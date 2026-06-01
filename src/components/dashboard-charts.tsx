"use client";

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#b91c1c", "#d97706", "#2563eb", "#059669", "#7c3aed", "#0891b2", "#db2777"];

export function PaymentMixChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No payments yet.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TopItemsChart({ data }: { data: { name: string; qty: number }[] }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No sales yet.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 30 }}>
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="qty" fill="#b91c1c" />
      </BarChart>
    </ResponsiveContainer>
  );
}
