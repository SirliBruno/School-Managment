"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute right-3.5 text-slate-400 pointer-events-none shrink-0">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full h-11 px-3.5 rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150",
              "border-slate-200 hover:border-slate-300 focus:outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500/15",
              icon && "pr-10",
              error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={cn(
            "w-full p-3.5 rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150 min-h-[90px]",
            "border-slate-200 hover:border-slate-300 focus:outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500/15",
            error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          className={cn(
            "w-full h-11 px-3.5 rounded-xl border bg-white text-sm text-slate-900 transition-all duration-150 cursor-pointer",
            "border-slate-200 hover:border-slate-300 focus:outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500/15",
            error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
