"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({
  className,
  required,
  children,
  ...props
}) => {
  return (
    <label
      className={cn(
        "block text-xs md:text-sm font-bold text-slate-700 mb-1.5 select-none",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-rose-500 mr-1">*</span>}
    </label>
  );
};
