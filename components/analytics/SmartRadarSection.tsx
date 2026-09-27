"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  Zap,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProactiveAlert } from "@/lib/delayDeductionIntegration";
import { Button } from "@/components/ui/Button";

export interface SmartRadarSectionProps {
  alerts: ProactiveAlert[];
  className?: string;
}

export const SmartRadarSection: React.FC<SmartRadarSectionProps> = ({
  alerts,
  className,
}) => {
  const [activeFilter, setActiveFilter] = useState<"all" | "critical" | "warning" | "info">("all");

  const criticalCount = useMemo(() => alerts.filter((a) => a.severity === "critical").length, [alerts]);
  const warningCount = useMemo(() => alerts.filter((a) => a.severity === "warning").length, [alerts]);
  const infoCount = useMemo(() => alerts.filter((a) => a.severity === "info").length, [alerts]);

  const filteredAlerts = useMemo(() => {
    if (activeFilter === "all") return alerts;
    return alerts.filter((a) => a.severity === activeFilter);
  }, [alerts, activeFilter]);

  const severityConfigs = {
    critical: {
      border: "border-rose-200/90 dark:border-rose-800/60 hover:border-rose-400/80 dark:hover:border-rose-600",
      bg: "bg-rose-50/40 dark:bg-rose-950/30 hover:bg-rose-50/70 dark:hover:bg-rose-950/50",
      badgeBg: "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-700",
      badgeText: "عاجل / حسم فوري",
      icon: ShieldAlert,
      iconColor: "text-rose-600 dark:text-rose-400",
      btnVariant: "danger" as const,
      pulseColor: "bg-rose-500",
    },
    warning: {
      border: "border-amber-200/90 dark:border-amber-800/60 hover:border-amber-400/80 dark:hover:border-amber-600",
      bg: "bg-amber-50/40 dark:bg-amber-950/30 hover:bg-amber-50/70 dark:hover:bg-amber-950/50",
      badgeBg: "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700",
      badgeText: "تنبيه اقتراب النصاب",
      icon: AlertTriangle,
      iconColor: "text-amber-600 dark:text-amber-400",
      btnVariant: "warning" as const,
      pulseColor: "bg-amber-500",
    },
    info: {
      border: "border-blue-200/90 dark:border-blue-800/60 hover:border-blue-400/80 dark:hover:border-blue-600",
      bg: "bg-blue-50/40 dark:bg-blue-950/30 hover:bg-blue-50/70 dark:hover:bg-blue-950/50",
      badgeBg: "bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700",
      badgeText: "إشعار إداري",
      icon: Info,
      iconColor: "text-blue-600 dark:text-blue-400",
      btnVariant: "primary" as const,
      pulseColor: "bg-blue-500",
    },
  };

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden", className)}>
      {/* Top Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/80 dark:from-slate-850 via-white dark:via-slate-900 to-slate-50/40 dark:to-slate-850">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200/80 dark:border-teal-800/60 flex items-center justify-center text-[#137a85] dark:text-teal-400 shadow-xs">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">الرادار الإداري الاستباقي</h2>
              {alerts.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse">
                  {alerts.length} إجراء مطلوب
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              كشف تلقائي مستمر للمعلمات المستحقات للحسم والإنذارات المبكرة حسب اللوائح الوزارية
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer",
              activeFilter === "all"
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            )}
          >
            الكل ({alerts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("critical")}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeFilter === "critical"
                ? "bg-rose-600 text-white shadow-2xs"
                : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100/70 dark:hover:bg-rose-900/50 border border-rose-200/60 dark:border-rose-800/60"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span>حرِج ({criticalCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("warning")}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeFilter === "warning"
                ? "bg-amber-600 text-white shadow-2xs"
                : "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:bg-amber-100/70 dark:hover:bg-amber-900/50 border border-amber-200/60 dark:border-amber-800/60"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>إنذار مبكر ({warningCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("info")}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeFilter === "info"
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 hover:bg-blue-100/70 dark:hover:bg-blue-900/50 border border-blue-200/60 dark:border-blue-800/60"
            )}
          >
            <span>إرشادي ({infoCount})</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-6">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-slate-50/60 dark:bg-slate-850/60 border border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">الرادار الإداري مستقر ومنضبط</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              لا توجد حالات تستدعي تدخلاً إدارياً فورياً ضمن التصنيف المختار حالياً.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {filteredAlerts.map((alert, idx) => {
                const cfg = severityConfigs[alert.severity] || severityConfigs.info;
                const IconComponent = cfg.icon;

                return (
                  <motion.div
                    key={alert.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: idx * 0.04, duration: 0.2 }}
                    className={cn(
                      "p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs",
                      cfg.border,
                      cfg.bg
                    )}
                  >
                    <div>
                      {/* Top Bar: Severity Badge + Teacher Name */}
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5", cfg.badgeBg)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", cfg.pulseColor)} />
                          <span>{cfg.badgeText}</span>
                        </span>

                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{alert.teacherName}</span>
                        </span>
                      </div>

                      {/* Alert Title */}
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <IconComponent className={cn("w-4 h-4 shrink-0", cfg.iconColor)} />
                        <span>{alert.title}</span>
                      </h4>

                      {/* Alert Description */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {alert.description}
                      </p>
                    </div>

                    {/* Footer Action Button */}
                    <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-end">
                      <Link href={alert.actionUrl}>
                        <Button
                          variant={cfg.btnVariant}
                          size="sm"
                          rightIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                        >
                          {alert.actionLabel}
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
