import { Card, CardContent, CardHeader } from "@/components/ui/card";

// ── Shared shimmer block ────────────────────────────────────────────

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-muted ${className ?? ""}`}
    />
  );
}

// ── KPI card skeleton ───────────────────────────────────────────────

export function KpiCardSkeleton() {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="pb-0">
        <Shimmer className="h-4 w-24" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Shimmer className="h-7 w-32" />
        <Shimmer className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

// ── Table skeleton ──────────────────────────────────────────────────

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 px-2 py-2">
        <Shimmer className="h-4 w-8" />
        <Shimmer className="h-4 w-24" />
        <Shimmer className="ml-auto h-4 w-16" />
        <Shimmer className="h-4 w-16" />
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-4 w-16" />
        <Shimmer className="h-4 w-16" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-t px-2 py-3">
          <Shimmer className="h-4 w-6" />
          <Shimmer className="h-4 w-20" />
          <Shimmer className="ml-auto h-4 w-16" />
          <Shimmer className="h-4 w-14" />
          <Shimmer className="h-4 w-16" />
          <Shimmer className="h-4 w-16" />
          <Shimmer className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

// ── Single card skeleton ────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="ink-border-2 ink-shadow rounded-md bg-white p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Shimmer className="h-4 w-24" />
        <Shimmer className="h-4 w-12 rounded-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Shimmer className="h-6 w-28" />
        <Shimmer className="h-4 w-16" />
      </div>
      <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
        <Shimmer className="h-3 w-16" />
        <Shimmer className="h-3 w-24" />
      </div>
      <Shimmer className="h-8 w-full border-t border-zinc-200" />
    </div>
  );
}

// ── Grid skeleton ───────────────────────────────────────────────────

function GridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Yellow strip skeleton ───────────────────────────────────────────

function StatStripSkeleton() {
  return (
    <div className="ink-border-2 bg-yellow-200 py-3 px-6 flex items-center justify-center gap-x-8">
      <Shimmer className="h-4 w-24 !bg-yellow-300" />
      <Shimmer className="h-4 w-32 !bg-yellow-300" />
      <Shimmer className="h-4 w-28 !bg-yellow-300" />
    </div>
  );
}

// ── Controls bar skeleton ───────────────────────────────────────────

function ControlsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Shimmer className="h-10 flex-1 md:max-w-xs rounded-lg" />
        <Shimmer className="h-10 w-28 rounded-lg ml-auto" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
    </div>
  );
}

// ── Full dashboard skeleton (strip + controls + grid) ───────────────

export function DashboardSkeleton() {
  return (
    <>
      <StatStripSkeleton />
      <div className="mx-auto max-w-6xl px-4 md:px-6 mt-8">
        <div className="mb-6">
          <ControlsSkeleton />
        </div>
        <GridSkeleton count={9} />
      </div>
    </>
  );
}
