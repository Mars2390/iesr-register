// migration.js — CLASS_CONFIG (uses EncryptionSystem) + migrateLegacyData/runMigrateData. Load: 5 (after auth).

    // ===== CLASS CONFIGURATION - COMPLETE MERGED SYSTEM WITH REMOVED CLASSES =====
    const CLASS_CONFIG = {
        // ===== CRAFT CLASSES (CEEMAY2024A and CEEMAY2024B REMOVED) =====
        'CEEMAY2025R': {
            displayName: 'CEEMAY2025R (Craft Electrical)',
            teachers: ['ALOO', 'DOROTHY', 'KIRIGWI', 'SALOME', 'GITHOGORI', 'LILIAN', 'KWASA', 'WAFULA', 'SHARON'],
            teacherPins: {
                'ALOO': EncryptionSystem.hashPin('4810'),
                'DOROTHY': EncryptionSystem.hashPin('5922'),
                'KIRIGWI': EncryptionSystem.hashPin('6034'),
                'SALOME': EncryptionSystem.hashPin('9362'),
                'GITHOGORI': EncryptionSystem.hashPin('1586'),
                'LILIAN': EncryptionSystem.hashPin('7146'),
                'KWASA': EncryptionSystem.hashPin('8258'),
                'WAFULA': EncryptionSystem.hashPin('9360'),
                'SHARON': EncryptionSystem.hashPin('0472')
            },
            defaultSessions: [
                {"DAY":"MON","TIME":"08:00AM TO 10:00AM","SUBJECT":"ELECTRONICS","LECTURER":"ALOO"},
                {"DAY":"MON","TIME":"10:30AM TO 12:30PM","SUBJECT":"ENTREPRENEURSHIP","LECTURER":"DOROTHY"},
                {"DAY":"MON","TIME":"1:30PM TO 3:30PM","SUBJECT":"ENGINEERING DRAWING","LECTURER":"KIRIGWI"},
                {"DAY":"MON","TIME":"3:30PM TO 5:30PM","SUBJECT":"ENGINEERING DRAWING","LECTURER":"KIRIGWI"},
                {"DAY":"TUE","TIME":"08:00AM TO 10:00AM","SUBJECT":"W/TECHNOLOGY (A&B)","LECTURER":"KIRIGWI"},
                {"DAY":"TUE","TIME":"10:30AM TO 12:30PM","SUBJECT":"W/TECHNOLOGY (A&B)","LECTURER":"KIRIGWI"},
                {"DAY":"TUE","TIME":"1:30PM TO 3:30PM","SUBJECT":"ELECTRICAL PRINCIPLES","LECTURER":"SALOME"},
                {"DAY":"TUE","TIME":"3:30PM TO 5:30PM","SUBJECT":"ELECTRICAL PRINCIPLES","LECTURER":"SALOME"},
                {"DAY":"WED","TIME":"08:00AM TO 10:00AM","SUBJECT":"ELECTRICAL INSTALLATION TECH.","LECTURER":"GITHOGORI"},
                {"DAY":"WED","TIME":"10:30AM TO 12:30PM","SUBJECT":"ELECTRICAL INSTALLATION TECH.","LECTURER":"GITHOGORI"},
                {"DAY":"WED","TIME":"1:30PM TO 3:30PM","SUBJECT":"ELECTRICAL INSTALLATION TECH.","LECTURER":"GITHOGORI"},
                {"DAY":"THU","TIME":"08:00AM TO 10:00AM","SUBJECT":"ICT","LECTURER":"LILIAN"},
                {"DAY":"THU","TIME":"10:30AM TO 12:30PM","SUBJECT":"ICT","LECTURER":"LILIAN"},
                {"DAY":"THU","TIME":"1:30PM TO 3:30PM","SUBJECT":"W/TECHNOLOGY (A&B)","LECTURER":"KIRIGWI/NGANA"},
                {"DAY":"THU","TIME":"3:30PM TO 5:30PM","SUBJECT":"W/TECHNOLOGY (A&B)","LECTURER":"KIRIGWI/NGANA"},
                {"DAY":"FRI","TIME":"08:00AM TO 10:00AM","SUBJECT":"MATHEMATICS","LECTURER":"KWASA"},
                {"DAY":"FRI","TIME":"10:30AM TO 12:30PM","SUBJECT":"SOLAR","LECTURER":"WAFULA"},
                {"DAY":"FRI","TIME":"1:30PM TO 3:30PM","SUBJECT":"APPLIED SCIENCE","LECTURER":"SHARON"},
                {"DAY":"FRI","TIME":"3:30PM TO 5:30PM","SUBJECT":"ELECTRONICS","LECTURER":"ALOO"}
            ],
            embeddedStudents: [
                {"Admission_No":"12992/CEEMAY2025R","Student_Name":"SEGERGER MATHEW KIPKORIR","Class":"CEEMAY2025R"},
                {"Admission_No":"12994/CEEMAY2025R","Student_Name":"OUMA BRIAN ODHIAMBO","Class":"CEEMAY2025R"},
                {"Admission_No":"12996/CEEMAY2025R","Student_Name":"PAUL OGENDO NYANDIKA","Class":"CEEMAY2025R"},
                {"Admission_No":"12998/CEEMAY2025R","Student_Name":"MWATHE VERONICAH VAATI","Class":"CEEMAY2025R"},
                {"Admission_No":"13001/CEEMAY2025R","Student_Name":"MWANZIA DAVID NGILA","Class":"CEEMAY2025R"},
                {"Admission_No":"13002/CEEMAY2025R","Student_Name":"DOYO EDIN HUSSEIN","Class":"CEEMAY2025R"},
                {"Admission_No":"13003/CEEMAY2025R","Student_Name":"GACHOKI MARK MACHARIA","Class":"CEEMAY2025R"},
                {"Admission_No":"13004/CEEMAY2025R","Student_Name":"SALIM MBARAKA MRABU","Class":"CEEMAY2025R"},
                {"Admission_No":"13005/CEEMAY2025R","Student_Name":"NYAMBURA FRANKLIN KIMANI","Class":"CEEMAY2025R"},
                {"Admission_No":"13006/CEEMAY2025R","Student_Name":"MUSAU POLYN","Class":"CEEMAY2025R"},
                {"Admission_No":"13008/CEEMAY2025R","Student_Name":"MUNIU ANTHONY KAMAU","Class":"CEEMAY2025R"},
                {"Admission_No":"13011/CEEMAY2025R","Student_Name":"WAMBULWA DENZEL WAFULA","Class":"CEEMAY2025R"},
                {"Admission_No":"13013/CEEMAY2025R","Student_Name":"KENJI COLLINS KINYUA","Class":"CEEMAY2025R"},
                {"Admission_No":"13014/CEEMAY2025R","Student_Name":"KAMAU ABIGAIL WAMAITHA","Class":"CEEMAY2025R"},
                {"Admission_No":"13015/CEEMAY2025R","Student_Name":"OCHIENG JOHN WILFRED","Class":"CEEMAY2025R"},
                {"Admission_No":"13018/CEEMAY2025R","Student_Name":"GEDION KIPNGETICH","Class":"CEEMAY2025R"},
                {"Admission_No":"13020/CEEMAY2025R","Student_Name":"AYA JORAM LIANI","Class":"CEEMAY2025R"},
                {"Admission_No":"13022/CEEMAY2025R","Student_Name":"OMOSA SCHEFFER MBERA","Class":"CEEMAY2025R"},
                {"Admission_No":"13028/CEEMAY2025R","Student_Name":"MAINA PHILIP SIMEL","Class":"CEEMAY2025R"},
                {"Admission_No":"13030/CEEMAY2025R","Student_Name":"OMBUI ALBERT MOMANYI","Class":"CEEMAY2025R"},
                {"Admission_No":"13031/CEEMAY2025R","Student_Name":"CHIRCHIR RUTH JEPKOGEI","Class":"CEEMAY2025R"},
                {"Admission_No":"13032/CEEMAY2025R","Student_Name":"EDITH CAROL","Class":"CEEMAY2025R"},
                {"Admission_No":"13034/CEEMAY2025R","Student_Name":"KIPSANG BENARD NGETICH","Class":"CEEMAY2025R"},
                {"Admission_No":"13035/CEEMAY2025R","Student_Name":"ODOYO VIVIAN ADHIAMBO","Class":"CEEMAY2025R"},
                {"Admission_No":"13036/CEEMAY2025R","Student_Name":"ADAMS KIPKORIR","Class":"CEEMAY2025R"},
                {"Admission_No":"13039/CEEMAY2025R","Student_Name":"KEVIN ONGIRI MONARI","Class":"CEEMAY2025R"},
                {"Admission_No":"13041/CEEMAY2025R","Student_Name":"KINYILI BENARD NDUNGA","Class":"CEEMAY2025R"},
                {"Admission_No":"13042/CEEMAY2025R","Student_Name":"KIPROTICH VICTOR MOSONG","Class":"CEEMAY2025R"},
                {"Admission_No":"13043/CEEMAY2025R","Student_Name":"KIUMBE JOSEPH NJUGUNA","Class":"CEEMAY2025R"},
                {"Admission_No":"13045/CEEMAY2025R","Student_Name":"MONICA JEROP","Class":"CEEMAY2025R"},
                {"Admission_No":"13046/CEEMAY2025R","Student_Name":"FAITH CHELANGAT","Class":"CEEMAY2025R"},
                {"Admission_No":"13049/CEEMAY2025R","Student_Name":"NAFULA BELINDA CHARITY","Class":"CEEMAY2025R"},
                {"Admission_No":"13052/CEEMAY2025R","Student_Name":"MWANGI DANIEL GIKONYO","Class":"CEEMAY2025R"},
                {"Admission_No":"13055/CEEMAY2025R","Student_Name":"NAFTAL ORIOSA","Class":"CEEMAY2025R"},
                {"Admission_No":"13057/CEEMAY2025R","Student_Name":"NJOGU JOSEPH MWANGI","Class":"CEEMAY2025R"},
                {"Admission_No":"13059/CEEMAY2025R","Student_Name":"KWOMA NOEL NEKESA","Class":"CEEMAY2025R"},
                {"Admission_No":"13065/CEEMAY2025R","Student_Name":"AREKI RABEL MURIMI","Class":"CEEMAY2025R"},
                {"Admission_No":"13115/CEEMAY2025R","Student_Name":"SERONY TITUS KIPNGENO","Class":"CEEMAY2025R"},
                {"Admission_No":"13131/CEEMAY2025R","Student_Name":"KIPROP HOSEA KOECH","Class":"CEEMAY2025R"},
                {"Admission_No":"13143/CEEMAY2025R","Student_Name":"MUASYA CYRUS MUINDE","Class":"CEEMAY2025R"},
                {"Admission_No":"13144/CEEMAY2025R","Student_Name":"MULI BRIAN MBURI","Class":"CEEMAY2025R"},
                {"Admission_No":"13147/CEEMAY2025R","Student_Name":"WAMBUA DENNIS KIOKO","Class":"CEEMAY2025R"},
                {"Admission_No":"13148/CEEMAY2025R","Student_Name":"EPHY MBUCHE MAINA","Class":"CEEMAY2025R"},
                {"Admission_No":"13402/CEEMAY2025R","Student_Name":"WAIRIMU JOHN MAKUMI","Class":"CEEMAY2025R"},
                {"Admission_No":"12997/CEEMAY2025R","Student_Name":"NYAMWEYA COLLINS ABUGA","Class":"CEEMAY2025R"},
                {"Admission_No":"13012/CEEMAY2025R","Student_Name":"MBAE IAN MUTUGI","Class":"CEEMAY2025R"},
                {"Admission_No":"13021/CEEMAY2025R","Student_Name":"NCHOE ISAYA KOILEKEN","Class":"CEEMAY2025R"},
                {"Admission_No":"13023/CEEMAY2025R","Student_Name":"OTIENO BUXTON OCHIENG","Class":"CEEMAY2025R"},
                {"Admission_No":"13037/CEEMAY2025R","Student_Name":"IMBIRU ALVIN MUGODO","Class":"CEEMAY2025R"},
                {"Admission_No":"13038/CEEMAY2025R","Student_Name":"MOGOI RAILA OMAMBIA","Class":"CEEMAY2025R"},
                {"Admission_No":"13044/CEEMAY2025R","Student_Name":"OKOTH DAVID ACHILLA","Class":"CEEMAY2025R"},
                {"Admission_No":"13053/CEEMAY2025R","Student_Name":"OWOUR KELLY OTIENO","Class":"CEEMAY2025R"},
                {"Admission_No":"13054/CEEMAY2025R","Student_Name":"KIOKO KENNEDY NDOLO","Class":"CEEMAY2025R"},
                {"Admission_No":"13058/CEEMAY2025R","Student_Name":"OTIENO TIMOTHY OMONDI","Class":"CEEMAY2025R"},
                {"Admission_No":"13085/CEEMAY2025R","Student_Name":"MACHARIA STANLEY GACHUKI","Class":"CEEMAY2025R"},
                {"Admission_No":"13145/CEEMAY2025R","Student_Name":"ELINAH NEKESA MISIKO","Class":"CEEMAY2025R"}
            ]
        },
        'CEESEP2024A': {
            displayName: 'CEESEP2024A (Craft Electrical)',
            teachers: ['OMBUI', 'GITHAE', 'KOBIA', 'DON', 'SHARON', 'GLADYS', 'DORIS', 'JENNIFER', 'MUTENDE', 'WANAGAI', 'GITHOGORI'],
            teacherPins: {
                'OMBUI': EncryptionSystem.hashPin('9090'),
                'GITHAE': EncryptionSystem.hashPin('0990'),
                'KOBIA': EncryptionSystem.hashPin('5555'),
                'DON': EncryptionSystem.hashPin('4712'),
                'SHARON': EncryptionSystem.hashPin('0472'),
                'GLADYS': EncryptionSystem.hashPin('6936'),
                'DORIS': EncryptionSystem.hashPin('5824'),
                'JENNIFER': EncryptionSystem.hashPin('6922'),
                'MUTENDE': EncryptionSystem.hashPin('7148'),
                'WANAGAI': EncryptionSystem.hashPin('5423'),
                'GITHOGORI': EncryptionSystem.hashPin('1586')
            },
            defaultSessions: [
                {"DAY":"MON","TIME":"08:00AM TO 10:00AM","SUBJECT":"ELECTRICAL INSTALLATION TECHNOLOGY II","LECTURER":"OMBUI"},
                {"DAY":"MON","TIME":"10:30AM TO 12:30PM","SUBJECT":"ELECTRICAL INSTALLATION TECHNOLOGY II","LECTURER":"OMBUI"},
                {"DAY":"MON","TIME":"01:30PM TO 03:30PM","SUBJECT":"ELECTRICAL INSTALLATION TECHNOLOGY II","LECTURER":"OMBUI"},
                {"DAY":"MON","TIME":"03:30PM TO 05:30PM","SUBJECT":"MICRO ELECTRONICS","LECTURER":"GITHAE"},
                {"DAY":"TUE","TIME":"08:00AM TO 10:00AM","SUBJECT":"ELECTRICAL MAINTENANCE & FAULT DIAGNOSIS","LECTURER":"KOBIA"},
                {"DAY":"TUE","TIME":"10:30AM TO 12:30PM","SUBJECT":"ELECTRICAL MAINTENANCE & FAULT DIAGNOSIS","LECTURER":"KOBIA"},
                {"DAY":"TUE","TIME":"01:30PM TO 03:30PM","SUBJECT":"INDUSTRIAL MACHINES & CONTROLS","LECTURER":"DON"},
                {"DAY":"TUE","TIME":"03:30PM TO 05:30PM","SUBJECT":"W. O. M","LECTURER":"SHARON"},
                {"DAY":"WED","TIME":"08:00AM TO 10:00AM","SUBJECT":"ELECTRICAL PRINCIPLES II","LECTURER":"GLADYS"},
                {"DAY":"WED","TIME":"10:30AM TO 12:30PM","SUBJECT":"ELECTRICAL PRINCIPLES II","LECTURER":"GLADYS"},
                {"DAY":"WED","TIME":"01:30PM TO 03:30PM","SUBJECT":"MATHEMATICS","LECTURER":"DORIS"},
                {"DAY":"THU","TIME":"08:00AM TO 10:00AM","SUBJECT":"COMM SKILLS","LECTURER":"JENNIFER"},
                {"DAY":"THU","TIME":"10:30AM TO 12:30PM","SUBJECT":"COMM SKILLS","LECTURER":"JENNIFER"},
                {"DAY":"THU","TIME":"01:30PM TO 03:30PM","SUBJECT":"MATHEMATICS","LECTURER":"DORIS"},
                {"DAY":"THU","TIME":"03:30PM TO 05:30PM","SUBJECT":"BUSINESS PLAN","LECTURER":"MUTENDE"},
                {"DAY":"FRI","TIME":"08:00AM TO 10:00AM","SUBJECT":"ELECTRICAL DESIGN ESTIMATING & TENDERING","LECTURER":"WANAGAI"},
                {"DAY":"FRI","TIME":"10:30AM TO 12:30PM","SUBJECT":"ELECTRICAL DESIGN ESTIMATING & TENDERING","LECTURER":"WANAGAI"},
                {"DAY":"FRI","TIME":"01:30PM TO 03:30PM","SUBJECT":"INDUSTRIAL MACHINES & CONTROLS","LECTURER":"DON"},
                {"DAY":"FRI","TIME":"03:30PM TO 05:30PM","SUBJECT":"PROJECT","LECTURER":"GITHOGORI"}
            ],
            embeddedStudents: [
                {"Admission_No":"12628/CEEMAY2024A","Student_Name":"OTIENO DAN BILLY","Class":"CEESEP2024A"},
                {"Admission_No":"12695/CEESEP2024A","Student_Name":"CHERONO MARY ANN","Class":"CEESEP2024A"},
                {"Admission_No":"12717/CEEMAY2024A","Student_Name":"MORARA FRANKLIN OBIRI","Class":"CEESEP2024A"},
                {"Admission_No":"13346/CEESEP2024A","Student_Name":"KIPNGENO BRIAN","Class":"CEESEP2024A"},
                {"Admission_No":"13348/CEESEP2024A","Student_Name":"MUNENE LENNOX KABURO","Class":"CEESEP2024A"},
                {"Admission_No":"13350/CEESEP2024A","Student_Name":"MARITIM HARON","Class":"CEESEP2024A"},
                {"Admission_No":"13352/CEESEP2024A","Student_Name":"MUTANDA MALVIN MBURU","Class":"CEESEP2024A"},
                {"Admission_No":"13353/CEESEP2024A","Student_Name":"AMUKONYI HARRIS BRENDAN","Class":"CEESEP2024A"},
                {"Admission_No":"13356/CEESEP2024A","Student_Name":"OCHIENG RONALD OTIENO","Class":"CEESEP2024A"},
                {"Admission_No":"13362/CEESEP2024A","Student_Name":"HILLARY ODHIAMBO","Class":"CEESEP2024A"},
                {"Admission_No":"13363/CEESEP2024A","Student_Name":"NTAWUASA KELVIN KELIAN","Class":"CEESEP2024A"},
                {"Admission_No":"13367/CEESEP2024A","Student_Name":"OTIENO MELVIN ISAAC","Class":"CEESEP2024A"},
                {"Admission_No":"13368/CEESEP2024A","Student_Name":"KINYANJUI PAUL NDERITU","Class":"CEESEP2024A"},
                {"Admission_No":"13369/CEESEP2024A","Student_Name":"KIRASA WELDON","Class":"CEESEP2024A"},
                {"Admission_No":"13370/CEESEP2024A","Student_Name":"BELINDA JEPCHIRCHIR","Class":"CEESEP2024A"},
                {"Admission_No":"13372/CEESEP2024A","Student_Name":"KTUM ISAAC ROTICH","Class":"CEESEP2024A"},
                {"Admission_No":"13375/CEESEP2024A","Student_Name":"BRIAN KIPLANGAT","Class":"CEESEP2024A"},
                {"Admission_No":"13377/CEESEP2024A","Student_Name":"KIBET PAUL KIGEN","Class":"CEESEP2024A"},
                {"Admission_No":"13379/CEESEP2024A","Student_Name":"WASWA MERARI SIMIYU","Class":"CEESEP2024A"},
                {"Admission_No":"13380/CEESEP2024A","Student_Name":"OKONGO VERONICAH OSEBE","Class":"CEESEP2024A"},
                {"Admission_No":"13383/CEESEP2024A","Student_Name":"THUO ALLAN HAHANYU","Class":"CEESEP2024A"},
                {"Admission_No":"13384/CEESEP2024A","Student_Name":"NYAGWANSA PERIS KWAMBOKA","Class":"CEESEP2024A"},
                {"Admission_No":"13390/CEESEP2024A","Student_Name":"MEREMO LEVIS OKEYO","Class":"CEESEP2024A"},
                {"Admission_No":"13396/CEESEP2024A","Student_Name":"KOSGEI DANCAN KIPNGENO","Class":"CEESEP2024A"},
                {"Admission_No":"13537/CEESEP2024A","Student_Name":"MWOLOLO KEVIN MUTUKU","Class":"CEESEP2024A"},
                {"Admission_No":"13550/CEESEP2024A","Student_Name":"KILONZO JETHRO MWISA","Class":"CEESEP2024A"},
                {"Admission_No":"13551/CEESEP2024A","Student_Name":"KOSGEI COLLINS KIPRONO","Class":"CEESEP2024A"},
                {"Admission_No":"12214/CEEMAY2023R","Student_Name":"WANGIA JOSHUA MATERE","Class":"CEESEP2024A"},
                {"Admission_No":"12596/CEEMAY2024A","Student_Name":"PETER KIAGE","Class":"CEESEP2024A"},
                {"Admission_No":"12658/CEEMAY2024A","Student_Name":"RIRO CLIFFORD NYANDUCHA","Class":"CEESEP2024A"},
                {"Admission_No":"13333/CEESEP2024A","Student_Name":"ACHOLA IBRAHIM OUMA","Class":"CEESEP2024A"},
                {"Admission_No":"13334/CEESEP2024A","Student_Name":"ONGAGA JARED","Class":"CEESEP2024A"},
                {"Admission_No":"13336/CEESEP2024A","Student_Name":"YEGON BRANAM KIMUTAI","Class":"CEESEP2024A"},
                {"Admission_No":"13339/CEESEP2024A","Student_Name":"OROCHE BRIAN MARITA","Class":"CEESEP2024A"},
                {"Admission_No":"13341/CEESEP2024A","Student_Name":"MUTISYA STEPHEN NDAMBUKI","Class":"CEESEP2024A"},
                {"Admission_No":"13357/CEESEP2024A","Student_Name":"MUNGAI ANGELA WAMBUI","Class":"CEESEP2024A"},
                {"Admission_No":"13359/CEESEP2024A","Student_Name":"SAMMY KELVIN MWENDWA","Class":"CEESEP2024A"},
                {"Admission_No":"13365/CEESEP2024A","Student_Name":"ODHIAMBO MERCY CANDY","Class":"CEESEP2024A"},
                {"Admission_No":"13366/CEESEP2024A","Student_Name":"KONDO ISAAC MOCHACHE","Class":"CEESEP2024A"},
                {"Admission_No":"13373/CEESEP2024A","Student_Name":"MARABURI LISTONE GEKONGE","Class":"CEESEP2024A"},
                {"Admission_No":"13374/CEESEP2024A","Student_Name":"KILUNDA JOYCE NDULULU","Class":"CEESEP2024A"},
                {"Admission_No":"13381/CEESEP2024A","Student_Name":"KARANJA JOHN MUIRURI","Class":"CEESEP2024A"},
                {"Admission_No":"13385/CEESEP2024A","Student_Name":"ODHIAMBO ARNOLD OCHIENG","Class":"CEESEP2024A"},
                {"Admission_No":"13388/CEESEP2024A","Student_Name":"BETTY RAHIM MUTUGI","Class":"CEESEP2024A"},
                {"Admission_No":"13393/CEESEP2024A","Student_Name":"MUYE PATRICK NGUJO","Class":"CEESEP2024A"},
                {"Admission_No":"13394/CEESEP2024A","Student_Name":"SADERA LESETU","Class":"CEESEP2024A"},
                {"Admission_No":"13395/CEESEP2024A","Student_Name":"ROTICH SAMUEL KEITANY","Class":"CEESEP2024A"},
                {"Admission_No":"13544/CEESEP2024A","Student_Name":"NYANGAU RAYVON MOCHA","Class":"CEESEP2024A"}
            ]
        },
        'CEESEP2024B': {
            displayName: 'CEESEP2024B (Craft Electrical)',
            teachers: ['MOKI', 'RUTH', 'OMBUI', 'WANGAI', 'KOBIA', 'PATRICK', 'SALOME', 'MUTENDE', 'SHARON', 'GITHOGORI'],
            teacherPins: {
                'MOKI': EncryptionSystem.hashPin('7026'),
                'RUTH': EncryptionSystem.hashPin('8250'),
                'OMBUI': EncryptionSystem.hashPin('9090'),
                'WANGAI': EncryptionSystem.hashPin('5423'),
                'KOBIA': EncryptionSystem.hashPin('5555'),
                'PATRICK': EncryptionSystem.hashPin('8790'),
                'SALOME': EncryptionSystem.hashPin('9362'),
                'MUTENDE': EncryptionSystem.hashPin('7148'),
                'SHARON': EncryptionSystem.hashPin('0472'),
                'GITHOGORI': EncryptionSystem.hashPin('1586')
            },
            defaultSessions: [
                {"DAY":"MON","TIME":"08:00AM TO 10:00AM","SUBJECT":"ELECTRICAL PRINCIPLES II","LECTURER":"MOKI"},
                {"DAY":"MON","TIME":"10:30AM TO 12:30PM","SUBJECT":"ELECTRICAL PRINCIPLES II","LECTURER":"MOKI"},
                {"DAY":"MON","TIME":"01:30PM TO 03:30PM","SUBJECT":"MATHEMATICS","LECTURER":"RUTH"},
                {"DAY":"MON","TIME":"03:30PM TO 05:30PM","SUBJECT":"MICRO ELECTRONICS","LECTURER":"OMBUI"},
                {"DAY":"TUE","TIME":"08:00AM TO 10:00AM","SUBJECT":"ELECTRICAL INSTALLATION TECHNOLOGY II","LECTURER":"WANGAI"},
                {"DAY":"TUE","TIME":"10:30AM TO 12:30PM","SUBJECT":"ELECTRICAL INSTALLATION TECHNOLOGY II","LECTURER":"WANGAI"},
                {"DAY":"TUE","TIME":"01:30PM TO 03:30PM","SUBJECT":"ELECTRICAL DESIGN ESTIMATING & TENDERING","LECTURER":"KOBIA"},
                {"DAY":"TUE","TIME":"03:30PM TO 05:30PM","SUBJECT":"ELECTRICAL DESIGN ESTIMATING & TENDERING","LECTURER":"KOBIA"},
                {"DAY":"WED","TIME":"08:00AM TO 10:00AM","SUBJECT":"ELECTRICAL MAINTENANCE & FAULT DIAGNOSIS","LECTURER":"PATRICK"},
                {"DAY":"WED","TIME":"10:30AM TO 12:30PM","SUBJECT":"ELECTRICAL MAINTENANCE & FAULT DIAGNOSIS","LECTURER":"PATRICK"},
                {"DAY":"WED","TIME":"01:30PM TO 03:30PM","SUBJECT":"INDUSTRIAL MACHINES & CONTROLS","LECTURER":"SALOME"},
                {"DAY":"THU","TIME":"08:00AM TO 10:00AM","SUBJECT":"MATHEMATICS","LECTURER":"RUTH"},
                {"DAY":"THU","TIME":"10:30AM TO 12:30PM","SUBJECT":"COMM SKILLS","LECTURER":"MUTENDE"},
                {"DAY":"THU","TIME":"01:30PM TO 03:30PM","SUBJECT":"COMM SKILLS","LECTURER":"MUTENDE"},
                {"DAY":"THU","TIME":"03:30PM TO 05:30PM","SUBJECT":"ELECTRICAL INSTALLATION TECHNOLOGY II","LECTURER":"WANGAI"},
                {"DAY":"FRI","TIME":"08:00AM TO 10:00AM","SUBJECT":"BUSINESS PLAN","LECTURER":"SHARON"},
                {"DAY":"FRI","TIME":"10:30AM TO 12:30PM","SUBJECT":"INDUSTRIAL MACHINES & CONTROLS","LECTURER":"SALOME"},
                {"DAY":"FRI","TIME":"01:30PM TO 03:30PM","SUBJECT":"PROJECT","LECTURER":"GITHOGORI"},
                {"DAY":"FRI","TIME":"03:30PM TO 05:30PM","SUBJECT":"W. O. M","LECTURER":"SHARON"}
            ],
            embeddedStudents: [
                {"Admission_No":"12633/CEEMAY2024B","Student_Name":"ONGIRI IVONNE MORAA","Class":"CEESEP2024B"},
                {"Admission_No":"13398/CEESEP2024B","Student_Name":"BOIT TOBIAS RERIMOI","Class":"CEESEP2024B"},
                {"Admission_No":"13400/CEESEP2024B","Student_Name":"NDANA JIMMY KILONZO","Class":"CEESEP2024B"},
                {"Admission_No":"13403/CEESEP2024B","Student_Name":"OUMA STEPHEN ODHIAMBO","Class":"CEESEP2024B"},
                {"Admission_No":"13404/CEESEP2024B","Student_Name":"IRUNGU JAMES MBURU","Class":"CEESEP2024B"},
                {"Admission_No":"13405/CEESEP2024B","Student_Name":"OURU NAOM KWAMBOKA","Class":"CEESEP2024B"},
                {"Admission_No":"13406/CEESEP2024B","Student_Name":"LIMO GESTON KIPTOO","Class":"CEESEP2024B"},
                {"Admission_No":"13407/CEESEP2024B","Student_Name":"CHACHA REDEMTAR ROBI","Class":"CEESEP2024B"},
                {"Admission_No":"13410/CEESEP2024B","Student_Name":"RONOH BRIAN CHERUIYOT","Class":"CEESEP2024B"},
                {"Admission_No":"13412/CEESEP2024B","Student_Name":"NGENO LUKE KIBOR","Class":"CEESEP2024B"},
                {"Admission_No":"13415/CEESEP2024B","Student_Name":"CLINTON KIPCHIRCHIR","Class":"CEESEP2024B"},
                {"Admission_No":"13423/CEESEP2024B","Student_Name":"ODUOL DICKENS OCHIENG","Class":"CEESEP2024B"},
                {"Admission_No":"13500/CEESEP2024B","Student_Name":"KARIUKI MARVIN","Class":"CEESEP2024B"},
                {"Admission_No":"13502/CEESEP2024B","Student_Name":"MUTUNGA BREDAN MUTUA","Class":"CEESEP2024B"},
                {"Admission_No":"13511/CEESEP2024B","Student_Name":"KIPTOO MARK KIPKORIR","Class":"CEESEP2024B"},
                {"Admission_No":"13514/CEESEP2024B","Student_Name":"KORIR DICKENS KIPKOECH","Class":"CEESEP2024B"},
                {"Admission_No":"13515/CEESEP2024B","Student_Name":"SILVANCE OMONDI","Class":"CEESEP2024B"},
                {"Admission_No":"13517/CEESEP2024B","Student_Name":"KIOKO ANNASHARON MWELU","Class":"CEESEP2024B"},
                {"Admission_No":"13519/CEESEP2024B","Student_Name":"MBOGO ERIC KINYUA","Class":"CEESEP2024B"},
                {"Admission_No":"13529/CEESEP2024B","Student_Name":"NDIANGUI JOSEPH MURITHI","Class":"CEESEP2024B"},
                {"Admission_No":"13531/CEESEP2024B","Student_Name":"GACHOKI NEWTON MURIMI","Class":"CEESEP2024B"},
                {"Admission_No":"13532/CEESEP2024B","Student_Name":"KYALO JANICE MUMO","Class":"CEESEP2024B"},
                {"Admission_No":"13534/CEESEP2024B","Student_Name":"KIPNGETICH BRIAN","Class":"CEESEP2024B"},
                {"Admission_No":"13541/CEESEP2024B","Student_Name":"OCHIENG EMILY WANJIKU","Class":"CEESEP2024B"},
                {"Admission_No":"13543/CEESEP2024B","Student_Name":"ODOYO JOSPHINE ADHIAMBO","Class":"CEESEP2024B"},
                {"Admission_No":"13547/CEESEP2024B","Student_Name":"MIRINGU EZEKIEL WAINAINA","Class":"CEESEP2024B"},
                {"Admission_No":"13583/CEESEP2024B","Student_Name":"KIRUI HARMAN KIPKOECH","Class":"CEESEP2024B"},
                {"Admission_No":"13503/CEESEP2024B","Student_Name":"MONYANCHA EVANSON ONSONGO","Class":"CEESEP2024B"},
                {"Admission_No":"13508/CEESEP2024B","Student_Name":"MWENDWA BERYL MUTHEU","Class":"CEESEP2024B"},
                {"Admission_No":"12649/CEEMAY2024B","Student_Name":"NGANGA PATRICK KIMANI","Class":"CEESEP2024B"},
                {"Admission_No":"12664/CEEMAY2024B","Student_Name":"KIPRONO IAN ERICSON","Class":"CEESEP2024B"},
                {"Admission_No":"12684/CEEMAY2024B","Student_Name":"ODHIAMBO DANIEL OKOTH","Class":"CEESEP2024B"},
                {"Admission_No":"12712/CEEMAY2024B","Student_Name":"MWAI JEREMY KOOME","Class":"CEESEP2024B"},
                {"Admission_No":"13335/CEESEP2024B","Student_Name":"MUTUGI VICTOR MUKANGURA","Class":"CEESEP2024B"},
                {"Admission_No":"13391/CEESEP2024B","Student_Name":"OKOKO STEPHEN ONYANGO","Class":"CEESEP2024B"},
                {"Admission_No":"13397/CEESEP2024B","Student_Name":"KIPKIRUI KOECH MOSES","Class":"CEESEP2024B"},
                {"Admission_No":"13408/CEESEP2024B","Student_Name":"OMARE KEVIN OMENTA","Class":"CEESEP2024B"},
                {"Admission_No":"13411/CEESEP2024B","Student_Name":"OMONDI SPENCER ODHIAMBO","Class":"CEESEP2024B"},
                {"Admission_No":"13414/CEESEP2024B","Student_Name":"KIPCHUMBA IAN","Class":"CEESEP2024B"},
                {"Admission_No":"13441/CEESEP2024B","Student_Name":"JEVAN GODFREY ODHIAMBO","Class":"CEESEP2024B"},
                {"Admission_No":"13501/CEESEP2024B","Student_Name":"ODHIAMBO IAN LUSI","Class":"CEESEP2024B"},
                {"Admission_No":"13504/CEESEP2024B","Student_Name":"NEKESA MARTHA WANJALA","Class":"CEESEP2024B"},
                {"Admission_No":"13507/CEESEP2024B","Student_Name":"ROTICH CALEB KIPRONO","Class":"CEESEP2024B"},
                {"Admission_No":"13530/CEESEP2024B","Student_Name":"BRIAN CHERUIYOT","Class":"CEESEP2024B"},
                {"Admission_No":"13535/CEESEP2024B","Student_Name":"GIKUNDA MARTIN MWENDA","Class":"CEESEP2024B"},
                {"Admission_No":"13538/CEESEP2024B","Student_Name":"MUTHONI IAN CEASER FUNDI","Class":"CEESEP2024B"}
            ]
        },
        'CDAC/L5/EE/SEP2025': {
            displayName: 'CDAC/L5/EE/SEP2025 (Craft Electrical - Level 5)',
            teachers: ['SALOME', 'MUGAMBI', 'DAVID', 'NAOMI'],
            teacherPins: {
                'SALOME': EncryptionSystem.hashPin('9362'),
                'MUGAMBI': EncryptionSystem.hashPin('4738'),
                'DAVID': EncryptionSystem.hashPin('2020'),
                'NAOMI': EncryptionSystem.hashPin('3696')
            },
            defaultSessions: [
                {"DAY":"MON","TIME":"FULL DAY","SUBJECT":"MACHINE REWINDING","LECTURER":"SALOME"},
                {"DAY":"TUE","TIME":"FULL DAY","SUBJECT":"BELLS AND ALARMS","LECTURER":"MUGAMBI/DAVID"},
                {"DAY":"FRI","TIME":"FULL DAY","SUBJECT":"SOLAR","LECTURER":"NAOMI"}
            ],
            embeddedStudents: [
                {"Admission_No":"13675/L5/EE/SEP2025","Student_Name":"Kevin Opore Andama","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13676/L5/EE/SEP2025","Student_Name":"Godwin Kiprotich","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13677/L5/EE/SEP2025","Student_Name":"Francis Ruhohi Muthoni","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13678/L5/EE/SEP2025","Student_Name":"Simon Kimanthi Mwendwa","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13679/L5/EE/SEP2025","Student_Name":"Stella Asheri Omunyifwa","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13681/L5/EE/SEP2025","Student_Name":"Joseph Ndambuki Kimilu","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13682/L5/EE/SEP2025","Student_Name":"Florence Mutile Ndila","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13685/L5/EE/SEP2025","Student_Name":"Alaky Webale","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13686/L5/EE/SEP2025","Student_Name":"Enock Muchiri Ireri","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13687/L5/EE/SEP2025","Student_Name":"Eunice Murugi Kinuthia","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13688/L5/EE/SEP2025","Student_Name":"Emmanuel Kipruto Kibiwott","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13690/L5/EE/SEP2025","Student_Name":"Adano Abduba Ali","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13691/L5/EE/SEP2025","Student_Name":"Carlos Kipkemoi","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13692/L5/EE/SEP2025","Student_Name":"Hosea Masani Muinde","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13694/L5/EE/SEP2025","Student_Name":"Emmanuel Kipkorir","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13695/L5/EE/SEP2025","Student_Name":"Brian Kipchirchir","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13697/L5/EE/SEP2025","Student_Name":"Wimms Onsase Ogeto","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13699/L5/EE/SEP2025","Student_Name":"Daniel Gichini Mathenge","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13700/L5/EE/SEP2025","Student_Name":"Lilian Loko Kyalo","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13701/L5/EE/SEP2025","Student_Name":"Ezra Kibet Korir","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13702/L5/EE/SEP2025","Student_Name":"Denis Otieno Okong'o","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13704/L5/EE/SEP2025","Student_Name":"Victor Mutua Muteti","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13756/L5/EE/SEP2025","Student_Name":"Lewis Mwenda","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13758/L5/EE/SEP2025","Student_Name":"Safi Hussein Diba","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13765/L5/EE/SEP2025","Student_Name":"Ezra Kipngeno","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13767/L5/EE/SEP2025","Student_Name":"Mercy Koka Munyoki","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13768/L5/EE/SEP2025","Student_Name":"Norman Kipkorir Bett","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13777/L5/EE/SEP2025","Student_Name":"Austine Okoth Odongo","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13693/L5/EE/SEP2025","Student_Name":"Nuru Ongori Keragori","Class":"CDAC/L5/EE/SEP2025"},
                {"Admission_No":"13772/L5/EE/SEP2025","Student_Name":"Stephen Mule Ngunga","Class":"CDAC/L5/EE/SEP2025"}
            ]
        },
        
        // ===== DIPLOMA CLASSES (DEEMAY2023RA, DEEMAY2023RB, and DEESEP2024E REMOVED) =====
        'DEEMAY2024A': {
            displayName: 'DEEMAY2024A (Diploma Electrical)',
            teachers: ['GLADYS', 'OMONDI', 'ROSE', 'GITHOGORI', 'OUNGO', 'MUTUKU', 'MUTENDE', 'DORIS', 'CYPRIAN', 'NGANA', 'MBURU'],
            teacherPins: {
                'GLADYS': EncryptionSystem.hashPin('6936'),
                'OMONDI': EncryptionSystem.hashPin('5810'),
                'ROSE': EncryptionSystem.hashPin('9374'),
                'GITHOGORI': EncryptionSystem.hashPin('1586'),
                'OUNGO': EncryptionSystem.hashPin('2584'),
                'MUTUKU': EncryptionSystem.hashPin('3700'),
                'MUTENDE': EncryptionSystem.hashPin('7148'),
                'DORIS': EncryptionSystem.hashPin('5824'),
                'CYPRIAN': EncryptionSystem.hashPin('1480'),
                'NGANA': EncryptionSystem.hashPin('4708'),
                'MBURU': EncryptionSystem.hashPin('3820')
            },
            defaultSessions: [
                {"DAY":"MON","TIME":"08:00AM TO 10:00AM","SUBJECT":"ANALOGUE ELECTRONICS II","LECTURER":"GLADYS"},
                {"DAY":"MON","TIME":"10:30AM TO 12:30PM","SUBJECT":"INDUSTRIAL PLCS","LECTURER":"OMONDI"},
                {"DAY":"MON","TIME":"1:30PM TO 3:30PM","SUBJECT":"ANALOGUE ELECTRONICS II","LECTURER":"GLADYS"},
                {"DAY":"MON","TIME":"3:30PM TO 5:30PM","SUBJECT":"BUSINESS PLAN","LECTURER":"MUTENDE"},
                {"DAY":"TUE","TIME":"08:00AM TO 10:00AM","SUBJECT":"DIGITAL ELECTRONICS","LECTURER":"ROSE"},
                {"DAY":"TUE","TIME":"10:30AM TO 12:30PM","SUBJECT":"ELECTRICAL PROTECTION & BUILDING SERVICES","LECTURER":"GITHOGORI"},
                {"DAY":"TUE","TIME":"1:30PM TO 3:30PM","SUBJECT":"ELECTRICAL PROTECTION & BUILDING SERVICES","LECTURER":"GITHOGORI"},
                {"DAY":"TUE","TIME":"3:30PM TO 5:30PM","SUBJECT":"ELECTRICAL CIRCUIT ANALYSIS","LECTURER":"OUNGO"},
                {"DAY":"WED","TIME":"08:00AM TO 10:00AM","SUBJECT":"ELECTRICAL POWER GENERATION & TRANSMISSION","LECTURER":"MUTUKU"},
                {"DAY":"WED","TIME":"10:30AM TO 12:30PM","SUBJECT":"ELECTRICAL POWER GENERATION & TRANSMISSION","LECTURER":"MUTUKU"},
                {"DAY":"WED","TIME":"1:30PM TO 3:30PM","SUBJECT":"PRACTICALS","LECTURER":""},
                {"DAY":"THU","TIME":"08:00AM TO 10:00AM","SUBJECT":"MATHEMATICS","LECTURER":"DORIS"},
                {"DAY":"THU","TIME":"10:30AM TO 12:30PM","SUBJECT":"MATHEMATICS","LECTURER":"DORIS"},
                {"DAY":"THU","TIME":"1:30PM TO 3:30PM","SUBJECT":"ELECTRICAL CIRCUIT ANALYSIS","LECTURER":"OUNGO"},
                {"DAY":"THU","TIME":"3:30PM TO 5:30PM","SUBJECT":"ELECTRICAL CIRCUIT ANALYSIS","LECTURER":"OUNGO"},
                {"DAY":"FRI","TIME":"08:00AM TO 10:00AM","SUBJECT":"DIGITAL ELECTRONICS","LECTURER":"ROSE"},
                {"DAY":"FRI","TIME":"10:30AM TO 12:30PM","SUBJECT":"CONTROL SYSTEMS","LECTURER":"CYPRIAN"},
                {"DAY":"FRI","TIME":"1:30PM TO 3:30PM","SUBJECT":"CONTROL SYSTEMS","LECTURER":"CYPRIAN"},
                {"DAY":"FRI","TIME":"3:30PM TO 5:30PM","SUBJECT":"ENGINEERING DRAWING","LECTURER":"NGANA"}
            ],
            embeddedStudents: [
                {"Admission_No":"12754/DEEMAY2024A","Student_Name":"KOLUA MICHEAL TONKEI","Class":"DEEMAY2024A"},
                {"Admission_No":"12760/DEEMAY2024A","Student_Name":"ODHIAMBO MOURICE OTIENO","Class":"DEEMAY2024A"},
                {"Admission_No":"12761/DEEMAY2024A","Student_Name":"KERONGO BEVIN MORAA","Class":"DEEMAY2024A"},
                {"Admission_No":"12762/DEEMAY2024A","Student_Name":"KYALO SAMUEL MUNYALO","Class":"DEEMAY2024A"},
                {"Admission_No":"12763/DEEMAY2024A","Student_Name":"MBURU JOHNSON MUCHOKI","Class":"DEEMAY2024A"},
                {"Admission_No":"12768/DEEMAY2024A","Student_Name":"MUTHONI EVALYNE KENDI","Class":"DEEMAY2024A"},
                {"Admission_No":"12769/DEEMAY2024A","Student_Name":"CHERUIYOT EMMANUEL KIPLANGAT","Class":"DEEMAY2024A"},
                {"Admission_No":"12772/DEEMAY2024A","Student_Name":"KOGI GEOFFREY MWANGI","Class":"DEEMAY2024A"},
                {"Admission_No":"12773/DEEMAY2024A","Student_Name":"MUKUMBA MORGAN CHACHA","Class":"DEEMAY2024A"},
                {"Admission_No":"12774/DEEMAY2024A","Student_Name":"SAISI CONSTANTINE CHARLES","Class":"DEEMAY2024A"},
                {"Admission_No":"12776/DEEMAY2024A","Student_Name":"OSERO CLIFFORD NYAIRATI","Class":"DEEMAY2024A"},
                {"Admission_No":"12777/DEEMAY2024A","Student_Name":"OCHE ROMANOS KIOKO","Class":"DEEMAY2024A"},
                {"Admission_No":"12779/DEEMAY2024A","Student_Name":"OTIENO JUNIOR OMONDI","Class":"DEEMAY2024A"},
                {"Admission_No":"12781/DEEMAY2024A","Student_Name":"QAMPA GALGALLO GURACHA","Class":"DEEMAY2024A"},
                {"Admission_No":"12787/DEEMAY2024A","Student_Name":"GACHII JOHN MBAGA","Class":"DEEMAY2024A"},
                {"Admission_No":"12793/DEEMAY2024A","Student_Name":"KIPLANGAT KELVIN","Class":"DEEMAY2024A"},
                {"Admission_No":"12798/DEEMAY2024A","Student_Name":"MUNYOKI MACDONALD MUSYOKA","Class":"DEEMAY2024A"},
                {"Admission_No":"12799/DEEMAY2024A","Student_Name":"VETU PETER MUTUKU","Class":"DEEMAY2024A"},
                {"Admission_No":"12801/DEEMAY2024A","Student_Name":"NZEKI BRIAN MUTUKU","Class":"DEEMAY2024A"},
                {"Admission_No":"12802/DEEMAY2024A","Student_Name":"BARASA SAMANTHA ATIENO","Class":"DEEMAY2024A"},
                {"Admission_No":"12885/DEEMAY2024A","Student_Name":"BUNDI BRIAN","Class":"DEEMAY2024A"},
                {"Admission_No":"12895/DEEMAY2024A","Student_Name":"EDMOND MWANGI","Class":"DEEMAY2024A"},
                {"Admission_No":"12896/DEEMAY2024A","Student_Name":"MUMIRIA CORNELIUS MUTURI","Class":"DEEMAY2024A"},
                {"Admission_No":"12897/DEEMAY2024A","Student_Name":"MILDRED AUMA","Class":"DEEMAY2024A"},
                {"Admission_No":"12902/DEEMAY2024A","Student_Name":"MAUREEN CHELANGAT","Class":"DEEMAY2024A"},
                {"Admission_No":"12903/DEEMAY2024A","Student_Name":"OLUOCH DERICK BUODO","Class":"DEEMAY2024A"},
                {"Admission_No":"13632/DEEMAY2024A","Student_Name":"KIIRAKI FRANCIS MUNGAI","Class":"DEEMAY2024A"},
                {"Admission_No":"13634/DEEMAY2024A","Student_Name":"KIPTOO MARION JEPKURUI","Class":"DEEMAY2024A"},
                {"Admission_No":"13635/DEEMAY2024A","Student_Name":"CHELANGA MIGAL JELIMO","Class":"DEEMAY2024A"},
                {"Admission_No":"13654/DEEMAY2024A","Student_Name":"AMBALWA JOY AMANI","Class":"DEEMAY2024A"},
                {"Admission_No":"13659/DEEMAY2024A","Student_Name":"NGURE MYLES","Class":"DEEMAY2024A"},
                {"Admission_No":"13663/DEEMAY2024A","Student_Name":"KINYANJUI ELIJAH NDATHO","Class":"DEEMAY2024A"},
                {"Admission_No":"13745/DEEMAY2024A","Student_Name":"MWANGI ROSE NJERI","Class":"DEEMAY2024A"},
                {"Admission_No":"13751/DEEMAY2024A","Student_Name":"NJOROGE PAUL NDEGWA","Class":"DEEMAY2024A"},
                {"Admission_No":"12291/DEEMAY2024A","Student_Name":"MAINA MICHAEL MUGO","Class":"DEEMAY2024A"},
                {"Admission_No":"12752/DEEMAY2024A","Student_Name":"KIPKEMBOI STANLEY KIRWA","Class":"DEEMAY2024A"},
                {"Admission_No":"12755/DEEMAY2024A","Student_Name":"KYALO BENSON MUTEMBEI","Class":"DEEMAY2024A"},
                {"Admission_No":"12757/DEEMAY2024A","Student_Name":"MURIGI LAWRENCE KARANJA","Class":"DEEMAY2024A"},
                {"Admission_No":"12767/DEEMAY2024A","Student_Name":"LESALAJA NAHSHON LENKAKENYA","Class":"DEEMAY2024A"},
                {"Admission_No":"12770/DEEMAY2024A","Student_Name":"WESONGA WICYLIFFEE ODONGO","Class":"DEEMAY2024A"},
                {"Admission_No":"12771/DEEMAY2024A","Student_Name":"ZADDOCK KIBET","Class":"DEEMAY2024A"},
                {"Admission_No":"12783/DEEMAY2024A","Student_Name":"MOGERE MOSES ONYANCHA","Class":"DEEMAY2024A"},
                {"Admission_No":"12784/DEEMAY2024A","Student_Name":"MUEMA BENEDICT MUTINDA","Class":"DEEMAY2024A"},
                {"Admission_No":"12792/DEEMAY2024A","Student_Name":"BIKETI SEITH BARAKA","Class":"DEEMAY2024A"},
                {"Admission_No":"12797/DEEMAY2024A","Student_Name":"NANJIRA ARTHUR ABNER","Class":"DEEMAY2024A"},
                {"Admission_No":"12804/DEEMAY2024A","Student_Name":"NGENGA NEWTON","Class":"DEEMAY2024A"},
                {"Admission_No":"12805/DEEMAY2024A","Student_Name":"RUGUMI FELIX NDIRANGU","Class":"DEEMAY2024A"},
                {"Admission_No":"12864/DEEMAY2024A","Student_Name":"MOGERE SAMEL ATEMBA","Class":"DEEMAY2024A"},
                {"Admission_No":"12866/DEEMAY2024A","Student_Name":"ALUGA DANIEL OYUDA","Class":"DEEMAY2024A"},
                {"Admission_No":"12872/DEEMAY2024A","Student_Name":"ODIWOUR PHILIP ODHIAMBO","Class":"DEEMAY2024A"},
                {"Admission_No":"12881/DEEMAY2024A","Student_Name":"MBINDA KELVIN MUOMO","Class":"DEEMAY2024A"},
                {"Admission_No":"12882/DEEMAY2024A","Student_Name":"KIRAGU WINNIE WANGUI","Class":"DEEMAY2024A"},
                {"Admission_No":"12149/DEEMAY2023R","Student_Name":"KANGATA JOHN NJOROGE","Class":"DEEMAY2024A"},
                {"Admission_No":"12751/DEEMAY2024A","Student_Name":"KEMMON HENRY GERALD","Class":"DEEMAY2024A"}
            ]
        },
        'DEEMAY2024B': {
            displayName: 'DEEMAY2024B (Diploma Electrical)',
            teachers: ['OMONDI', 'CYPRIAN', 'DORIS', 'MBURU', 'ROSE', 'DON', 'DOROTHY', 'NGANA', 'WAFULA', 'GITHOGORI'],
            teacherPins: {
                'OMONDI': EncryptionSystem.hashPin('5810'),
                'CYPRIAN': EncryptionSystem.hashPin('1480'),
                'DORIS': EncryptionSystem.hashPin('5824'),
                'MBURU': EncryptionSystem.hashPin('3820'),
                'ROSE': EncryptionSystem.hashPin('9374'),
                'DON': EncryptionSystem.hashPin('4712'),
                'DOROTHY': EncryptionSystem.hashPin('5922'),
                'NGANA': EncryptionSystem.hashPin('4708'),
                'WAFULA': EncryptionSystem.hashPin('9360'),
                'GITHOGORI': EncryptionSystem.hashPin('1586')
            },
            defaultSessions: [
                {"DAY":"MON","TIME":"08:00AM TO 10:00AM","SUBJECT":"INDUSTRIAL PLCS","LECTURER":"OMONDI"},
                {"DAY":"MON","TIME":"10:30AM TO 12:30PM","SUBJECT":"PRACTICALS","LECTURER":""},
                {"DAY":"MON","TIME":"01:30PM TO 03:30PM","SUBJECT":"CONTROL SYSTEMS","LECTURER":"CYPRIAN"},
                {"DAY":"MON","TIME":"03:30PM TO 05:30PM","SUBJECT":"MATHEMATICS","LECTURER":"DORIS"},
                {"DAY":"TUE","TIME":"08:00AM TO 10:00AM","SUBJECT":"ANALOGUE ELECTRONICS II","LECTURER":"MBURU"},
                {"DAY":"TUE","TIME":"10:30AM TO 12:30PM","SUBJECT":"DIGITAL ELECTRONICS","LECTURER":"ROSE"},
                {"DAY":"TUE","TIME":"01:30PM TO 03:30PM","SUBJECT":"DIGITAL ELECTRONICS","LECTURER":"ROSE"},
                {"DAY":"TUE","TIME":"03:30PM TO 05:30PM","SUBJECT":"ELECTRICAL POWER GENERATION & TRANSMISSION","LECTURER":"DON"},
                {"DAY":"WED","TIME":"08:00AM TO 10:00AM","SUBJECT":"BUSINESS PLAN","LECTURER":"DOROTHY"},
                {"DAY":"WED","TIME":"10:30AM TO 12:30PM","SUBJECT":"ENGINEERING DRAWING","LECTURER":"NGANA"},
                {"DAY":"WED","TIME":"01:30PM TO 03:30PM","SUBJECT":"ELECTRICAL CIRCUIT ANALYSIS","LECTURER":"WAFULA"},
                {"DAY":"THU","TIME":"08:00AM TO 10:00AM","SUBJECT":"ELECTRICAL POWER GENERATION & TRANSMISSION","LECTURER":"DON"},
                {"DAY":"THU","TIME":"10:30AM TO 12:30PM","SUBJECT":"ELECTRICAL PROTECTION & BUILDING SERVICES","LECTURER":"GITHOGORI"},
                {"DAY":"THU","TIME":"01:30PM TO 03:30PM","SUBJECT":"ELECTRICAL PROTECTION & BUILDING SERVICES","LECTURER":"GITHOGORI"},
                {"DAY":"THU","TIME":"03:30PM TO 05:30PM","SUBJECT":"MATHEMATICS","LECTURER":"DORIS"},
                {"DAY":"FRI","TIME":"08:00AM TO 10:00AM","SUBJECT":"CONTROL SYSTEMS","LECTURER":"CYPRIAN"},
                {"DAY":"FRI","TIME":"10:30AM TO 12:30PM","SUBJECT":"ANALOGUE ELECTRONICS II","LECTURER":"MBURU"},
                {"DAY":"FRI","TIME":"01:30PM TO 03:30PM","SUBJECT":"ELECTRICAL CIRCUIT ANALYSIS","LECTURER":"WAFULA"},
                {"DAY":"FRI","TIME":"03:30PM TO 05:30PM","SUBJECT":"ELECTRICAL CIRCUIT ANALYSIS","LECTURER":"WAFULA"}
            ],
            embeddedStudents: [
                {"Admission_No":"12806/DEEMAY2024B","Student_Name":"MUTUA MAXWELL MUTISYA","Class":"DEEMAY2024B"},
                {"Admission_No":"12807/DEEMAY2024B","Student_Name":"DAVID MWANGI","Class":"DEEMAY2024B"},
                {"Admission_No":"12811/DEEMAY2024B","Student_Name":"MASINGOT SOLOMON KIPETUAN","Class":"DEEMAY2024B"},
                {"Admission_No":"12813/DEEMAY2024B","Student_Name":"HUSSEIN SABIR ABDINUR","Class":"DEEMAY2024B"},
                {"Admission_No":"12818/DEEMAY2024B","Student_Name":"MUIGIRIRI PETER WACHIRA","Class":"DEEMAY2024B"},
                {"Admission_No":"12819/DEEMAY2024B","Student_Name":"MOGOA JERUSAH BISIERI","Class":"DEEMAY2024B"},
                {"Admission_No":"12826/DEEMAY2024B","Student_Name":"THAMBURA KEFA MURIIRA","Class":"DEEMAY2024B"},
                {"Admission_No":"12827/DEEMAY2024B","Student_Name":"KAMATHE JOSEPH","Class":"DEEMAY2024B"},
                {"Admission_No":"12828/DEEMAY2024B","Student_Name":"WAIHWA RAYMOND NGECHU","Class":"DEEMAY2024B"},
                {"Admission_No":"12829/DEEMAY2024B","Student_Name":"KILONZO WINFRED MWENDE","Class":"DEEMAY2024B"},
                {"Admission_No":"12834/DEEMAY2024B","Student_Name":"MURAYA ALLAN GITHUGA","Class":"DEEMAY2024B"},
                {"Admission_No":"12835/DEEMAY2024B","Student_Name":"SHADRAC KIPCHIRCHIR","Class":"DEEMAY2024B"},
                {"Admission_No":"12836/DEEMAY2024B","Student_Name":"KIMARU WINNIE WANGARI","Class":"DEEMAY2024B"},
                {"Admission_No":"12837/DEEMAY2024B","Student_Name":"MASESE DAVID MAINA","Class":"DEEMAY2024B"},
                {"Admission_No":"12838/DEEMAY2024B","Student_Name":"KIMATHI DUNCAN BUNDI","Class":"DEEMAY2024B"},
                {"Admission_No":"12839/DEEMAY2024B","Student_Name":"GITONGA COLLINS","Class":"DEEMAY2024B"},
                {"Admission_No":"12843/DEEMAY2024B","Student_Name":"OMBIMA STEPHEN OKANGA","Class":"DEEMAY2024B"},
                {"Admission_No":"12845/DEEMAY2024B","Student_Name":"MWANGI ANOLD MUNENE","Class":"DEEMAY2024B"},
                {"Admission_No":"12848/DEEMAY2024B","Student_Name":"KYALO LOISE MWENDE","Class":"DEEMAY2024B"},
                {"Admission_No":"12850/DEEMAY2024B","Student_Name":"NYONGESA CYPRIAN WAFULA","Class":"DEEMAY2024B"},
                {"Admission_No":"12851/DEEMAY2024B","Student_Name":"KIPKORE CORNELIUS KIPRUTO","Class":"DEEMAY2024B"},
                {"Admission_No":"12862/DEEMAY2024B","Student_Name":"EMMIE DOREEN KERAGE","Class":"DEEMAY2024B"},
                {"Admission_No":"12863/DEEMAY2024B","Student_Name":"NJAGI CHRIS MUNENE","Class":"DEEMAY2024B"},
                {"Admission_No":"12870/DEEMAY2024B","Student_Name":"OMONDI CLIFF WILLS","Class":"DEEMAY2024B"},
                {"Admission_No":"12989/DEEMAY2024B","Student_Name":"MCHANA CHARLTON","Class":"DEEMAY2024B"},
                {"Admission_No":"12809/DEEMAY2024B","Student_Name":"MAMBO OMAR ABDULMALIK","Class":"DEEMAY2024B"},
                {"Admission_No":"12815/DEEMAY2024B","Student_Name":"NYINKE JACOB MASAILEL","Class":"DEEMAY2024B"},
                {"Admission_No":"12816/DEEMAY2024B","Student_Name":"SANKALE SOLOMON KANTI","Class":"DEEMAY2024B"},
                {"Admission_No":"12823/DEEMAY2024B","Student_Name":"GATOBI IAN KOOME","Class":"DEEMAY2024B"},
                {"Admission_No":"12840/DEEMAY2024B","Student_Name":"GITHINJI ZACHARY MWANIKI","Class":"DEEMAY2024B"},
                {"Admission_No":"12841/DEEMAY2024B","Student_Name":"NJUNGU JOSEPH MAINA","Class":"DEEMAY2024B"},
                {"Admission_No":"12842/DEEMAY2024B","Student_Name":"MWANGI NEHEMIAH NGOORO","Class":"DEEMAY2024B"},
                {"Admission_No":"12854/DEEMAY2024B","Student_Name":"NTHEI MORIS KILEE","Class":"DEEMAY2024B"},
                {"Admission_No":"12861/DEEMAY2024B","Student_Name":"MBUYA ISSAK AHMED","Class":"DEEMAY2024B"},
                {"Admission_No":"12867/DEEMAY2024B","Student_Name":"KORIR BRYTON KIMUTAI","Class":"DEEMAY2024B"}
            ]
        },
        'DEEMAY2025R': {
            displayName: 'DEEMAY2025R (Diploma Electrical)',
            teachers: ['KIRIGWI', 'ONAYA', 'OUNGO', 'DON', 'SHARON', 'OPIYO', 'NAOMI', 'DOROTHY', 'NGANA', 'MUTENDE', 'OMONDI', 'JENNIFER'],
            teacherPins: {
                'KIRIGWI': EncryptionSystem.hashPin('6034'),
                'ONAYA': EncryptionSystem.hashPin('1472'),
                'OUNGO': EncryptionSystem.hashPin('2584'),
                'DON': EncryptionSystem.hashPin('4712'),
                'SHARON': EncryptionSystem.hashPin('0472'),
                'OPIYO': EncryptionSystem.hashPin('0474'),
                'NAOMI': EncryptionSystem.hashPin('3696'),
                'DOROTHY': EncryptionSystem.hashPin('5922'),
                'NGANA': EncryptionSystem.hashPin('4708'),
                'MUTENDE': EncryptionSystem.hashPin('7148'),
                'OMONDI': EncryptionSystem.hashPin('5810'),
                'JENNIFER': EncryptionSystem.hashPin('6922')
            },
            defaultSessions: [
                {"DAY":"MON","TIME":"08:00AM TO 10:00AM","SUBJECT":"ENGINEERING DRAWING","LECTURER":"KIRIGWI"},
                {"DAY":"MON","TIME":"10:30AM TO 12:30PM","SUBJECT":"MATHEMATICS","LECTURER":"ONAYA"},
                {"DAY":"MON","TIME":"1:30PM TO 3:30PM","SUBJECT":"ELECTRICAL PRINCIPLES","LECTURER":"OUNGO"},
                {"DAY":"MON","TIME":"3:30PM TO 5:30PM","SUBJECT":"ELECTRICAL PRINCIPLES","LECTURER":"OUNGO"},
                {"DAY":"TUE","TIME":"08:00AM TO 10:00AM","SUBJECT":"ELECTRICAL MEASUREMENTS","LECTURER":"DON"},
                {"DAY":"TUE","TIME":"10:30AM TO 12:30PM","SUBJECT":"MECHANICAL SCIENCE","LECTURER":"SHARON"},
                {"DAY":"TUE","TIME":"1:30PM TO 3:30PM","SUBJECT":"ELECTRICAL INSTALLATION","LECTURER":"OPIYO"},
                {"DAY":"TUE","TIME":"3:30PM TO 5:30PM","SUBJECT":"ELECTRICAL INSTALLATION","LECTURER":"OPIYO"},
                {"DAY":"WED","TIME":"08:00AM TO 10:00AM","SUBJECT":"SOLAR","LECTURER":"NAOMI"},
                {"DAY":"WED","TIME":"10:30AM TO 12:30PM","SUBJECT":"COMM SKILLS","LECTURER":"DOROTHY"},
                {"DAY":"WED","TIME":"1:30PM TO 3:30PM","SUBJECT":"MATERIALS AND PROCESSESS","LECTURER":"NGANA"},
                {"DAY":"THU","TIME":"08:00AM TO 10:00AM","SUBJECT":"ENTREPRENEUSHIP","LECTURER":"MUTENDE"},
                {"DAY":"THU","TIME":"10:30AM TO 12:30PM","SUBJECT":"ANALOGUE ELECTRONICS I","LECTURER":"OMONDI"},
                {"DAY":"THU","TIME":"1:30PM TO 3:30PM","SUBJECT":"ANALOGUE ELECTRONICS I","LECTURER":"OMONDI"},
                {"DAY":"THU","TIME":"3:30PM TO 5:30PM","SUBJECT":"MATHEMATICS","LECTURER":"ONAYA"},
                {"DAY":"FRI","TIME":"08:00AM TO 10:00AM","SUBJECT":"ELECTRICAL MEASUREMENTS","LECTURER":"DON"},
                {"DAY":"FRI","TIME":"10:30AM TO 12:30PM","SUBJECT":"PHYSICAL SCIENCE","LECTURER":"SHARON"},
                {"DAY":"FRI","TIME":"1:30PM TO 3:30PM","SUBJECT":"ICT","LECTURER":"JENNIFER"},
                {"DAY":"FRI","TIME":"3:30PM TO 5:30PM","SUBJECT":"ICT","LECTURER":"JENNIFER"}
            ],
            embeddedStudents: [
                {"Admission_No":"13062/DEEMAY2025R","Student_Name":"WAWERU SAMUEL MUCHIRI","Class":"DEEMAY2025R"},
                {"Admission_No":"13063/DEEMAY2025R","Student_Name":"MWIRICHIA TIMOTHY MUTABARI","Class":"DEEMAY2025R"},
                {"Admission_No":"13068/DEEMAY2025R","Student_Name":"GITAU SIMON CRUZ MBACHIA","Class":"DEEMAY2025R"},
                {"Admission_No":"13069/DEEMAY2025R","Student_Name":"MUSUNGU REGINA ANYANGO","Class":"DEEMAY2025R"},
                {"Admission_No":"13070/DEEMAY2025R","Student_Name":"MOSOTI STEVE ONDIEKI","Class":"DEEMAY2025R"},
                {"Admission_No":"13071/DEEMAY2025R","Student_Name":"NYAMWEYA BRIGHTSON OMWATA","Class":"DEEMAY2025R"},
                {"Admission_No":"13077/DEEMAY2025R","Student_Name":"ARAKA KELLY GUSUTA","Class":"DEEMAY2025R"},
                {"Admission_No":"13078/DEEMAY2025R","Student_Name":"MWANGI VINCENT KIRAGU","Class":"DEEMAY2025R"},
                {"Admission_No":"13081/DEEMAY2025R","Student_Name":"GATI SOLOMON CHACHA","Class":"DEEMAY2025R"},
                {"Admission_No":"13084/DEEMAY2025R","Student_Name":"OKIRU BRYAN","Class":"DEEMAY2025R"},
                {"Admission_No":"13089/DEEMAY2025R","Student_Name":"MIRAMBO NAOMI BONARERI","Class":"DEEMAY2025R"},
                {"Admission_No":"13092/DEEMAY2025R","Student_Name":"IPU TOLA TRANSITION","Class":"DEEMAY2025R"},
                {"Admission_No":"13098/DEEMAY2025R","Student_Name":"MURAGE ANASTACIA NYAKIO","Class":"DEEMAY2025R"},
                {"Admission_No":"13100/DEEMAY2025R","Student_Name":"ODHIAMBO BRANDAN ODUOR","Class":"DEEMAY2025R"},
                {"Admission_No":"13101/DEEMAY2025R","Student_Name":"ONYANGO VINCENCIA OCHIENG","Class":"DEEMAY2025R"},
                {"Admission_No":"13102/DEEMAY2025R","Student_Name":"ODUOR KEN OMONDI","Class":"DEEMAY2025R"},
                {"Admission_No":"13103/DEEMAY2025R","Student_Name":"ABDIKADIR MAZUUD KUSOW","Class":"DEEMAY2025R"},
                {"Admission_No":"13104/DEEMAY2025R","Student_Name":"AMOKONO EMMANUEL KIMAYI","Class":"DEEMAY2025R"},
                {"Admission_No":"13105/DEEMAY2025R","Student_Name":"OTIENO CYNTHIA ATIENO","Class":"DEEMAY2025R"},
                {"Admission_No":"13109/DEEMAY2025R","Student_Name":"METO IVINE JEPTOO","Class":"DEEMAY2025R"},
                {"Admission_No":"13110/DEEMAY2025R","Student_Name":"ODHIAMBO DANIEL OTIENO","Class":"DEEMAY2025R"},
                {"Admission_No":"13111/DEEMAY2025R","Student_Name":"OTUKE SHANIL MORAA","Class":"DEEMAY2025R"},
                {"Admission_No":"13112/DEEMAY2025R","Student_Name":"KIMANZI EVANS MITAU","Class":"DEEMAY2025R"},
                {"Admission_No":"13113/DEEMAY2025R","Student_Name":"CYRUS BOSIRE","Class":"DEEMAY2025R"},
                {"Admission_No":"13114/DEEMAY2025R","Student_Name":"MARAGA SAMUEL BOSIRE","Class":"DEEMAY2025R"},
                {"Admission_No":"13116/DEEMAY2025R","Student_Name":"AINOAM JEPCHUMBA","Class":"DEEMAY2025R"},
                {"Admission_No":"13119/DEEMAY2025R","Student_Name":"KITHI SAFARI ELVIS","Class":"DEEMAY2025R"},
                {"Admission_No":"13123/DEEMAY2025R","Student_Name":"OMOLO JOSEPH OBUDO","Class":"DEEMAY2025R"},
                {"Admission_No":"13124/DEEMAY2025R","Student_Name":"OTIAMBO DANCARLOS OKENYE","Class":"DEEMAY2025R"},
                {"Admission_No":"13125/DEEMAY2025R","Student_Name":"ELINA ACHIENG","Class":"DEEMAY2025R"},
                {"Admission_No":"13126/DEEMAY2025R","Student_Name":"MAINA TIMOTHY NJOROGE","Class":"DEEMAY2025R"},
                {"Admission_No":"13127/DEEMAY2025R","Student_Name":"ORWENYO SAMUEL MICHAKA","Class":"DEEMAY2025R"},
                {"Admission_No":"13135/DEEMAY2025R","Student_Name":"THAGICHU SAMUEL NJENGA","Class":"DEEMAY2025R"},
                {"Admission_No":"13136/DEEMAY2025R","Student_Name":"MUTEMI PATRICK NZOMO","Class":"DEEMAY2025R"},
                {"Admission_No":"13138/DEEMAY2025R","Student_Name":"KYULE MWONGELA","Class":"DEEMAY2025R"},
                {"Admission_No":"13139/DEEMAY2025R","Student_Name":"MUINDE ERIC NUENDO","Class":"DEEMAY2025R"},
                {"Admission_No":"13142/DEEMAY2025R","Student_Name":"GUMATO JILLO HUKA","Class":"DEEMAY2025R"},
                {"Admission_No":"13146/DEEMAY2025R","Student_Name":"KARIUKI DOMINIC MUCERU","Class":"DEEMAY2025R"},
                {"Admission_No":"13150/DEEMAY2025R","Student_Name":"NDEGWA SUSAN WAIRIMU","Class":"DEEMAY2025R"},
                {"Admission_No":"13151/DEEMAY2025R","Student_Name":"KIPNGETICH AMOS","Class":"DEEMAY2025R"},
                {"Admission_No":"13430/DEEMAY2025R","Student_Name":"JOSEPH CLINTON","Class":"DEEMAY2025R"},
                {"Admission_No":"13066/DEEMAY2025R","Student_Name":"MARWA EMMANUEL","Class":"DEEMAY2025R"},
                {"Admission_No":"13072/DEEMAY2025R","Student_Name":"CHEROTICH FLOMAXINE","Class":"DEEMAY2025R"},
                {"Admission_No":"13083/DEEMAY2025R","Student_Name":"OWINO MOSES MBUYU","Class":"DEEMAY2025R"},
                {"Admission_No":"13087/DEEMAY2025R","Student_Name":"KAMBANJA LILIAN MUTIGA","Class":"DEEMAY2025R"},
                {"Admission_No":"13106/DEEMAY2025R","Student_Name":"MUNANGWE DAVID TSIMILI","Class":"DEEMAY2025R"},
                {"Admission_No":"13117/DEEMAY2025R","Student_Name":"KIPKORIR AMOS","Class":"DEEMAY2025R"},
                {"Admission_No":"13120/DEEMAY2025R","Student_Name":"KIRAGU STEPHEN MWAURA","Class":"DEEMAY2025R"},
                {"Admission_No":"13137/DEEMAY2025R","Student_Name":"ONYANGO BRIAN ODHIAMBO","Class":"DEEMAY2025R"},
                {"Admission_No":"13061/DEEMAY2025R","Student_Name":"MATHEKA MAUREEN MWENDE","Class":"DEEMAY2025R"},
                {"Admission_No":"13067/DEEMAY2025R","Student_Name":"AHMED ABDIBASID ABDIRAHAHMAN","Class":"DEEMAY2025R"},
                {"Admission_No":"13073/DEEMAY2025R","Student_Name":"NDOMBI BENARDICT","Class":"DEEMAY2025R"},
                {"Admission_No":"13080/DEEMAY2025R","Student_Name":"MASINDE YASEEN MUBARACK","Class":"DEEMAY2025R"},
                {"Admission_No":"13093/DEEMAY2025R","Student_Name":"WAFULA BRUCE WEKESA","Class":"DEEMAY2025R"},
                {"Admission_No":"13097/DEEMAY2025R","Student_Name":"ODONYO BRIGHTON OKOTH","Class":"DEEMAY2025R"},
                {"Admission_No":"13107/DEEMAY2025R","Student_Name":"OSMAN ABDI IBRAHIM","Class":"DEEMAY2025R"}
            ]
        },
        'CDAC/L6/EE/SEP2025': {
            displayName: 'CDAC/L6/EE/SEP2025 (Diploma Electrical - Level 6)',
            teachers: ['WAFULA', 'KOBIA', 'MURIMI'],
            teacherPins: {
                'WAFULA': EncryptionSystem.hashPin('9360'),
                'KOBIA': EncryptionSystem.hashPin('5555'),
                'MURIMI': EncryptionSystem.hashPin('5050')
            },
            defaultSessions: [
                {"DAY":"TUE","TIME":"FULL DAY","SUBJECT":"SOLAR","LECTURER":"WAFULA"},
                {"DAY":"THU","TIME":"FULL DAY","SUBJECT":"MACHINE REWINDING","LECTURER":"KOBIA"},
                {"DAY":"FRI","TIME":"FULL DAY","SUBJECT":"BELLS AND ALARMS","LECTURER":"MURIMI"}
            ],
            embeddedStudents: [
                {"Admission_No":"13705/L6/EE/SEP2025","Student_Name":"Yuvinalis Mose","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13707/L6/EE/SEP2025","Student_Name":"Alex Kamande Kiboro","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13708/L6/EE/SEP2025","Student_Name":"Jesseb Katenya Kisaka","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13709/L6/EE/SEP2025","Student_Name":"Laurah Mary Mukhwana","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13710/L6/EE/SEP2025","Student_Name":"Brian Kokonya Odala","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13711/L6/EE/SEP2025","Student_Name":"Ishmael Munjuri Muthomi","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13712/L6/EE/SEP2025","Student_Name":"Derrick Wamwenge","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13713/L6/EE/SEP2025","Student_Name":"Winslet Wanjiku Wairimu","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13716/L6/EE/SEP2025","Student_Name":"Fridah Akinyi Orenyo","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13718/L6/EE/SEP2025","Student_Name":"Ruth Achieng Odoyo","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13725/L6/EE/SEP2025","Student_Name":"William Kimanzi Mwanzia","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13726/L6/EE/SEP2025","Student_Name":"Griffins Edga Omollo","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13727/L6/EE/SEP2025","Student_Name":"Briton Odiwuor Ouko","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13732/L6/EE/SEP2025","Student_Name":"Victor Gitonga M'ngaruthi","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13733/L6/EE/SEP2025","Student_Name":"Taj Njuki Gachangi","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13735/L6/EE/SEP2025","Student_Name":"Joseph Mutua Maingi","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13753/L6/SEP2025","Student_Name":"Mark Kathigo Muchira","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13755/L6/EE/SEP2025","Student_Name":"Carolyne Wanjiru Mwangi","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13759/L6/EE/SEP2025","Student_Name":"Elvis Kipruto","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13773/L6/EE/SEP2025","Student_Name":"Regan Roxy Mawira","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13774/L6/EE/SEP2025","Student_Name":"Felix Cheruiyot Ngeno","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13775/L6/EE/SEP2025","Student_Name":"Nelly Kerubo Orwaru","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13776/L6/EE/SEP2025","Student_Name":"Chris Ochieng","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13779/L6/EE/SEP2025","Student_Name":"Stanley Mbuvi Wambua","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13780/L6/EE/SEP2025","Student_Name":"Joshua Mwendwa Muela","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13757/L6/EE/SEP2025","Student_Name":"Elphas Kipchirchir","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13734/L6/EE/SEP2025","Student_Name":"Willy Mutungi Mutua","Class":"CDAC/L6/EE/SEP2025"},
                {"Admission_No":"13706/L6/EE/SEP2025","Student_Name":"Jedida Awino Otieno","Class":"CDAC/L6/EE/SEP2025"}
            ]
        },
        'DEESEP2023R': {
            displayName: 'DEESEP2023R (Diploma in Electrical Engineering)',
            teachers: ['NAOMI', 'DOROTHY', 'MUSASIA', 'OUNGO', 'WANYAMA', 'KIMANI', 'ONAYA', 'OMONDI', 'ALOO', 'OMBUI'],
            teacherPins: {
                'NAOMI': EncryptionSystem.hashPin('3696'),
                'DOROTHY': EncryptionSystem.hashPin('5922'),
                'MUSASIA': EncryptionSystem.hashPin('2698'),
                'OUNGO': EncryptionSystem.hashPin('2584'),
                'WANYAMA': EncryptionSystem.hashPin('1970'),
                'KIMANI': EncryptionSystem.hashPin('9668'),
                'ONAYA': EncryptionSystem.hashPin('1474'),
                'OMONDI': EncryptionSystem.hashPin('5810'),
                'ALOO': EncryptionSystem.hashPin('4810'),
                'OMBUI': EncryptionSystem.hashPin('9090')
            },
            defaultSessions: [
                {"DAY":"MON","TIME":"08:00AM TO 10:00AM","SUBJECT":"INDUSTRIAL ORG & MANAGEMENT","LECTURER":"NAOMI"},
                {"DAY":"MON","TIME":"10:30AM TO 12:30PM","SUBJECT":"INDUSTRIAL ORG & MANAGEMENT","LECTURER":"NAOMI"},
                {"DAY":"MON","TIME":"01:30PM TO 03:30PM","SUBJECT":"ESTIMATING AND TENDERING","LECTURER":"DOROTHY"},
                {"DAY":"MON","TIME":"03:30PM TO 05:30PM","SUBJECT":"ESTIMATING AND TENDERING","LECTURER":"DOROTHY"},
                {"DAY":"TUE","TIME":"08:00AM TO 10:00AM","SUBJECT":"MICRO PROCESSOR SYSTEMS","LECTURER":"MUSASIA"},
                {"DAY":"TUE","TIME":"10:30AM TO 12:30PM","SUBJECT":"MICRO PROCESSOR SYSTEMS","LECTURER":"MUSASIA"},
                {"DAY":"TUE","TIME":"01:30PM TO 03:30PM","SUBJECT":"MACHINES & UTILIZATION","LECTURER":"OUNGO"},
                {"DAY":"TUE","TIME":"03:30PM TO 05:30PM","SUBJECT":"TRADE PROJECT","LECTURER":"WANYAMA/SUPERVISORS"},
                {"DAY":"WED","TIME":"08:00AM TO 10:00AM","SUBJECT":"ELECTRICAL POWER & TRANSMISSION","LECTURER":"KIMANI"},
                {"DAY":"WED","TIME":"10:30AM TO 12:30PM","SUBJECT":"ELECTRICAL POWER & TRANSMISSION","LECTURER":"KIMANI"},
                {"DAY":"WED","TIME":"01:30PM TO 03:30PM","SUBJECT":"MATHEMATICS","LECTURER":"ONAYA"},
                {"DAY":"THU","TIME":"08:00AM TO 10:00AM","SUBJECT":"ELECTROMAGNETIC THEORY","LECTURER":"OMONDI"},
                {"DAY":"THU","TIME":"10:30AM TO 12:30PM","SUBJECT":"MICRO CONTROLLER TECHNOLOGY","LECTURER":"ALOO"},
                {"DAY":"THU","TIME":"01:30PM TO 03:30PM","SUBJECT":"MATHEMATICS","LECTURER":"ONAYA"},
                {"DAY":"THU","TIME":"03:30PM TO 05:30PM","SUBJECT":"TRADE PROJECT","LECTURER":"WANYAMA/SUPERVISORS"},
                {"DAY":"FRI","TIME":"08:00AM TO 10:00AM","SUBJECT":"MACHINES & UTILIZATION","LECTURER":"OUNGO"},
                {"DAY":"FRI","TIME":"10:30AM TO 12:30PM","SUBJECT":"MICRO CONTROLLER TECHNOLOGY","LECTURER":"ALOO"},
                {"DAY":"FRI","TIME":"01:30PM TO 03:30PM","SUBJECT":"POWER ELECTRONICS","LECTURER":"OMBUI"},
                {"DAY":"FRI","TIME":"03:30PM TO 05:30PM","SUBJECT":"POWER ELECTRONICS","LECTURER":"OMBUI"}
            ],
            embeddedStudents: [
                {"Admission_No":"11837/DEESEP2021R","Student_Name":"OMBASA ANNA KWAMBOKA","Class":"DEESEP2023R"},
                {"Admission_No":"12153/DEEMAY2023R","Student_Name":"MUNYITHYA JOSEPHAT KITEME","Class":"DEESEP2023R"},
                {"Admission_No":"12392/DEESEP2023R","Student_Name":"KAMAU RAYMOND NGINYO","Class":"DEESEP2023R"},
                {"Admission_No":"12395/DEESEP2023R","Student_Name":"KARIUKI WALLACE BORO","Class":"DEESEP2023R"},
                {"Admission_No":"12397/DEESEP2023R","Student_Name":"MICHEAL JOSEPH MULANDI","Class":"DEESEP2023R"},
                {"Admission_No":"12401/DEESEP2023R","Student_Name":"AYIENGA ALLAN OGWATI","Class":"DEESEP2023R"},
                {"Admission_No":"12402/DEESEP2023R","Student_Name":"NCHOE KELLY TOMPO","Class":"DEESEP2023R"},
                {"Admission_No":"12406/DEESEP2023R","Student_Name":"KEMOI GABRIEL KIBET","Class":"DEESEP2023R"},
                {"Admission_No":"12407/DEESEP2023R","Student_Name":"MUENI ROSE MITCHELL","Class":"DEESEP2023R"},
                {"Admission_No":"12409/DEESEP2023R","Student_Name":"INDANGASI RHODA NEKESA","Class":"DEESEP2023R"},
                {"Admission_No":"12411/DEESEP2023R","Student_Name":"NGANGA LILIAN WAITHERA","Class":"DEESEP2023R"},
                {"Admission_No":"12419/DEESEP2023R","Student_Name":"KARIUKI MARGARET WANJIKU","Class":"DEESEP2023R"},
                {"Admission_No":"12420/DEESEP2023R","Student_Name":"NGIMA FELIX EMMANUEL KABURI","Class":"DEESEP2023R"},
                {"Admission_No":"12421/DEESEP2023R","Student_Name":"MWANGI NICHOLAS MUNENE","Class":"DEESEP2023R"},
                {"Admission_No":"12422/DEESEP2023R","Student_Name":"CECIL ODUOR","Class":"DEESEP2023R"},
                {"Admission_No":"12425/DEESEP2023R","Student_Name":"MUTAHI MARK ERWAN","Class":"DEESEP2023R"},
                {"Admission_No":"12427/DEESEP2023R","Student_Name":"ONDARA WESLEY OTOIGO","Class":"DEESEP2023R"},
                {"Admission_No":"12429/DEESEP2023R","Student_Name":"NGAHU FRANKLIN KAGUTHI","Class":"DEESEP2023R"},
                {"Admission_No":"12432/DEESEP2023R","Student_Name":"AARON FRANCIS MUNYAO","Class":"DEESEP2023R"},
                {"Admission_No":"12435/DEESEP2023R","Student_Name":"SIMON NGAHU","Class":"DEESEP2023R"},
                {"Admission_No":"12438/DEESEP2023R","Student_Name":"KIMWELE BENJAMIN KIMANZI","Class":"DEESEP2023R"},
                {"Admission_No":"12439/DEESEP2023R","Student_Name":"OJIAMBO AMOS ONESMUS","Class":"DEESEP2023R"},
                {"Admission_No":"12440/DEESEP2023R","Student_Name":"MERCY CHEPKEMOI","Class":"DEESEP2023R"},
                {"Admission_No":"12445/DEESEP2023R","Student_Name":"LUMBASI CHRISPUS MALALA","Class":"DEESEP2023R"},
                {"Admission_No":"12450/DEESEP2023R","Student_Name":"MWANGI FLAVIANAH WAITHERERO","Class":"DEESEP2023R"},
                {"Admission_No":"12500/DEESEP2023R","Student_Name":"ADIENGE FRANCIS DENZEL","Class":"DEESEP2023R"},
                {"Admission_No":"12502/DEESEP2023R","Student_Name":"LEKISHON VICTOR ORAMAT","Class":"DEESEP2023R"},
                {"Admission_No":"12508/DEESEP2023R","Student_Name":"VICTOR BARASA","Class":"DEESEP2023R"},
                {"Admission_No":"12509/DEESEP2023R","Student_Name":"MATONGO LAURYN OBONYO","Class":"DEESEP2023R"},
                {"Admission_No":"12510/DEESEP2023R","Student_Name":"NGETICH BRIAN KIRWA","Class":"DEESEP2023R"},
                {"Admission_No":"12513/DEESEP2023R","Student_Name":"ERICSON AGEYO","Class":"DEESEP2023R"},
                {"Admission_No":"12514/DEESEP2022R","Student_Name":"KOSGEI KEVIN KIPKEMOI","Class":"DEESEP2023R"},
                {"Admission_No":"12515/DEESEP2023R","Student_Name":"KEMBOI BRIAN KIPKOGEI","Class":"DEESEP2023R"},
                {"Admission_No":"12543/DEESEP2023R","Student_Name":"KIONGOINA BENARD MOURUME","Class":"DEESEP2023R"},
                {"Admission_No":"12545/DEESEP2023R","Student_Name":"FESTUS KIPKOECH","Class":"DEESEP2023R"},
                {"Admission_No":"12546/DEESEP2023R","Student_Name":"MURIUKI EUGINE MACHIRA","Class":"DEESEP2023R"},
                {"Admission_No":"12551/DEESEP2023R","Student_Name":"ROTICH BRIAN KIMUTAI","Class":"DEESEP2023R"},
                {"Admission_No":"12400/DEESEP2023R","Student_Name":"WOKABI MICHEAL MUTURI","Class":"DEESEP2023R"},
                {"Admission_No":"12405/DEESEP2023R","Student_Name":"OP0NDO JEMILA AMONDI","Class":"DEESEP2023R"},
                {"Admission_No":"12416/DEESEP2023R","Student_Name":"EMMANUEL KIPKOECH","Class":"DEESEP2023R"},
                {"Admission_No":"12417/DEESEP2023R","Student_Name":"NTHENYA WAMBUA","Class":"DEESEP2023R"},
                {"Admission_No":"12433/DEESEP2023R","Student_Name":"FELIX KIPRONO NGETICH","Class":"DEESEP2023R"},
                {"Admission_No":"12437/DEESEP2023R","Student_Name":"OWUOR EUGINE KERE","Class":"DEESEP2023R"},
                {"Admission_No":"12501/DEESEP2023R","Student_Name":"MUHIA EMILIO MWANGI","Class":"DEESEP2023R"},
                {"Admission_No":"12506/DEESEP2023R","Student_Name":"SYLVIAH WAMBUI","Class":"DEESEP2023R"},
                {"Admission_No":"12547/DEESEP2023R","Student_Name":"NGENO JUSTICE KIPKIRUI","Class":"DEESEP2023R"}
            ]
        }
    };

    async function migrateLegacyData() {
        const codes = Object.keys(CLASS_CONFIG || {});
        if (!codes.length) {
            alert('No CLASS_CONFIG to migrate.');
            return { classes: 0, students: 0, teachers: 0, errors: ['no_class_config'] };
        }
        const proceed = confirm(
            `Migrate ${codes.length} classes (and their embedded students/teachers) from CLASS_CONFIG into the Sheet?\n\n` +
            `IMPORTANT: teacher PINs cannot be migrated. Migrated teacher records will have empty PIN fields. ` +
            `Use "Reset PIN" in Manage Teachers before they can log in via the new path. ` +
            `The existing CLASS_CONFIG PIN path remains active in parallel until removed in a later stage.`
        );
        if (!proceed) return { aborted: true };

        const result = { classes: 0, students: 0, teachers: 0, timetable: 0, subjects: 0, errors: [] };

        // ----- 1. Classes -----
        try {
            const classRecords = codes.map(code => ({
                ClassCode:   code,
                DisplayName: (CLASS_CONFIG[code] && CLASS_CONFIG[code].displayName) || code,
                Category:    (CLASS_CONFIG[code] && CLASS_CONFIG[code].category) || 'Other',
                Active:      true,
            }));
            const r = await SheetData.bulkUpsertClasses(classRecords);
            result.classes = (r && r.written) || 0;
            if (r && r.errors && r.errors.length) {
                r.errors.forEach(e => result.errors.push('Classes batch — ' + e));
            }
        } catch (e) {
            result.errors.push('Classes: ' + e.message);
        }

        // ----- 2. Students -----
        const allStudents = [];
        codes.forEach(code => {
            const students = (CLASS_CONFIG[code] && CLASS_CONFIG[code].embeddedStudents) || [];
            students.forEach(s => {
                if (s && s.Admission_No) {
                    allStudents.push({
                        AdmissionNo: s.Admission_No,
                        FullName:    s.Student_Name || '',
                        Class:       code,
                        Active:      true,
                    });
                }
            });
        });
        if (allStudents.length) {
            try {
                const r = await SheetData.bulkUpsertStudents(allStudents);
                result.students = (r && r.written) || 0;
                if (r && r.errors && r.errors.length) {
                    r.errors.forEach(e => result.errors.push('Students batch — ' + e));
                }
            } catch (e) {
                result.errors.push('Students: ' + e.message);
            }
        }

        // ----- 3. Teachers (no PINs) -----
        // Build a unique-by-name set spanning all classes the teacher appears in.
        const teacherMap = new Map();
        codes.forEach(code => {
            const list = (CLASS_CONFIG[code] && CLASS_CONFIG[code].teachers) || [];
            list.forEach(name => {
                if (!name) return;
                const key = String(name).toUpperCase();
                if (!teacherMap.has(key)) {
                    teacherMap.set(key, { Name: name, Classes: [code] });
                } else {
                    const existing = teacherMap.get(key);
                    if (existing.Classes.indexOf(code) < 0) existing.Classes.push(code);
                }
            });
        });

        if (teacherMap.size) {
            // Skip names that already exist in the Sheet so re-running migration
            // doesn't clobber teachers an admin has already set up.
            let existingNames = new Set();
            try {
                const existing = SheetData.getCachedTeachers();
                existing.forEach(t => existingNames.add(String(t.Name).toUpperCase()));
            } catch (e) {}

            const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
            const teacherRecords = Array.from(teacherMap.values())
                .filter(t => !existingNames.has(String(t.Name).toUpperCase()))
                .map(t => ({
                    TeacherId: 'legacy_' + slug(t.Name),
                    Name:      t.Name,
                    Classes:   t.Classes,
                    PinHash:   '',
                    PinSalt:   '',
                    Active:    true,
                }));

            if (teacherRecords.length) {
                try {
                    const r = await SheetData.bulkUpsertTeachers(teacherRecords);
                    result.teachers = (r && r.written) || 0;
                    if (r && r.errors && r.errors.length) {
                        r.errors.forEach(e => result.errors.push('Teachers batch — ' + e));
                    }
                } catch (e) {
                    result.errors.push('Teachers: ' + e.message);
                }
            }
        }

        // ----- 4. Timetable + 5. Subjects (Stage 8) -----
        // CLASS_CONFIG[code].defaultSessions has shape:
        //   { DAY: 'MON', TIME: '08:00AM TO 10:00AM', SUBJECT: '...', LECTURER: 'NAME' }
        // We split TIME into 24h StartTime/EndTime, derive a deterministic
        // TimetableId so re-running migration is idempotent, and collect a
        // unique (Class, SUBJECT) set for the Subjects tab.
        function parseTimePart_(s) {
            const m = String(s || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
            if (!m) return '';
            let h = parseInt(m[1], 10);
            const min = m[2];
            const ampm = (m[3] || '').toUpperCase();
            if (ampm === 'AM' && h === 12) h = 0;
            else if (ampm === 'PM' && h < 12) h += 12;
            return String(h).padStart(2, '0') + ':' + min;
        }
        function parseTimeRange_(timeStr) {
            const parts = String(timeStr || '').split(/\s+TO\s+/i).map(s => s.trim());
            if (parts.length !== 2) return ['', ''];
            return [parseTimePart_(parts[0]), parseTimePart_(parts[1])];
        }
        function slugify_(s) {
            return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
        }

        const allTimetable = [];
        const subjectsByClass = {};   // { classCode: Set<subjectName> }
        codes.forEach(code => {
            const sessions = (CLASS_CONFIG[code] && CLASS_CONFIG[code].defaultSessions) || [];
            sessions.forEach(s => {
                if (!s || !s.DAY || !s.TIME || !s.SUBJECT) return;
                const [start, end] = parseTimeRange_(s.TIME);
                const day = String(s.DAY).toUpperCase();
                allTimetable.push({
                    TimetableId: 'tt_' + slugify_(code) + '_' + day + '_' + start.replace(':', '') + '_' + slugify_(s.SUBJECT),
                    Class:       code,
                    Day:         day,
                    StartTime:   start,
                    EndTime:     end,
                    Subject:     s.SUBJECT,
                    TeacherId:   s.LECTURER || '',
                });
                if (!subjectsByClass[code]) subjectsByClass[code] = new Set();
                subjectsByClass[code].add(s.SUBJECT);
            });
        });

        if (allTimetable.length) {
            try {
                const r = await SheetData.bulkUpsertTimetable(allTimetable);
                result.timetable = (r && r.written) || 0;
                if (r && r.errors && r.errors.length) {
                    r.errors.forEach(e => result.errors.push('Timetable batch — ' + e));
                }
            } catch (e) {
                result.errors.push('Timetable: ' + e.message);
            }
        }

        const allSubjects = [];
        Object.keys(subjectsByClass).forEach(code => {
            Array.from(subjectsByClass[code]).forEach(name => {
                allSubjects.push({
                    SubjectCode: slugify_(code) + '_' + slugify_(name),
                    SubjectName: name,
                    Class:       code,
                    Active:      true,
                });
            });
        });

        if (allSubjects.length) {
            try {
                const r = await SheetData.bulkUpsertSubjects(allSubjects);
                result.subjects = (r && r.written) || 0;
                if (r && r.errors && r.errors.length) {
                    r.errors.forEach(e => result.errors.push('Subjects batch — ' + e));
                }
            } catch (e) {
                result.errors.push('Subjects: ' + e.message);
            }
        }

        await SheetData.refreshAll();

        let summary = `Migration complete.\n\n` +
                      `• Classes: ${result.classes}\n` +
                      `• Students: ${result.students}\n` +
                      `• Teachers: ${result.teachers} (PINs not set — use Reset PIN before login)\n` +
                      `• Timetable entries: ${result.timetable || 0}\n` +
                      `• Subjects: ${result.subjects || 0}`;
        if (result.errors.length) summary += '\n\nERRORS:\n' + result.errors.join('\n');
        alert(summary);
        return result;
    }
    window.migrateLegacyData = migrateLegacyData;

    // Toolbar button "Migrate Data" routes through showAdminPinVerification,
    // which looks up callbacks by name in verifyAdminPin's callbackMap.
    // The map references `runMigrateData`, so this declaration must exist
    // in the same scope or the object literal throws ReferenceError when
    // the PIN modal confirms.
    async function runMigrateData() {
        return migrateLegacyData();
    }
    window.runMigrateData = runMigrateData;

    // ===================== STAGE 10: INSIGHTS DASHBOARD =====================
    // Admin-only school-wide attendance metrics computed client-side from
    // the Attendance tab. Tolerant of TitleCase (server) and camelCase
    // (older clients) field names because the queue has been writing both
    // shapes over the lifetime of this app.
