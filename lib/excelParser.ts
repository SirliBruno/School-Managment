import * as XLSX from "xlsx";
import { ExcelTeacherRow } from "@/types/teacher";

/**
 * Standard 8 column headers for Teachers Excel file
 */
export const STANDARD_EXCEL_HEADERS = [
  "الجوال",
  "البريد الإلكتروني",
  "الإسم",
  "رقم الهوية",
  "حالة التوظيف",
  "المسمى الوظيفي",
  "مجال التدريس",
  "التخصص",
] as const;

/**
 * Parses raw ArrayBuffer / File data into an array of ExcelTeacherRow objects.
 */
export function parseExcelData(data: ArrayBuffer): ExcelTeacherRow[] {
  const workbook = XLSX.read(data, { type: "array" });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("ملف الإكسل فارغ ولا يحتوي على أي ورقة عمل صالحة.");
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Parse rows as strings so numbers/usernames/nationalIds aren't corrupted
  const rawRows: ExcelTeacherRow[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false,
  });

  // Filter out completely blank rows where every column is empty or whitespace
  const nonBlankRows = rawRows.filter((row) =>
    Object.values(row).some(
      (val) => val !== null && val !== undefined && String(val).trim() !== ""
    )
  );

  return nonBlankRows;
}

/**
 * Generates and downloads the official Empty Excel Template with the standard 8 columns (Stage 4).
 */
export function downloadEmptyExcelTemplate(
  filename: string = "قالب_استيراد_بيانات_المعلمات_فارغ.xlsx"
): void {
  // Create an empty worksheet with only header row
  const worksheet = XLSX.utils.aoa_to_sheet([
    [...STANDARD_EXCEL_HEADERS],
  ]);

  // Set standard column widths for clean appearance
  worksheet["!cols"] = [
    { wch: 18 }, // الجوال
    { wch: 28 }, // البريد الإلكتروني
    { wch: 32 }, // الإسم
    { wch: 20 }, // رقم الهوية
    { wch: 16 }, // حالة التوظيف
    { wch: 18 }, // المسمى الوظيفي
    { wch: 20 }, // مجال التدريس
    { wch: 24 }, // التخصص
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "بيانات المعلمات");

  XLSX.writeFile(workbook, filename);
}

/**
 * Generates and downloads a sample Excel file populated with realistic test data.
 */
export function downloadSampleExcelTemplate(
  filename: string = "نموذج_استيراد_منسوبات_المدرسة_المعتمد.xlsx"
): void {
  const sampleData: ExcelTeacherRow[] = [
    {
      الجوال: "0501234567",
      "البريد الإلكتروني": "sara.otaibi@moe.gov.sa",
      الإسم: "سارة عبد الله سالم العتيبي",
      "رقم الهوية": "1048291023",
      "حالة التوظيف": "دائم",
      "المسمى الوظيفي": "معلم",
      "مجال التدريس": "لغة عربية",
      التخصص: "اللغة العربية وآدابها",
    },
    {
      الجوال: "0559876543",
      "البريد الإلكتروني": "reem.qahtani@moe.gov.sa",
      الإسم: "ريم خالد فهد القحطاني",
      "رقم الهوية": "1059283741",
      "حالة التوظيف": "عقد",
      "المسمى الوظيفي": "معلم",
      "مجال التدريس": "رياضيات",
      التخصص: "رياضيات بحتة",
    },
    {
      الجوال: "0543210987",
      "البريد الإلكتروني": "fatima.ghamdi@moe.gov.sa",
      الإسم: "فاطمة محمد علي الغامدي",
      "رقم الهوية": "1038472910",
      "حالة التوظيف": "دائم",
      "المسمى الوظيفي": "معلم ممارس",
      "مجال التدريس": "علوم طبيعية",
      التخصص: "فيزياء",
    },
    {
      الجوال: "0567890123",
      "البريد الإلكتروني": "noura.dosari@moe.gov.sa",
      الإسم: "نورة مسفر حمد الدوسري",
      "رقم الهوية": "1074829104",
      "حالة التوظيف": "دائم",
      "المسمى الوظيفي": "معلم",
      "مجال التدريس": "علوم شرعية",
      التخصص: "دراسات إسلامية",
    },
    {
      الجوال: "0534567890",
      "البريد الإلكتروني": "hind.shehri@moe.gov.sa",
      الإسم: "هند عبد الرحمن ظافر الشهري",
      "رقم الهوية": "1083729105",
      "حالة التوظيف": "عقد",
      "المسمى الوظيفي": "معلم",
      "مجال التدريس": "لغة إنجليزية",
      التخصص: "لغويات إنجليزية",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData, {
    header: [...STANDARD_EXCEL_HEADERS],
  });

  worksheet["!cols"] = [
    { wch: 18 }, // الجوال
    { wch: 28 }, // البريد الإلكتروني
    { wch: 32 }, // الإسم
    { wch: 20 }, // رقم الهوية
    { wch: 16 }, // حالة التوظيف
    { wch: 18 }, // المسمى الوظيفي
    { wch: 20 }, // مجال التدريس
    { wch: 24 }, // التخصص
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "منسوبات المدرسة");

  XLSX.writeFile(workbook, filename);
}
