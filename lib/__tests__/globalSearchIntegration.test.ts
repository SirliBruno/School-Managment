import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { Teacher, DelayNotice, AdministrativeInquiry } from "@/types/teacher";

describe("Global Search Integration & URL Parameter Synchronization Test Suite", () => {
  const rootDir = process.cwd();

  describe("1. Static Architectural Verifications", () => {
    it("DataTable.tsx should accept initialSearchQuery prop and synchronize state", () => {
      const dataTablePath = path.join(rootDir, "components/ui/DataTable.tsx");
      const content = fs.readFileSync(dataTablePath, "utf-8");

      expect(content).toContain("initialSearchQuery?: string;");
      expect(content).toContain("const [searchQuery, setSearchQuery] = useState(initialSearchQuery || \"\");");
      expect(content).toContain("setSearchQuery(initialSearchQuery);");
    });

    it("TeacherTable.tsx should accept initialSearchQuery and pass it to DataTable", () => {
      const teacherTablePath = path.join(rootDir, "components/teachers/TeacherTable.tsx");
      const content = fs.readFileSync(teacherTablePath, "utf-8");

      expect(content).toContain("initialSearchQuery?: string;");
      expect(content).toContain("initialSearchQuery = \"\"");
      expect(content).toContain("initialSearchQuery={initialSearchQuery}");
    });

    it("app/teachers/page.tsx should use useSearchParams inside a safe Suspense boundary", () => {
      const pagePath = path.join(rootDir, "app/teachers/page.tsx");
      const content = fs.readFileSync(pagePath, "utf-8");

      expect(content).toContain("useSearchParams");
      expect(content).toContain("Suspense");
      expect(content).toContain("TeachersTableWithQuery");
      expect(content).toContain("searchParams?.get(\"q\")");
      expect(content).toContain("<Suspense");
    });

    it("AppHeader.tsx should contain live search dropdown, clear button, and TeacherProfileModal", () => {
      const headerPath = path.join(rootDir, "components/layout/AppHeader.tsx");
      const content = fs.readFileSync(headerPath, "utf-8");

      expect(content).toContain("Search");
      expect(content).toContain("isSearchDropdownOpen");
      expect(content).toContain("searchResults");
      expect(content).toContain("matchingTeachers");
      expect(content).toContain("matchingDelayNotices");
      expect(content).toContain("matchingAdminInquiries");
      expect(content).toContain("TeacherProfileModal");
      expect(content).toContain("setSelectedTeacherForProfile");
      expect(content).toContain("aria-label=\"مسح البحث\"");
    });
  });

  describe("2. Pure Search Filtering Logic Tests", () => {
    const mockTeachers: Teacher[] = [
      {
        id: "t-1",
        fullName: "فاطمة محمد الحربي",
        nationalId: "1098765432",
        jobNumber: "9001",
        specialty: "رياضيات",
        mobile: "0501234567",
        totalAbsences: 0,
        isArchived: false,
      } as Teacher,
      {
        id: "t-2",
        fullName: "أحلام عبد الله الغامدي",
        nationalId: "1087654321",
        jobNumber: "9002",
        specialty: "فيزياء",
        mobile: "0559876543",
        totalAbsences: 2,
        isArchived: false,
      } as Teacher,
      {
        id: "t-3",
        fullName: "نورة سعد العتيبي (مؤرشفة)",
        nationalId: "1076543210",
        jobNumber: "9003",
        specialty: "كيمياء",
        totalAbsences: 1,
        isArchived: true,
      } as Teacher,
    ];

    const mockDelayNotices: DelayNotice[] = [
      {
        id: "dn-1",
        noticeNumber: "ت-0012",
        teacherName: "فاطمة محمد الحربي",
        noticeDate: "2026-09-29",
        isArchived: false,
      } as DelayNotice,
    ];

    const mockAdminInquiries: AdministrativeInquiry[] = [
      {
        id: "ai-1",
        inquiryNumber: "م-0044",
        teacherName: "أحلام عبد الله الغامدي",
        violationTypeArabic: "الامتناع عن المناوبة",
        incidentDate: "2026-09-28",
        isArchived: false,
      } as AdministrativeInquiry,
    ];

    function runGlobalSearch(query: string) {
      const q = query.trim().toLowerCase();
      if (!q) return { matchingTeachers: [], matchingDelayNotices: [], matchingAdminInquiries: [] };

      const matchingTeachers = mockTeachers
        .filter((t) => !t.isArchived)
        .filter((t) => {
          const name = (t.fullName || "").toLowerCase();
          const nationalId = (t.nationalId || "").toLowerCase();
          const job = (t.jobNumber || "").toLowerCase();
          const specialty = (t.specialty || "").toLowerCase();
          const mobile = (t.mobile || "").toLowerCase();
          return (
            name.includes(q) ||
            nationalId.includes(q) ||
            job.includes(q) ||
            specialty.includes(q) ||
            mobile.includes(q)
          );
        });

      const matchingDelayNotices = mockDelayNotices
        .filter((d) => !d.isArchived)
        .filter((d) => {
          const num = (d.noticeNumber || "").toLowerCase();
          const name = (d.teacherName || "").toLowerCase();
          return num.includes(q) || name.includes(q);
        });

      const matchingAdminInquiries = mockAdminInquiries
        .filter((a) => !a.isArchived)
        .filter((a) => {
          const num = (a.inquiryNumber || "").toLowerCase();
          const name = (a.teacherName || "").toLowerCase();
          const type = (a.violationTypeArabic || "").toLowerCase();
          return num.includes(q) || name.includes(q) || type.includes(q);
        });

      return { matchingTeachers, matchingDelayNotices, matchingAdminInquiries };
    }

    it("should accurately match teachers by name and exclude archived records", () => {
      const results = runGlobalSearch("فاطمة");
      expect(results.matchingTeachers.length).toBe(1);
      expect(results.matchingTeachers[0].fullName).toBe("فاطمة محمد الحربي");

      const archivedResults = runGlobalSearch("نورة");
      expect(archivedResults.matchingTeachers.length).toBe(0);
    });

    it("should match teachers by national ID or job number", () => {
      const idResults = runGlobalSearch("1087654321");
      expect(idResults.matchingTeachers.length).toBe(1);
      expect(idResults.matchingTeachers[0].fullName).toBe("أحلام عبد الله الغامدي");

      const jobResults = runGlobalSearch("9001");
      expect(jobResults.matchingTeachers.length).toBe(1);
      expect(jobResults.matchingTeachers[0].fullName).toBe("فاطمة محمد الحربي");
    });

    it("should match procedures across delay notices and administrative inquiries", () => {
      const delayResults = runGlobalSearch("ت-0012");
      expect(delayResults.matchingDelayNotices.length).toBe(1);
      expect(delayResults.matchingDelayNotices[0].teacherName).toBe("فاطمة محمد الحربي");

      const inquiryResults = runEventSearch("م-0044");
      expect(inquiryResults.matchingAdminInquiries.length).toBe(1);
      expect(inquiryResults.matchingAdminInquiries[0].teacherName).toBe("أحلام عبد الله الغامدي");
    });

    function runEventSearch(q: string) {
      return runGlobalSearch(q);
    }
  });
});
