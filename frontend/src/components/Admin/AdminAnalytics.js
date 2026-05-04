// src/components/Admin/AdminAnalytics.js
import React, { useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
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

function KpiCard({ icon, label, value, sub, color = "#1a2744", bg = "#f0f4ff", trend }) {
  return (
    <div style={{ background: "white", borderRadius: 16, padding: "20px 22px", border: "1px solid #e5e7eb", boxShadow: "0 2px 12px rgba(26,39,68,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>{icon}</div>
        {trend !== undefined && (
          <span style={{ fontSize: ".72rem", fontWeight: 700, color: trend >= 0 ? "#16a34a" : "#dc2626", background: trend >= 0 ? "#dcfce7" : "#fee2e2", borderRadius: 50, padding: "2px 8px" }}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p style={{ margin: 0, fontSize: "2rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
      <p style={{ margin: "4px 0 0", fontSize: ".78rem", fontWeight: 600, color: "#374151" }}>{label}</p>
      {sub && <p style={{ margin: "2px 0 0", fontSize: ".72rem", color: "#9ca3af" }}>{sub}</p>}
    </div>
  );
}

function ChartCard({ title, icon, children, full }) {
  return (
    <div style={{ background: "white", borderRadius: 18, padding: "22px 24px", border: "1px solid #e5e7eb", boxShadow: "0 2px 14px rgba(26,39,68,0.06)", gridColumn: full ? "1 / -1" : undefined }}>
      <p style={{ fontFamily: "'Playfair Display',serif", fontSize: ".95rem", fontWeight: 700, color: "#1a2744", margin: "0 0 18px", display: "flex", alignItems: "center", gap: 8 }}>
        <span>{icon}</span> {title}
      </p>
      {children}
    </div>
  );
}

export default function AdminAnalytics({ lawyers, litigants, cases, reviews }) {
  const stats = useMemo(() => {
    const total  = lawyers.length + litigants.length;
    const verified = lawyers.filter(l => l.verificationStatus === "approved" || (l.verified && !l.verificationStatus)).length;
    const pending  = lawyers.filter(l => l.verificationStatus === "pending" || (!l.verified && !l.verificationStatus)).length;

    // Case stats
    const openCases  = cases.filter(c => c.status === "Open").length;
    const inProgress = cases.filter(c => c.status === "In Progress").length;
    const closedCases= cases.filter(c => c.status === "Closed").length;

    // Avg rating
    const avgRating = reviews.length
      ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : "—";

    // Status pie
    const statusData = [
      { name: "Open", value: openCases },
      { name: "In Progress", value: inProgress },
      { name: "Closed", value: closedCases },
    ].filter(d => d.value > 0);

    // Category distribution
    const catMap = cases.reduce((acc, c) => {
      acc[c.category || "Other"] = (acc[c.category || "Other"] || 0) + 1;
      return acc;
    }, {});
    const categoryData = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 8);

    // Monthly user registrations (last 8 months)
    const today = new Date();
    const userMonths = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (7 - i), 1);
      return { month: d.toLocaleString("en-IN", { month: "short" }), year: d.getFullYear(), Lawyers: 0, Litigants: 0 };
    });
    [...lawyers, ...litigants].forEach(u => {
      const created = u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000) : null;
      if (!created) return;
      const label = created.toLocaleString("en-IN", { month: "short" });
      const yr = created.getFullYear();
      const idx = userMonths.findIndex(m => m.month === label && m.year === yr);
      if (idx >= 0) {
        if (u.role === "lawyer") userMonths[idx].Lawyers++;
        else userMonths[idx].Litigants++;
      }
    });

    // Monthly cases (last 8 months)
    const caseMonths = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (7 - i), 1);
      return { month: d.toLocaleString("en-IN", { month: "short" }), year: d.getFullYear(), Cases: 0 };
    });
    cases.forEach(c => {
      const created = c.createdAt?.seconds ? new Date(c.createdAt.seconds * 1000) : c.date ? new Date(c.date) : null;
      if (!created) return;
      const label = created.toLocaleString("en-IN", { month: "short" });
      const yr = created.getFullYear();
      const idx = caseMonths.findIndex(m => m.month === label && m.year === yr);
      if (idx >= 0) caseMonths[idx].Cases++;
    });

    // Top lawyers by case count
    const lawyerCaseMap = {};
    cases.forEach(c => {
      if (!c.lawyerName) return;
      lawyerCaseMap[c.lawyerName] = (lawyerCaseMap[c.lawyerName] || 0) + 1;
    });
    const topLawyers = Object.entries(lawyerCaseMap)
      .map(([name, cases]) => ({ name: name.length > 16 ? name.slice(0, 16) + "…" : name, cases }))
      .sort((a, b) => b.cases - a.cases).slice(0, 8);

    // Rating distribution
    const ratingDist = [1, 2, 3, 4, 5].map(r => ({
      rating: `${r}★`,
      count: reviews.filter(rev => Math.round(rev.rating) === r).length,
    }));

    // Upcoming hearings platform-wide
    const upcomingHearings = cases.filter(c => {
      if (!c.next_hearing_date) return false;
      const d = new Date(c.next_hearing_date);
      const now = new Date(); now.setHours(0,0,0,0);
      const in7 = new Date(now); in7.setDate(in7.getDate() + 7);
      return d >= now && d <= in7;
    }).sort((a, b) => new Date(a.next_hearing_date) - new Date(b.next_hearing_date));

    return { total, verified, pending, openCases, inProgress, closedCases, avgRating,
      statusData, categoryData, userMonths, caseMonths, topLawyers, ratingDist, upcomingHearings };
  }, [lawyers, litigants, cases, reviews]);

  return (
    <>
      <style>{`
        .adm-kpi { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:14px; margin-bottom:22px; }
        .adm-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:18px; }
        .adm-grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:18px; margin-bottom:18px; }
        @media(max-width:900px){ .adm-grid2,.adm-grid3{grid-template-columns:1fr;} }
        .adm-legend { display:flex; flex-wrap:wrap; gap:10px; margin-top:12px; }
        .adm-legend-item { display:flex; align-items:center; gap:6px; font-size:.75rem; color:#374151; }
        .adm-hearing-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f3f4f6; }
        .adm-hearing-row:last-child { border-bottom:none; }
      `}</style>

      <div>
        {/* KPI Row */}
        <div className="adm-kpi">
          <KpiCard icon="👨‍⚖️" label="Total Lawyers"    value={lawyers.length}       bg="#eef2ff"  color="#4338ca" sub={`${stats.verified} verified`} />
          <KpiCard icon="✅"   label="Verified"          value={stats.verified}        bg="#dcfce7"  color="#16a34a" sub={`${stats.pending} pending`} />
          <KpiCard icon="👥"  label="Total Litigants"   value={litigants.length}      bg="#fef3c7"  color="#d97706" />
          <KpiCard icon="⚖️"  label="Total Cases"       value={cases.length}          bg="#f5f3ff"  color="#7c3aed" />
          <KpiCard icon="🟢"  label="Active Cases"      value={stats.openCases}       bg="#dcfce7"  color="#16a34a" />
          <KpiCard icon="⭐"  label="Avg. Rating"       value={stats.avgRating}       bg="#fef9ee"  color="#c9a84c" sub={`${reviews.length} reviews`} />
          <KpiCard icon="📅"  label="Hearings (7 days)" value={stats.upcomingHearings.length} bg="#fee2e2" color="#dc2626" />
          <KpiCard icon="👫"  label="Total Users"       value={stats.total}           bg="#e0f2fe"  color="#0ea5e9" />
        </div>

        {/* Row 1: Case Status Pie + User Growth */}
        <div className="adm-grid2">
          <ChartCard title="Cases by Status" icon="🍩">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                  {stats.statusData.map((e, i) => <Cell key={i} fill={STATUS_COLORS[e.name] || PALETTE[i]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="adm-legend">
              {stats.statusData.map((item, i) => (
                <div key={i} className="adm-legend-item">
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLORS[item.name] || PALETTE[i] }} />
                  {item.name} ({item.value})
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="User Growth (8 Months)" icon="📈">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.userMonths}>
                <defs>
                  <linearGradient id="gLawyer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a2744" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1a2744" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gLitigant" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: ".75rem" }} />
                <Area type="monotone" dataKey="Lawyers"   stroke="#1a2744" strokeWidth={2} fill="url(#gLawyer)"   dot={{ r: 3, fill: "#1a2744" }} />
                <Area type="monotone" dataKey="Litigants" stroke="#c9a84c" strokeWidth={2} fill="url(#gLitigant)" dot={{ r: 3, fill: "#c9a84c" }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 2: Cases by Category + Monthly Case Filing */}
        <div className="adm-grid2">
          <ChartCard title="Cases by Category" icon="📂">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.categoryData} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Cases" radius={[0, 8, 8, 0]}>
                  {stats.categoryData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Monthly Case Filings" icon="📊">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.caseMonths} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Cases" fill="#1a2744" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 3: Top Lawyers + Rating Distribution */}
        <div className="adm-grid2">
          <ChartCard title="Top Lawyers by Case Volume" icon="🏆">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.topLawyers} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cases" name="Cases" radius={[0, 8, 8, 0]}>
                  {stats.topLawyers.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Review Rating Distribution" icon="⭐">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.ratingDist} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="rating" tick={{ fontSize: 12, fill: "#374151" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Reviews" radius={[8, 8, 0, 0]}>
                  {stats.ratingDist.map((d, i) => (
                    <Cell key={i} fill={d.rating === "5★" ? "#16a34a" : d.rating === "4★" ? "#c9a84c" : d.rating === "3★" ? "#d97706" : "#dc2626"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Upcoming Hearings Table */}
        {stats.upcomingHearings.length > 0 && (
          <ChartCard title={`⚡ Platform Hearings — Next 7 Days (${stats.upcomingHearings.length})`} icon="" full>
            <div>
              {stats.upcomingHearings.map((c, i) => {
                const daysLeft = Math.ceil((new Date(c.next_hearing_date) - new Date()) / 86400000);
                return (
                  <div key={i} className="adm-hearing-row">
                    <div>
                      <p style={{ fontWeight: 700, color: "#1a2744", fontSize: ".88rem", margin: 0 }}>{c.title}</p>
                      <p style={{ fontSize: ".72rem", color: "#6b7280", margin: "2px 0 0" }}>
                        👤 {c.clientName} · ⚖️ {c.lawyerName} · {c.category}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontWeight: 700, color: "#1a2744", fontSize: ".85rem", margin: 0 }}>{c.next_hearing_date}</p>
                      <span style={{ background: daysLeft <= 1 ? "#fee2e2" : "#fef3c7", color: daysLeft <= 1 ? "#dc2626" : "#92400e", borderRadius: 50, padding: "2px 10px", fontSize: ".68rem", fontWeight: 700 }}>
                        {daysLeft === 0 ? "Today!" : daysLeft === 1 ? "Tomorrow" : `In ${daysLeft} days`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        )}
      </div>
    </>
  );
}
