const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');

const csvData = `الجوال,البريد الإلكتروني,الإسم,رقم الهوية,حالة التوظيف,المسمى الوظيفي,مجال التدريس,التخصص
966509683264,,اريج عبده بن محمد تركي,1010669594,دائم,معلم,دين,دين
966550801116,batoul.alsoufi@gmail.com,البتول محمد سليمان الصوفي,1043325131,دائم,معلم,دين,دين
966502563997,amolhhfc123456@hotmail.com,امل حمود سعود السبيعي,1089953663,دائم,معلم,رياضيات,رياضيات
966552523681,t185316@mkhg.moe.gov.sa,امنه علي احمد السهيمي,1068192960,دائم,معلم,التربية الفنية,فنية
966531193174,t9746122@mkhg.moe.gov.sa,بدور عبيد مكتوب المالكي,1077643987,دائم,معلم,اللغة الإنجليزية,إنجليزي
966552832729,t96688575@mkhg.moe.gov.sa,حنان محمد سعيد الزهراني,1094993290,عقد,معلم,اللغة الإنجليزية,إنجليزي
966556971084,t9583040@mkhg.moe.gov.sa,حياة يوسف بن درويش بوبه,1065712158,دائم,معلم,علم نفس واجتماع,علم نفس
966557416665,t161319@mkhg.moe.gov.sa,خلود خالد محمد الجيزاني,1010262309,دائم,معلم,اللغة الإنجليزية,إنجليزي
966554546789,t567286@mkhg.moe.gov.sa,خيريه عابد عبداللطيف منشي,1038667364,دائم,معلم,اقتصاد منزلي,اقتصاد منزلي
966500046770,t827782@mkhg.moe.gov.sa,درين عيدروس بن عبد القادر الحبشي,1012384861,دائم,معلم,رياضيات,رياضيات
966552244081,t235380@mkhg.moe.gov.sa,رانيه كمال محمد قاروت,1019409836,دائم,معلم,كيمياء,كيمياء
966540522692,t9305669@mkhg.moe.gov.sa,رانيه محمد عبدالله الاحمدي,1027408390,دائم,معلم,أحياء,أحياء
966538544464,t613292@mkhg.moe.gov.sa,رايه علي خليل هتاني,1009676931,دائم,معلم,التربية الاجتماعية والوطنية,جغرافيا
966533926716,,رنده محمد بن مرزوق السهلي,1035114642,دائم,معلم,كيمياء,كيمياء
966555749516,t626859@mkhg.moe.gov.sa,ريم بنت مسعود بن عبيد المولد,1021326572,دائم,معلم,فيزياء,فيزياء
966569418491,t9561929@mkhg.moe.gov.sa,ساره محمد سليمان الطلحي,1092332483,عقد,معلم,الحاسب الآلي,حاسب
966540773232,t477517@mkhg.moe.gov.sa,سعاد بنت مساعد بن حضيض المحمادي,1028438693,دائم,معلم,اللغة العربية,عربي
966559134228,t348222@mkhg.moe.gov.sa,سعيده احمد حسن القاسمي,1029416573,دائم,معلم,كيمياء,كيمياء
966567756734,t850234@mkhg.moe.gov.sa,سلمى داوود عبدالرحمن السيامي,1060106364,دائم,معلم,فيزياء,فيزياء
966500581322,t542237@mkhg.moe.gov.sa,سميره بنت ابراهيم بن عثمان عثمان,1118922978,دائم,معلم,رياضيات,رياضيات
966504501406,t278548@mkhg.moe.gov.sa,سميره سعد سليمان الاحمدي الحربي,1001350600,دائم,معلم,التربية الاجتماعية والوطنية,جغرافيا
966531031064,t623349@mkhg.moe.gov.sa,سميره محمد حمد الثمالي,1053758262,دائم,معلم,اللغة العربية,عربي
966580127127,t453062@mkhg.moe.gov.sa,سميه طلال ابن محمد بحه,1018584357,دائم,معلم,الحاسب الآلي,حاسب
966560342997,t276103@mkhg.moe.gov.sa,طرفه عمر عمر هوساوي,1071632648,دائم,معلم,دين,قراءات
966500570822,t9341766@mkhg.moe.gov.sa,عبير سحيم مصلح الوليدى الشهري,1009357631,دائم,معلم,رياضيات,رياضيات
966555057874,,فاطمه علي مسعود الشنبري,1035874351,دائم,معلم,التربية الاجتماعية والوطنية,جغرافيا
966550220808,t326290@mkhg.moe.gov.sa,فاطمه محمد عبدالله البارقي,1051119111,دائم,معلم,فيزياء,فيزياء
966560376050,t941604@mkhg.moe.gov.sa,فوزيه صالح عطيه الزهراني,1060591052,دائم,معلم,اللغة الإنجليزية,إنجليزي
966501341969,t396187@mkhg.moe.gov.sa,مريم مساعد فايز الرحيلي,1110566468,دائم,معلم,دين,دين
966550074422,t680469@mkhg.moe.gov.sa,منال محمد رده الخزاعي,1016978650,دائم,معلم,أحياء,أحياء
966532656942,t999067@mkhg.moe.gov.sa,منى جماح صالح الغامدي,1073463562,عقد,معلم,كيمياء,كيمياء
966504520578,t455752@mkhg.moe.gov.sa,مها محمد عبدالرحمن الهوساوي,1008480368,دائم,معلم,اقتصاد منزلي,اقتصاد منزلي
966508727560,t231804@mkhg.moe.gov.sa,نورة بنت يحي حامد الفهمي,1041241629,دائم,معلم,اللغة الإنجليزية,إنجليزي
966564954507,t749753@mkhg.moe.gov.sa,هناء بنت صالح زيني الامير,1012793475,دائم,معلم,رياضيات,رياضيات
966540444543,t490010@mkhg.moe.gov.sa,هناء عادل يعقوب التركي,1032930222,دائم,معلم,أحياء,أحياء
966506536278,t431115@mkhg.moe.gov.sa,هوازم ظويهرصالح محمد المغامسي,1057277913,دائم,معلم,اللغة العربية,عربي
966556536776,t9381793@mkhg.moe.gov.sa,ولاء بندر رشيد الحربي,1015524257,دائم,معلم,مكتبات,مكتبات`;

const lines = csvData.trim().split('\n');
const headers = lines[0].split(',');
const rows = [];
const idSet = new Set();
const mobileSet = new Set();
const nameSet = new Set();

for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(',');
  const rowObj = {};
  headers.forEach((h, idx) => {
    rowObj[h] = parts[idx] ? parts[idx].trim() : '';
  });
  rows.push(rowObj);

  const id = rowObj['رقم الهوية'];
  const mobile = rowObj['الجوال'];
  const name = rowObj['الإسم'];

  if (idSet.has(id)) {
    console.error('ERROR: Duplicate ID found:', id, name);
    process.exit(1);
  }
  idSet.add(id);

  if (mobileSet.has(mobile)) {
    console.error('ERROR: Duplicate Mobile found:', mobile, name);
    process.exit(1);
  }
  mobileSet.add(mobile);

  if (nameSet.has(name)) {
    console.error('ERROR: Duplicate Name found:', name);
    process.exit(1);
  }
  nameSet.add(name);

  if (!/^\d{10}$/.test(id)) {
    console.error('ERROR: Invalid National ID length:', id, name);
    process.exit(1);
  }
}

console.log('✓ Validation Passed: 37 Teachers, 0 Duplicates, 0 Invalid IDs.');

// 1. Generate updated Excel file
const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(rows, { header: headers });
ws['!cols'] = [
  { wch: 18 }, // الجوال
  { wch: 32 }, // البريد الإلكتروني
  { wch: 36 }, // الإسم
  { wch: 18 }, // رقم الهوية
  { wch: 14 }, // حالة التوظيف
  { wch: 14 }, // المسمى الوظيفي
  { wch: 24 }, // مجال التدريس
  { wch: 24 }  // التخصص
];
xlsx.utils.book_append_sheet(wb, ws, 'بيانات المعلمات');
xlsx.writeFile(wb, 'منسوبات ث5.xlsx');
console.log('✓ Wrote updated منسوبات ث5.xlsx');

// 2. Output JSON definition for codebase
const jsonCode = `export interface OfficialTeacherRecord {
  mobile: string;
  email: string;
  fullName: string;
  nationalId: string;
  employmentStatus: "دائم" | "عقد";
  jobTitle: string;
  teachingField: string;
  specialty: string;
}

export const OFFICIAL_TEACHERS: OfficialTeacherRecord[] = ${JSON.stringify(
  rows.map((r) => ({
    mobile: r['الجوال'],
    email: r['البريد الإلكتروني'],
    fullName: r['الإسم'],
    nationalId: r['رقم الهوية'],
    employmentStatus: r['حالة التوظيف'],
    jobTitle: r['المسمى الوظيفي'],
    teachingField: r['مجال التدريس'],
    specialty: r['التخصص'],
  })),
  null,
  2
)};
`;

fs.writeFileSync(path.join(__dirname, '../lib/officialTeachersData.ts'), jsonCode, 'utf8');
console.log('✓ Wrote lib/officialTeachersData.ts');
