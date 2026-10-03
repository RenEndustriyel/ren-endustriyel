"use client";

import * as React from "react";

interface DonutSlice {
  value: number;
  color: string;
}

interface DonutChartProps {
  title: string;
  amount: string;
  amountColor?: string;
  slices?: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  emptyIcon?: React.ReactNode;
  emptyText?: string;
}

export function DonutChart({
  title,
  amount,
  amountColor = "#2d3748",
  slices = [],
  size = 150,
  strokeWidth = 14,
  emptyIcon,
  emptyText,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const totalValue = slices.reduce((acc, s) => acc + s.value, 0);

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col items-center text-center">
      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 truncate max-w-[160px]">
        {title}
      </h4>

      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {emptyIcon ? (
          <div className="flex flex-col items-center justify-center w-full h-full rounded-full border-4 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            {emptyIcon}
            {emptyText && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                {emptyText}
              </span>
            )}
          </div>
        ) : (
          <>
            <svg width={size} height={size} className="-rotate-90 transform">
              {/* Background circle */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
                fill="transparent"
                className="dark:stroke-slate-800"
              />

              {/* Slices */}
              {totalValue > 0 &&
                slices.map((slice, idx) => {
                  const percent = slice.value / totalValue;
                  const strokeDasharray = `${circumference * percent} ${circumference * (1 - percent)}`;
                  const strokeDashoffset = -circumference * accumulatedPercent;
                  accumulatedPercent += percent;

                  return (
                    <circle
                      key={idx}
                      cx={center}
                      cy={center}
                      r={radius}
                      stroke={slice.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      fill="transparent"
                      strokeLinecap="butt"
                    />
                  );
                })}
            </svg>

            {/* Centered Amount */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-2">
              <span
                className="font-extrabold text-sm sm:text-base leading-tight tabular-nums truncate max-w-[120px]"
                style={{ color: amountColor }}
              >
                {amount}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
