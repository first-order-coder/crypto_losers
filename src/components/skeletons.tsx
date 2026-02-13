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
      {/* Header */}
      <div className="flex items-center gap-4 px-2 py-2">
        <Shimmer className="h-4 w-8" />
        <Shimmer className="h-4 w-24" />
        <Shimmer className="ml-auto h-4 w-16" />
        <Shimmer className="h-4 w-16" />
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-4 w-16" />
        <Shimmer className="h-4 w-16" />
      </div>
      {/* Rows */}
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

// ── Full dashboard skeleton (KPIs + Table) ──────────────────────────

export function DashboardSkeleton() {
  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <Card>
        <CardHeader>
          <Shimmer className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={10} />
        </CardContent>
      </Card>
    </>
  );
}
