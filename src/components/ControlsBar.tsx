"use client";

import { Input } from "@/components/ui/input";

const LIQUIDITY_PILLS = [
  { label: "ALL", value: 0 },
  { label: "HIGH LIQ.", value: 5_000_000 },
  { label: "MID LIQ.", value: 1_000_000 },
  { label: "LOW LIQ.", value: 100_000 },
] as const;

export interface ControlsBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  activeMinVolume: number;
  onMinVolumeChange: (vol: number) => void;
  excludeLeveraged: boolean;
  onExcludeLeveragedChange: (val: boolean) => void;
  viewMode: "grid" | "table";
  onViewModeChange: (mode: "grid" | "table") => void;
}

export function ControlsBar({
  searchTerm,
  onSearchChange,
  activeMinVolume,
  onMinVolumeChange,
  excludeLeveraged,
  onExcludeLeveragedChange,
  viewMode,
  onViewModeChange,
}: ControlsBarProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Top row: search + view toggle */}
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Search symbol…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="ink-border rounded-lg flex-1 md:max-w-xs"
        />

        {/* View toggle */}
        <div className="flex ink-border rounded-lg overflow-hidden ml-auto">
          <button
            onClick={() => onViewModeChange("grid")}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              viewMode === "grid"
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-zinc-100"
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => onViewModeChange("table")}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border-l border-[#111] transition-colors ${
              viewMode === "table"
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-zinc-100"
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {/* Bottom row: pills */}
      <div className="flex flex-wrap gap-2">
        {LIQUIDITY_PILLS.map((pill) => (
          <button
            key={pill.label}
            onClick={() => onMinVolumeChange(pill.value)}
            className={`ink-border rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeMinVolume === pill.value
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-zinc-100"
            }`}
          >
            {pill.label}
          </button>
        ))}

        {/* Leveraged toggle */}
        <button
          onClick={() => onExcludeLeveragedChange(!excludeLeveraged)}
          className={`ink-border rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
            excludeLeveraged
              ? "bg-black text-white"
              : "bg-white text-black hover:bg-zinc-100"
          }`}
        >
          Excl. Leveraged
        </button>
      </div>
    </div>
  );
}
