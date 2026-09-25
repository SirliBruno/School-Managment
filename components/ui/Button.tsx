"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "emerald"
    | "outline"
    | "ghost"
    | "danger"
    | "outline-danger"
    | "warning";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      icon,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "h-8.5 px-3 text-xs rounded-xl gap-1.5",
      md: "h-10 px-4 text-xs sm:text-sm rounded-xl gap-2",
      lg: "h-12 px-6 text-sm sm:text-base rounded-xl gap-2.5",
    };

    const variantClasses = {
      primary:
        "bg-[#137a85] hover:bg-teal-700 text-white shadow-2xs hover:shadow-xs active:scale-[0.98]",
      emerald:
        "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs hover:shadow-xs active:scale-[0.98]",
      secondary:
        "bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200/80 active:scale-[0.98]",
      outline:
        "bg-white hover:bg-teal-50 text-[#137a85] border border-teal-200 hover:border-teal-300 active:scale-[0.98]",
      ghost:
        "bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 active:scale-[0.98]",
      danger:
        "bg-rose-600 hover:bg-rose-700 text-white shadow-2xs hover:shadow-xs active:scale-[0.98]",
      "outline-danger":
        "bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 active:scale-[0.98]",
      warning:
        "bg-amber-500 hover:bg-amber-600 text-white shadow-2xs hover:shadow-xs active:scale-[0.98]",
    };

    const leadIcon = leftIcon || icon;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-bold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed select-none",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : leadIcon ? (
          <span className="shrink-0">{leadIcon}</span>
        ) : null}
        {children && <span>{children}</span>}
        {rightIcon && !isLoading && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
