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
      default: "bg-white border-slate-200/90 shadow-xs",
      subtle: "bg-slate-50/70 border-slate-200/80 shadow-none",
      elevated: "bg-white border-slate-200/80 shadow-md",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border transition-all duration-200",
          variantClasses[variant] || variantClasses.default,
          compact ? "p-4" : "p-5 md:p-6",
          hover && "hover:shadow-md hover:border-slate-300",
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
    className={cn("text-sm md:text-base font-bold text-slate-800", className)}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ className, children, ...props }) => (
  <p className={cn("text-xs text-slate-500 mt-0.5", className)} {...props}>
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
