"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  align = "left", // In RTL, "left" aligns with the button's start edge
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [menuCoords, setMenuCoords] = useState<{
    top: number;
    left: number;
    placement: "bottom" | "top";
  }>({
    top: 0,
    left: 0,
    placement: "bottom",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 220; // comfortable width for full action labels with icons
    const estimatedHeight = items.length * 40 + 18;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const placement: "bottom" | "top" =
      spaceBelow < estimatedHeight && spaceAbove > spaceBelow ? "top" : "bottom";

    let top = placement === "bottom" ? rect.bottom + 6 : rect.top - estimatedHeight - 6;

    // Horizontal alignment
    let left = align === "left" ? rect.left : rect.right - menuWidth;

    // Viewport clamping with safe margin
    if (left < 10) left = 10;
    if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }

    if (top < 10) top = 10;
    if (top + estimatedHeight > window.innerHeight - 10) {
      top = Math.max(10, window.innerHeight - estimatedHeight - 10);
    }

    setMenuCoords({ top, left, placement });
  }, [align, items.length]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const variantTextClasses: Record<string, string> = {
    default: "text-slate-700 hover:text-slate-900 hover:bg-slate-100/90",
    danger: "text-rose-600 hover:text-rose-700 hover:bg-rose-50",
    success: "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50",
    warning: "text-amber-700 hover:text-amber-800 hover:bg-amber-50",
  };

  return (
    <div className={cn("inline-block text-right", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          updatePosition();
          setIsOpen((prev) => !prev);
        }}
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

      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <>
                {/* Transparent overlay for outside click capture */}
                <div
                  className="fixed inset-0 z-[9998] bg-transparent"
                  onClick={() => setIsOpen(false)}
                  aria-hidden="true"
                />

                {/* Floating Portal Menu */}
                <motion.div
                  ref={menuRef}
                  initial={{
                    opacity: 0,
                    scale: 0.96,
                    y: menuCoords.placement === "top" ? 6 : -6,
                  }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    scale: 0.96,
                    y: menuCoords.placement === "top" ? 6 : -6,
                  }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  role="menu"
                  aria-orientation="vertical"
                  style={{
                    position: "fixed",
                    top: `${menuCoords.top}px`,
                    left: `${menuCoords.left}px`,
                    width: "220px",
                  }}
                  className="z-[9999] rounded-2xl bg-white/98 backdrop-blur-md border border-slate-200/90 shadow-2xl p-1.5 focus:outline-none text-right font-sans select-none"
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
                          "w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none text-right",
                          variantTextClasses[item.variant || "default"]
                        )}
                      >
                        {item.icon && (
                          <span className="w-4 h-4 shrink-0 flex items-center justify-center text-slate-500 group-hover:text-inherit">
                            {React.isValidElement(item.icon)
                              ? item.icon
                              : React.createElement(
                                  item.icon as React.ComponentType<{ className?: string }>,
                                  { className: "w-4 h-4" }
                                )}
                          </span>
                        )}
                        <span className="flex-1 truncate leading-tight">{item.label}</span>
                      </button>
                    </React.Fragment>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
