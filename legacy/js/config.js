// config.js — tenant CONFIG, branding, sheet-URL resolver. Load order: 1 (first).
    // ===================== TENANT CONFIG (Stage 1) =====================
    // Identity, branding, and backend URL for this deployment.
    //   - Override per tenant by writing a JSON object (any subset of
    //     CONFIG_DEFAULTS keys) to localStorage['iesr_tenant_config_v1'].
    //   - Override the Sheet URL via localStorage['iesr_tenant_sheet_url_v1']
    //     or by calling window.setSheetUrl(url) at runtime.
    // Defaults preserve original IESR behavior, so the existing deployment
    // sees no rebrand and no behavior change.
    const CONFIG_DEFAULTS = Object.freeze({
      schoolName: 'IESR',
      schoolFullName: 'Intelligent Electronic School Register',
      departmentName: 'ELECTRICAL DEPARTMENT',
      year: '2026',
      // Standalone display strings (each is shown verbatim in the UI; rebranding
      // tenants override them directly rather than composing from the parts above)
      copyrightLine: '© 2026 IESR — Electrical Department • Craft & Diploma Programs • AI-Powered Insights',
      welcomeHeadline: 'Welcome to<br>IESR 2026 ELECTRICAL REGISTER',
      welcomeBlurb: 'Complete attendance management for Craft Certificate and Diploma in Electrical Engineering. Secure, efficient and intelligent with cloud sync.',
      loginPanelHeading: 'Access Electrical Register',
      parentPortalTitle: 'IESR PARENT MONITOR',
      splashVersionLine: 'IESR v2026 · ELECTRICAL DEPARTMENT · SECURE',
      classBrandPrefix: 'IESR',         // rendered as `${prefix} — ${currentClass}`
      registerBrandPrefix: 'IESR',      // rendered as `${prefix} — ${currentClass} REGISTER`
      // Backend
      defaultSheetUrl: 'https://script.google.com/macros/s/AKfycbxolIUza94tkFL5u0ejiBbFfZ6bmsbe2sSId1WsKJHOK6g3DR7Glmf5UuZUIeJ8nD_Hmw/exec',
      // When true, prompt for a Sheet URL on first run if none is stored and
      // no defaultSheetUrl is set. Set false for single-tenant deployments.
      multiTenant: true,
      // Legacy PIN seed values, used ONLY on first boot when no PINs are
      // stored. After first boot they migrate into hashed storage and the
      // admin should change them via window.setAdminPin / setGlobalAdminPin /
      // setSubmissionCode (admin panel UI lands in a later stage).
      // Set keys to null for fresh installs that should require setup.
      legacyPins: {
        admin: '2003',
        globalAdmin: '13030',
        submissionCode: '9209',
      },
    });

    const TENANT_CONFIG_KEY = 'iesr_tenant_config_v1';
    const TENANT_SHEET_URL_KEY = 'iesr_tenant_sheet_url_v1';

    function loadTenantOverrides() {
      try {
        const raw = localStorage.getItem(TENANT_CONFIG_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return (parsed && typeof parsed === 'object') ? parsed : {};
      } catch (e) {
        console.warn('[CONFIG] tenant overrides unreadable, using defaults:', e);
        return {};
      }
    }

    const CONFIG = Object.assign({}, CONFIG_DEFAULTS, loadTenantOverrides());

    // Tenant Sheet URL resolver.
    // Order: stored override -> CONFIG.defaultSheetUrl -> prompt (only if multiTenant).
    function resolveSheetUrl() {
      let stored = '';
      try { stored = localStorage.getItem(TENANT_SHEET_URL_KEY) || ''; } catch (e) {}
      if (stored) return stored;
      if (CONFIG.defaultSheetUrl) return CONFIG.defaultSheetUrl;
      if (CONFIG.multiTenant && typeof window !== 'undefined' && typeof window.prompt === 'function') {
        const url = (window.prompt(
          'Welcome! Paste your Google Apps Script Web App URL to connect this register to your school’s spreadsheet.\n(You can change this later in admin settings.)'
        ) || '').trim();
        if (url) {
          try { localStorage.setItem(TENANT_SHEET_URL_KEY, url); } catch (e) {}
          return url;
        }
      }
      return '';
    }

    // Public helper exposed for the future admin panel.
    window.setSheetUrl = function(url) {
      url = (url || '').trim();
      try {
        if (url) localStorage.setItem(TENANT_SHEET_URL_KEY, url);
        else localStorage.removeItem(TENANT_SHEET_URL_KEY);
      } catch (e) {}
      alert('Sheet URL updated. Reload the page for the change to take effect.');
    };

    // Apply tenant identity to the DOM. Safe to call multiple times and on
    // partial DOM (missing elements are skipped).
    function applyBranding() {
      const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el && value != null) el.textContent = value;
      };
      const setHTML = (id, value) => {
        const el = document.getElementById(id);
        if (el && value != null) el.innerHTML = value;
      };
      document.title = CONFIG.schoolName + ' — ' + CONFIG.schoolFullName;
      setText('splashTitle', CONFIG.schoolName);
      setText('splashSubtitle', CONFIG.schoolFullName);
      setText('splashVersionLine', CONFIG.splashVersionLine);
      setText('parentPortalTitle', CONFIG.parentPortalTitle);
      setText('welcomeLogoTitle', CONFIG.schoolName);
      setText('welcomeLogoSubtitle', CONFIG.schoolFullName);
      setHTML('welcomeHeadline', CONFIG.welcomeHeadline);
      setText('welcomeBlurb', CONFIG.welcomeBlurb);
      setText('loginPanelHeading', CONFIG.loginPanelHeading);
      setText('copyrightLine', CONFIG.copyrightLine);
    }
    applyBranding();
    document.addEventListener('DOMContentLoaded', applyBranding);
    // =================== END TENANT CONFIG ===================
