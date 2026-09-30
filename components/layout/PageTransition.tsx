"use client";

import React from "react";
import { usePathname } from "next/navigation";

import { motion } from "framer-motion";

export const PageTransition: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0.92, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      className="w-full flex-1 flex flex-col min-w-0"
    >
      {children}
    </motion.div>
  );
};
