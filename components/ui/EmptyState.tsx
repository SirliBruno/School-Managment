"use client";

import React from "react";
import { Inbox, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-14 px-4 select-none",
        className
      )}
    >
      <div className="w-16 h-16 rounded-3xl bg-slate-100/90 dark:bg-slate-800/90 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-4 shadow-2xs border border-slate-200/70 dark:border-slate-700/70">
        {icon || <Inbox className="w-8 h-8 stroke-[1.5] text-slate-400 dark:text-slate-500" />}
      </div>
      <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1.5">
        {title}
      </h4>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed mb-5">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#137a85] text-white hover:bg-teal-700 shadow-2xs hover:shadow transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};
