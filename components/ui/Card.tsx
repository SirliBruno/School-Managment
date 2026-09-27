"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  compact?: boolean;
  interactive?: boolean;
  variant?: "default" | "subtle" | "elevated";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      hover = false,
      compact = false,
      interactive = false,
      variant = "default",
      children,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      default: "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs",
      subtle: "bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 shadow-none",
      elevated: "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-md",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border transition-all duration-200",
          variantClasses[variant] || variantClasses.default,
          compact ? "p-4" : "p-5 md:p-6",
          hover && "hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700",
          interactive && "cursor-pointer active:scale-[0.995]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn("flex items-center justify-between gap-3 mb-4", className)}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3
    className={cn("text-sm md:text-base font-bold text-slate-800 dark:text-slate-100", className)}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ className, children, ...props }) => (
  <p className={cn("text-xs text-slate-500 dark:text-slate-400 mt-0.5", className)} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn("space-y-4", className)} {...props}>
    {children}
  </div>
);
