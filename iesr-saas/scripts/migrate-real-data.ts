// scripts/migrate-real-data.ts
// One-time migration: inserts ALL real IESR data from CLASS_CONFIG into Neon
// Usage: npm run db:migrate  (add to package.json scripts)

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pbkdf2 as _pbkdf2, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import * as schema from "../src/db/schema";
import { and, eq } from "drizzle-orm";

const pbkdf2 = promisify(_pbkdf2);

async function hashPin(pin: string) {
  const salt = randomBytes(16);
  const dk = await pbkdf2(pin.normalize("NFKC"), salt, 100000, 32, "sha256");
  return { hash: dk.toString("hex"), salt: salt.toString("hex") };
}

// ===== ALL REAL IESR DATA =====

interface ClassData {
  code: string;
  displayName: string;
  category: string;
  teachers: string[];
  teacherPins: Record<string, string>;
  sessions: SessionData[];
  students: StudentData[];
}

interface SessionData {
  day: string;
  time: string;
  subject: string;
  lecturer: string;
}

interface StudentData {
  admissionNo: string;
  name: string;
}

export const CLASS_CONFIG: Record<string, ClassData> = {
  'CEEMAY2025R': {
    code: 'CEEMAY2025R',
    displayName: 'CEEMAY2025R (Craft Electrical)',
    category: 'Craft',
    teachers: ['ALOO', 'DOROTHY', 'KIRIGWI', 'SALOME', 'GITHOGORI', 'LILIAN', 'KWASA', 'WAFULA', 'SHARON'],
    teacherPins: {
      'ALOO': '4810', 'DOROTHY': '5922', 'KIRIGWI': '6034', 'SALOME': '9362',
      'GITHOGORI': '1586', 'LILIAN': '7146', 'KWASA': '8258', 'WAFULA': '9360', 'SHARON': '0472'
    },
    sessions: [
      { day: "MON", time: "08:00-10:00", subject: "ELECTRONICS", lecturer: "ALOO" },
      { day: "MON", time: "10:30-12:30", subject: "ENTREPRENEURSHIP", lecturer: "DOROTHY" },
      { day: "MON", time: "13:30-15:30", subject: "ENGINEERING DRAWING", lecturer: "KIRIGWI" },
      { day: "MON", time: "15:30-17:30", subject: "ENGINEERING DRAWING", lecturer: "KIRIGWI" },
      { day: "TUE", time: "08:00-10:00", subject: "W/TECHNOLOGY (A&B)", lecturer: "KIRIGWI" },
      { day: "TUE", time: "10:30-12:30", subject: "W/TECHNOLOGY (A&B)", lecturer: "KIRIGWI" },
      { day: "TUE", time: "13:30-15:30", subject: "ELECTRICAL PRINCIPLES", lecturer: "SALOME" },
      { day: "TUE", time: "15:30-17:30", subject: "ELECTRICAL PRINCIPLES", lecturer: "SALOME" },
      { day: "WED", time: "08:00-10:00", subject: "ELECTRICAL INSTALLATION TECH.", lecturer: "GITHOGORI" },
      { day: "WED", time: "10:30-12:30", subject: "ELECTRICAL INSTALLATION TECH.", lecturer: "GITHOGORI" },
      { day: "WED", time: "13:30-15:30", subject: "ELECTRICAL INSTALLATION TECH.", lecturer: "GITHOGORI" },
      { day: "THU", time: "08:00-10:00", subject: "ICT", lecturer: "LILIAN" },
      { day: "THU", time: "10:30-12:30", subject: "ICT", lecturer: "LILIAN" },
      { day: "THU", time: "13:30-15:30", subject: "W/TECHNOLOGY (A&B)", lecturer: "KIRIGWI/NGANA" },
      { day: "THU", time: "15:30-17:30", subject: "W/TECHNOLOGY (A&B)", lecturer: "KIRIGWI/NGANA" },
      { day: "FRI", time: "08:00-10:00", subject: "MATHEMATICS", lecturer: "KWASA" },
      { day: "FRI", time: "10:30-12:30", subject: "SOLAR", lecturer: "WAFULA" },
      { day: "FRI", time: "13:30-15:30", subject: "APPLIED SCIENCE", lecturer: "SHARON" },
      { day: "FRI", time: "15:30-17:30", subject: "ELECTRONICS", lecturer: "ALOO" }
    ],
    students: [
      { admissionNo: "12992/CEEMAY2025R", name: "SEGERGER MATHEW KIPKORIR" },
      { admissionNo: "12994/CEEMAY2025R", name: "OUMA BRIAN ODHIAMBO" },
      { admissionNo: "12996/CEEMAY2025R", name: "PAUL OGENDO NYANDIKA" },
      { admissionNo: "12998/CEEMAY2025R", name: "MWATHE VERONICAH VAATI" },
      { admissionNo: "13001/CEEMAY2025R", name: "MWANZIA DAVID NGILA" },
      { admissionNo: "13002/CEEMAY2025R", name: "DOYO EDIN HUSSEIN" },
      { admissionNo: "13003/CEEMAY2025R", name: "GACHOKI MARK MACHARIA" },
      { admissionNo: "13004/CEEMAY2025R", name: "SALIM MBARAKA MRABU" },
      { admissionNo: "13005/CEEMAY2025R", name: "NYAMBURA FRANKLIN KIMANI" },
      { admissionNo: "13006/CEEMAY2025R", name: "MUSAU POLYN" },
      { admissionNo: "13008/CEEMAY2025R", name: "MUNIU ANTHONY KAMAU" },
      { admissionNo: "13011/CEEMAY2025R", name: "WAMBULWA DENZEL WAFULA" },
      { admissionNo: "13013/CEEMAY2025R", name: "KENJI COLLINS KINYUA" },
      { admissionNo: "13014/CEEMAY2025R", name: "KAMAU ABIGAIL WAMAITHA" },
      { admissionNo: "13015/CEEMAY2025R", name: "OCHIENG JOHN WILFRED" },
      { admissionNo: "13018/CEEMAY2025R", name: "GEDION KIPNGETICH" },
      { admissionNo: "13020/CEEMAY2025R", name: "AYA JORAM LIANI" },
      { admissionNo: "13022/CEEMAY2025R", name: "OMOSA SCHEFFER MBERA" },
      { admissionNo: "13028/CEEMAY2025R", name: "MAINA PHILIP SIMEL" },
      { admissionNo: "13030/CEEMAY2025R", name: "OMBUI ALBERT MOMANYI" },
      { admissionNo: "13031/CEEMAY2025R", name: "CHIRCHIR RUTH JEPKOGEI" },
      { admissionNo: "13032/CEEMAY2025R", name: "EDITH CAROL" },
      { admissionNo: "13034/CEEMAY2025R", name: "KIPSANG BENARD NGETICH" },
      { admissionNo: "13035/CEEMAY2025R", name: "ODOYO VIVIAN ADHIAMBO" },
      { admissionNo: "13036/CEEMAY2025R", name: "ADAMS KIPKORIR" },
      { admissionNo: "13039/CEEMAY2025R", name: "KEVIN ONGIRI MONARI" },
      { admissionNo: "13041/CEEMAY2025R", name: "KINYILI BENARD NDUNGA" },
      { admissionNo: "13042/CEEMAY2025R", name: "KIPROTICH VICTOR MOSONG" },
      { admissionNo: "13043/CEEMAY2025R", name: "KIUMBE JOSEPH NJUGUNA" },
      { admissionNo: "13045/CEEMAY2025R", name: "MONICA JEROP" },
      { admissionNo: "13046/CEEMAY2025R", name: "FAITH CHELANGAT" },
      { admissionNo: "13049/CEEMAY2025R", name: "NAFULA BELINDA CHARITY" },
      { admissionNo: "13052/CEEMAY2025R", name: "MWANGI DANIEL GIKONYO" },
      { admissionNo: "13055/CEEMAY2025R", name: "NAFTAL ORIOSA" },
      { admissionNo: "13057/CEEMAY2025R", name: "NJOGU JOSEPH MWANGI" },
      { admissionNo: "13059/CEEMAY2025R", name: "KWOMA NOEL NEKESA" },
      { admissionNo: "13065/CEEMAY2025R", name: "AREKI RABEL MURIMI" },
      { admissionNo: "13115/CEEMAY2025R", name: "SERONY TITUS KIPNGENO" },
      { admissionNo: "13131/CEEMAY2025R", name: "KIPROP HOSEA KOECH" },
      { admissionNo: "13143/CEEMAY2025R", name: "MUASYA CYRUS MUINDE" },
      { admissionNo: "13144/CEEMAY2025R", name: "MULI BRIAN MBURI" },
      { admissionNo: "13147/CEEMAY2025R", name: "WAMBUA DENNIS KIOKO" },
      { admissionNo: "13148/CEEMAY2025R", name: "EPHY MBUCHE MAINA" },
      { admissionNo: "13402/CEEMAY2025R", name: "WAIRIMU JOHN MAKUMI" },
      { admissionNo: "12997/CEEMAY2025R", name: "NYAMWEYA COLLINS ABUGA" },
      { admissionNo: "13012/CEEMAY2025R", name: "MBAE IAN MUTUGI" },
      { admissionNo: "13021/CEEMAY2025R", name: "NCHOE ISAYA KOILEKEN" },
      { admissionNo: "13023/CEEMAY2025R", name: "OTIENO BUXTON OCHIENG" },
      { admissionNo: "13037/CEEMAY2025R", name: "IMBIRU ALVIN MUGODO" },
      { admissionNo: "13038/CEEMAY2025R", name: "MOGOI RAILA OMAMBIA" },
      { admissionNo: "13044/CEEMAY2025R", name: "OKOTH DAVID ACHILLA" },
      { admissionNo: "13053/CEEMAY2025R", name: "OWOUR KELLY OTIENO" },
      { admissionNo: "13054/CEEMAY2025R", name: "KIOKO KENNEDY NDOLO" },
      { admissionNo: "13058/CEEMAY2025R", name: "OTIENO TIMOTHY OMONDI" },
      { admissionNo: "13085/CEEMAY2025R", name: "MACHARIA STANLEY GACHUKI" },
      { admissionNo: "13145/CEEMAY2025R", name: "ELINAH NEKESA MISIKO" }
    ]
  },
  'CEESEP2024A': {
    code: 'CEESEP2024A',
    displayName: 'CEESEP2024A (Craft Electrical)',
    category: 'Craft',
    teachers: ['OMBUI', 'GITHAE', 'KOBIA', 'DON', 'SHARON', 'GLADYS', 'DORIS', 'JENNIFER', 'MUTENDE', 'WANAGAI', 'GITHOGORI'],
    teacherPins: {
      'OMBUI': '9090', 'GITHAE': '0990', 'KOBIA': '5555', 'DON': '4712', 'SHARON': '0472',
      'GLADYS': '6936', 'DORIS': '5824', 'JENNIFER': '6922', 'MUTENDE': '7148', 'WANAGAI': '5423', 'GITHOGORI': '1586'
    },
    sessions: [
      { day: "MON", time: "08:00-10:00", subject: "ELECTRICAL INSTALLATION TECHNOLOGY II", lecturer: "OMBUI" },
      { day: "MON", time: "10:30-12:30", subject: "ELECTRICAL INSTALLATION TECHNOLOGY II", lecturer: "OMBUI" },
      { day: "MON", time: "13:30-15:30", subject: "ELECTRICAL INSTALLATION TECHNOLOGY II", lecturer: "OMBUI" },
      { day: "MON", time: "15:30-17:30", subject: "MICRO ELECTRONICS", lecturer: "GITHAE" },
      { day: "TUE", time: "08:00-10:00", subject: "ELECTRICAL MAINTENANCE & FAULT DIAGNOSIS", lecturer: "KOBIA" },
      { day: "TUE", time: "10:30-12:30", subject: "ELECTRICAL MAINTENANCE & FAULT DIAGNOSIS", lecturer: "KOBIA" },
      { day: "TUE", time: "13:30-15:30", subject: "INDUSTRIAL MACHINES & CONTROLS", lecturer: "DON" },
      { day: "TUE", time: "15:30-17:30", subject: "W. O. M", lecturer: "SHARON" },
      { day: "WED", time: "08:00-10:00", subject: "ELECTRICAL PRINCIPLES II", lecturer: "GLADYS" },
      { day: "WED", time: "10:30-12:30", subject: "ELECTRICAL PRINCIPLES II", lecturer: "GLADYS" },
      { day: "WED", time: "13:30-15:30", subject: "MATHEMATICS", lecturer: "DORIS" },
      { day: "THU", time: "08:00-10:00", subject: "COMM SKILLS", lecturer: "JENNIFER" },
      { day: "THU", time: "10:30-12:30", subject: "COMM SKILLS", lecturer: "JENNIFER" },
      { day: "THU", time: "13:30-15:30", subject: "MATHEMATICS", lecturer: "DORIS" },
      { day: "THU", time: "15:30-17:30", subject: "BUSINESS PLAN", lecturer: "MUTENDE" },
      { day: "FRI", time: "08:00-10:00", subject: "ELECTRICAL DESIGN ESTIMATING & TENDERING", lecturer: "WANAGAI" },
      { day: "FRI", time: "10:30-12:30", subject: "ELECTRICAL DESIGN ESTIMATING & TENDERING", lecturer: "WANAGAI" },
      { day: "FRI", time: "13:30-15:30", subject: "INDUSTRIAL MACHINES & CONTROLS", lecturer: "DON" },
      { day: "FRI", time: "15:30-17:30", subject: "PROJECT", lecturer: "GITHOGORI" }
    ],
    students: [
      { admissionNo: "12628/CEEMAY2024A", name: "OTIENO DAN BILLY" },
      { admissionNo: "12695/CEESEP2024A", name: "CHERONO MARY ANN" },
      { admissionNo: "12717/CEEMAY2024A", name: "MORARA FRANKLIN OBIRI" },
      { admissionNo: "13346/CEESEP2024A", name: "KIPNGENO BRIAN" },
      { admissionNo: "13348/CEESEP2024A", name: "MUNENE LENNOX KABURO" },
      { admissionNo: "13350/CEESEP2024A", name: "MARITIM HARON" },
      { admissionNo: "13352/CEESEP2024A", name: "MUTANDA MALVIN MBURU" },
      { admissionNo: "13353/CEESEP2024A", name: "AMUKONYI HARRIS BRENDAN" },
      { admissionNo: "13356/CEESEP2024A", name: "OCHIENG RONALD OTIENO" },
      { admissionNo: "13362/CEESEP2024A", name: "HILLARY ODHIAMBO" },
      { admissionNo: "13363/CEESEP2024A", name: "NTAWUASA KELVIN KELIAN" },
      { admissionNo: "13367/CEESEP2024A", name: "OTIENO MELVIN ISAAC" },
      { admissionNo: "13368/CEESEP2024A", name: "KINYANJUI PAUL NDERITU" },
      { admissionNo: "13369/CEESEP2024A", name: "KIRASA WELDON" },
      { admissionNo: "13370/CEESEP2024A", name: "BELINDA JEPCHIRCHIR" },
      { admissionNo: "13372/CEESEP2024A", name: "KTUM ISAAC ROTICH" },
      { admissionNo: "13375/CEESEP2024A", name: "BRIAN KIPLANGAT" },
      { admissionNo: "13377/CEESEP2024A", name: "KIBET PAUL KIGEN" },
      { admissionNo: "13379/CEESEP2024A", name: "WASWA MERARI SIMIYU" },
      { admissionNo: "13380/CEESEP2024A", name: "OKONGO VERONICAH OSEBE" },
      { admissionNo: "13383/CEESEP2024A", name: "THUO ALLAN HAHANYU" },
      { admissionNo: "13384/CEESEP2024A", name: "NYAGWANSA PERIS KWAMBOKA" },
      { admissionNo: "13390/CEESEP2024A", name: "MEREMO LEVIS OKEYO" },
      { admissionNo: "13396/CEESEP2024A", name: "KOSGEI DANCAN KIPNGENO" },
      { admissionNo: "13537/CEESEP2024A", name: "MWOLOLO KEVIN MUTUKU" },
      { admissionNo: "13550/CEESEP2024A", name: "KILONZO JETHRO MWISA" },
      { admissionNo: "13551/CEESEP2024A", name: "KOSGEI COLLINS KIPRONO" },
      { admissionNo: "12214/CEEMAY2023R", name: "WANGIA JOSHUA MATERE" },
      { admissionNo: "12596/CEEMAY2024A", name: "PETER KIAGE" },
      { admissionNo: "12658/CEEMAY2024A", name: "RIRO CLIFFORD NYANDUCHA" },
      { admissionNo: "13333/CEESEP2024A", name: "ACHOLA IBRAHIM OUMA" },
      { admissionNo: "13334/CEESEP2024A", name: "ONGAGA JARED" },
      { admissionNo: "13336/CEESEP2024A", name: "YEGON BRANAM KIMUTAI" },
      { admissionNo: "13339/CEESEP2024A", name: "OROCHE BRIAN MARITA" },
      { admissionNo: "13341/CEESEP2024A", name: "MUTISYA STEPHEN NDAMBUKI" },
      { admissionNo: "13357/CEESEP2024A", name: "MUNGAI ANGELA WAMBUI" },
      { admissionNo: "13359/CEESEP2024A", name: "SAMMY KELVIN MWENDWA" },
      { admissionNo: "13365/CEESEP2024A", name: "ODHIAMBO MERCY CANDY" },
      { admissionNo: "13366/CEESEP2024A", name: "KONDO ISAAC MOCHACHE" },
      { admissionNo: "13373/CEESEP2024A", name: "MARABURI LISTONE GEKONGE" },
      { admissionNo: "13374/CEESEP2024A", name: "KILUNDA JOYCE NDULULU" },
      { admissionNo: "13381/CEESEP2024A", name: "KARANJA JOHN MUIRURI" },
      { admissionNo: "13385/CEESEP2024A", name: "ODHIAMBO ARNOLD OCHIENG" },
      { admissionNo: "13388/CEESEP2024A", name: "BETTY RAHIM MUTUGI" },
      { admissionNo: "13393/CEESEP2024A", name: "MUYE PATRICK NGUJO" },
      { admissionNo: "13394/CEESEP2024A", name: "SADERA LESETU" },
      { admissionNo: "13395/CEESEP2024A", name: "ROTICH SAMUEL KEITANY" },
      { admissionNo: "13544/CEESEP2024A", name: "NYANGAU RAYVON MOCHA" }
    ]
  },
  'CEESEP2024B': {
    code: 'CEESEP2024B',
    displayName: 'CEESEP2024B (Craft Electrical)',
    category: 'Craft',
    teachers: ['MOKI', 'RUTH', 'OMBUI', 'WANGAI', 'KOBIA', 'PATRICK', 'SALOME', 'MUTENDE', 'SHARON', 'GITHOGORI'],
    teacherPins: {
      'MOKI': '7026', 'RUTH': '8250', 'OMBUI': '9090', 'WANGAI': '5423', 'KOBIA': '5555',
      'PATRICK': '8790', 'SALOME': '9362', 'MUTENDE': '7148', 'SHARON': '0472', 'GITHOGORI': '1586'
    },
    sessions: [
      { day: "MON", time: "08:00-10:00", subject: "ELECTRICAL PRINCIPLES II", lecturer: "MOKI" },
      { day: "MON", time: "10:30-12:30", subject: "ELECTRICAL PRINCIPLES II", lecturer: "MOKI" },
      { day: "MON", time: "13:30-15:30", subject: "MATHEMATICS", lecturer: "RUTH" },
      { day: "MON", time: "15:30-17:30", subject: "MICRO ELECTRONICS", lecturer: "OMBUI" },
      { day: "TUE", time: "08:00-10:00", subject: "ELECTRICAL INSTALLATION TECHNOLOGY II", lecturer: "WANGAI" },
      { day: "TUE", time: "10:30-12:30", subject: "ELECTRICAL INSTALLATION TECHNOLOGY II", lecturer: "WANGAI" },
      { day: "TUE", time: "13:30-15:30", subject: "ELECTRICAL DESIGN ESTIMATING & TENDERING", lecturer: "KOBIA" },
      { day: "TUE", time: "15:30-17:30", subject: "ELECTRICAL DESIGN ESTIMATING & TENDERING", lecturer: "KOBIA" },
      { day: "WED", time: "08:00-10:00", subject: "ELECTRICAL MAINTENANCE & FAULT DIAGNOSIS", lecturer: "PATRICK" },
      { day: "WED", time: "10:30-12:30", subject: "ELECTRICAL MAINTENANCE & FAULT DIAGNOSIS", lecturer: "PATRICK" },
      { day: "WED", time: "13:30-15:30", subject: "INDUSTRIAL MACHINES & CONTROLS", lecturer: "SALOME" },
      { day: "THU", time: "08:00-10:00", subject: "MATHEMATICS", lecturer: "RUTH" },
      { day: "THU", time: "10:30-12:30", subject: "COMM SKILLS", lecturer: "MUTENDE" },
      { day: "THU", time: "13:30-15:30", subject: "COMM SKILLS", lecturer: "MUTENDE" },
      { day: "THU", time: "15:30-17:30", subject: "ELECTRICAL INSTALLATION TECHNOLOGY II", lecturer: "WANGAI" },
      { day: "FRI", time: "08:00-10:00", subject: "BUSINESS PLAN", lecturer: "SHARON" },
      { day: "FRI", time: "10:30-12:30", subject: "INDUSTRIAL MACHINES & CONTROLS", lecturer: "SALOME" },
      { day: "FRI", time: "13:30-15:30", subject: "PROJECT", lecturer: "GITHOGORI" },
      { day: "FRI", time: "15:30-17:30", subject: "W. O. M", lecturer: "SHARON" }
    ],
    students: [
      { admissionNo: "12633/CEEMAY2024B", name: "ONGIRI IVONNE MORAA" },
      { admissionNo: "13398/CEESEP2024B", name: "BOIT TOBIAS RERIMOI" },
      { admissionNo: "13400/CEESEP2024B", name: "NDANA JIMMY KILONZO" },
      { admissionNo: "13403/CEESEP2024B", name: "OUMA STEPHEN ODHIAMBO" },
      { admissionNo: "13404/CEESEP2024B", name: "IRUNGU JAMES MBURU" },
      { admissionNo: "13405/CEESEP2024B", name: "OURU NAOM KWAMBOKA" },
      { admissionNo: "13406/CEESEP2024B", name: "LIMO GESTON KIPTOO" },
      { admissionNo: "13407/CEESEP2024B", name: "CHACHA REDEMTAR ROBI" },
      { admissionNo: "13410/CEESEP2024B", name: "RONOH BRIAN CHERUIYOT" },
      { admissionNo: "13412/CEESEP2024B", name: "NGENO LUKE KIBOR" },
      { admissionNo: "13415/CEESEP2024B", name: "CLINTON KIPCHIRCHIR" },
      { admissionNo: "13423/CEESEP2024B", name: "ODUOL DICKENS OCHIENG" },
      { admissionNo: "13500/CEESEP2024B", name: "KARIUKI MARVIN" },
      { admissionNo: "13502/CEESEP2024B", name: "MUTUNGA BREDAN MUTUA" },
      { admissionNo: "13511/CEESEP2024B", name: "KIPTOO MARK KIPKORIR" },
      { admissionNo: "13514/CEESEP2024B", name: "KORIR DICKENS KIPKOECH" },
      { admissionNo: "13515/CEESEP2024B", name: "SILVANCE OMONDI" },
      { admissionNo: "13517/CEESEP2024B", name: "KIOKO ANNASHARON MWELU" },
      { admissionNo: "13519/CEESEP2024B", name: "MBOGO ERIC KINYUA" },
      { admissionNo: "13529/CEESEP2024B", name: "NDIANGUI JOSEPH MURITHI" },
      { admissionNo: "13531/CEESEP2024B", name: "GACHOKI NEWTON MURIMI" },
      { admissionNo: "13532/CEESEP2024B", name: "KYALO JANICE MUMO" },
      { admissionNo: "13534/CEESEP2024B", name: "KIPNGETICH BRIAN" },
      { admissionNo: "13541/CEESEP2024B", name: "OCHIENG EMILY WANJIKU" },
      { admissionNo: "13543/CEESEP2024B", name: "ODOYO JOSPHINE ADHIAMBO" },
      { admissionNo: "13547/CEESEP2024B", name: "MIRINGU EZEKIEL WAINAINA" },
      { admissionNo: "13583/CEESEP2024B", name: "KIRUI HARMAN KIPKOECH" },
      { admissionNo: "13503/CEESEP2024B", name: "MONYANCHA EVANSON ONSONGO" },
      { admissionNo: "13508/CEESEP2024B", name: "MWENDWA BERYL MUTHEU" },
      { admissionNo: "12649/CEEMAY2024B", name: "NGANGA PATRICK KIMANI" },
      { admissionNo: "12664/CEEMAY2024B", name: "KIPRONO IAN ERICSON" },
      { admissionNo: "12684/CEEMAY2024B", name: "ODHIAMBO DANIEL OKOTH" },
      { admissionNo: "12712/CEEMAY2024B", name: "MWAI JEREMY KOOME" },
      { admissionNo: "13335/CEESEP2024B", name: "MUTUGI VICTOR MUKANGURA" },
      { admissionNo: "13391/CEESEP2024B", name: "OKOKO STEPHEN ONYANGO" },
      { admissionNo: "13397/CEESEP2024B", name: "KIPKIRUI KOECH MOSES" },
      { admissionNo: "13408/CEESEP2024B", name: "OMARE KEVIN OMENTA" },
      { admissionNo: "13411/CEESEP2024B", name: "OMONDI SPENCER ODHIAMBO" },
      { admissionNo: "13414/CEESEP2024B", name: "KIPCHUMBA IAN" },
      { admissionNo: "13441/CEESEP2024B", name: "JEVAN GODFREY ODHIAMBO" },
      { admissionNo: "13501/CEESEP2024B", name: "ODHIAMBO IAN LUSI" },
      { admissionNo: "13504/CEESEP2024B", name: "NEKESA MARTHA WANJALA" },
      { admissionNo: "13507/CEESEP2024B", name: "ROTICH CALEB KIPRONO" },
      { admissionNo: "13530/CEESEP2024B", name: "BRIAN CHERUIYOT" },
      { admissionNo: "13535/CEESEP2024B", name: "GIKUNDA MARTIN MWENDA" },
      { admissionNo: "13538/CEESEP2024B", name: "MUTHONI IAN CEASER FUNDI" }
    ]
  },
  'CDAC/L5/EE/SEP2025': {
    code: 'CDAC/L5/EE/SEP2025',
    displayName: 'CDAC/L5/EE/SEP2025 (Craft Electrical - Level 5)',
    category: 'Craft',
    teachers: ['SALOME', 'MUGAMBI', 'DAVID', 'NAOMI'],
    teacherPins: { 'SALOME': '9362', 'MUGAMBI': '4738', 'DAVID': '2020', 'NAOMI': '3696' },
    sessions: [
      { day: "MON", time: "FULL DAY", subject: "MACHINE REWINDING", lecturer: "SALOME" },
      { day: "TUE", time: "FULL DAY", subject: "BELLS AND ALARMS", lecturer: "MUGAMBI/DAVID" },
      { day: "FRI", time: "FULL DAY", subject: "SOLAR", lecturer: "NAOMI" }
    ],
    students: [
      { admissionNo: "13675/L5/EE/SEP2025", name: "Kevin Opore Andama" },
      { admissionNo: "13676/L5/EE/SEP2025", name: "Godwin Kiprotich" },
      { admissionNo: "13677/L5/EE/SEP2025", name: "Francis Ruhohi Muthoni" },
      { admissionNo: "13678/L5/EE/SEP2025", name: "Simon Kimanthi Mwendwa" },
      { admissionNo: "13679/L5/EE/SEP2025", name: "Stella Asheri Omunyifwa" },
      { admissionNo: "13681/L5/EE/SEP2025", name: "Joseph Ndambuki Kimilu" },
      { admissionNo: "13682/L5/EE/SEP2025", name: "Florence Mutile Ndila" },
      { admissionNo: "13685/L5/EE/SEP2025", name: "Alaky Webale" },
      { admissionNo: "13686/L5/EE/SEP2025", name: "Enock Muchiri Ireri" },
      { admissionNo: "13687/L5/EE/SEP2025", name: "Eunice Murugi Kinuthia" },
      { admissionNo: "13688/L5/EE/SEP2025", name: "Emmanuel Kipruto Kibiwott" },
      { admissionNo: "13690/L5/EE/SEP2025", name: "Adano Abduba Ali" },
      { admissionNo: "13691/L5/EE/SEP2025", name: "Carlos Kipkemoi" },
      { admissionNo: "13692/L5/EE/SEP2025", name: "Hosea Masani Muinde" },
      { admissionNo: "13694/L5/EE/SEP2025", name: "Emmanuel Kipkorir" },
      { admissionNo: "13695/L5/EE/SEP2025", name: "Brian Kipchirchir" },
      { admissionNo: "13697/L5/EE/SEP2025", name: "Wimms Onsase Ogeto" },
      { admissionNo: "13699/L5/EE/SEP2025", name: "Daniel Gichini Mathenge" },
      { admissionNo: "13700/L5/EE/SEP2025", name: "Lilian Loko Kyalo" },
      { admissionNo: "13701/L5/EE/SEP2025", name: "Ezra Kibet Korir" },
      { admissionNo: "13702/L5/EE/SEP2025", name: "Denis Otieno Okong'o" },
      { admissionNo: "13704/L5/EE/SEP2025", name: "Victor Mutua Muteti" },
      { admissionNo: "13756/L5/EE/SEP2025", name: "Lewis Mwenda" },
      { admissionNo: "13758/L5/EE/SEP2025", name: "Safi Hussein Diba" },
      { admissionNo: "13765/L5/EE/SEP2025", name: "Ezra Kipngeno" },
      { admissionNo: "13767/L5/EE/SEP2025", name: "Mercy Koka Munyoki" },
      { admissionNo: "13768/L5/EE/SEP2025", name: "Norman Kipkorir Bett" },
      { admissionNo: "13777/L5/EE/SEP2025", name: "Austine Okoth Odongo" },
      { admissionNo: "13693/L5/EE/SEP2025", name: "Nuru Ongori Keragori" },
      { admissionNo: "13772/L5/EE/SEP2025", name: "Stephen Mule Ngunga" }
    ]
  },
  'DEEMAY2024A': {
    code: 'DEEMAY2024A',
    displayName: 'DEEMAY2024A (Diploma Electrical)',
    category: 'Diploma',
    teachers: ['GLADYS', 'OMONDI', 'ROSE', 'GITHOGORI', 'OUNGO', 'MUTUKU', 'MUTENDE', 'DORIS', 'CYPRIAN', 'NGANA', 'MBURU'],
    teacherPins: {
      'GLADYS': '6936', 'OMONDI': '5810', 'ROSE': '9374', 'GITHOGORI': '1586', 'OUNGO': '2584',
      'MUTUKU': '3700', 'MUTENDE': '7148', 'DORIS': '5824', 'CYPRIAN': '1480', 'NGANA': '4708', 'MBURU': '3820'
    },
    sessions: [
      { day: "MON", time: "08:00-10:00", subject: "ANALOGUE ELECTRONICS II", lecturer: "GLADYS" },
      { day: "MON", time: "10:30-12:30", subject: "INDUSTRIAL PLCS", lecturer: "OMONDI" },
      { day: "MON", time: "13:30-15:30", subject: "ANALOGUE ELECTRONICS II", lecturer: "GLADYS" },
      { day: "MON", time: "15:30-17:30", subject: "BUSINESS PLAN", lecturer: "MUTENDE" },
      { day: "TUE", time: "08:00-10:00", subject: "DIGITAL ELECTRONICS", lecturer: "ROSE" },
      { day: "TUE", time: "10:30-12:30", subject: "ELECTRICAL PROTECTION & BUILDING SERVICES", lecturer: "GITHOGORI" },
      { day: "TUE", time: "13:30-15:30", subject: "ELECTRICAL PROTECTION & BUILDING SERVICES", lecturer: "GITHOGORI" },
      { day: "TUE", time: "15:30-17:30", subject: "ELECTRICAL CIRCUIT ANALYSIS", lecturer: "OUNGO" },
      { day: "WED", time: "08:00-10:00", subject: "ELECTRICAL POWER GENERATION & TRANSMISSION", lecturer: "MUTUKU" },
      { day: "WED", time: "10:30-12:30", subject: "ELECTRICAL POWER GENERATION & TRANSMISSION", lecturer: "MUTUKU" },
      { day: "WED", time: "13:30-15:30", subject: "PRACTICALS", lecturer: "" },
      { day: "THU", time: "08:00-10:00", subject: "MATHEMATICS", lecturer: "DORIS" },
      { day: "THU", time: "10:30-12:30", subject: "MATHEMATICS", lecturer: "DORIS" },
      { day: "THU", time: "13:30-15:30", subject: "ELECTRICAL CIRCUIT ANALYSIS", lecturer: "OUNGO" },
      { day: "THU", time: "15:30-17:30", subject: "ELECTRICAL CIRCUIT ANALYSIS", lecturer: "OUNGO" },
      { day: "FRI", time: "08:00-10:00", subject: "DIGITAL ELECTRONICS", lecturer: "ROSE" },
      { day: "FRI", time: "10:30-12:30", subject: "CONTROL SYSTEMS", lecturer: "CYPRIAN" },
      { day: "FRI", time: "13:30-15:30", subject: "CONTROL SYSTEMS", lecturer: "CYPRIAN" },
      { day: "FRI", time: "15:30-17:30", subject: "ENGINEERING DRAWING", lecturer: "NGANA" }
    ],
    students: [
      { admissionNo: "12754/DEEMAY2024A", name: "KOLUA MICHEAL TONKEI" },
      { admissionNo: "12760/DEEMAY2024A", name: "ODHIAMBO MOURICE OTIENO" },
      { admissionNo: "12761/DEEMAY2024A", name: "KERONGO BEVIN MORAA" },
      { admissionNo: "12762/DEEMAY2024A", name: "KYALO SAMUEL MUNYALO" },
      { admissionNo: "12763/DEEMAY2024A", name: "MBURU JOHNSON MUCHOKI" },
      { admissionNo: "12768/DEEMAY2024A", name: "MUTHONI EVALYNE KENDI" },
      { admissionNo: "12769/DEEMAY2024A", name: "CHERUIYOT EMMANUEL KIPLANGAT" },
      { admissionNo: "12772/DEEMAY2024A", name: "KOGI GEOFFREY MWANGI" },
      { admissionNo: "12773/DEEMAY2024A", name: "MUKUMBA MORGAN CHACHA" },
      { admissionNo: "12774/DEEMAY2024A", name: "SAISI CONSTANTINE CHARLES" },
      { admissionNo: "12776/DEEMAY2024A", name: "OSERO CLIFFORD NYAIRATI" },
      { admissionNo: "12777/DEEMAY2024A", name: "OCHE ROMANOS KIOKO" },
      { admissionNo: "12779/DEEMAY2024A", name: "OTIENO JUNIOR OMONDI" },
      { admissionNo: "12781/DEEMAY2024A", name: "QAMPA GALGALLO GURACHA" },
      { admissionNo: "12787/DEEMAY2024A", name: "GACHII JOHN MBAGA" },
      { admissionNo: "12793/DEEMAY2024A", name: "KIPLANGAT KELVIN" },
      { admissionNo: "12798/DEEMAY2024A", name: "MUNYOKI MACDONALD MUSYOKA" },
      { admissionNo: "12799/DEEMAY2024A", name: "VETU PETER MUTUKU" },
      { admissionNo: "12801/DEEMAY2024A", name: "NZEKI BRIAN MUTUKU" },
      { admissionNo: "12802/DEEMAY2024A", name: "BARASA SAMANTHA ATIENO" },
      { admissionNo: "12885/DEEMAY2024A", name: "BUNDI BRIAN" },
      { admissionNo: "12895/DEEMAY2024A", name: "EDMOND MWANGI" },
      { admissionNo: "12896/DEEMAY2024A", name: "MUMIRIA CORNELIUS MUTURI" },
      { admissionNo: "12897/DEEMAY2024A", name: "MILDRED AUMA" },
      { admissionNo: "12902/DEEMAY2024A", name: "MAUREEN CHELANGAT" },
      { admissionNo: "12903/DEEMAY2024A", name: "OLUOCH DERICK BUODO" },
      { admissionNo: "13632/DEEMAY2024A", name: "KIIRAKI FRANCIS MUNGAI" },
      { admissionNo: "13634/DEEMAY2024A", name: "KIPTOO MARION JEPKURUI" },
      { admissionNo: "13635/DEEMAY2024A", name: "CHELANGA MIGAL JELIMO" },
      { admissionNo: "13654/DEEMAY2024A", name: "AMBALWA JOY AMANI" },
      { admissionNo: "13659/DEEMAY2024A", name: "NGURE MYLES" },
      { admissionNo: "13663/DEEMAY2024A", name: "KINYANJUI ELIJAH NDATHO" },
      { admissionNo: "13745/DEEMAY2024A", name: "MWANGI ROSE NJERI" },
      { admissionNo: "13751/DEEMAY2024A", name: "NJOROGE PAUL NDEGWA" },
      { admissionNo: "12291/DEEMAY2024A", name: "MAINA MICHAEL MUGO" },
      { admissionNo: "12752/DEEMAY2024A", name: "KIPKEMBOI STANLEY KIRWA" },
      { admissionNo: "12755/DEEMAY2024A", name: "KYALO BENSON MUTEMBEI" },
      { admissionNo: "12757/DEEMAY2024A", name: "MURIGI LAWRENCE KARANJA" },
      { admissionNo: "12767/DEEMAY2024A", name: "LESALAJA NAHSHON LENKAKENYA" },
      { admissionNo: "12770/DEEMAY2024A", name: "WESONGA WICYLIFFEE ODONGO" },
      { admissionNo: "12771/DEEMAY2024A", name: "ZADDOCK KIBET" },
      { admissionNo: "12783/DEEMAY2024A", name: "MOGERE MOSES ONYANCHA" },
      { admissionNo: "12784/DEEMAY2024A", name: "MUEMA BENEDICT MUTINDA" },
      { admissionNo: "12792/DEEMAY2024A", name: "BIKETI SEITH BARAKA" },
      { admissionNo: "12797/DEEMAY2024A", name: "NANJIRA ARTHUR ABNER" },
      { admissionNo: "12804/DEEMAY2024A", name: "NGENGA NEWTON" },
      { admissionNo: "12805/DEEMAY2024A", name: "RUGUMI FELIX NDIRANGU" },
      { admissionNo: "12864/DEEMAY2024A", name: "MOGERE SAMEL ATEMBA" },
      { admissionNo: "12866/DEEMAY2024A", name: "ALUGA DANIEL OYUDA" },
      { admissionNo: "12872/DEEMAY2024A", name: "ODIWOUR PHILIP ODHIAMBO" },
      { admissionNo: "12881/DEEMAY2024A", name: "MBINDA KELVIN MUOMO" },
      { admissionNo: "12882/DEEMAY2024A", name: "KIRAGU WINNIE WANGUI" },
      { admissionNo: "12149/DEEMAY2023R", name: "KANGATA JOHN NJOROGE" },
      { admissionNo: "12751/DEEMAY2024A", name: "KEMMON HENRY GERALD" }
    ]
  },
  'DEEMAY2024B': {
    code: 'DEEMAY2024B',
    displayName: 'DEEMAY2024B (Diploma Electrical)',
    category: 'Diploma',
    teachers: ['OMONDI', 'CYPRIAN', 'DORIS', 'MBURU', 'ROSE', 'DON', 'DOROTHY', 'NGANA', 'WAFULA', 'GITHOGORI'],
    teacherPins: {
      'OMONDI': '5810', 'CYPRIAN': '1480', 'DORIS': '5824', 'MBURU': '3820', 'ROSE': '9374',
      'DON': '4712', 'DOROTHY': '5922', 'NGANA': '4708', 'WAFULA': '9360', 'GITHOGORI': '1586'
    },
    sessions: [
      { day: "MON", time: "08:00-10:00", subject: "INDUSTRIAL PLCS", lecturer: "OMONDI" },
      { day: "MON", time: "10:30-12:30", subject: "PRACTICALS", lecturer: "" },
      { day: "MON", time: "13:30-15:30", subject: "CONTROL SYSTEMS", lecturer: "CYPRIAN" },
      { day: "MON", time: "15:30-17:30", subject: "MATHEMATICS", lecturer: "DORIS" },
      { day: "TUE", time: "08:00-10:00", subject: "ANALOGUE ELECTRONICS II", lecturer: "MBURU" },
      { day: "TUE", time: "10:30-12:30", subject: "DIGITAL ELECTRONICS", lecturer: "ROSE" },
      { day: "TUE", time: "13:30-15:30", subject: "DIGITAL ELECTRONICS", lecturer: "ROSE" },
      { day: "TUE", time: "15:30-17:30", subject: "ELECTRICAL POWER GENERATION & TRANSMISSION", lecturer: "DON" },
      { day: "WED", time: "08:00-10:00", subject: "BUSINESS PLAN", lecturer: "DOROTHY" },
      { day: "WED", time: "10:30-12:30", subject: "ENGINEERING DRAWING", lecturer: "NGANA" },
      { day: "WED", time: "13:30-15:30", subject: "ELECTRICAL CIRCUIT ANALYSIS", lecturer: "WAFULA" },
      { day: "THU", time: "08:00-10:00", subject: "ELECTRICAL POWER GENERATION & TRANSMISSION", lecturer: "DON" },
      { day: "THU", time: "10:30-12:30", subject: "ELECTRICAL PROTECTION & BUILDING SERVICES", lecturer: "GITHOGORI" },
      { day: "THU", time: "13:30-15:30", subject: "ELECTRICAL PROTECTION & BUILDING SERVICES", lecturer: "GITHOGORI" },
      { day: "THU", time: "15:30-17:30", subject: "MATHEMATICS", lecturer: "DORIS" },
      { day: "FRI", time: "08:00-10:00", subject: "CONTROL SYSTEMS", lecturer: "CYPRIAN" },
      { day: "FRI", time: "10:30-12:30", subject: "ANALOGUE ELECTRONICS II", lecturer: "MBURU" },
      { day: "FRI", time: "13:30-15:30", subject: "ELECTRICAL CIRCUIT ANALYSIS", lecturer: "WAFULA" },
      { day: "FRI", time: "15:30-17:30", subject: "ELECTRICAL CIRCUIT ANALYSIS", lecturer: "WAFULA" }
    ],
    students: [
      { admissionNo: "12806/DEEMAY2024B", name: "MUTUA MAXWELL MUTISYA" },
      { admissionNo: "12807/DEEMAY2024B", name: "DAVID MWANGI" },
      { admissionNo: "12811/DEEMAY2024B", name: "MASINGOT SOLOMON KIPETUAN" },
      { admissionNo: "12813/DEEMAY2024B", name: "HUSSEIN SABIR ABDINUR" },
      { admissionNo: "12818/DEEMAY2024B", name: "MUIGIRIRI PETER WACHIRA" },
      { admissionNo: "12819/DEEMAY2024B", name: "MOGOA JERUSAH BISIERI" },
      { admissionNo: "12826/DEEMAY2024B", name: "THAMBURA KEFA MURIIRA" },
      { admissionNo: "12827/DEEMAY2024B", name: "KAMATHE JOSEPH" },
      { admissionNo: "12828/DEEMAY2024B", name: "WAIHWA RAYMOND NGECHU" },
      { admissionNo: "12829/DEEMAY2024B", name: "KILONZO WINFRED MWENDE" },
      { admissionNo: "12834/DEEMAY2024B", name: "MURAYA ALLAN GITHUGA" },
      { admissionNo: "12835/DEEMAY2024B", name: "SHADRAC KIPCHIRCHIR" },
      { admissionNo: "12836/DEEMAY2024B", name: "KIMARU WINNIE WANGARI" },
      { admissionNo: "12837/DEEMAY2024B", name: "MASESE DAVID MAINA" },
      { admissionNo: "12838/DEEMAY2024B", name: "KIMATHI DUNCAN BUNDI" },
      { admissionNo: "12839/DEEMAY2024B", name: "GITONGA COLLINS" },
      { admissionNo: "12843/DEEMAY2024B", name: "OMBIMA STEPHEN OKANGA" },
      { admissionNo: "12845/DEEMAY2024B", name: "MWANGI ANOLD MUNENE" },
      { admissionNo: "12848/DEEMAY2024B", name: "KYALO LOISE MWENDE" },
      { admissionNo: "12850/DEEMAY2024B", name: "NYONGESA CYPRIAN WAFULA" },
      { admissionNo: "12851/DEEMAY2024B", name: "KIPKORE CORNELIUS KIPRUTO" },
      { admissionNo: "12862/DEEMAY2024B", name: "EMMIE DOREEN KERAGE" },
      { admissionNo: "12863/DEEMAY2024B", name: "NJAGI CHRIS MUNENE" },
      { admissionNo: "12870/DEEMAY2024B", name: "OMONDI CLIFF WILLS" },
      { admissionNo: "12989/DEEMAY2024B", name: "MCHANA CHARLTON" },
      { admissionNo: "12809/DEEMAY2024B", name: "MAMBO OMAR ABDULMALIK" },
      { admissionNo: "12815/DEEMAY2024B", name: "NYINKE JACOB MASAILEL" },
      { admissionNo: "12816/DEEMAY2024B", name: "SANKALE SOLOMON KANTI" },
      { admissionNo: "12823/DEEMAY2024B", name: "GATOBI IAN KOOME" },
      { admissionNo: "12840/DEEMAY2024B", name: "GITHINJI ZACHARY MWANIKI" },
      { admissionNo: "12841/DEEMAY2024B", name: "NJUNGU JOSEPH MAINA" },
      { admissionNo: "12842/DEEMAY2024B", name: "MWANGI NEHEMIAH NGOORO" },
      { admissionNo: "12854/DEEMAY2024B", name: "NTHEI MORIS KILEE" },
      { admissionNo: "12861/DEEMAY2024B", name: "MBUYA ISSAK AHMED" },
      { admissionNo: "12867/DEEMAY2024B", name: "KORIR BRYTON KIMUTAI" }
    ]
  },
  'DEEMAY2025R': {
    code: 'DEEMAY2025R',
    displayName: 'DEEMAY2025R (Diploma Electrical)',
    category: 'Diploma',
    teachers: ['KIRIGWI', 'ONAYA', 'OUNGO', 'DON', 'SHARON', 'OPIYO', 'NAOMI', 'DOROTHY', 'NGANA', 'MUTENDE', 'OMONDI', 'JENNIFER'],
    teacherPins: {
      'KIRIGWI': '6034', 'ONAYA': '1472', 'OUNGO': '2584', 'DON': '4712', 'SHARON': '0472',
      'OPIYO': '0474', 'NAOMI': '3696', 'DOROTHY': '5922', 'NGANA': '4708', 'MUTENDE': '7148', 'OMONDI': '5810', 'JENNIFER': '6922'
    },
    sessions: [
      { day: "MON", time: "08:00-10:00", subject: "ENGINEERING DRAWING", lecturer: "KIRIGWI" },
      { day: "MON", time: "10:30-12:30", subject: "MATHEMATICS", lecturer: "ONAYA" },
      { day: "MON", time: "13:30-15:30", subject: "ELECTRICAL PRINCIPLES", lecturer: "OUNGO" },
      { day: "MON", time: "15:30-17:30", subject: "ELECTRICAL PRINCIPLES", lecturer: "OUNGO" },
      { day: "TUE", time: "08:00-10:00", subject: "ELECTRICAL MEASUREMENTS", lecturer: "DON" },
      { day: "TUE", time: "10:30-12:30", subject: "MECHANICAL SCIENCE", lecturer: "SHARON" },
      { day: "TUE", time: "13:30-15:30", subject: "ELECTRICAL INSTALLATION", lecturer: "OPIYO" },
      { day: "TUE", time: "15:30-17:30", subject: "ELECTRICAL INSTALLATION", lecturer: "OPIYO" },
      { day: "WED", time: "08:00-10:00", subject: "SOLAR", lecturer: "NAOMI" },
      { day: "WED", time: "10:30-12:30", subject: "COMM SKILLS", lecturer: "DOROTHY" },
      { day: "WED", time: "13:30-15:30", subject: "MATERIALS AND PROCESSESS", lecturer: "NGANA" },
      { day: "THU", time: "08:00-10:00", subject: "ENTREPRENEUSHIP", lecturer: "MUTENDE" },
      { day: "THU", time: "10:30-12:30", subject: "ANALOGUE ELECTRONICS I", lecturer: "OMONDI" },
      { day: "THU", time: "13:30-15:30", subject: "ANALOGUE ELECTRONICS I", lecturer: "OMONDI" },
      { day: "THU", time: "15:30-17:30", subject: "MATHEMATICS", lecturer: "ONAYA" },
      { day: "FRI", time: "08:00-10:00", subject: "ELECTRICAL MEASUREMENTS", lecturer: "DON" },
      { day: "FRI", time: "10:30-12:30", subject: "PHYSICAL SCIENCE", lecturer: "SHARON" },
      { day: "FRI", time: "13:30-15:30", subject: "ICT", lecturer: "JENNIFER" },
      { day: "FRI", time: "15:30-17:30", subject: "ICT", lecturer: "JENNIFER" }
    ],
    students: [
      { admissionNo: "13062/DEEMAY2025R", name: "WAWERU SAMUEL MUCHIRI" },
      { admissionNo: "13063/DEEMAY2025R", name: "MWIRICHIA TIMOTHY MUTABARI" },
      { admissionNo: "13068/DEEMAY2025R", name: "GITAU SIMON CRUZ MBACHIA" },
      { admissionNo: "13069/DEEMAY2025R", name: "MUSUNGU REGINA ANYANGO" },
      { admissionNo: "13070/DEEMAY2025R", name: "MOSOTI STEVE ONDIEKI" },
      { admissionNo: "13071/DEEMAY2025R", name: "NYAMWEYA BRIGHTSON OMWATA" },
      { admissionNo: "13077/DEEMAY2025R", name: "ARAKA KELLY GUSUTA" },
      { admissionNo: "13078/DEEMAY2025R", name: "MWANGI VINCENT KIRAGU" },
      { admissionNo: "13081/DEEMAY2025R", name: "GATI SOLOMON CHACHA" },
      { admissionNo: "13084/DEEMAY2025R", name: "OKIRU BRYAN" },
      { admissionNo: "13089/DEEMAY2025R", name: "MIRAMBO NAOMI BONARERI" },
      { admissionNo: "13092/DEEMAY2025R", name: "IPU TOLA TRANSITION" },
      { admissionNo: "13098/DEEMAY2025R", name: "MURAGE ANASTACIA NYAKIO" },
      { admissionNo: "13100/DEEMAY2025R", name: "ODHIAMBO BRANDAN ODUOR" },
      { admissionNo: "13101/DEEMAY2025R", name: "ONYANGO VINCENCIA OCHIENG" },
      { admissionNo: "13102/DEEMAY2025R", name: "ODUOR KEN OMONDI" },
      { admissionNo: "13103/DEEMAY2025R", name: "ABDIKADIR MAZUUD KUSOW" },
      { admissionNo: "13104/DEEMAY2025R", name: "AMOKONO EMMANUEL KIMAYI" },
      { admissionNo: "13105/DEEMAY2025R", name: "OTIENO CYNTHIA ATIENO" },
      { admissionNo: "13109/DEEMAY2025R", name: "METO IVINE JEPTOO" },
      { admissionNo: "13110/DEEMAY2025R", name: "ODHIAMBO DANIEL OTIENO" },
      { admissionNo: "13111/DEEMAY2025R", name: "OTUKE SHANIL MORAA" },
      { admissionNo: "13112/DEEMAY2025R", name: "KIMANZI EVANS MITAU" },
      { admissionNo: "13113/DEEMAY2025R", name: "CYRUS BOSIRE" },
      { admissionNo: "13114/DEEMAY2025R", name: "MARAGA SAMUEL BOSIRE" },
      { admissionNo: "13116/DEEMAY2025R", name: "AINOAM JEPCHUMBA" },
      { admissionNo: "13119/DEEMAY2025R", name: "KITHI SAFARI ELVIS" },
      { admissionNo: "13123/DEEMAY2025R", name: "OMOLO JOSEPH OBUDO" },
      { admissionNo: "13124/DEEMAY2025R", name: "OTIAMBO DANCARLOS OKENYE" },
      { admissionNo: "13125/DEEMAY2025R", name: "ELINA ACHIENG" },
      { admissionNo: "13126/DEEMAY2025R", name: "MAINA TIMOTHY NJOROGE" },
      { admissionNo: "13127/DEEMAY2025R", name: "ORWENYO SAMUEL MICHAKA" },
      { admissionNo: "13135/DEEMAY2025R", name: "THAGICHU SAMUEL NJENGA" },
      { admissionNo: "13136/DEEMAY2025R", name: "MUTEMI PATRICK NZOMO" },
      { admissionNo: "13138/DEEMAY2025R", name: "KYULE MWONGELA" },
      { admissionNo: "13139/DEEMAY2025R", name: "MUINDE ERIC NUENDO" },
      { admissionNo: "13142/DEEMAY2025R", name: "GUMATO JILLO HUKA" },
      { admissionNo: "13146/DEEMAY2025R", name: "KARIUKI DOMINIC MUCERU" },
      { admissionNo: "13150/DEEMAY2025R", name: "NDEGWA SUSAN WAIRIMU" },
      { admissionNo: "13151/DEEMAY2025R", name: "KIPNGETICH AMOS" },
      { admissionNo: "13430/DEEMAY2025R", name: "JOSEPH CLINTON" },
      { admissionNo: "13066/DEEMAY2025R", name: "MARWA EMMANUEL" },
      { admissionNo: "13072/DEEMAY2025R", name: "CHEROTICH FLOMAXINE" },
      { admissionNo: "13083/DEEMAY2025R", name: "OWINO MOSES MBUYU" },
      { admissionNo: "13087/DEEMAY2025R", name: "KAMBANJA LILIAN MUTIGA" },
      { admissionNo: "13106/DEEMAY2025R", name: "MUNANGWE DAVID TSIMILI" },
      { admissionNo: "13117/DEEMAY2025R", name: "KIPKORIR AMOS" },
      { admissionNo: "13120/DEEMAY2025R", name: "KIRAGU STEPHEN MWAURA" },
      { admissionNo: "13137/DEEMAY2025R", name: "ONYANGO BRIAN ODHIAMBO" },
      { admissionNo: "13061/DEEMAY2025R", name: "MATHEKA MAUREEN MWENDE" },
      { admissionNo: "13067/DEEMAY2025R", name: "AHMED ABDIBASID ABDIRAHAHMAN" },
      { admissionNo: "13073/DEEMAY2025R", name: "NDOMBI BENARDICT" },
      { admissionNo: "13080/DEEMAY2025R", name: "MASINDE YASEEN MUBARACK" },
      { admissionNo: "13093/DEEMAY2025R", name: "WAFULA BRUCE WEKESA" },
      { admissionNo: "13097/DEEMAY2025R", name: "ODONYO BRIGHTON OKOTH" },
      { admissionNo: "13107/DEEMAY2025R", name: "OSMAN ABDI IBRAHIM" }
    ]
  },
  'CDAC/L6/EE/SEP2025': {
    code: 'CDAC/L6/EE/SEP2025',
    displayName: 'CDAC/L6/EE/SEP2025 (Diploma Electrical - Level 6)',
    category: 'Diploma',
    teachers: ['WAFULA', 'KOBIA', 'MURIMI'],
    teacherPins: { 'WAFULA': '9360', 'KOBIA': '5555', 'MURIMI': '5050' },
    sessions: [
      { day: "TUE", time: "FULL DAY", subject: "SOLAR", lecturer: "WAFULA" },
      { day: "THU", time: "FULL DAY", subject: "MACHINE REWINDING", lecturer: "KOBIA" },
      { day: "FRI", time: "FULL DAY", subject: "BELLS AND ALARMS", lecturer: "MURIMI" }
    ],
    students: [
      { admissionNo: "13705/L6/EE/SEP2025", name: "Yuvinalis Mose" },
      { admissionNo: "13707/L6/EE/SEP2025", name: "Alex Kamande Kiboro" },
      { admissionNo: "13708/L6/EE/SEP2025", name: "Jesseb Katenya Kisaka" },
      { admissionNo: "13709/L6/EE/SEP2025", name: "Laurah Mary Mukhwana" },
      { admissionNo: "13710/L6/EE/SEP2025", name: "Brian Kokonya Odala" },
      { admissionNo: "13711/L6/EE/SEP2025", name: "Ishmael Munjuri Muthomi" },
      { admissionNo: "13712/L6/EE/SEP2025", name: "Derrick Wamwenge" },
      { admissionNo: "13713/L6/EE/SEP2025", name: "Winslet Wanjiku Wairimu" },
      { admissionNo: "13716/L6/EE/SEP2025", name: "Fridah Akinyi Orenyo" },
      { admissionNo: "13718/L6/EE/SEP2025", name: "Ruth Achieng Odoyo" },
      { admissionNo: "13725/L6/EE/SEP2025", name: "William Kimanzi Mwanzia" },
      { admissionNo: "13726/L6/EE/SEP2025", name: "Griffins Edga Omollo" },
      { admissionNo: "13727/L6/EE/SEP2025", name: "Briton Odiwuor Ouko" },
      { admissionNo: "13732/L6/EE/SEP2025", name: "Victor Gitonga M'ngaruthi" },
      { admissionNo: "13733/L6/EE/SEP2025", name: "Taj Njuki Gachangi" },
      { admissionNo: "13735/L6/EE/SEP2025", name: "Joseph Mutua Maingi" },
      { admissionNo: "13753/L6/SEP2025", name: "Mark Kathigo Muchira" },
      { admissionNo: "13755/L6/EE/SEP2025", name: "Carolyne Wanjiru Mwangi" },
      { admissionNo: "13759/L6/EE/SEP2025", name: "Elvis Kipruto" },
      { admissionNo: "13773/L6/EE/SEP2025", name: "Regan Roxy Mawira" },
      { admissionNo: "13774/L6/EE/SEP2025", name: "Felix Cheruiyot Ngeno" },
      { admissionNo: "13775/L6/EE/SEP2025", name: "Nelly Kerubo Orwaru" },
      { admissionNo: "13776/L6/EE/SEP2025", name: "Chris Ochieng" },
      { admissionNo: "13779/L6/EE/SEP2025", name: "Stanley Mbuvi Wambua" },
      { admissionNo: "13780/L6/EE/SEP2025", name: "Joshua Mwendwa Muela" },
      { admissionNo: "13757/L6/EE/SEP2025", name: "Elphas Kipchirchir" },
      { admissionNo: "13734/L6/EE/SEP2025", name: "Willy Mutungi Mutua" },
      { admissionNo: "13706/L6/EE/SEP2025", name: "Jedida Awino Otieno" }
    ]
  },
  'DEESEP2023R': {
    code: 'DEESEP2023R',
    displayName: 'DEESEP2023R (Diploma in Electrical Engineering)',
    category: 'Diploma',
    teachers: ['NAOMI', 'DOROTHY', 'MUSASIA', 'OUNGO', 'WANYAMA', 'KIMANI', 'ONAYA', 'OMONDI', 'ALOO', 'OMBUI'],
    teacherPins: {
      'NAOMI': '3696', 'DOROTHY': '5922', 'MUSASIA': '2698', 'OUNGO': '2584', 'WANYAMA': '1970',
      'KIMANI': '9668', 'ONAYA': '1474', 'OMONDI': '5810', 'ALOO': '4810', 'OMBUI': '9090'
    },
    sessions: [
      { day: "MON", time: "08:00-10:00", subject: "INDUSTRIAL ORG & MANAGEMENT", lecturer: "NAOMI" },
      { day: "MON", time: "10:30-12:30", subject: "INDUSTRIAL ORG & MANAGEMENT", lecturer: "NAOMI" },
      { day: "MON", time: "13:30-15:30", subject: "ESTIMATING AND TENDERING", lecturer: "DOROTHY" },
      { day: "MON", time: "15:30-17:30", subject: "ESTIMATING AND TENDERING", lecturer: "DOROTHY" },
      { day: "TUE", time: "08:00-10:00", subject: "MICRO PROCESSOR SYSTEMS", lecturer: "MUSASIA" },
      { day: "TUE", time: "10:30-12:30", subject: "MICRO PROCESSOR SYSTEMS", lecturer: "MUSASIA" },
      { day: "TUE", time: "13:30-15:30", subject: "MACHINES & UTILIZATION", lecturer: "OUNGO" },
      { day: "TUE", time: "15:30-17:30", subject: "TRADE PROJECT", lecturer: "WANYAMA/SUPERVISORS" },
      { day: "WED", time: "08:00-10:00", subject: "ELECTRICAL POWER & TRANSMISSION", lecturer: "KIMANI" },
      { day: "WED", time: "10:30-12:30", subject: "ELECTRICAL POWER & TRANSMISSION", lecturer: "KIMANI" },
      { day: "WED", time: "13:30-15:30", subject: "MATHEMATICS", lecturer: "ONAYA" },
      { day: "THU", time: "08:00-10:00", subject: "ELECTROMAGNETIC THEORY", lecturer: "OMONDI" },
      { day: "THU", time: "10:30-12:30", subject: "MICRO CONTROLLER TECHNOLOGY", lecturer: "ALOO" },
      { day: "THU", time: "13:30-15:30", subject: "MATHEMATICS", lecturer: "ONAYA" },
      { day: "THU", time: "15:30-17:30", subject: "TRADE PROJECT", lecturer: "WANYAMA/SUPERVISORS" },
      { day: "FRI", time: "08:00-10:00", subject: "MACHINES & UTILIZATION", lecturer: "OUNGO" },
      { day: "FRI", time: "10:30-12:30", subject: "MICRO CONTROLLER TECHNOLOGY", lecturer: "ALOO" },
      { day: "FRI", time: "13:30-15:30", subject: "POWER ELECTRONICS", lecturer: "OMBUI" },
      { day: "FRI", time: "15:30-17:30", subject: "POWER ELECTRONICS", lecturer: "OMBUI" }
    ],
    students: [
      { admissionNo: "11837/DEESEP2021R", name: "OMBASA ANNA KWAMBOKA" },
      { admissionNo: "12153/DEEMAY2023R", name: "MUNYITHYA JOSEPHAT KITEME" },
      { admissionNo: "12392/DEESEP2023R", name: "KAMAU RAYMOND NGINYO" },
      { admissionNo: "12395/DEESEP2023R", name: "KARIUKI WALLACE BORO" },
      { admissionNo: "12397/DEESEP2023R", name: "MICHEAL JOSEPH MULANDI" },
      { admissionNo: "12401/DEESEP2023R", name: "AYIENGA ALLAN OGWATI" },
      { admissionNo: "12402/DEESEP2023R", name: "NCHOE KELLY TOMPO" },
      { admissionNo: "12406/DEESEP2023R", name: "KEMOI GABRIEL KIBET" },
      { admissionNo: "12407/DEESEP2023R", name: "MUENI ROSE MITCHELL" },
      { admissionNo: "12409/DEESEP2023R", name: "INDANGASI RHODA NEKESA" },
      { admissionNo: "12411/DEESEP2023R", name: "NGANGA LILIAN WAITHERA" },
      { admissionNo: "12419/DEESEP2023R", name: "KARIUKI MARGARET WANJIKU" },
      { admissionNo: "12420/DEESEP2023R", name: "NGIMA FELIX EMMANUEL KABURI" },
      { admissionNo: "12421/DEESEP2023R", name: "MWANGI NICHOLAS MUNENE" },
      { admissionNo: "12422/DEESEP2023R", name: "CECIL ODUOR" },
      { admissionNo: "12425/DEESEP2023R", name: "MUTAHI MARK ERWAN" },
      { admissionNo: "12427/DEESEP2023R", name: "ONDARA WESLEY OTOIGO" },
      { admissionNo: "12429/DEESEP2023R", name: "NGAHU FRANKLIN KAGUTHI" },
      { admissionNo: "12432/DEESEP2023R", name: "AARON FRANCIS MUNYAO" },
      { admissionNo: "12435/DEESEP2023R", name: "SIMON NGAHU" },
      { admissionNo: "12438/DEESEP2023R", name: "KIMWELE BENJAMIN KIMANZI" },
      { admissionNo: "12439/DEESEP2023R", name: "OJIAMBO AMOS ONESMUS" },
      { admissionNo: "12440/DEESEP2023R", name: "MERCY CHEPKEMOI" },
      { admissionNo: "12445/DEESEP2023R", name: "LUMBASI CHRISPUS MALALA" },
      { admissionNo: "12450/DEESEP2023R", name: "MWANGI FLAVIANAH WAITHERERO" },
      { admissionNo: "12500/DEESEP2023R", name: "ADIENGE FRANCIS DENZEL" },
      { admissionNo: "12502/DEESEP2023R", name: "LEKISHON VICTOR ORAMAT" },
      { admissionNo: "12508/DEESEP2023R", name: "VICTOR BARASA" },
      { admissionNo: "12509/DEESEP2023R", name: "MATONGO LAURYN OBONYO" },
      { admissionNo: "12510/DEESEP2023R", name: "NGETICH BRIAN KIRWA" },
      { admissionNo: "12513/DEESEP2023R", name: "ERICSON AGEYO" },
      { admissionNo: "12514/DEESEP2022R", name: "KOSGEI KEVIN KIPKEMOI" },
      { admissionNo: "12515/DEESEP2023R", name: "KEMBOI BRIAN KIPKOGEI" },
      { admissionNo: "12543/DEESEP2023R", name: "KIONGOINA BENARD MOURUME" },
      { admissionNo: "12545/DEESEP2023R", name: "FESTUS KIPKOECH" },
      { admissionNo: "12546/DEESEP2023R", name: "MURIUKI EUGINE MACHIRA" },
      { admissionNo: "12551/DEESEP2023R", name: "ROTICH BRIAN KIMUTAI" },
      { admissionNo: "12400/DEESEP2023R", name: "WOKABI MICHEAL MUTURI" },
      { admissionNo: "12405/DEESEP2023R", name: "OP0NDO JEMILA AMONDI" },
      { admissionNo: "12416/DEESEP2023R", name: "EMMANUEL KIPKOECH" },
      { admissionNo: "12417/DEESEP2023R", name: "NTHENYA WAMBUA" },
      { admissionNo: "12433/DEESEP2023R", name: "FELIX KIPRONO NGETICH" },
      { admissionNo: "12437/DEESEP2023R", name: "OWUOR EUGINE KERE" },
      { admissionNo: "12501/DEESEP2023R", name: "MUHIA EMILIO MWANGI" },
      { admissionNo: "12506/DEESEP2023R", name: "SYLVIAH WAMBUI" },
      { admissionNo: "12547/DEESEP2023R", name: "NGENO JUSTICE KIPKIRUI" }
    ]
  }
};

// ===== MIGRATION FUNCTION =====

async function migrate() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  
  const db = drizzle(neon(process.env.DATABASE_URL), { schema });
  
  // Find the IESR demo school
  const schools = await db.select().from(schema.schools).where(eq(schema.schools.slug, 'iesr-demo'));
  const school = schools[0];
  if (!school) throw new Error("School not found. Run db:seed first.");
  
  console.log(`Migrating to school: ${school.name} (${school.id})`);
  
  // Track unique teachers across all classes
  const allTeachers = new Map<string, { name: string; pin: string }>();
  const allSubjects = new Set<string>();
  
  // First pass: collect all unique teachers and subjects
  for (const [code, data] of Object.entries(CLASS_CONFIG)) {
    for (const teacherName of data.teachers) {
      const pin = data.teacherPins[teacherName];
      if (pin && !allTeachers.has(teacherName)) {
        allTeachers.set(teacherName, { name: teacherName, pin });
      }
    }
    for (const session of data.sessions) {
      if (session.subject) allSubjects.add(session.subject);
    }
  }
  
  console.log(`Found ${allTeachers.size} unique teachers, ${allSubjects.size} unique subjects`);
  
  // Timetables have no unique key — clear this school's timetable so a re-run
  // rebuilds it cleanly instead of duplicating rows.
  await db.delete(schema.timetables).where(eq(schema.timetables.schoolId, school.id));

  // Teachers: no unique constraint on (school, name), so ON CONFLICT has no
  // target — look-up-or-insert keeps it idempotent across re-runs.
  const teacherIds = new Map<string, string>();
  for (const [name, { pin }] of allTeachers) {
    const existing = await db
      .select({ id: schema.teachers.id })
      .from(schema.teachers)
      .where(and(eq(schema.teachers.schoolId, school.id), eq(schema.teachers.name, name)))
      .limit(1);
    if (existing[0]) {
      teacherIds.set(name, existing[0].id);
      console.log(`  Teacher (exists): ${name}`);
      continue;
    }
    const { hash, salt } = await hashPin(pin);
    const [teacher] = await db.insert(schema.teachers).values({
      schoolId: school.id, name, pinHash: hash, pinSalt: salt, classIds: [], active: true,
    }).returning({ id: schema.teachers.id });
    teacherIds.set(name, teacher.id);
    console.log(`  Teacher: ${name} (PIN: ${pin})`);
  }
  
  // Subjects: unique(school_id, code). The old 8-char prefix could collide (e.g.
  // two "ELECTRICAL …" names) — use a collision-free slug code and upsert, so
  // re-runs and any overlap with seed data are graceful and still return the id.
  const subjectIds = new Map<string, string>();
  for (const subjectName of allSubjects) {
    const code =
      subjectName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "SUBJECT";
    const [subject] = await db
      .insert(schema.subjects)
      .values({ schoolId: school.id, code, name: subjectName, active: true })
      .onConflictDoUpdate({
        target: [schema.subjects.schoolId, schema.subjects.code],
        set: { name: subjectName, active: true },
      })
      .returning({ id: schema.subjects.id });
    subjectIds.set(subjectName, subject.id);
    console.log(`  Subject: ${code} - ${subjectName}`);
  }
  
  // Insert classes, students, timetable
  for (const [code, data] of Object.entries(CLASS_CONFIG)) {
    // Insert class
    const [cls] = await db
      .insert(schema.classes)
      .values({
        schoolId: school.id, code, displayName: data.displayName,
        category: data.category || "Other", active: true,
      })
      .onConflictDoUpdate({
        target: [schema.classes.schoolId, schema.classes.code],
        set: { displayName: data.displayName, category: data.category || "Other", active: true },
      })
      .returning({ id: schema.classes.id });
    console.log(`\nClass: ${code} - ${data.displayName}`);
    
    // Insert students
    for (const student of data.students) {
      await db
        .insert(schema.students)
        .values({
          schoolId: school.id, admissionNo: student.admissionNo,
          fullName: student.name, classId: cls.id, active: true,
        })
        .onConflictDoUpdate({
          target: [schema.students.schoolId, schema.students.admissionNo],
          set: { fullName: student.name, classId: cls.id, active: true },
        });
    }
    console.log(`  ${data.students.length} students`);
    
    // Update teacher class assignments
    for (const teacherName of data.teachers) {
      const teacherId = teacherIds.get(teacherName);
      if (teacherId) {
        const teacher = await db.select().from(schema.teachers).where(eq(schema.teachers.id, teacherId));
        if (teacher[0]) {
          const currentClasses = teacher[0].classIds || [];
          if (!currentClasses.includes(cls.id)) {
            await db.update(schema.teachers)
              .set({ classIds: [...currentClasses, cls.id] })
              .where(eq(schema.teachers.id, teacherId));
          }
        }
      }
    }
    
    // Insert timetable
    for (const session of data.sessions) {
      const [startTime, endTime] = session.time === 'FULL DAY' 
        ? ['08:00', '17:00'] 
        : session.time.split('-').map(t => t.trim());
      
      const subjectId = subjectIds.get(session.subject) || null;

      // Handle lecturers with slashes (e.g., "KIRIGWI/NGANA") - use first lecturer
      const lecturerName = session.lecturer.split('/')[0].trim();
      const teacherId = teacherIds.get(lecturerName) || null;

      // DB CHECK expects lowercase 3-letter days ('mon'..'sun'); CLASS_CONFIG is
      // uppercase ('MON'). Normalize to satisfy timetables_day_check.
      const day = session.day.trim().toLowerCase().slice(0, 3) as
        "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

      await db.insert(schema.timetables).values({
        schoolId: school.id,
        classId: cls.id,
        day,
        startTime,
        endTime,
        subjectId,
        teacherId,
      });
    }
    console.log(`  ${data.sessions.length} timetable entries`);
  }
  
  console.log("\n✅ MIGRATION COMPLETE!");
  console.log(`   School: ${school.id}`);
  console.log(`   Classes: ${Object.keys(CLASS_CONFIG).length}`);
  console.log(`   Teachers: ${allTeachers.size}`);
  console.log(`   Subjects: ${allSubjects.size}`);
}

// Only auto-run when invoked directly (not when imported, e.g. by gen-migration-sql.ts).
if (process.argv[1] && /migrate-real-data\.[tj]s$/.test(process.argv[1])) {
  migrate().catch((e) => { console.error(e); process.exit(1); });
}