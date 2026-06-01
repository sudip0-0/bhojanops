import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type Tone = "default" | "success" | "warning" | "danger" | "accent";

const toneText: Record<Tone, string> = {
  default: "",
  success: "text-green-700",
  warning: "text-amber-700",
  danger: "text-destructive",
  accent: "text-destructive",
};

const toneBorder: Record<Tone, string> = {
  default: "",
  success: "border-green-200",
  warning: "border-amber-200",
  danger: "border-destructive",
  accent: "border-destructive",
};

export interface KpiProps {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
  hint?: string;
  className?: string;
}

export function Kpi({ label, value, tone = "default", hint, className }: KpiProps) {
  return (
    <Card className={cn(toneBorder[tone], className)}>
      <CardContent className="pt-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-bold", toneText[tone])}>{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
