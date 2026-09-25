import * as XLSX from "xlsx";
import { ExcelTeacherRow } from "@/types/teacher";
import { OFFICIAL_TEACHERS } from "./officialTeachersData";

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
  const sampleData: ExcelTeacherRow[] = OFFICIAL_TEACHERS.map((t) => ({
    الجوال: t.mobile,
    "البريد الإلكتروني": t.email,
    الإسم: t.fullName,
    "رقم الهوية": t.nationalId,
    "حالة التوظيف": t.employmentStatus,
    "المسمى الوظيفي": t.jobTitle,
    "مجال التدريس": t.teachingField,
    التخصص: t.specialty,
  }));

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
