import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";

export const dynamic = "force-dynamic";
import { EmailForm } from "@/components/EmailForm";
import { DashboardContent } from "@/components/DashboardContent";
import { DashboardSkeleton } from "@/components/skeletons";
import { Footer } from "@/components/Footer";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <PageShell>
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crypto Losers</h1>
          <p className="text-sm text-muted-foreground">
            Binance Spot · 24h worst performers
          </p>
        </div>
        <EmailForm />
      </header>

      <Separator className="mb-6" />

      {/* Data: KPIs + Table — with streaming skeleton */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>

      {/* Footer */}
      <Footer />
    </PageShell>
  );
}
