"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  Check,
  ChevronDown,
  X,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Teacher } from "@/types/teacher";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";

interface TeacherComboboxProps {
  teachers: Teacher[];
  selectedTeacherId: string;
  onSelect: (teacher: Teacher | null) => void;
  error?: string;
  disabled?: boolean;
}

export const TeacherCombobox: React.FC<TeacherComboboxProps> = ({
  teachers,
  selectedTeacherId,
  onSelect,
  error,
  disabled = false,
}) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === selectedTeacherId) || null,
    [teachers, selectedTeacherId]
  );

  const filteredTeachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return teachers;

    return teachers.filter(
      (t) =>
        (t.fullName || t.name || "").toLowerCase().includes(q) ||
        (t.nationalId || t.username || t.jobNumber || "").toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q) ||
        (t.specialty || "").toLowerCase().includes(q) ||
        (t.teachingField || "").toLowerCase().includes(q) ||
        (t.mobile || "").toLowerCase().includes(q)
    );
  }, [teachers, searchQuery]);

  // Reset highlighted index when filter results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredTeachers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation for dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredTeachers.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredTeachers[highlightedIndex]) {
        handleSelect(filteredTeachers[highlightedIndex]);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (teacher: Teacher) => {
    if (disabled) return;
    onSelect(teacher);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onSelect(null);
    setSearchQuery("");
  };

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5">
      <label id="teacher-combobox-label" className="block text-xs font-bold text-slate-700">
        اسم المعلمة <span className="text-rose-500">*</span>
      </label>

      {/* Trigger Box */}
      <div
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={isOpen}
        aria-controls="teacher-combobox-listbox"
        aria-labelledby="teacher-combobox-label"
        aria-haspopup="listbox"
        aria-disabled={disabled}
        onKeyDown={handleKeyDown}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        className={cn(
          "w-full min-h-[46px] px-3.5 py-2 rounded-xl border bg-white flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 shadow-sm select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/30 focus-visible:border-[#137a85]",
          disabled && "opacity-60 cursor-not-allowed bg-slate-50",
          error
            ? "border-rose-400 focus-within:ring-2 focus-within:ring-rose-200"
            : isOpen
            ? "border-[#137a85] ring-2 ring-[#137a85]/20"
            : "border-slate-200 hover:border-slate-300"
        )}
      >
        {selectedTeacher ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-teal-50 text-[#137a85] flex items-center justify-center font-bold text-xs shrink-0">
                {(selectedTeacher.fullName || selectedTeacher.name || "م").charAt(0)}
              </div>
              <div className="truncate">
                <span className="block text-xs md:text-sm font-bold text-slate-800 truncate">
                  {selectedTeacher.fullName || selectedTeacher.name}
                </span>
                <span className="block text-[11px] text-slate-400 font-mono">
                  {selectedTeacher.nationalId || selectedTeacher.username || selectedTeacher.jobNumber} • {selectedTeacher.specialty || selectedTeacher.teachingField || "عام"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {!disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="إلغاء التحديد"
                  aria-label="إلغاء اختيار المعلمة"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-slate-400 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full text-slate-400 text-xs md:text-sm">
            <span>ابحثي بالاسم أو رقم الهوية لاختيار المعلمة...</span>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-slate-400 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </div>
        )}
      </div>

      {/* Desktop Dropdown Menu */}
      {isOpen && !isMobile && !disabled && (
        <div
          id="teacher-combobox-listbox"
          role="listbox"
          aria-label="قائمة المعلمات المتاحة"
          className="absolute top-full right-0 left-0 mt-1.5 z-40 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتبي اسم المعلمة أو رقم الهوية... (الأسهم للتنقل و Enter للاختيار)"
                className="w-full pl-3 pr-9 py-2 text-xs bg-white rounded-lg border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85]"
              />
            </div>
          </div>

          {/* List of Teachers */}
          <div ref={listRef} className="max-h-60 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
            {filteredTeachers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                لم يتم العثور على معلمات مطابقة للبحث
              </div>
            ) : (
              filteredTeachers.map((teacher, index) => {
                const isSelected = teacher.id === selectedTeacherId;
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={teacher.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(teacher)}
                    className={cn(
                      "px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors text-xs md:text-sm",
                      isSelected
                        ? "bg-teal-50/80 text-[#137a85] font-bold"
                        : isHighlighted
                        ? "bg-slate-100/90 text-slate-900 ring-1 ring-[#137a85]/20"
                        : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                          isSelected
                            ? "bg-[#137a85] text-white"
                            : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {(teacher.fullName || teacher.name || "م").charAt(0)}
                      </div>

                      <div>
                        <div className="font-bold text-slate-900 leading-tight">
                          {teacher.fullName || teacher.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className="font-mono">{teacher.nationalId || teacher.username || teacher.jobNumber}</span>
                          <span>•</span>
                          <span>{teacher.specialty || teacher.teachingField || "عام"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold border",
                          (teacher.totalAbsences || 0) === 0
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-amber-50 text-amber-800 border-amber-300"
                        )}
                      >
                        {teacher.totalAbsences || 0} غياب سابق
                      </span>

                      {isSelected && (
                        <Check className="w-4 h-4 text-[#137a85] shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Mobile BottomSheet Selection Modal */}
      {isMobile && (
        <AnimatePresence>
          {isOpen && !disabled && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="اختيار المعلمة"
              className="fixed inset-0 z-50 flex flex-col justify-end"
            >
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              />

              {/* Bottom Sheet Modal Container */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col z-10 shadow-2xl pb-safe overflow-hidden"
              >
                {/* Drag Handle */}
                <div className="flex items-center justify-center pt-3 pb-1">
                  <div className="w-10 h-1.5 rounded-full bg-slate-300" />
                </div>

                {/* Mobile Header with Search */}
                <div className="p-4 border-b border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-900">
                      اختيار المعلمة ({filteredTeachers.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="p-2 -me-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      aria-label="إغلاق قائمة المعلمات"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحثي بالاسم أو التخصص أو الرقم..."
                      className="w-full pl-3 pr-10 py-3 text-base bg-slate-50 rounded-xl border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137a85]/30 focus:border-[#137a85] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Mobile List Items (≥ 56px touch target) */}
                <div
                  id="teacher-combobox-listbox"
                  role="listbox"
                  aria-label="قائمة المعلمات المتاحة"
                  className="overflow-y-auto flex-1 divide-y divide-slate-100 p-2"
                >
                  {filteredTeachers.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400">
                      لم يتم العثور على معلمات مطابقة للبحث
                    </div>
                  ) : (
                    filteredTeachers.map((teacher) => {
                      const isSelected = teacher.id === selectedTeacherId;
                      return (
                        <div
                          key={teacher.id}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelect(teacher)}
                          className={cn(
                            "px-4 py-3.5 rounded-xl flex items-center justify-between transition-colors min-h-[56px] active:scale-[0.99]",
                            isSelected
                              ? "bg-teal-50 text-[#137a85] font-bold"
                              : "hover:bg-slate-50 text-slate-800"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                                isSelected
                                  ? "bg-[#137a85] text-white"
                                  : "bg-slate-100 text-slate-600"
                              )}
                            >
                              {(teacher.fullName || teacher.name || "م").charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900 leading-tight">
                                {teacher.fullName || teacher.name}
                              </div>
                              <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                <span className="font-mono">{teacher.nationalId || teacher.username || teacher.jobNumber}</span>
                                <span>•</span>
                                <span>{teacher.specialty || teacher.teachingField || "عام"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span
                              className={cn(
                                "text-[11px] px-2 py-0.5 rounded-full font-bold border",
                                (teacher.totalAbsences || 0) === 0
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : "bg-amber-50 text-amber-800 border-amber-300"
                              )}
                            >
                              {teacher.totalAbsences || 0} غياب
                            </span>
                            {isSelected && (
                              <Check className="w-5 h-5 text-[#137a85] shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      )}

      {/* Validation Error Message */}
      {error && (
        <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1 animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
