import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { operatorMetrics, recentActivity } from "@/mocks/dashboard";

export default function OperatorDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard · Operator</h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">
          Visão do operador mockada (sem backend).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {operatorMetrics.map((m) => (
          <Card key={m.label}>
            <CardHeader>
              <CardTitle>{m.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{m.value}</div>
              <Badge
                className="mt-2"
                variant={m.trend === "up" ? "success" : m.trend === "down" ? "danger" : "default"}
              >
                {m.delta}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-[var(--color-border)]">
            {recentActivity.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <span className="font-medium">{a.who}</span>{" "}
                  <span className="text-[var(--color-muted-foreground)]">— {a.what}</span>
                </div>
                <span className="text-xs text-[var(--color-muted-foreground)]">{a.when}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
