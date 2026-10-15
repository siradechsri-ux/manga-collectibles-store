"use client";

import React from "react";

export interface PointBadgeProps {
  /**
   * ขนาดของ PointBadge
   * - xs: 14x14px (เหมาะสำหรับ inline text / pills เล็ก)
   * - sm: 18x18px (เหมาะสำหรับ Navbar / Card footer)
   * - md: 22x22px (เหมาะสำหรับสรุปคะแนน / หัวข้อปานกลาง)
   * - lg: 28x28px (เหมาะสำหรับแบนเนอร์ / หัวข้อย่อย)
   * - xl: 44x44px (เหมาะสำหรับ Dashboard Header / Points Hero Banner)
   */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /**
   * รูปแบบการแสดงผล
   * - "token" (ค่าเริ่มต้น): เหรียญสะสมแต้มพร้อมตัว P สีน้ำเงินราชนาวี
   * - "solid": เหรียญพื้นหลังสีน้ำเงินพร้อมตัว P สีขาว
   * - "plain": สัญลักษณ์ตัว P สีน้ำเงินล้วน
   */
  variant?: "token" | "solid" | "plain";
  /**
   * คลาส Tailwind เพิ่มเติม
   */
  className?: string;
  /**
   * กำหนดข้อความสำหรับ Accessibility (ค่าเริ่มต้น aria-hidden)
   */
  ariaLabel?: string;
}

const sizeDimensions = {
  xs: "h-3.5 w-3.5 min-w-3.5",
  sm: "h-4.5 w-4.5 min-w-4.5",
  md: "h-5.5 w-5.5 min-w-5.5",
  lg: "h-7 w-7 min-w-7",
  xl: "h-11 w-11 min-w-11",
};

/**
 * คอมโพเนนต์สัญลักษณ์สะสมแต้ม "ตัว P สีน้ำเงิน" (Blue P Point Token)
 * สะอาด ตา คมชัดระดับ Vector มาตรฐาน Clean UI 100% ปราศจาก Emoji
 */
export default function PointBadge({
  size = "sm",
  variant = "token",
  className = "",
  ariaLabel,
}: PointBadgeProps) {
  const sizeClass = sizeDimensions[size] || sizeDimensions.sm;

  if (variant === "plain") {
    return (
      <span
        role={ariaLabel ? "img" : undefined}
        aria-label={ariaLabel}
        aria-hidden={!ariaLabel}
        className={`inline-flex shrink-0 items-center justify-center font-black select-none text-blue-600 dark:text-blue-400 ${className}`}
      >
        P
      </span>
    );
  }

  if (variant === "solid") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`inline-block shrink-0 select-none ${sizeClass} ${className}`}
        role={ariaLabel ? "img" : undefined}
        aria-label={ariaLabel}
        aria-hidden={!ariaLabel}
      >
        {/* Solid Blue Circle */}
        <circle
          cx="12"
          cy="12"
          r="10.5"
          className="fill-blue-600 stroke-blue-700 dark:fill-blue-500 dark:stroke-blue-600"
          strokeWidth="1.2"
        />
        <circle
          cx="12"
          cy="12"
          r="8.5"
          className="stroke-white/30"
          strokeWidth="0.8"
          strokeDasharray="1.5 1.5"
        />
        {/* White Letter P */}
        <path
          d="M 7.8 6 H 12.5 C 14.8 6 16.5 7.7 16.5 10 C 16.5 12.3 14.8 14 12.5 14 H 10.5 V 18 H 7.8 V 6 Z M 10.5 8.4 H 12.3 C 13.3 8.4 14.1 9.1 14.1 10 C 14.1 10.9 13.3 11.6 12.3 11.6 H 10.5 V 8.4 Z"
          fill="white"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  // Variant "token" (Default): Circular medallion with distinct Blue Letter P
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 select-none align-middle ${sizeClass} ${className}`}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
    >
      {/* Outer Coin Rim */}
      <circle
        cx="12"
        cy="12"
        r="10.5"
        className="fill-blue-50 stroke-blue-500 dark:fill-blue-950/80 dark:stroke-blue-400"
        strokeWidth="1.5"
      />
      {/* Inner Decorative Dashed Ring */}
      <circle
        cx="12"
        cy="12"
        r="8.2"
        className="stroke-blue-300 dark:stroke-blue-700/80"
        strokeWidth="0.8"
        strokeDasharray="1.5 1.5"
      />
      {/* Sharp Blue Letter P (ตัว P สีน้ำเงิน) */}
      <path
        d="M 7.8 6 H 12.5 C 14.8 6 16.5 7.7 16.5 10 C 16.5 12.3 14.8 14 12.5 14 H 10.5 V 18 H 7.8 V 6 Z M 10.5 8.4 H 12.3 C 13.3 8.4 14.1 9.1 14.1 10 C 14.1 10.9 13.3 11.6 12.3 11.6 H 10.5 V 8.4 Z"
        className="fill-blue-600 dark:fill-blue-400"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}
