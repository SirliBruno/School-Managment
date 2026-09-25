import { Teacher } from "@/types/teacher";
import {
  normalizeArabicName,
  normalizeNationalId,
  normalizeSaudiMobile,
} from "./teacherDeduplication";

export interface OfficialTeacherRecord {
  mobile: string;
  email: string;
  fullName: string;
  nationalId: string;
  employmentStatus: "دائم" | "عقد";
  jobTitle: string;
  teachingField: string;
  specialty: string;
}

export const OFFICIAL_TEACHERS: OfficialTeacherRecord[] = [
  {
    "mobile": "966509683264",
    "email": "",
    "fullName": "اريج عبده بن محمد تركي",
    "nationalId": "1010669594",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "دين",
    "specialty": "دين"
  },
  {
    "mobile": "966550801116",
    "email": "batoul.alsoufi@gmail.com",
    "fullName": "البتول محمد سليمان الصوفي",
    "nationalId": "1043325131",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "دين",
    "specialty": "دين"
  },
  {
    "mobile": "966502563997",
    "email": "amolhhfc123456@hotmail.com",
    "fullName": "امل حمود سعود السبيعي",
    "nationalId": "1089953663",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "رياضيات",
    "specialty": "رياضيات"
  },
  {
    "mobile": "966552523681",
    "email": "t185316@mkhg.moe.gov.sa",
    "fullName": "امنه علي احمد السهيمي",
    "nationalId": "1068192960",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "التربية الفنية",
    "specialty": "فنية"
  },
  {
    "mobile": "966531193174",
    "email": "t9746122@mkhg.moe.gov.sa",
    "fullName": "بدور عبيد مكتوب المالكي",
    "nationalId": "1077643987",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "اللغة الإنجليزية",
    "specialty": "إنجليزي"
  },
  {
    "mobile": "966552832729",
    "email": "t96688575@mkhg.moe.gov.sa",
    "fullName": "حنان محمد سعيد الزهراني",
    "nationalId": "1094993290",
    "employmentStatus": "عقد",
    "jobTitle": "معلم",
    "teachingField": "اللغة الإنجليزية",
    "specialty": "إنجليزي"
  },
  {
    "mobile": "966556971084",
    "email": "t9583040@mkhg.moe.gov.sa",
    "fullName": "حياة يوسف بن درويش بوبه",
    "nationalId": "1065712158",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "علم نفس واجتماع",
    "specialty": "علم نفس"
  },
  {
    "mobile": "966557416665",
    "email": "t161319@mkhg.moe.gov.sa",
    "fullName": "خلود خالد محمد الجيزاني",
    "nationalId": "1010262309",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "اللغة الإنجليزية",
    "specialty": "إنجليزي"
  },
  {
    "mobile": "966554546789",
    "email": "t567286@mkhg.moe.gov.sa",
    "fullName": "خيريه عابد عبداللطيف منشي",
    "nationalId": "1038667364",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "اقتصاد منزلي",
    "specialty": "اقتصاد منزلي"
  },
  {
    "mobile": "966500046770",
    "email": "t827782@mkhg.moe.gov.sa",
    "fullName": "درين عيدروس بن عبد القادر الحبشي",
    "nationalId": "1012384861",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "رياضيات",
    "specialty": "رياضيات"
  },
  {
    "mobile": "966552244081",
    "email": "t235380@mkhg.moe.gov.sa",
    "fullName": "رانيه كمال محمد قاروت",
    "nationalId": "1019409836",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "كيمياء",
    "specialty": "كيمياء"
  },
  {
    "mobile": "966540522692",
    "email": "t9305669@mkhg.moe.gov.sa",
    "fullName": "رانيه محمد عبدالله الاحمدي",
    "nationalId": "1027408390",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "أحياء",
    "specialty": "أحياء"
  },
  {
    "mobile": "966538544464",
    "email": "t613292@mkhg.moe.gov.sa",
    "fullName": "رايه علي خليل هتاني",
    "nationalId": "1009676931",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "التربية الاجتماعية والوطنية",
    "specialty": "جغرافيا"
  },
  {
    "mobile": "966533926716",
    "email": "",
    "fullName": "رنده محمد بن مرزوق السهلي",
    "nationalId": "1035114642",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "كيمياء",
    "specialty": "كيمياء"
  },
  {
    "mobile": "966555749516",
    "email": "t626859@mkhg.moe.gov.sa",
    "fullName": "ريم بنت مسعود بن عبيد المولد",
    "nationalId": "1021326572",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "فيزياء",
    "specialty": "فيزياء"
  },
  {
    "mobile": "966569418491",
    "email": "t9561929@mkhg.moe.gov.sa",
    "fullName": "ساره محمد سليمان الطلحي",
    "nationalId": "1092332483",
    "employmentStatus": "عقد",
    "jobTitle": "معلم",
    "teachingField": "الحاسب الآلي",
    "specialty": "حاسب"
  },
  {
    "mobile": "966540773232",
    "email": "t477517@mkhg.moe.gov.sa",
    "fullName": "سعاد بنت مساعد بن حضيض المحمادي",
    "nationalId": "1028438693",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "اللغة العربية",
    "specialty": "عربي"
  },
  {
    "mobile": "966559134228",
    "email": "t348222@mkhg.moe.gov.sa",
    "fullName": "سعيده احمد حسن القاسمي",
    "nationalId": "1029416573",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "كيمياء",
    "specialty": "كيمياء"
  },
  {
    "mobile": "966567756734",
    "email": "t850234@mkhg.moe.gov.sa",
    "fullName": "سلمى داوود عبدالرحمن السيامي",
    "nationalId": "1060106364",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "فيزياء",
    "specialty": "فيزياء"
  },
  {
    "mobile": "966500581322",
    "email": "t542237@mkhg.moe.gov.sa",
    "fullName": "سميره بنت ابراهيم بن عثمان عثمان",
    "nationalId": "1118922978",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "رياضيات",
    "specialty": "رياضيات"
  },
  {
    "mobile": "966504501406",
    "email": "t278548@mkhg.moe.gov.sa",
    "fullName": "سميره سعد سليمان الاحمدي الحربي",
    "nationalId": "1001350600",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "التربية الاجتماعية والوطنية",
    "specialty": "جغرافيا"
  },
  {
    "mobile": "966531031064",
    "email": "t623349@mkhg.moe.gov.sa",
    "fullName": "سميره محمد حمد الثمالي",
    "nationalId": "1053758262",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "اللغة العربية",
    "specialty": "عربي"
  },
  {
    "mobile": "966580127127",
    "email": "t453062@mkhg.moe.gov.sa",
    "fullName": "سميه طلال ابن محمد بحه",
    "nationalId": "1018584357",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "الحاسب الآلي",
    "specialty": "حاسب"
  },
  {
    "mobile": "966560342997",
    "email": "t276103@mkhg.moe.gov.sa",
    "fullName": "طرفه عمر عمر هوساوي",
    "nationalId": "1071632648",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "دين",
    "specialty": "قراءات"
  },
  {
    "mobile": "966500570822",
    "email": "t9341766@mkhg.moe.gov.sa",
    "fullName": "عبير سحيم مصلح الوليدى الشهري",
    "nationalId": "1009357631",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "رياضيات",
    "specialty": "رياضيات"
  },
  {
    "mobile": "966555057874",
    "email": "",
    "fullName": "فاطمه علي مسعود الشنبري",
    "nationalId": "1035874351",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "التربية الاجتماعية والوطنية",
    "specialty": "جغرافيا"
  },
  {
    "mobile": "966550220808",
    "email": "t326290@mkhg.moe.gov.sa",
    "fullName": "فاطمه محمد عبدالله البارقي",
    "nationalId": "1051119111",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "فيزياء",
    "specialty": "فيزياء"
  },
  {
    "mobile": "966560376050",
    "email": "t941604@mkhg.moe.gov.sa",
    "fullName": "فوزيه صالح عطيه الزهراني",
    "nationalId": "1060591052",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "اللغة الإنجليزية",
    "specialty": "إنجليزي"
  },
  {
    "mobile": "966501341969",
    "email": "t396187@mkhg.moe.gov.sa",
    "fullName": "مريم مساعد فايز الرحيلي",
    "nationalId": "1110566468",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "دين",
    "specialty": "دين"
  },
  {
    "mobile": "966550074422",
    "email": "t680469@mkhg.moe.gov.sa",
    "fullName": "منال محمد رده الخزاعي",
    "nationalId": "1016978650",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "أحياء",
    "specialty": "أحياء"
  },
  {
    "mobile": "966532656942",
    "email": "t999067@mkhg.moe.gov.sa",
    "fullName": "منى جماح صالح الغامدي",
    "nationalId": "1073463562",
    "employmentStatus": "عقد",
    "jobTitle": "معلم",
    "teachingField": "كيمياء",
    "specialty": "كيمياء"
  },
  {
    "mobile": "966504520578",
    "email": "t455752@mkhg.moe.gov.sa",
    "fullName": "مها محمد عبدالرحمن الهوساوي",
    "nationalId": "1008480368",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "اقتصاد منزلي",
    "specialty": "اقتصاد منزلي"
  },
  {
    "mobile": "966508727560",
    "email": "t231804@mkhg.moe.gov.sa",
    "fullName": "نورة بنت يحي حامد الفهمي",
    "nationalId": "1041241629",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "اللغة الإنجليزية",
    "specialty": "إنجليزي"
  },
  {
    "mobile": "966564954507",
    "email": "t749753@mkhg.moe.gov.sa",
    "fullName": "هناء بنت صالح زيني الامير",
    "nationalId": "1012793475",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "رياضيات",
    "specialty": "رياضيات"
  },
  {
    "mobile": "966540444543",
    "email": "t490010@mkhg.moe.gov.sa",
    "fullName": "هناء عادل يعقوب التركي",
    "nationalId": "1032930222",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "أحياء",
    "specialty": "أحياء"
  },
  {
    "mobile": "966506536278",
    "email": "t431115@mkhg.moe.gov.sa",
    "fullName": "هوازم ظويهرصالح محمد المغامسي",
    "nationalId": "1057277913",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "اللغة العربية",
    "specialty": "عربي"
  },
  {
    "mobile": "966556536776",
    "email": "t9381793@mkhg.moe.gov.sa",
    "fullName": "ولاء بندر رشيد الحربي",
    "nationalId": "1015524257",
    "employmentStatus": "دائم",
    "jobTitle": "معلم",
    "teachingField": "مكتبات",
    "specialty": "مكتبات"
  }
];

export function createTeacherFromOfficial(off: OfficialTeacherRecord): Teacher {
  return {
    id: `tea_${off.nationalId}`,
    nationalId: off.nationalId,
    fullName: off.fullName,
    name: off.fullName,
    username: off.nationalId,
    jobNumber: off.nationalId,
    mobile: off.mobile,
    email: off.email || undefined,
    employmentStatus: off.employmentStatus,
    jobTitle: off.jobTitle || "معلم",
    teachingField: off.teachingField,
    specialty: off.specialty,
    totalAbsences: 0,
    totalDelayNotices: 0,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getOfficialTeachersList(): Teacher[] {
  return OFFICIAL_TEACHERS.map(createTeacherFromOfficial);
}

/**
 * Reconciles any teachers list against the 37 official records:
 * - Fixes any truncated or invalid national IDs (e.g. 2309, 6468, 9836, 298990892)
 * - Fills in missing official details
 * - Prevents duplicate teacher entries
 */
export function reconcileWithOfficialTeachers(
  existingTeachers: Teacher[],
  options?: { insertMissing?: boolean }
): {
  teachers: Teacher[];
  changed: boolean;
  updatedNationalIdByTeacherId: Map<string, string>;
} {
  let changed = false;
  const updatedNationalIdByTeacherId = new Map<string, string>();

  if (!existingTeachers || existingTeachers.length === 0) {
    if (options?.insertMissing) {
      const list = getOfficialTeachersList();
      for (const t of list) {
        updatedNationalIdByTeacherId.set(t.id, t.nationalId);
      }
      return {
        teachers: list,
        changed: true,
        updatedNationalIdByTeacherId,
      };
    }
    return {
      teachers: [],
      changed: false,
      updatedNationalIdByTeacherId,
    };
  }

  const updatedTeachers: Teacher[] = [...existingTeachers];

  for (const off of OFFICIAL_TEACHERS) {
    const offNormName = normalizeArabicName(off.fullName);
    const offNormMobile = normalizeSaudiMobile(off.mobile);

    // Look for matching existing teacher
    let matchIdx = updatedTeachers.findIndex((t) => {
      const cleanId = normalizeNationalId(t.nationalId || t.username || t.jobNumber);
      if (cleanId === off.nationalId) return true;

      const normName = normalizeArabicName(t.fullName || t.name);
      if (normName && normName === offNormName) return true;

      const normMob = normalizeSaudiMobile(t.mobile);
      if (normMob && normMob === offNormMobile) return true;

      return false;
    });

    if (matchIdx !== -1) {
      const current = updatedTeachers[matchIdx];
      let itemChanged = false;

      // Ensure nationalId is the complete 10-digit ID
      if (current.nationalId !== off.nationalId) {
        current.nationalId = off.nationalId;
        current.username = off.nationalId;
        current.jobNumber = off.nationalId;
        updatedNationalIdByTeacherId.set(current.id, off.nationalId);
        itemChanged = true;
      }
      if (current.fullName !== off.fullName) {
        current.fullName = off.fullName;
        current.name = off.fullName;
        itemChanged = true;
      }
      if (current.mobile !== off.mobile) {
        current.mobile = off.mobile;
        itemChanged = true;
      }
      if (off.email && current.email !== off.email) {
        current.email = off.email;
        itemChanged = true;
      }
      if (current.employmentStatus !== off.employmentStatus) {
        current.employmentStatus = off.employmentStatus;
        itemChanged = true;
      }
      if (current.teachingField !== off.teachingField) {
        current.teachingField = off.teachingField;
        itemChanged = true;
      }
      if (current.specialty !== off.specialty) {
        current.specialty = off.specialty;
        itemChanged = true;
      }
      if (current.jobTitle !== off.jobTitle) {
        current.jobTitle = off.jobTitle;
        itemChanged = true;
      }

      if (itemChanged) {
        current.updatedAt = new Date().toISOString();
        changed = true;
      }
    } else if (options?.insertMissing !== false) {
      // Missing teacher from official roster: add them
      const newTeacher = createTeacherFromOfficial(off);
      updatedTeachers.push(newTeacher);
      updatedNationalIdByTeacherId.set(newTeacher.id, newTeacher.nationalId);
      changed = true;
    }
  }

  // Deduplicate against duplicates by nationalId
  const finalMap = new Map<string, Teacher>();
  for (const t of updatedTeachers) {
    const key = normalizeNationalId(t.nationalId || t.username || t.jobNumber);
    if (!finalMap.has(key)) {
      finalMap.set(key, t);
    } else {
      changed = true;
      // Merge absences / notices if duplicate had any
      const existing = finalMap.get(key)!;
      existing.totalAbsences = Math.max(existing.totalAbsences || 0, t.totalAbsences || 0);
      existing.totalDelayNotices = Math.max(existing.totalDelayNotices || 0, t.totalDelayNotices || 0);
    }
  }

  const result = Array.from(finalMap.values());
  return { teachers: result, changed, updatedNationalIdByTeacherId };
}
