"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  Check,
  ChevronDown,
  X,
  AlertCircle,
} from "lucide-react";
import { Teacher } from "@/types/teacher";
import { cn } from "@/lib/utils";

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
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
        (t.username || t.jobNumber || "").toLowerCase().includes(q) ||
        (t.specialty || "").toLowerCase().includes(q) ||
        (t.teachingField || "").toLowerCase().includes(q) ||
        (t.mobile || "").toLowerCase().includes(q)
    );
  }, [teachers, searchQuery]);

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
      <label className="block text-xs font-bold text-slate-700">
        اسم المعلمة <span className="text-rose-500">*</span>
      </label>

      {/* Trigger Box */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="teacher-combobox-listbox"
        aria-haspopup="listbox"
        aria-disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        className={cn(
          "w-full min-h-[46px] px-3.5 py-2 rounded-xl border bg-white flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 shadow-2xs select-none",
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
                  {selectedTeacher.username || selectedTeacher.jobNumber} • {selectedTeacher.specialty || selectedTeacher.teachingField || "عام"}
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
            <span>ابحثي بالاسم أو الرقم الوظيفي لاختيار المعلمة...</span>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-slate-400 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </div>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
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
                placeholder="اكتبي اسم المعلمة أو اسم المستخدم..."
                className="w-full pl-3 pr-9 py-2 text-xs bg-white rounded-lg border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85]"
              />
            </div>
          </div>

          {/* List of Teachers */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
            {filteredTeachers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
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
                      "px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors text-xs md:text-sm",
                      isSelected
                        ? "bg-teal-50/80 text-[#137a85] font-bold"
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
                          <span className="font-mono">{teacher.username || teacher.jobNumber}</span>
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
