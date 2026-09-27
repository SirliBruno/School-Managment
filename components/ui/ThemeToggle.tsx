"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme, Theme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

export interface ThemeToggleProps {
  variant?: "button" | "dropdown" | "compact";
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = "button",
  className,
}) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (variant !== "dropdown") return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [variant]);

  if (!mounted) {
    return (
      <div
        className={cn(
          "w-9 h-9 rounded-xl border border-slate-200/80 bg-white/80 dark:bg-slate-800 dark:border-slate-700 animate-pulse",
          className
        )}
      />
    );
  }

  // Simple one-click toggle button
  if (variant === "button" || variant === "compact") {
    const isDark = resolvedTheme === "dark";
    return (
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={toggleTheme}
        className={cn(
          "relative inline-flex items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
          variant === "compact" ? "w-8 h-8" : "w-9 h-9",
          isDark
            ? "bg-slate-800/90 hover:bg-slate-700/90 text-amber-300 border-slate-700/90 shadow-2xs"
            : "bg-white/90 hover:bg-slate-100 text-slate-700 border-slate-200/90 shadow-2xs hover:text-slate-900",
          className
        )}
        title={isDark ? "التبديل إلى الوضع النهاري (فاتح)" : "التبديل إلى الوضع الليلي (داكن)"}
        aria-label={isDark ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي"}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="moon"
              initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex items-center justify-center"
            >
              <Moon className="w-4 h-4 text-amber-300 stroke-[2.2]" />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: 90, scale: 0.6, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex items-center justify-center"
            >
              <Sun className="w-4 h-4 text-amber-500 stroke-[2.2]" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }

  // Dropdown variant with System / Light / Dark options
  const options: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "الوضع النهاري", icon: Sun },
    { id: "dark", label: "الوضع الليلي", icon: Moon },
    { id: "system", label: "تلقائي (حسب النظام)", icon: Monitor },
  ];

  return (
    <div ref={dropdownRef} className="relative inline-block text-right">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl border text-xs font-bold transition-all duration-200 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
          resolvedTheme === "dark"
            ? "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
          className
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {resolvedTheme === "dark" ? (
          <Moon className="w-4 h-4 text-amber-300 shrink-0" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500 shrink-0" />
        )}
        <span className="hidden sm:inline">
          {theme === "system" ? "تلقائي" : theme === "dark" ? "داكن" : "فاتح"}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-1.5 w-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 z-50 text-xs font-medium"
          >
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setTheme(opt.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer",
                    isSelected
                      ? "bg-teal-50 text-[#137a85] dark:bg-teal-950/60 dark:text-teal-300 font-bold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#137a85] dark:text-teal-400" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
