"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  description?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actionButtons?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  breadcrumbs = [{ label: "نظام الإدارة المدرسية", href: "/" }],
  description,
  subtitle,
  badge,
  actionButtons,
  actions,
  className,
}) => {
  const descText = subtitle || description;
  const actionNode = actions || actionButtons;
  return (
    <header
      className={cn(
        "bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-[72px] z-10 shadow-2xs transition-colors",
        className
      )}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-1.5 flex-wrap"
            >
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.label + idx}>
                    {idx > 0 && (
                      <ChevronLeft
                        className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    {crumb.href && !isLast ? (
                      <Link
                        href={crumb.href}
                        className="hover:text-teal-700 dark:hover:text-teal-400 transition-colors font-medium"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        className={cn(
                          isLast
                            ? "text-[#137a85] dark:text-teal-400 font-bold"
                            : "font-medium text-slate-500 dark:text-slate-400"
                        )}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          )}

          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={typography.pageTitle}>{title}</h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>

          {descText && (
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {descText}
            </p>
          )}
        </div>

        {actionNode && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {actionNode}
          </div>
        )}
      </div>
    </header>
  );
};
