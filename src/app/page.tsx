import { Suspense } from "react";
import { GraveyardHero } from "@/components/GraveyardHero";
import { DashboardContent } from "@/components/DashboardContent";
import { DashboardSkeleton } from "@/components/skeletons";
import { EmailForm } from "@/components/EmailForm";
import { Footer } from "@/components/Footer";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <GraveyardHero />
      </div>

      {/* Email capture */}
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <section id="email" className="scroll-mt-8">
          <Separator className="mb-6" />
          <div className="flex flex-col items-center gap-4 py-8">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tight text-center">
              Get This List In Your Inbox
            </h2>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Enter your email to receive the current losers snapshot. One-time
              send, no subscriptions.
            </p>
            <EmailForm />
          </div>
          <Separator />
        </section>
      </div>

      {/* Data: stat strip + controls + results — streamed with skeleton */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>

      {/* Footer */}
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Footer />
      </div>
    </main>
  );
}
