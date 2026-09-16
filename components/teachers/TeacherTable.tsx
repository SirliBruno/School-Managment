"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Trash2,
  Users,
  FileSpreadsheet,
  AlertTriangle,
  RotateCcw,
  Eye,
  UserPlus,
  Phone,
  Filter,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { Teacher } from "@/types/teacher";
import { TeacherProfileModal } from "@/components/teachers/TeacherProfileModal";
import { AddTeacherModal } from "@/components/teachers/AddTeacherModal";
import { cn } from "@/lib/utils";

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.02,
      duration: 0.22,
      ease: "easeOut" as const,
    },
  }),
};

type FilterStatus = "all" | "دائم" | "عقد" | "with_absence";

export const TeacherTable: React.FC = () => {
  const { teachers, deleteTeacher, isLoading } = useTeachers();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("all");
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [selectedTeacherForProfile, setSelectedTeacherForProfile] =
    useState<Teacher | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Close delete modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && teacherToDelete) {
        setTeacherToDelete(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [teacherToDelete]);

  // Focus cancel button when delete modal opens
  useEffect(() => {
    if (teacherToDelete) {
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
    }
  }, [teacherToDelete]);

  // Client-side multi-field search and status filtering
  const filteredTeachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return teachers.filter((t) => {
      // 1. Status Filter
      if (selectedStatus === "دائم" && t.employmentStatus !== "دائم") {
        return false;
      }
      if (selectedStatus === "عقد" && t.employmentStatus !== "عقد") {
        return false;
      }
      if (selectedStatus === "with_absence" && (t.totalAbsences || 0) <= 0) {
        return false;
      }

      // 2. Query Search across 6 fields
      if (!q) return true;

      const nameMatch = (t.fullName || t.name || "").toLowerCase().includes(q);
      const userMatch = (t.username || t.jobNumber || "").toLowerCase().includes(q);
      const mobileMatch = (t.mobile || "").toLowerCase().includes(q);
      const specialtyMatch = (t.specialty || "").toLowerCase().includes(q);
      const fieldMatch = (t.teachingField || "").toLowerCase().includes(q);
      const titleMatch = (t.jobTitle || "").toLowerCase().includes(q);

      return (
        nameMatch ||
        userMatch ||
        mobileMatch ||
        specialtyMatch ||
        fieldMatch ||
        titleMatch
      );
    });
  }, [teachers, searchQuery, selectedStatus]);

  // Delete execution
  const confirmDelete = () => {
    if (teacherToDelete) {
      deleteTeacher(teacherToDelete.id);
      setTeacherToDelete(null);
    }
  };

  const permanentCount = teachers.filter((t) => t.employmentStatus === "دائم").length;
  const contractCount = teachers.filter((t) => t.employmentStatus === "عقد").length;

  return (
    <div className="space-y-4">
      {/* Top Controls Bar: Search + Filter Chips + Add Teacher Button */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
        {/* Search Input with ARIA label */}
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            role="searchbox"
            aria-label="البحث في قائمة المعلمات بالاسم الرباعي أو اسم المستخدم أو الجوال أو التخصص"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث بالاسم الرباعي، اسم المستخدم، الجوال، التخصص..."
            className="w-full pl-8 pr-10 py-2.5 text-xs md:text-sm rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
              aria-label="إفراغ حقل البحث"
            >
              مسح
            </button>
          )}
        </div>

        {/* Filter Chips & Manual Add Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedStatus("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                selectedStatus === "all"
                  ? "bg-white text-slate-800 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              الكل ({teachers.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("دائم")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer",
                selectedStatus === "دائم"
                  ? "bg-emerald-600 text-white shadow-2xs font-bold"
                  : "text-emerald-700 hover:bg-emerald-50"
              )}
            >
              <span>دائم</span>
              <span className="text-[10px] opacity-80">({permanentCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("عقد")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer",
                selectedStatus === "عقد"
                  ? "bg-amber-600 text-white shadow-2xs font-bold"
                  : "text-amber-700 hover:bg-amber-50"
              )}
            >
              <span>عقد</span>
              <span className="text-[10px] opacity-80">({contractCount})</span>
            </button>
          </div>

          {/* Add Teacher Manually Button */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold bg-[#137a85] text-white hover:bg-teal-700 shadow-sm hover:shadow transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85] focus-visible:ring-offset-2"
          >
            <UserPlus className="w-4 h-4 text-teal-100" />
            <span>إضافة معلمة يدوياً</span>
          </motion.button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          /* Skeleton Loader */
          <div className="p-6 space-y-4">
            <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-slate-50/60 rounded-xl animate-pulse gap-4"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                  <div className="w-40 h-4 bg-slate-200 rounded" />
                  <div className="w-24 h-4 bg-slate-200 rounded" />
                  <div className="w-28 h-4 bg-slate-200 rounded" />
                  <div className="w-10 h-6 bg-slate-200 rounded-full" />
                  <div className="w-20 h-7 bg-slate-200 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ) : teachers.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-[#137a85] flex items-center justify-center shadow-inner">
              <FileSpreadsheet className="w-8 h-8" aria-hidden="true" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-base font-bold text-slate-800">
                لا يوجد معلمات مسجلات حالياً
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                يمكنك استيراد ملف Excel منسوبات ث5 المعتمد أو إضافة المعلمات
                واحدة تلو الأخرى يدوياً.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#137a85] text-white hover:bg-teal-700 transition-all cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة أول معلمة يدوياً</span>
            </button>
          </div>
        ) : filteredTeachers.length === 0 ? (
          /* Filtered Results Empty State */
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-bold text-slate-700">
              لم يتم العثور على نتائج مطابقة للبحث أو التصفية الحالية
            </p>
            <p className="text-xs text-slate-400">
              يرجى التأكد من الكلمات المدخلة أو إلغاء تصفية حالة التوظيف.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedStatus("all");
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>إلغاء التصفية وعرض جميع المعلمات</span>
            </button>
          </div>
        ) : (
          /* Populated 7-Column Table */
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs md:text-sm">
              <thead className="bg-slate-50/90 text-slate-700 font-bold border-b border-slate-200 select-none">
                <tr>
                  <th scope="col" className="py-3.5 px-4 text-center w-12">
                    #
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    اسم المعلمة واسم المستخدم
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    المسمى والتخصص
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    مجال التدريس
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-center">
                    حالة التوظيف
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    الجوال
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-center">
                    الغياب
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-center">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.map((teacher, index) => {
                  const isContract = teacher.employmentStatus === "عقد";

                  return (
                    <motion.tr
                      key={teacher.id}
                      custom={index}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      className="hover:bg-slate-50/90 transition-colors duration-150 group"
                    >
                      {/* 1. Index */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-xs text-center">
                        {index + 1}
                      </td>

                      {/* 2. Full Name & Username */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedTeacherForProfile(teacher)}
                          className="flex items-center gap-2.5 text-right hover:text-[#137a85] transition-colors group/name cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85] rounded-lg p-0.5"
                          title={`عرض ملف وسجل غياب المعلمة ${teacher.fullName || teacher.name}`}
                        >
                          <div
                            className="w-8 h-8 rounded-full bg-teal-50 text-[#137a85] flex items-center justify-center font-bold text-xs shrink-0 group-hover/name:bg-[#137a85] group-hover/name:text-white transition-colors"
                            aria-hidden="true"
                          >
                            {(teacher.fullName || teacher.name || "م").charAt(0)}
                          </div>
                          <div>
                            <span className="block font-bold text-slate-900 group-hover/name:underline underline-offset-2">
                              {teacher.fullName || teacher.name}
                            </span>
                            <span className="block text-[11px] text-slate-400 font-mono">
                              {teacher.username || teacher.jobNumber}
                            </span>
                          </div>
                        </button>
                      </td>

                      {/* 3. Job Title & Specialty */}
                      <td className="py-3.5 px-4">
                        <span className="block font-semibold text-slate-800 text-xs">
                          {teacher.specialty || teacher.teachingField || "عام"}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          {teacher.jobTitle || "معلم"}
                        </span>
                      </td>

                      {/* 4. Teaching Field */}
                      <td className="py-3.5 px-4">
                        {teacher.teachingField ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                            {teacher.teachingField}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* 5. Employment Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border",
                            isContract
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-emerald-50 text-emerald-800 border-emerald-300"
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isContract ? "bg-amber-500" : "bg-emerald-500"
                            )}
                          />
                          <span>{teacher.employmentStatus || "دائم"}</span>
                        </span>
                      </td>

                      {/* 6. Mobile */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 text-xs">
                        {teacher.mobile ? (
                          <div className="flex items-center gap-1 text-slate-700">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span dir="ltr">{teacher.mobile}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* 7. Absences Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedTeacherForProfile(teacher)}
                          className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85] rounded-full"
                          title="عرض تفاصيل وسجل الغياب"
                        >
                          <span
                            className={cn(
                              "inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border hover:scale-105 transition-transform",
                              (teacher.totalAbsences || 0) === 0
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : (teacher.totalAbsences || 0) <= 2
                                ? "bg-amber-50 text-amber-800 border-amber-300"
                                : "bg-rose-50 text-rose-800 border-rose-300"
                            )}
                          >
                            {teacher.totalAbsences || 0}
                          </span>
                        </button>
                      </td>

                      {/* 8. Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => setSelectedTeacherForProfile(teacher)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#137a85] bg-teal-50/80 hover:bg-[#137a85] hover:text-white border border-teal-200/80 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]"
                            title={`عرض ملف وسجل غياب المعلمة ${teacher.fullName || teacher.name}`}
                            aria-label={`عرض ملف المعلمة ${teacher.fullName || teacher.name}`}
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>الملف</span>
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTeacherToDelete(teacher);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                            title={`حذف المعلمة ${teacher.fullName || teacher.name}`}
                            aria-label={`حذف سجل المعلمة ${teacher.fullName || teacher.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span className="sr-only sm:not-sr-only">حذف</span>
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        {teachers.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>
              عرض {filteredTeachers.length} من إجمالي {teachers.length} معلمة
            </span>
            <span className="text-[11px] text-slate-400">
              بيانات الكادر مطابقة لسجلات الثانوية الخامسة مسارات ومحفوظة محلياً وسحابياً
            </span>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {teacherToDelete && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-desc"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setTeacherToDelete(null)}
              aria-hidden="true"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 320 }}
              className="relative bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 z-10"
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" aria-hidden="true" />
              </div>

              <div className="text-center space-y-1.5">
                <h4
                  id="delete-dialog-title"
                  className="text-base font-bold text-slate-900"
                >
                  تأكيد حذف المعلمة
                </h4>
                <p
                  id="delete-dialog-desc"
                  className="text-xs text-slate-600 leading-relaxed"
                >
                  هل أنتِ متأكدة من حذف المعلمة{" "}
                  <strong className="text-slate-900 font-bold">
                    &ldquo;{teacherToDelete.fullName || teacherToDelete.name}&rdquo;
                  </strong>{" "}
                  (اسم المستخدم: {teacherToDelete.username || teacherToDelete.jobNumber})؟
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  نعم، تأكيد الحذف
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  ref={cancelButtonRef}
                  onClick={() => setTeacherToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  إلغاء
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Add Teacher Modal */}
      <AddTeacherModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Teacher Profile & Detailed History Modal */}
      {selectedTeacherForProfile && (
        <TeacherProfileModal
          teacher={selectedTeacherForProfile}
          onClose={() => setSelectedTeacherForProfile(null)}
        />
      )}
    </div>
  );
};
