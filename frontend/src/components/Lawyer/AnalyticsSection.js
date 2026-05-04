// src/components/Lawyer/AnalyticsSection.js
import React, { useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, RadialBarChart, RadialBar,
} from "recharts";

const PALETTE = ["#1a2744", "#c9a84c", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0ea5e9", "#ec4899"];
const STATUS_COLORS = { Open: "#16a34a", "In Progress": "#d97706", Closed: "#dc2626" };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "10px 14px", boxShadow: "0 8px 24px rgba(26,39,68,0.12)", fontFamily: "Inter,sans-serif", fontSize: "0.82rem" }}>
      {label && <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#9ca3af", fontSize: "0.72rem", textTransform: "uppercase" }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ margin: "2px 0", fontWeight: 600, color: p.color || "#1a2744" }}>
          {p.name}: <span style={{ color: "#1a2744" }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
};

function StatCard({ icon, label, value, sub, color = "#1a2744", bg = "#f0f4ff" }) {
  return (
    <div style={{ background: "white", borderRadius: 16, padding: "20px 22px", border: "1px solid #e5e7eb", boxShadow: "0 2px 12px rgba(26,39,68,0.05)", display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 50, height: 50, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>{icon}</div>
      <div>
        <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#9ca3af" }}>{label}</p>
        <p style={{ margin: "2px 0 0", fontSize: "1.6rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ margin: "3px 0 0", fontSize: "0.73rem", color: "#9ca3af" }}>{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, icon, children, span = 1 }) {
  return (
    <div style={{ background: "white", borderRadius: 18, padding: "22px 24px", border: "1px solid #e5e7eb", boxShadow: "0 2px 14px rgba(26,39,68,0.06)", gridColumn: span === 2 ? "1 / -1" : undefined }}>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", fontWeight: 700, color: "#1a2744", margin: "0 0 18px", display: "flex", alignItems: "center", gap: 8 }}>
        <span>{icon}</span> {title}
      </p>
      {children}
    </div>
  );
}

export default function AnalyticsSection({ cases }) {
  const stats = useMemo(() => {
    const open       = cases.filter(c => c.status === "Open").length;
    const inProgress = cases.filter(c => c.status === "In Progress").length;
    const closed     = cases.filter(c => c.status === "Closed").length;
    const total      = cases.length;

    // Upcoming hearings (next 7 days)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in7   = new Date(today); in7.setDate(in7.getDate() + 7);
    const upcoming = cases.filter(c => {
      if (!c.next_hearing_date) return false;
      const d = new Date(c.next_hearing_date);
      return d >= today && d <= in7;
    }).sort((a, b) => new Date(a.next_hearing_date) - new Date(b.next_hearing_date));

    // Unique clients
    const clients = new Set(cases.map(c => c.clientEmail).filter(Boolean)).size;



    // Status distribution (pie)
    const statusData = [
      { name: "Open", value: open },
      { name: "In Progress", value: inProgress },
      { name: "Closed", value: closed },
    ].filter(d => d.value > 0);

    // Category distribution
    const catMap = cases.reduce((acc, c) => {
      const cat = c.category || "Other";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
    const categoryData = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);

    // Monthly trend (last 8 months)
    const months = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (7 - i), 1);
      return {
        month: d.toLocaleString("en-IN", { month: "short" }),
        year: d.getFullYear(),
        Open: 0, "In Progress": 0, Closed: 0, total: 0,
      };
    });
    cases.forEach(c => {
      const created = c.createdAt?.seconds
        ? new Date(c.createdAt.seconds * 1000)
        : c.date ? new Date(c.date) : null;
      if (!created) return;
      const label = created.toLocaleString("en-IN", { month: "short" });
      const yr    = created.getFullYear();
      const idx   = months.findIndex(m => m.month === label && m.year === yr);
      if (idx >= 0) {
        months[idx].total++;
        months[idx][c.status || "Open"] = (months[idx][c.status || "Open"] || 0) + 1;
      }
    });

    // Hearing month distribution
    const hearingMonths = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      return { month: d.toLocaleString("en-IN", { month: "short", year: "2-digit" }), count: 0 };
    });
    cases.forEach(c => {
      if (!c.next_hearing_date) return;
      const d = new Date(c.next_hearing_date);
      const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      const idx = hearingMonths.findIndex(m => m.month === label);
      if (idx >= 0) hearingMonths[idx].count++;
    });

    // Client case load
    const clientMap = cases.reduce((acc, c) => {
      const name = c.clientName || c.clientEmail || "Unknown";
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});
    const clientData = Object.entries(clientMap)
      .map(([name, cases]) => ({ name: name.length > 14 ? name.slice(0, 14) + "…" : name, cases }))
      .sort((a, b) => b.cases - a.cases).slice(0, 6);

    return { open, inProgress, closed, total, upcoming, clients, statusData, categoryData, months, hearingMonths, clientData };
  }, [cases]);

  if (cases.length === 0) return null;

  const closureRate = stats.total ? Math.round((stats.closed / stats.total) * 100) : 0;
  const radialData  = [{ name: "Closed", value: closureRate, fill: "#16a34a" }];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700;800&display=swap');
        .an-wrapper { font-family: 'Inter', sans-serif; margin-bottom: 32px; }
        .an-kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; margin-bottom: 20px; }
        .an-chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px; }
        .an-chart-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; margin-bottom: 18px; }
        @media(max-width:900px){ .an-chart-grid{grid-template-columns:1fr;} .an-chart-grid-3{grid-template-columns:1fr;} }
        .an-section-header { display: flex; align-items: center; gap: 10px; margin: 28px 0 14px; }
        .an-section-title { font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 700; color: #1a2744; margin: 0; }
        .an-upcoming-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
        .an-upcoming-item:last-child { border-bottom: none; }
        .an-badge { display: inline-block; border-radius: 50px; padding: 3px 10px; font-size: 0.7rem; font-weight: 700; }
        .an-legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
        .an-legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #374151; }
        .an-legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
      `}</style>

      <div className="an-wrapper">
        {/* Section Header */}
        <div className="an-section-header">
          <div style={{ width: 4, height: 28, background: "linear-gradient(#1a2744,#c9a84c)", borderRadius: 4 }} />
          <h2 className="an-section-title">Analytics & Insights</h2>
        </div>

        {/* KPI Cards */}
        <div className="an-kpi-grid">
          <StatCard icon="⚖️"  label="Total Cases"    value={stats.total}      sub="All time"            color="#1a2744" bg="#eef2ff" />
          <StatCard icon="🟢"  label="Active Cases"   value={stats.open}       sub="Currently open"      color="#16a34a" bg="#dcfce7" />
          <StatCard icon="⏳"  label="In Progress"    value={stats.inProgress} sub="Being processed"     color="#d97706" bg="#fef3c7" />
          <StatCard icon="✅"  label="Closed Cases"   value={stats.closed}     sub={`${closureRate}% closure rate`} color="#7c3aed" bg="#f5f3ff" />
          <StatCard icon="👥"  label="Total Clients"  value={stats.clients}    sub="Unique clients"      color="#0ea5e9" bg="#e0f2fe" />
          <StatCard icon="📅"  label="Due This Week"  value={stats.upcoming.length} sub="Upcoming hearings" color="#dc2626" bg="#fee2e2" />

        </div>

        {/* Row 1: Status Pie + Monthly Trend */}
        <div className="an-chart-grid">
          <ChartCard title="Cases by Status" icon="🍩">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={58} outerRadius={88}
                  paddingAngle={4} dataKey="value" stroke="none">
                  {stats.statusData.map((e, i) => (
                    <Cell key={i} fill={STATUS_COLORS[e.name] || PALETTE[i]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="an-legend">
              {stats.statusData.map((item, i) => (
                <div key={i} className="an-legend-item">
                  <div className="an-legend-dot" style={{ background: STATUS_COLORS[item.name] || PALETTE[i] }} />
                  {item.name} ({item.value})
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Monthly Case Trend" icon="📈">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.months}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1a2744" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1a2744" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" name="Total" stroke="#1a2744" strokeWidth={2.5} fill="url(#gradTotal)" dot={{ fill: "#1a2744", r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 2: Category Bar + Hearing Forecast */}
        <div className="an-chart-grid">
          <ChartCard title="Cases by Category" icon="📂">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.categoryData} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Cases" radius={[0, 8, 8, 0]}>
                  {stats.categoryData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Hearing Schedule Forecast" icon="📅">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.hearingMonths} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Hearings" fill="#c9a84c" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 3: Stacked Monthly + Client Load + Closure Radial */}
        <div className="an-chart-grid-3">
          <ChartCard title="Status Breakdown Over Time" icon="📊">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.months} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "0.72rem", fontFamily: "Inter" }} />
                <Bar dataKey="Open"        stackId="a" fill="#16a34a" radius={[0,0,0,0]} />
                <Bar dataKey="In Progress" stackId="a" fill="#d97706" radius={[0,0,0,0]} />
                <Bar dataKey="Closed"      stackId="a" fill="#dc2626" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top Clients by Cases" icon="👥">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.clientData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: "#374151" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cases" name="Cases" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Case Closure Rate" icon="🎯">
            <div style={{ textAlign: "center" }}>
              <ResponsiveContainer width="100%" height={160}>
                <RadialBarChart cx="50%" cy="50%" innerRadius={50} outerRadius={80} data={radialData} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" background={{ fill: "#f3f4f6" }} cornerRadius={8} />
                  <Tooltip formatter={(v) => [`${v}%`, "Closure Rate"]} />
                </RadialBarChart>
              </ResponsiveContainer>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "2rem", fontWeight: 800, color: "#16a34a", margin: "-16px 0 4px" }}>{closureRate}%</p>
              <p style={{ fontSize: "0.78rem", color: "#9ca3af", margin: 0 }}>of cases resolved</p>
            </div>
          </ChartCard>
        </div>

        {/* Upcoming Hearings Panel */}
        {stats.upcoming.length > 0 && (
          <div style={{ background: "white", borderRadius: 18, padding: "22px 24px", border: "1px solid #e5e7eb", boxShadow: "0 2px 14px rgba(26,39,68,0.06)" }}>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.95rem", fontWeight: 700, color: "#1a2744", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              ⚡ Upcoming Hearings (Next 7 Days)
            </p>
            {stats.upcoming.map((c, i) => {
              const daysLeft = Math.ceil((new Date(c.next_hearing_date) - new Date()) / 86400000);
              return (
                <div key={i} className="an-upcoming-item">
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: "#1a2744", fontSize: "0.88rem" }}>{c.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#6b7280" }}>{c.clientName} · {c.category}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontWeight: 700, color: "#1a2744", fontSize: "0.85rem" }}>{c.next_hearing_date}</p>
                    <span className="an-badge" style={{ background: daysLeft <= 1 ? "#fee2e2" : "#fef3c7", color: daysLeft <= 1 ? "#dc2626" : "#92400e" }}>
                      {daysLeft === 0 ? "Today!" : daysLeft === 1 ? "Tomorrow" : `In ${daysLeft} days`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
