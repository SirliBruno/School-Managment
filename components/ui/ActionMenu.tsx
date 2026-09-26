"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "default" | "danger" | "success" | "warning";
  disabled?: boolean;
  dividerBefore?: boolean;
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  triggerLabel?: string;
  className?: string;
  align?: "left" | "right";
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  items,
  triggerLabel = "إجراءات الصف",
  className,
  align = "left", // In RTL, "left" opens towards the inner content
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const variantTextClasses: Record<string, string> = {
    default: "text-slate-700 hover:text-slate-900 hover:bg-slate-100",
    danger: "text-rose-600 hover:text-rose-700 hover:bg-rose-50",
    success: "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50",
    warning: "text-amber-700 hover:text-amber-800 hover:bg-amber-50",
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block text-right", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={triggerLabel}
        className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/50",
          isOpen && "bg-slate-100 text-slate-900 border-slate-200 shadow-2xs"
        )}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="menu"
            aria-orientation="vertical"
            className={cn(
              "absolute z-40 mt-1 w-48 rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 focus:outline-none",
              align === "left" ? "left-0" : "right-0"
            )}
          >
            {items.map((item) => (
              <React.Fragment key={item.id}>
                {item.dividerBefore && <div className="my-1 border-t border-slate-100" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    setIsOpen(false);
                    item.onClick();
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none text-right",
                    variantTextClasses[item.variant || "default"]
                  )}
                >
                  {item.icon && (
                    <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                      {React.isValidElement(item.icon)
                        ? item.icon
                        : React.createElement(
                            item.icon as React.ComponentType<{ className?: string }>,
                            { className: "w-4 h-4" }
                          )}
                    </span>
                  )}
                  <span className="flex-1 truncate">{item.label}</span>
                </button>
              </React.Fragment>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
