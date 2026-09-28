"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  Download,
  Filter,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { Button } from "@/components/ui/Button";

export interface ColumnDef<T> {
  id: string;
  header: React.ReactNode;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => any;
  cell?: (props: { row: T; value: any; index: number }) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
  hideable?: boolean;
  hidden?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T, index: number) => string;
  searchPlaceholder?: string;
  searchFilterKeys?: (keyof T | ((item: T) => string))[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  onExportExcel?: () => void;
  exportLabel?: string;
  filtersSlot?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  title?: string;
  subtitle?: string;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  className?: string;
  mobileCardRenderer?: (item: T, index: number) => React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  searchPlaceholder = "البحث السريع في السجلات...",
  searchFilterKeys = [],
  isLoading = false,
  emptyTitle = "لا توجد سجلات",
  emptyDescription = "لم يتم العثور على أي نتائج مطابقة في الوقت الحالي.",
  emptyAction,
  onExportExcel,
  exportLabel = "تصدير Excel",
  filtersSlot,
  actionsSlot,
  title,
  subtitle,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50],
  className,
  mobileCardRenderer,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumnId, setSortColumnId] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<string>>(() => {
    return new Set(columns.filter((c) => !c.hidden).map((c) => c.id));
  });
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);

  // Filter columns based on visibility
  const activeColumns = useMemo(() => {
    return columns.filter((col) => visibleColumnIds.has(col.id));
  }, [columns, visibleColumnIds]);

  // Search filtering
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.trim().toLowerCase();

    return data.filter((item) => {
      if (searchFilterKeys.length > 0) {
        return searchFilterKeys.some((key) => {
          let val: any;
          if (typeof key === "function") {
            val = key(item);
          } else {
            val = item[key];
          }
          return val !== undefined && val !== null && String(val).toLowerCase().includes(query);
        });
      }

      // Default: match all primitive string/number values on object
      return Object.values(item as Record<string, any>).some((val) => {
        if (typeof val === "string" || typeof val === "number") {
          return String(val).toLowerCase().includes(query);
        }
        return false;
      });
    });
  }, [data, searchQuery, searchFilterKeys]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortColumnId) return filteredData;
    const targetCol = columns.find((c) => c.id === sortColumnId);
    if (!targetCol) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (targetCol.accessorFn) {
        aVal = targetCol.accessorFn(a);
        bVal = targetCol.accessorFn(b);
      } else if (targetCol.accessorKey) {
        aVal = a[targetCol.accessorKey];
        bVal = b[targetCol.accessorKey];
      }

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      return sortDirection === "asc" ? strA.localeCompare(strB, "ar") : strB.localeCompare(strA, "ar");
    });
  }, [filteredData, sortColumnId, sortDirection, columns]);

  // Pagination
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, safePage, pageSize]);

  const handleSort = (columnId: string) => {
    if (sortColumnId === columnId) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumnId(null);
      }
    } else {
      setSortColumnId(columnId);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const toggleColumn = (columnId: string) => {
    setVisibleColumnIds((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        if (next.size > 1) next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  };

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden", className)}>
      {/* Top Header & Toolbar Area */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4">
        {/* Toolbar Content */}
        {title || subtitle ? (
          <>
            {/* Title & Actions Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                {title && <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h2>}
                {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {onExportExcel && (
                  <button
                    type="button"
                    onClick={onExportExcel}
                    className="inline-flex flex-row items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold whitespace-nowrap shadow-2xs transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="whitespace-nowrap">{exportLabel}</span>
                  </button>
                )}

                {/* Column manager toggle */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsColumnManagerOpen((prev) => !prev)}
                    className="inline-flex flex-row items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold whitespace-nowrap shadow-2xs transition-colors cursor-pointer"
                    title="تخصيص الأعمدة"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span className="whitespace-nowrap">الأعمدة</span>
                  </button>

                  {isColumnManagerOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsColumnManagerOpen(false)}
                        aria-hidden="true"
                      />
                      <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 font-bold text-slate-800 dark:text-slate-200">
                          <span>إظهار الأعمدة</span>
                          <button
                            type="button"
                            onClick={() => setIsColumnManagerOpen(false)}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
                          {columns
                            .filter((c) => c.hideable !== false)
                            .map((col) => (
                              <label key={col.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 select-none">
                                <input
                                  type="checkbox"
                                  checked={visibleColumnIds.has(col.id)}
                                  onChange={() => toggleColumn(col.id)}
                                  className="rounded text-[#137a85] focus:ring-[#137a85]"
                                />
                                <span className="truncate">{typeof col.header === "string" ? col.header : col.id}</span>
                              </label>
                            ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {actionsSlot}
              </div>
            </div>

            {/* Search & Custom Filters Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full pr-10 pl-8 py-2 text-xs sm:text-sm bg-slate-50/80 dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg cursor-pointer"
                    aria-label="مسح البحث"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {filtersSlot && <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">{filtersSlot}</div>}
            </div>
          </>
        ) : (
          /* Balanced Single-Row Flex Layout */
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
            {/* Filters on the right in RTL */}
            {filtersSlot && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0 shrink-0">
                {filtersSlot}
              </div>
            )}

            {/* Search in the center */}
            <div className="relative flex-1 min-w-[200px] max-w-lg">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full pr-10 pl-8 py-2 text-xs sm:text-sm bg-slate-50/80 dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg cursor-pointer"
                  aria-label="مسح البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Actions on the left in RTL */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {onExportExcel && (
                <button
                  type="button"
                  onClick={onExportExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold whitespace-nowrap shadow-2xs transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="whitespace-nowrap">{exportLabel}</span>
                </button>
              )}

              {/* Column manager toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsColumnManagerOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold whitespace-nowrap shadow-2xs transition-colors cursor-pointer"
                  title="تخصيص الأعمدة"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span className="whitespace-nowrap">الأعمدة</span>
                </button>

                {isColumnManagerOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsColumnManagerOpen(false)}
                      aria-hidden="true"
                    />
                    <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <span>إظهار الأعمدة</span>
                        <button
                          type="button"
                          onClick={() => setIsColumnManagerOpen(false)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
                        {columns
                          .filter((c) => c.hideable !== false)
                          .map((col) => (
                            <label key={col.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 select-none">
                              <input
                                type="checkbox"
                                checked={visibleColumnIds.has(col.id)}
                                onChange={() => toggleColumn(col.id)}
                                className="rounded text-[#137a85] focus:ring-[#137a85]"
                              />
                              <span className="truncate">{typeof col.header === "string" ? col.header : col.id}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {actionsSlot}
            </div>
          </div>
        )}
      </div>

      {/* Loading Skeleton State */}
      {isLoading ? (
        <div className="p-6">
          <SkeletonLoader count={5} />
        </div>
      ) : paginatedData.length === 0 ? (
        /* Empty State */
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyAction?.label}
          onAction={emptyAction?.onClick}
          className="py-12"
        />
      ) : (
        <>
          {/* Mobile Card View (if renderer provided, visible on mobile only) */}
          {mobileCardRenderer && (
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-2">
              {paginatedData.map((item, index) => (
                <div key={keyExtractor(item, index)} className="p-1">
                  {mobileCardRenderer(item, index)}
                </div>
              ))}
            </div>
          )}

          {/* Desktop Table View */}
          <div className={cn("overflow-x-auto custom-scrollbar", mobileCardRenderer && "hidden md:block")}>
            <table className="w-full text-right border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold select-none">
                  {activeColumns.map((col) => {
                    const isSorted = sortColumnId === col.id;
                    return (
                      <th
                        key={col.id}
                        scope="col"
                        style={{ width: col.width }}
                        className={cn(
                          "py-3.5 px-4 text-xs font-extrabold tracking-tight whitespace-nowrap",
                          col.sortable && "cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white transition-colors",
                          col.align === "center" && "text-center",
                          col.align === "left" && "text-left"
                        )}
                        onClick={() => col.sortable && handleSort(col.id)}
                      >
                        <div
                          className={cn(
                            "inline-flex items-center gap-1.5",
                            col.align === "center" && "justify-center",
                            col.align === "left" && "justify-end"
                          )}
                        >
                          <span>{col.header}</span>
                          {col.sortable && (
                            <span className="text-slate-400 dark:text-slate-500">
                              {isSorted ? (
                                sortDirection === "asc" ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-[#137a85] dark:text-teal-400" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-[#137a85] dark:text-teal-400" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                {paginatedData.map((row, index) => (
                  <tr
                    key={keyExtractor(row, index)}
                    className="hover:bg-teal-50/50 dark:hover:bg-slate-800/70 transition-colors duration-150 group"
                  >
                    {activeColumns.map((col) => {
                      let cellVal: any;
                      if (col.accessorFn) {
                        cellVal = col.accessorFn(row);
                      } else if (col.accessorKey) {
                        cellVal = row[col.accessorKey];
                      }

                      return (
                        <td
                          key={col.id}
                          className={cn(
                            "py-4 px-4 text-slate-700 dark:text-slate-300 align-middle",
                            col.align === "center" && "text-center",
                            col.align === "left" && "text-left"
                          )}
                        >
                          {col.cell ? col.cell({ row, value: cellVal, index }) : cellVal ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination & Summary Footer */}
          <div className="px-4 py-3.5 bg-slate-50/60 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>عرض</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#137a85] cursor-pointer"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span>من أصل <strong className="font-bold text-slate-800 dark:text-slate-100">{totalItems}</strong> سجل</span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="الصفحة السابقة"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>

                <span className="font-bold text-slate-700 dark:text-slate-200 px-2 font-mono">
                  {safePage} / {totalPages}
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="الصفحة التالية"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
