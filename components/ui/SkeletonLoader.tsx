"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "card" | "circle" | "table-row";
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({
  className,
  variant = "text",
  ...props
}) => {
  const variantClasses = {
    text: "h-4 w-full rounded-md bg-slate-200/80 animate-pulse",
    card: "h-32 w-full rounded-2xl bg-slate-200/80 animate-pulse",
    circle: "w-10 h-10 rounded-full bg-slate-200/80 animate-pulse shrink-0",
    "table-row": "h-12 w-full rounded-xl bg-slate-100 animate-pulse",
  };

  return (
    <div
      className={cn(variantClasses[variant], className)}
      aria-hidden="true"
      {...props}
    />
  );
};
