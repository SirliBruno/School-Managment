"use client";

import React from "react";
import { Inbox } from "lucide-react";
import { Button } from "./Button";
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
        "flex flex-col items-center justify-center text-center py-12 px-4 select-none",
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3.5 shadow-2xs">
        {icon || <Inbox className="w-7 h-7 stroke-[1.5]" />}
      </div>
      <h4 className="text-sm md:text-base font-bold text-slate-800 mb-1">
        {title}
      </h4>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mb-4">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
