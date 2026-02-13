import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  subtext?: string;
  className?: string;
}

export function KpiCard({ label, value, subtext, className }: KpiCardProps) {
  return (
    <Card className={cn("gap-2 py-4", className)}>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <span className="tabular-nums text-2xl font-bold tracking-tight">
          {value}
        </span>
        {subtext && (
          <span className="text-xs text-muted-foreground">{subtext}</span>
        )}
      </CardContent>
    </Card>
  );
}
