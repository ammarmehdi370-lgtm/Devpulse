"use client";

import React from "react";
import Image from "next/image";

type BrandLogoProps = {
  size?: "compact" | "large";
};

export const BrandMark: React.FC<{ className?: string }> = ({
  className = "h-8 w-8",
}) => (
  <span
    className={`flex shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0D1117] shadow-[0_4px_14px_rgba(0,0,0,0.28)] ${className}`}
  >
    <Image
      src="/devpulse-synapse-mark.svg"
      alt=""
      aria-hidden="true"
      width={48}
      height={48}
      priority
      className="h-[88%] w-[88%]"
    />
  </span>
);

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = "compact" }) => {
  const isLarge = size === "large";

  return (
    <span
      className={`inline-flex items-center gap-3 rounded-xl border border-ide-border-strong bg-ide-panel ${
        isLarge
          ? "px-4 py-3 shadow-[0_12px_32px_var(--ide-color-shadow-strong)]"
          : "border-transparent bg-transparent p-0"
      }`}
    >
      <BrandMark className={isLarge ? "h-12 w-12 rounded-xl" : "h-8 w-8"} />
      <span
        className={`whitespace-nowrap font-semibold tracking-tight ${
          isLarge ? "text-[25px]" : "text-[13px]"
        }`}
      >
        <span className="text-[#F0F6FC]">Dev</span>
        <span className="text-[#8B5CF6]">pulse</span>
      </span>
    </span>
  );
};
