"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "card" | "circle" | "table-row";
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({
  className,
  variant = "text",
  count = 1,
  ...props
}) => {
  const variantClasses = {
    text: "h-4 w-full rounded-md bg-slate-200/80 animate-pulse",
    card: "h-32 w-full rounded-2xl bg-slate-200/80 animate-pulse",
    circle: "w-10 h-10 rounded-full bg-slate-200/80 animate-pulse shrink-0",
    "table-row": "h-12 w-full rounded-xl bg-slate-100 animate-pulse",
  };

  if (count > 1) {
    return (
      <div className="space-y-3 w-full" aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(variantClasses[variant], className)}
            {...props}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(variantClasses[variant], className)}
      aria-hidden="true"
      {...props}
    />
  );
};
