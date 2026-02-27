import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "wide";
}

export function PageShell({
  children,
  className,
  variant = "default",
}: PageShellProps) {
  const baseClasses =
    variant === "wide"
      ? "mx-auto max-w-[min(1600px,100vw)] w-full px-3 sm:px-4 md:px-6"
      : "mx-auto max-w-6xl p-4 md:p-6";

  return <div className={cn(baseClasses, className)}>{children}</div>;
}
