"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "success"
    | "warning"
    | "error"
    | "info"
    | "neutral"
    | "brand"
    | "purple";
  shape?: "pill" | "rounded";
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  shape = "pill",
  icon,
  children,
  ...props
}) => {
  const variantStyles = {
    brand: "bg-teal-50 text-[#137a85] border-teal-200/80",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    warning: "bg-amber-50 text-amber-700 border-amber-200/80",
    error: "bg-rose-50 text-rose-700 border-rose-200/80",
    info: "bg-sky-50 text-sky-700 border-sky-200/80",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200/80",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold border shrink-0 transition-colors select-none",
        shape === "pill" ? "rounded-full" : "rounded-lg",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
