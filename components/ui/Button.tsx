"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "success"
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
      sm: "h-[34px] px-3 text-xs rounded-xl gap-1.5",
      md: "h-10 px-4 text-xs sm:text-sm rounded-xl gap-2",
      lg: "h-12 px-6 text-sm sm:text-base rounded-xl gap-2.5",
    };

    const variantClasses = {
      primary:
        "bg-gradient-to-b from-[#15828e] to-[#0f666f] hover:from-[#18919e] hover:to-[#116e78] text-white border border-[#0d5961] shadow-[0_1px_2px_rgba(0,0,0,0.08),inset_0_1px_0.5px_rgba(255,255,255,0.22)] active:scale-[0.98]",
      secondary:
        "bg-slate-100 hover:bg-slate-200/90 text-slate-800 border border-slate-200 shadow-2xs active:scale-[0.98]",
      success:
        "bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white border border-emerald-800 shadow-[0_1px_2px_rgba(0,0,0,0.08),inset_0_1px_0.5px_rgba(255,255,255,0.2)] active:scale-[0.98]",
      emerald:
        "bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white border border-emerald-800 shadow-[0_1px_2px_rgba(0,0,0,0.08),inset_0_1px_0.5px_rgba(255,255,255,0.2)] active:scale-[0.98]",
      warning:
        "bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white border border-amber-700 shadow-[0_1px_2px_rgba(0,0,0,0.08),inset_0_1px_0.5px_rgba(255,255,255,0.2)] active:scale-[0.98]",
      danger:
        "bg-gradient-to-b from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white border border-rose-800 shadow-[0_1px_2px_rgba(0,0,0,0.08),inset_0_1px_0.5px_rgba(255,255,255,0.2)] active:scale-[0.98]",
      ghost:
        "bg-transparent hover:bg-slate-100/90 text-slate-600 hover:text-slate-900 active:scale-[0.98]",
      outline:
        "bg-white hover:bg-teal-50/60 text-[#137a85] border border-teal-200 hover:border-teal-300 shadow-2xs active:scale-[0.98]",
      "outline-danger":
        "bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs active:scale-[0.98]",
    };

    const leadIcon = leftIcon || icon;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          "group inline-flex items-center justify-center font-bold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : leadIcon ? (
          <span className="shrink-0 transition-transform duration-200 ease-out group-hover:scale-110">{leadIcon}</span>
        ) : null}
        {children && <span>{children}</span>}
        {rightIcon && !isLoading && (
          <span className="shrink-0 transition-transform duration-200 ease-out group-hover:scale-110">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
