"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ExternalLink,
  FileText,
  Eye,
  Maximize2,
  RefreshCw,
} from "lucide-react";
import { openSafeAttachmentUrl, createSafeBlobUrl } from "@/lib/attachments";

interface AttachmentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string | null;
  title?: string;
  fileName?: string;
}

export const AttachmentViewerModal: React.FC<AttachmentViewerModalProps> = ({
  isOpen,
  onClose,
  url,
  title = "معاينة المرفق الرسمي",
  fileName = "attachment",
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const isPdf =
    Boolean(url) &&
    (url!.toLowerCase().includes(".pdf") ||
      url!.startsWith("data:application/pdf"));

  // Create safe Blob URL for Data URLs when viewing PDF
  useEffect(() => {
    let createdUrl: string | null = null;
    if (isOpen && url && isPdf && url.startsWith("data:")) {
      createdUrl = createSafeBlobUrl(url);
      setBlobUrl(createdUrl);
    } else {
      setBlobUrl(null);
    }
    return () => {
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, url, isPdf]);

  // Reset zoom & rotation when url or open state changes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen, url]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !url) return null;

  const displayPdfUrl = blobUrl || url;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleOpenSafe = () => {
    openSafeAttachmentUrl(url, fileName);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md"
        dir="rtl"
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
        >
          {/* Top Bar */}
          <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300 shrink-0">
                <Eye className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{title}</h3>
                <p className="text-[11px] text-indigo-200/70 font-mono truncate">
                  {isPdf ? "مستند PDF" : "صورة مرفقة"}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {!isPdf && (
                <div className="hidden sm:flex items-center gap-1 bg-white/10 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors"
                    title="تكبير (+)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors"
                    title="تصغير (-)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRotate}
                    className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors"
                    title="تدوير (90°)"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  {(zoom !== 1 || rotation !== 0) && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-2 py-1 hover:bg-white/20 rounded-lg text-[10px] text-indigo-200 transition-colors"
                      title="إعادة ضبط الحجم"
                    >
                      إعادة ضبط
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleOpenSafe}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                title="فتح في نافذة مستقلة / تحميل"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">فتح في نافذة جديدة</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors focus:outline-none"
                aria-label="إغلاق المعاينة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content Preview Area */}
          <div className="flex-1 min-h-[350px] max-h-[75vh] p-4 bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-auto custom-scrollbar">
            {isPdf ? (
              <div className="w-full h-full min-h-[520px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-inner flex flex-col relative">
                <object
                  data={displayPdfUrl}
                  type="application/pdf"
                  className="w-full flex-1 min-h-[500px] border-0"
                >
                  <div className="w-full h-full min-h-[420px] flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-900/50">
                    <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 shadow-2xs">
                      <FileText className="w-7 h-7" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1.5">
                      مستند PDF معتمد
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-5 leading-relaxed">
                      يتطلب متصفحك فتح مستندات PDF في نافذة مستقلة لعرضها بالحجم الكامل والتحكم بخيارات الطباعة والتنزيل.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleOpenSafe}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>فتح المستند في نافذة مستقلة</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenSafe}
                        className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>تحميل المستند</span>
                      </button>
                    </div>
                  </div>
                </object>
              </div>
            ) : (
              <div className="relative flex items-center justify-center w-full h-full min-h-[320px] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={title}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: "transform 0.15s ease-out",
                  }}
                  className="max-h-[68vh] max-w-full object-contain rounded-xl shadow-lg select-none"
                  draggable={false}
                />
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="px-5 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>مستند إداري معتمد داخل المنصة</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              إغلاق المعاينة
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
