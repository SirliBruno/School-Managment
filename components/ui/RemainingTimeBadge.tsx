"use client";

import React from "react";
import { Clock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useRemainingTime } from "@/hooks/useRemainingTime";
import { cn } from "@/lib/utils";

export interface RemainingTimeBadgeProps {
  expiresAt?: string | null;
  isCompleted?: boolean;
  variantFormat?: "exact" | "short";
  prefix?: string;
  size?: "xs" | "sm" | "md";
  className?: string;
  pulseOnUrgent?: boolean;
  showIcon?: boolean;
}

export const RemainingTimeBadge: React.FC<RemainingTimeBadgeProps> = ({
  expiresAt,
  isCompleted = false,
  variantFormat = "exact",
  prefix,
  size = "sm",
  className,
  pulseOnUrgent = true,
  showIcon = true,
}) => {
  const details = useRemainingTime(expiresAt, isCompleted);

  const sizeClasses = {
    xs: "text-[10px] px-2 py-0.5 gap-1",
    sm: "text-[11px] px-2.5 py-1 gap-1.5",
    md: "text-xs px-3 py-1.5 gap-2",
  };

  const iconSizes = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
  };

  let iconNode = <Clock className={iconSizes[size]} />;
  let colorClasses =
    "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80";

  if (details.isCompleted) {
    iconNode = <CheckCircle2 className={iconSizes[size]} />;
    colorClasses =
      "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80";
  } else if (details.isExpired) {
    iconNode = <XCircle className={iconSizes[size]} />;
    colorClasses =
      "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/80";
  } else if (details.isUrgent) {
    iconNode = <AlertTriangle className={iconSizes[size]} />;
    colorClasses = cn(
      "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/80",
      pulseOnUrgent && "animate-pulse"
    );
  }

  const label =
    variantFormat === "short" ? details.formattedShort : details.formattedExact;

  return (
    <span
      suppressHydrationWarning
      className={cn(
        "inline-flex items-center font-bold rounded-full border transition-colors select-none shrink-0 shadow-2xs",
        sizeClasses[size],
        colorClasses,
        className
      )}
      title={`صلاحية الرابط: ${details.formattedExact}`}
    >
      {showIcon && <span className="shrink-0">{iconNode}</span>}
      <span suppressHydrationWarning>
        {prefix ? `${prefix} ` : ""}
        {label}
      </span>
    </span>
  );
};
