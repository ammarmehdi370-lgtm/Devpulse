import React, { useId } from "react";

export interface DevpulseLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "mark" | "text";
  theme?: "dark" | "light" | "auto";
  className?: string;
}

const SIZES = {
  sm: { width: 140, height: 32, markSize: 24 },
  md: { width: 210, height: 48, markSize: 36 },
  lg: { width: 280, height: 64, markSize: 48 },
  xl: { width: 420, height: 96, markSize: 72 },
} as const;

function GradientDefinitions({ primaryId, syncId }: { primaryId: string; syncId: string }) {
  return (
    <defs>
      <linearGradient id={primaryId} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366F1" />
        <stop offset="50%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
      <linearGradient id={syncId} x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#06B6D4" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
    </defs>
  );
}

function LogoMark({
  primaryId,
  syncId,
  fill = "transparent",
}: {
  primaryId: string;
  syncId: string;
  fill?: string;
}) {
  return (
    <g>
      <path
        d="M 18 10 L 8 20 L 18 30"
        fill="none"
        stroke={`url(#${primaryId})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 30 18 L 40 28 L 30 38"
        fill="none"
        stroke={`url(#${syncId})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="24" r="4.5" fill={fill} stroke={`url(#${primaryId})`} strokeWidth="2.5" />
      <circle cx="24" cy="24" r="1.8" fill="#06B6D4" />
    </g>
  );
}

export function DevpulseLogo({
  size = "lg",
  variant = "full",
  theme = "dark",
  className,
}: DevpulseLogoProps) {
  const { width, height, markSize } = SIZES[size];
  const instanceId = useId().replace(/:/g, "");
  const primaryId = `dp-grad-primary-${instanceId}`;
  const syncId = `dp-grad-sync-${instanceId}`;
  const titleId = `dp-logo-title-${instanceId}`;
  const textColor = theme === "dark" ? "#F0F6FC" : theme === "light" ? "#0D1117" : "currentColor";
  const markFill = theme === "dark" ? "#0D1117" : theme === "light" ? "#FFFFFF" : "transparent";
  const fontFamily = "var(--font-plus-jakarta), system-ui, sans-serif";

  if (variant === "mark") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        width={markSize}
        height={markSize}
        className={className}
        role="img"
        aria-label="Devpulse"
      >
        <GradientDefinitions primaryId={primaryId} syncId={syncId} />
        <LogoMark primaryId={primaryId} syncId={syncId} />
      </svg>
    );
  }

  if (variant === "text") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 184 64"
        width={Math.round((height * 184) / 64)}
        height={height}
        className={className}
        role="img"
        aria-label="Devpulse"
      >
        <text x="0" y="41" className="wordmark" fontFamily={fontFamily} fontSize="27" fontWeight="800">
          <tspan fill={textColor}>dev</tspan>
          <tspan fill="#8B5CF6">pulse</tspan>
        </text>
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 280 64"
      width={width}
      height={height}
      className={className}
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>Devpulse</title>
      <GradientDefinitions primaryId={primaryId} syncId={syncId} />
      {theme === "dark" && <rect width="280" height="64" fill="#0D1117" rx="12" />}
      <g transform="translate(8, 8)">
        <LogoMark primaryId={primaryId} syncId={syncId} fill={markFill} />
      </g>
      <text x="68" y="41" className="wordmark" fontFamily={fontFamily} fontSize="27" fontWeight="800">
        <tspan fill={textColor}>dev</tspan>
        <tspan fill="#8B5CF6">pulse</tspan>
      </text>
    </svg>
  );
}

export function DevpulseIcon({
  size = 24,
  className,
}: { size?: number; className?: string }) {
  const instanceId = useId().replace(/:/g, "");
  const primaryId = `dp-icon-grad-primary-${instanceId}`;
  const syncId = `dp-icon-grad-sync-${instanceId}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Devpulse"
    >
      <GradientDefinitions primaryId={primaryId} syncId={syncId} />
      <LogoMark primaryId={primaryId} syncId={syncId} />
    </svg>
  );
}

export default DevpulseLogo;