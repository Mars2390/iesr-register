// auth.js — PinManager (PBKDF2), EncryptionSystem, GOOGLE_SHEETS_URL, legacy IndexedDB/GoogleSheetsSync classes. Load: 2.

    // ===================== PIN MANAGER (Stage 2) =====================
    // PBKDF2-HMAC-SHA256, 100k iterations, per-slot 16-byte salt.
    // Three slots:
    //   - admin       (cryptographic; verified locally)
    //   - globalAdmin (cryptographic; verified locally)
    //   - submissionCode (PLAINTEXT; sent to the backend with attendance
    //     submissions, so it must be retrievable in cleartext on the client)
    // First boot migrates CONFIG.legacyPins into hashed storage (mode='legacy')
    // so existing deployments keep working without intervention.
    const PinManager = (() => {
      const STORAGE_KEY = 'iesr_pins_v1';
      const ITERATIONS = 100000;
      let state = null;
      let initPromise = null;

      async function init() {
        let stored = null;
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) stored = JSON.parse(raw);
        } catch (e) { stored = null; }

        if (stored && typeof stored === 'object'
            && stored.admin && stored.admin.hash && stored.admin.salt) {
          return Object.assign({ mode: stored.mode || 'configured' }, stored);
        }

        const legacy = (CONFIG && CONFIG.legacyPins) || {};
        if (legacy.admin && legacy.globalAdmin) {
          const adminSalt = randomSaltHex();
          const globalSalt = randomSaltHex();
          const next = {
            admin: { hash: await pbkdf2(legacy.admin, adminSalt), salt: adminSalt, iterations: ITERATIONS },
            globalAdmin: { hash: await pbkdf2(legacy.globalAdmin, globalSalt), salt: globalSalt, iterations: ITERATIONS },
            submissionCode: legacy.submissionCode || '',
            mode: 'legacy',
            createdAt: new Date().toISOString(),
          };
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) {}
          console.warn('[PinManager] First-boot migration from legacyPins complete. Admin should change PINs via setAdminPin/setGlobalAdminPin/setSubmissionCode.');
          return next;
        }

        return { admin: null, globalAdmin: null, submissionCode: '', mode: 'unconfigured' };
      }

      function ready() {
        if (!initPromise) {
          initPromise = init().then(s => { state = s; return s; });
        }
        return initPromise;
      }

      async function verify(slot, pin) {
        if (slot !== 'admin' && slot !== 'globalAdmin') return false;
        const s = await ready();
        const slotData = s[slot];
        if (!slotData || !slotData.hash || !slotData.salt) return false;
        if (typeof pin !== 'string' || !pin) return false;
        const computed = await pbkdf2(pin, slotData.salt, slotData.iterations || ITERATIONS);
        return constantTimeEq(computed, slotData.hash);
      }

      async function setPin(slot, pin) {
        if (slot !== 'admin' && slot !== 'globalAdmin') {
          throw new Error('Invalid slot. Use "admin" or "globalAdmin".');
        }
        if (typeof pin !== 'string' || pin.trim().length < 3) {
          throw new Error('PIN must be at least 3 characters.');
        }
        await ready();
        const salt = randomSaltHex();
        const hash = await pbkdf2(pin.trim(), salt);
        state = Object.assign({}, state, {
          [slot]: { hash, salt, iterations: ITERATIONS },
          mode: 'configured',
        });
        persist();
      }

      async function setSubmissionCode(code) {
        if (typeof code !== 'string' || !code.trim()) {
          throw new Error('Submission code must be a non-empty string.');
        }
        await ready();
        state = Object.assign({}, state, { submissionCode: code.trim() });
        persist();
      }

      function getSubmissionCode() {
        return (state && state.submissionCode) || '';
      }
      function getMode() {
        return (state && state.mode) || 'unconfigured';
      }

      function persist() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
        catch (e) { console.warn('[PinManager] Could not persist PIN state:', e); }
      }

      // ----- crypto helpers -----
      async function pbkdf2(pin, saltHex, iterations) {
        iterations = iterations || ITERATIONS;
        const enc = new TextEncoder();
        const saltBytes = hexToBytes(saltHex);
        const keyMaterial = await crypto.subtle.importKey(
          'raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveBits']
        );
        const bits = await crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: saltBytes, iterations: iterations, hash: 'SHA-256' },
          keyMaterial, 256
        );
        return bytesToHex(new Uint8Array(bits));
      }
      function randomSaltHex() {
        const b = new Uint8Array(16);
        crypto.getRandomValues(b);
        return bytesToHex(b);
      }
      function bytesToHex(bytes) {
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      }
      function hexToBytes(hex) {
        const out = new Uint8Array(hex.length / 2);
        for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i*2, 2), 16);
        return out;
      }
      function constantTimeEq(a, b) {
        if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
        let r = 0;
        for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
        return r === 0;
      }

      // Eagerly kick off init so the first verify is fast and getSubmissionCode
      // returns the real value by the time any submit can fire.
      ready();

      return { ready, verify, setPin, setSubmissionCode, getSubmissionCode, getMode };
    })();

    // Programmatic helpers for the future admin panel UI.
    window.setAdminPin = function(pin) {
      return PinManager.setPin('admin', pin)
        .then(() => alert('Admin PIN updated.'))
        .catch(e => alert('Failed to update Admin PIN: ' + e.message));
    };
    window.setGlobalAdminPin = function(pin) {
      return PinManager.setPin('globalAdmin', pin)
        .then(() => alert('Global Admin PIN updated.'))
        .catch(e => alert('Failed to update Global Admin PIN: ' + e.message));
    };
    window.setSubmissionCode = function(code) {
      return PinManager.setSubmissionCode(code)
        .then(() => alert('Submission code updated.'))
        .catch(e => alert('Failed to update submission code: ' + e.message));
    };
    window.PinManager = PinManager;
    // =================== END PIN MANAGER ===================

    // ===== ENHANCED ENCRYPTION SYSTEM WITH SECURE HASHING =====
    class EncryptionSystem {
      // Original encryption/decryption for data
      static encrypt(text) {
        let encrypted = '';
        const key = 'IESR2026SECURE';
        for (let i = 0; i < text.length; i++) {
          const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
          encrypted += String.fromCharCode(charCode);
        }
        return btoa(encrypted).split('').reverse().join('');
      }
      
      static decrypt(encrypted) {
        try {
          const reversed = encrypted.split('').reverse().join('');
          const decoded = atob(reversed);
          const key = 'IESR2026SECURE';
          let decrypted = '';
          for (let i = 0; i < decoded.length; i++) {
            const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            decrypted += String.fromCharCode(charCode);
          }
          return decrypted;
        } catch (e) {
          return '';
        }
      }
      
      /**
       * ONE-WAY HASH FUNCTION - Cannot be reversed to get original PIN
       */
      static hashPin(pin) {
        let hash = 0;
        for (let i = 0; i < pin.length; i++) {
          const char = pin.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
      }
      
      static verifyPin(enteredPin, storedHash) {
        const enteredHash = this.hashPin(enteredPin);
        return enteredHash === storedHash;
      }
    }

    // ADMIN_PINS removed in Stage 2 — admin/globalAdmin/submissionCode are
    // now managed by PinManager (PBKDF2-hashed, per-tenant, in localStorage).
    // EncryptionSystem.hashPin remains in use only for legacy teacher PINs in
    // CLASS_CONFIG below; that structure is replaced in Stage 4.

    // ===== GLOBAL CONSTANTS =====
    // Resolved from tenant config above. Use window.setSheetUrl(newUrl) to
    // change the Sheet URL at runtime; reload required for it to take effect.
    let GOOGLE_SHEETS_URL = resolveSheetUrl();

    // ===== INDEXEDDB STORAGE CLASS (UPDATED v4 — SESSION-AWARE UNIQUE KEY) =====
    class IndexedDBStorage {
      constructor() {
        this.dbName = 'IESR_Database';
        this.version = 4; // v4: sessionId added to unique composite key for multi-session support
        this.db = null;
      }

      async init() {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(this.dbName, this.version);

          request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
          };

          request.onsuccess = (event) => {
            this.db = event.target.result;
            console.log('IndexedDB initialized successfully (v4 multi-session)');
            resolve();
          };

          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const oldVersion = event.oldVersion;

            // FIXED: Only drop stores when schema actually changed (v1→v4 requires new uniqueRecord index with sessionId)
            // For brand new DB (oldVersion === 0), create fresh. For upgrades, migrate carefully.
            if (oldVersion < 4) {
              // Only drop and recreate attendance if schema changed (added sessionId to uniqueRecord index)
              if (db.objectStoreNames.contains('attendance')) {
                db.deleteObjectStore('attendance');
              }
              if (db.objectStoreNames.contains('syncQueue')) {
                db.deleteObjectStore('syncQueue');
              }
              // Students store schema hasn't changed — only recreate if missing
              if (!db.objectStoreNames.contains('students')) {
                const studentStore = db.createObjectStore('students', { keyPath: 'admissionNo' });
                studentStore.createIndex('class', 'class', { unique: false });
              }
            }

            // v4: attendance store — unique key includes sessionId for multi-session support
            if (!db.objectStoreNames.contains('attendance')) {
              const attendanceStore = db.createObjectStore('attendance', { keyPath: 'id' });
              attendanceStore.createIndex('uniqueRecord', ['class', 'teacher', 'studentId', 'date', 'sessionId'], { unique: true });
              attendanceStore.createIndex('class', 'class', { unique: false });
              attendanceStore.createIndex('teacher', 'teacher', { unique: false });
              attendanceStore.createIndex('date', 'date', { unique: false });
              attendanceStore.createIndex('studentId', 'studentId', { unique: false });
              attendanceStore.createIndex('subject', 'subject', { unique: false });
              attendanceStore.createIndex('sessionId', 'sessionId', { unique: false });
              attendanceStore.createIndex('syncStatus', 'syncStatus', { unique: false });
            }

            // Sync queue
            if (!db.objectStoreNames.contains('syncQueue')) {
              const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
              syncStore.createIndex('status', 'status', { unique: false });
              syncStore.createIndex('uniqueRecordId', 'uniqueRecordId', { unique: true });
            }

            // Students store (if somehow missing)
            if (!db.objectStoreNames.contains('students')) {
              const studentStore = db.createObjectStore('students', { keyPath: 'admissionNo' });
              studentStore.createIndex('class', 'class', { unique: false });
            }
          };
        });
      }

      async saveAttendance(record) {
        return new Promise((resolve, reject) => {
          if (!this.db) {
            reject(new Error('Database not initialized'));
            return;
          }

          const transaction = this.db.transaction(['attendance', 'syncQueue'], 'readwrite');
          const attendanceStore = transaction.objectStore('attendance');
          const syncStore = transaction.objectStore('syncQueue');

          // v4: Generate unique composite key — includes sessionId for multi-session support
          const sessionId = record.sessionId || 'DEFAULT';
          const uniqueRecordId = record.uniqueRecordId || `${record.class}|${record.teacher}|${record.studentId}|${record.date}|${sessionId}`;
          
          // Check if record already exists — now lookup includes sessionId
          const index = attendanceStore.index('uniqueRecord');
          const getRequest = index.get([record.class, record.teacher, record.studentId, record.date, sessionId]);

          getRequest.onsuccess = () => {
            const existingRecord = getRequest.result;
            
            if (existingRecord) {
              // UPDATE existing record instead of creating duplicate
              console.log(`Updating existing record for ${record.studentId} on ${record.date} session ${sessionId}`);
              
              const updateRecord = {
                ...existingRecord,
                status: record.status,
                subject: record.subject || existingRecord.subject,
                sessionId: sessionId,
                marked_at: new Date().toISOString(),
                syncStatus: 'pending'
              };
              
              const putRequest = attendanceStore.put(updateRecord);
              
              putRequest.onsuccess = () => {
                const syncRecord = {
                  uniqueRecordId: uniqueRecordId,
                  recordId: updateRecord.id,
                  data: updateRecord,
                  status: 'pending',
                  retryCount: 0,
                  createdAt: new Date().toISOString()
                };
                
                const syncIndex = syncStore.index('uniqueRecordId');
                const syncGetRequest = syncIndex.get(uniqueRecordId);
                
                syncGetRequest.onsuccess = () => {
                  if (syncGetRequest.result) {
                    const existingSync = syncGetRequest.result;
                    existingSync.data = updateRecord;
                    existingSync.status = 'pending';
                    existingSync.retryCount = 0;
                    syncStore.put(existingSync);
                  } else {
                    syncStore.add(syncRecord);
                  }
                };
                
                resolve(updateRecord.id);
              };
              
              putRequest.onerror = (error) => reject(error);
            } else {
              // CREATE new record
              console.log(`Creating new record for ${record.studentId} on ${record.date} session ${sessionId}`);
              
              const newRecord = {
                id: uniqueRecordId,
                class: record.class,
                teacher: record.teacher,
                studentId: record.studentId,
                studentName: record.studentName,
                date: record.date,
                sessionId: sessionId,
                subject: record.subject,
                status: record.status,
                marked_at: record.marked_at || new Date().toISOString(),
                createdAt: new Date().toISOString(),
                syncStatus: 'pending'
              };
              
              const addRequest = attendanceStore.add(newRecord);
              
              addRequest.onsuccess = () => {
                const syncRecord = {
                  uniqueRecordId: uniqueRecordId,
                  recordId: uniqueRecordId,
                  data: newRecord,
                  status: 'pending',
                  retryCount: 0,
                  createdAt: new Date().toISOString()
                };
                
                syncStore.add(syncRecord);
                resolve(uniqueRecordId);
              };
              
              addRequest.onerror = (error) => reject(error);
            }
          };

          getRequest.onerror = (error) => reject(error);
        });
      }

      async saveAttendanceBatch(records) {
        // Process records one by one to ensure uniqueness
        const results = [];
        for (const record of records) {
          try {
            const result = await this.saveAttendance(record);
            results.push(result);
          } catch (e) {
            console.warn('Failed to save record:', e);
          }
        }
        return results;
      }

      async getAttendance(filters = {}) {
        return new Promise((resolve, reject) => {
          if (!this.db) {
            reject(new Error('Database not initialized'));
            return;
          }

          const transaction = this.db.transaction(['attendance'], 'readonly');
          const store = transaction.objectStore('attendance');
          const request = store.getAll();

          request.onsuccess = () => {
            let results = request.result;

            if (filters.class) {
              results = results.filter(r => r.class === filters.class);
            }
            if (filters.teacher) {
              results = results.filter(r => r.teacher === filters.teacher);
            }
            if (filters.studentId) {
              results = results.filter(r => r.studentId === filters.studentId);
            }
            if (filters.startDate && filters.endDate) {
              const start = new Date(filters.startDate);
              const end = new Date(filters.endDate);
              results = results.filter(r => {
                const recordDate = new Date(r.date);
                return recordDate >= start && recordDate <= end;
              });
            }
            if (filters.subject) {
              results = results.filter(r => r.subject === filters.subject);
            }

            resolve(results);
          };

          request.onerror = (error) => reject(error);
        });
      }

      async getAttendanceBySubject(subject, filters = {}) {
        const results = await this.getAttendance(filters);
        return results.filter(r => r.subject === subject);
      }

      async getPendingSync() {
        return new Promise((resolve, reject) => {
          if (!this.db) {
            reject(new Error('Database not initialized'));
            return;
          }

          const transaction = this.db.transaction(['syncQueue'], 'readonly');
          const store = transaction.objectStore('syncQueue');
          const index = store.index('status');
          const request = index.getAll('pending');

          request.onsuccess = () => {
            resolve(request.result);
          };

          request.onerror = (error) => reject(error);
        });
      }

      async markAsSynced(syncIds) {
        return new Promise((resolve, reject) => {
          if (!this.db) {
            reject(new Error('Database not initialized'));
            return;
          }

          const transaction = this.db.transaction(['syncQueue', 'attendance'], 'readwrite');
          const syncStore = transaction.objectStore('syncQueue');
          const attendanceStore = transaction.objectStore('attendance');

          let completed = 0;
          syncIds.forEach(syncId => {
            const getRequest = syncStore.get(syncId);
            
            getRequest.onsuccess = () => {
              const record = getRequest.result;
              if (record) {
                record.status = 'synced';
                record.syncedAt = new Date().toISOString();
                syncStore.put(record);

                if (record.recordId) {
                  const attRequest = attendanceStore.get(record.recordId);
                  attRequest.onsuccess = () => {
                    const attRecord = attRequest.result;
                    if (attRecord) {
                      attRecord.syncStatus = 'synced';
                      attRecord.syncedAt = new Date().toISOString();
                      attendanceStore.put(attRecord);
                    }
                  };
                }
              }
              completed++;
              if (completed === syncIds.length) {
                resolve();
              }
            };
          });
        });
      }

      async updateSyncRetry(syncId) {
        return new Promise((resolve, reject) => {
          if (!this.db) {
            reject(new Error('Database not initialized'));
            return;
          }

          const transaction = this.db.transaction(['syncQueue'], 'readwrite');
          const store = transaction.objectStore('syncQueue');
          const request = store.get(syncId);

          request.onsuccess = () => {
            const record = request.result;
            if (record) {
              record.retryCount = (record.retryCount || 0) + 1;
              record.lastRetry = new Date().toISOString();
              
              if (record.retryCount >= 5) {
                record.status = 'failed';
              }
              
              store.put(record);
              resolve();
            }
          };

          request.onerror = (error) => reject(error);
        });
      }

      async saveStudents(students) {
        return new Promise((resolve, reject) => {
          if (!this.db) {
            reject(new Error('Database not initialized'));
            return;
          }

          const transaction = this.db.transaction(['students'], 'readwrite');
          const store = transaction.objectStore('students');
          let written = 0;
          let skipped = 0;

          students.forEach(student => {
            const key = student && student.Admission_No;
            // Skip records without a usable key — IndexedDB accepts any
            // string (including admissions like '50090/CEEMAY2025R'), but
            // null/undefined/empty/non-string values throw DataError and
            // abort the whole transaction unless we filter them out.
            if (typeof key !== 'string' || key === '') {
              skipped++;
              console.warn('[saveStudents] skipping student without valid Admission_No:', student);
              return;
            }
            const req = store.put({
              admissionNo: key,
              name: student.Student_Name || '',
              class: student.Class || '',
              updatedAt: new Date().toISOString()
            });
            req.onsuccess = () => { written++; };
            req.onerror = (e) => {
              skipped++;
              const errMsg = (e.target && e.target.error && e.target.error.message) || 'unknown';
              console.warn('[saveStudents] put failed for ' + key + ':', errMsg);
              // prevent the failure from aborting the transaction so other
              // records still land
              e.preventDefault();
              e.stopPropagation();
            };
          });

          transaction.oncomplete = () => {
            if (skipped) console.warn(`[saveStudents] ${written} written, ${skipped} skipped`);
            resolve();
          };
          transaction.onerror = (error) => {
            reject(error && error.target ? error.target.error : error);
          };
        });
      }
    }

    // ===== GOOGLE SHEETS SYNC CLASS =====
    class GoogleSheetsSync {
      constructor() {
        this.url = GOOGLE_SHEETS_URL;
        this.syncInterval = null;
        this.isSyncing = false;
        this.lastSyncTime = null;
        this.pendingCount = 0;
      }

      startAutoSync(intervalMinutes = 5) {
        if (this.syncInterval) {
          clearInterval(this.syncInterval);
        }

        this.syncPendingData();
        this.syncInterval = setInterval(() => {
          this.syncPendingData();
        }, intervalMinutes * 60 * 1000);

        window.addEventListener('online', () => {
          console.log('Back online, syncing...');
          this.syncPendingData();
          this.updateSyncStatus();
        });

        window.addEventListener('offline', () => {
          console.log('Offline, sync paused');
          this.updateSyncStatus();
        });

        setInterval(() => this.updateSyncStatus(), 60000);
      }

      async syncPendingData() {
        if (this.isSyncing) {
          console.log('Sync already in progress');
          return;
        }

        if (!navigator.onLine) {
          console.log('Offline, skipping sync');
          this.updateSyncStatus();
          return;
        }

        this.isSyncing = true;
        this.updateSyncStatus('syncing');

        try {
          const pendingRecords = await indexedDBStorage.getPendingSync();
          
          if (pendingRecords.length === 0) {
            console.log('No pending records to sync');
            this.lastSyncTime = new Date();
            this.updateSyncStatus('success');
            this.isSyncing = false;
            return;
          }

          console.log(`Syncing ${pendingRecords.length} records to Google Sheets`);

          const batchSize = 50;
          const batches = [];
          
          for (let i = 0; i < pendingRecords.length; i += batchSize) {
            batches.push(pendingRecords.slice(i, i + batchSize));
          }

          const syncedIds = [];

          for (const batch of batches) {
            const records = batch.map(item => item.data);

            try {
              // Stage 5+ fix: route the legacy queue through SheetsAPI.
              // The original raw fetch used mode: 'no-cors' + Content-Type:
              // 'application/json' which (a) silently failed CORS preflight
              // from third-party origins like GitHub Pages and (b) sent no
              // submissionCode, so Code.gs rejected the writes once the
              // Config tab had a code set. SheetsAPI.submitAttendance uses
              // the application/x-www-form-urlencoded transport (CORS-simple,
              // works through the proxy or directly), attaches the
              // submissionCode automatically, and surfaces real errors so
              // the catch below actually fires on failure.
              const result = await SheetsAPI.submitAttendance(records);
              const written = (result && result.written != null) ? result.written : records.length;
              console.log(`✅ Batch of ${records.length} sent successfully (server wrote ${written})`);

              batch.forEach(item => {
                syncedIds.push(item.id);
              });

            } catch (error) {
              console.error('Batch sync failed:', error);

              for (const item of batch) {
                await indexedDBStorage.updateSyncRetry(item.id);
              }
            }

            await new Promise(resolve => setTimeout(resolve, 500));
          }

          if (syncedIds.length > 0) {
            await indexedDBStorage.markAsSynced(syncedIds);
            console.log(`Marked ${syncedIds.length} records as synced`);
          }

          this.lastSyncTime = new Date();
          this.pendingCount = pendingRecords.length - syncedIds.length;
          this.updateSyncStatus(syncedIds.length === pendingRecords.length ? 'success' : 'partial');

        } catch (error) {
          console.error('Sync failed:', error);
          this.updateSyncStatus('error');
        } finally {
          this.isSyncing = false;
        }
      }

      async loadFromSheets(filters = {}) {
        if (!navigator.onLine) {
          throw new Error('Cannot load from sheets while offline');
        }

        try {
          const params = new URLSearchParams();
          if (filters.class) params.append('class', filters.class);
          if (filters.teacher) params.append('teacher', filters.teacher);
          if (filters.subject) params.append('subject', filters.subject);
          if (filters.startDate) params.append('startDate', filters.startDate);
          if (filters.endDate) params.append('endDate', filters.endDate);
          if (filters.date) params.append('date', filters.date);

          const url = `${this.url}?${params.toString()}`;
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          
          if (Array.isArray(data)) {
            return data;
          } else if (data && Array.isArray(data.data)) {
            return data.data;
          } else if (data && data.error) {
            throw new Error(data.error);
          } else {
            console.warn('Unexpected response format:', data);
            return [];
          }

        } catch (error) {
          console.error('Error loading from sheets:', error);
          throw error;
        }
      }

      updateSyncStatus(status = 'checking') {
        const indicator = document.getElementById('syncStatusIndicator');
        const textEl = document.getElementById('syncStatusText');

        if (!indicator) return;

        indicator.classList.remove('sync-status-success', 'sync-status-pending', 'sync-status-error', 'sync-status-offline');

        if (!navigator.onLine) {
          indicator.style.display = 'inline-flex';
          indicator.classList.add('sync-status-offline');
          textEl.textContent = 'Offline';
          return;
        }

        if (status === 'syncing') {
          indicator.style.display = 'inline-flex';
          indicator.classList.add('sync-status-pending');
          textEl.textContent = 'Syncing...';
        } else if (status === 'success') {
          indicator.style.display = 'inline-flex';
          indicator.classList.add('sync-status-success');
          const lastSync = this.lastSyncTime ? this.lastSyncTime.toLocaleTimeString() : 'never';
          textEl.textContent = `Synced at ${lastSync}`;
        } else if (status === 'partial') {
          indicator.style.display = 'inline-flex';
          indicator.classList.add('sync-status-warning');
          textEl.textContent = `${this.pendingCount} pending`;
        } else if (status === 'error') {
          indicator.style.display = 'inline-flex';
          indicator.classList.add('sync-status-error');
          textEl.textContent = 'Sync failed';
        } else {
          indicator.style.display = 'none';
        }
      }

      stopAutoSync() {
        if (this.syncInterval) {
          clearInterval(this.syncInterval);
          this.syncInterval = null;
        }
      }
    }

