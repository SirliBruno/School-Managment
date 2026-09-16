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
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { Teacher } from "@/types/teacher";
import { TeacherProfileModal } from "@/components/teachers/TeacherProfileModal";
import { cn } from "@/lib/utils";

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.025,
      duration: 0.25,
      ease: "easeOut" as const,
    },
  }),
};

export const TeacherTable: React.FC = () => {
  const { teachers, deleteTeacher, isLoading } = useTeachers();
  const [searchQuery, setSearchQuery] = useState("");
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [selectedTeacherForProfile, setSelectedTeacherForProfile] =
    useState<Teacher | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && teacherToDelete) {
        setTeacherToDelete(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [teacherToDelete]);

  // Focus cancel button when modal opens to prevent accidental deletion
  useEffect(() => {
    if (teacherToDelete) {
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
    }
  }, [teacherToDelete]);

  // Client-side search filtering
  const filteredTeachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return teachers;

    return teachers.filter((t) => {
      const nameMatch = t.name.toLowerCase().includes(q);
      const jobMatch = t.jobNumber.toLowerCase().includes(q);
      const specialtyMatch = t.specialty.toLowerCase().includes(q);
      return nameMatch || jobMatch || specialtyMatch;
    });
  }, [teachers, searchQuery]);

  // Delete execution
  const confirmDelete = () => {
    if (teacherToDelete) {
      deleteTeacher(teacherToDelete.id);
      setTeacherToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar & Counter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input with ARIA label */}
        <div className="relative w-full sm:w-80 md:w-96">
          <Search
            className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            role="searchbox"
            aria-label="البحث في قائمة المعلمات باسم المعلمة أو الرقم الوظيفي أو التخصص"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث باسم المعلمة، رقم الوظيفة، أو التخصص..."
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

        {/* Counter Badge */}
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-[#137a85] border border-teal-200/60 shadow-2xs">
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              إجمالي المعلمات:{" "}
              <strong className="font-extrabold font-mono text-sm">
                {teachers.length}
              </strong>
            </span>
          </div>

          {searchQuery && (
            <span className="text-slate-500 font-medium">
              (مطابق للبحث: {filteredTeachers.length})
            </span>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          /* High quality Skeleton Loader */
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
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#137a85] flex items-center justify-center shadow-inner">
              <FileSpreadsheet className="w-7 h-7" aria-hidden="true" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                لا يوجد معلمات مسجلات حالياً
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                يرجى استيراد ملف Excel لبدء إدارة بيانات الكادر التعليمي ومتابعة
                الغياب وتوثيق الإجراءات الإدارية.
              </p>
            </div>
          </div>
        ) : filteredTeachers.length === 0 ? (
          /* Search Results Empty State */
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-bold text-slate-700">
              لم يتم العثور على نتائج مطابقة للبحث &ldquo;{searchQuery}&rdquo;
            </p>
            <p className="text-xs text-slate-400">
              يرجى التأكد من دقة كتابة الاسم أو رقم الوظيفة المدخل.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>إلغاء التصفية وعرض جميع المعلمات</span>
            </button>
          </div>
        ) : (
          /* Populated Table with Staggered Rows */
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs md:text-sm">
              <thead className="bg-slate-50/90 text-slate-700 font-bold border-b border-slate-200 select-none">
                <tr>
                  <th scope="col" className="py-3.5 px-5">
                    #
                  </th>
                  <th scope="col" className="py-3.5 px-5">
                    اسم المعلمة
                  </th>
                  <th scope="col" className="py-3.5 px-5">
                    رقم الوظيفة
                  </th>
                  <th scope="col" className="py-3.5 px-5">
                    التخصص
                  </th>
                  <th scope="col" className="py-3.5 px-5 text-center">
                    عدد الغياب
                  </th>
                  <th scope="col" className="py-3.5 px-5 text-center">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.map((teacher, index) => (
                  <motion.tr
                    key={teacher.id}
                    custom={index}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    className="hover:bg-slate-50/90 transition-colors duration-150 group"
                  >
                    {/* Index */}
                    <td className="py-3.5 px-5 text-slate-400 font-mono text-xs">
                      {index + 1}
                    </td>

                    {/* Teacher Name */}
                    <td className="py-3.5 px-5 font-bold text-slate-900">
                      <button
                        type="button"
                        onClick={() => setSelectedTeacherForProfile(teacher)}
                        className="flex items-center gap-2.5 text-right hover:text-[#137a85] transition-colors group/name cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85] rounded-lg p-0.5"
                        title={`عرض ملف وسجل غياب المعلمة ${teacher.name}`}
                      >
                        <div
                          className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover/name:bg-[#137a85] group-hover/name:text-white transition-colors"
                          aria-hidden="true"
                        >
                          {teacher.name.charAt(0)}
                        </div>
                        <span className="group-hover/name:underline underline-offset-2">
                          {teacher.name}
                        </span>
                      </button>
                    </td>

                    {/* Job Number */}
                    <td className="py-3.5 px-5 font-mono text-slate-700 font-semibold tabular-nums">
                      {teacher.jobNumber}
                    </td>

                    {/* Specialty */}
                    <td className="py-3.5 px-5">
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-medium">
                        {teacher.specialty}
                      </span>
                    </td>

                    {/* Absences Badge */}
                    <td className="py-3.5 px-5 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedTeacherForProfile(teacher)}
                        className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85] rounded-full"
                        title="عرض تفاصيل وسجل الغياب"
                      >
                        <span
                          className={cn(
                            "inline-flex items-center justify-center min-w-[2.25rem] px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums border hover:scale-105 transition-transform",
                            teacher.totalAbsences === 0
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : teacher.totalAbsences <= 2
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-rose-50 text-rose-800 border-rose-300"
                          )}
                        >
                          {teacher.totalAbsences}
                        </span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => setSelectedTeacherForProfile(teacher)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#137a85] bg-teal-50/80 hover:bg-[#137a85] hover:text-white border border-teal-200/80 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]"
                          title={`عرض ملف وسجل غياب المعلمة ${teacher.name}`}
                          aria-label={`عرض ملف المعلمة ${teacher.name}`}
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>عرض الملف</span>
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTeacherToDelete(teacher);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                          title={`حذف المعلمة ${teacher.name}`}
                          aria-label={`حذف سجل المعلمة ${teacher.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span className="sr-only sm:not-sr-only">حذف</span>
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
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
              بيانات الكادر محفوظة محلياً وتعمل بدون الحاجة لاتصال إنترنت
            </span>
          </div>
        )}
      </div>

      {/* Accessible Animated Delete Confirmation Modal */}
      <AnimatePresence>
        {teacherToDelete && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-desc"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setTeacherToDelete(null)}
              aria-hidden="true"
            />

            {/* Modal Dialog */}
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
                    &ldquo;{teacherToDelete.name}&rdquo;
                  </strong>{" "}
                  (رقم الوظيفة: {teacherToDelete.jobNumber})؟ لن يمكن استرجاع السجل
                  إلا بإعادة الاستيراد.
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
