// src/components/Lawyer/AnalyticsSection.js
import React from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const STATUS_COLORS = { Open: "#16a34a", "In Progress": "#d97706", Closed: "#dc2626" };

export default function AnalyticsSection({ cases }) {
  // Status distribution
  const statusData = Object.entries(
    cases.reduce((acc, c) => {
      const s = c.status || "Open";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Cases per month (last 6 months)
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { month: d.toLocaleString("en-IN", { month: "short" }), year: d.getFullYear(), count: 0 };
  });

  cases.forEach(c => {
    const created = c.createdAt?.seconds
      ? new Date(c.createdAt.seconds * 1000)
      : c.date ? new Date(c.date) : null;
    if (!created) return;
    const label = created.toLocaleString("en-IN", { month: "short" });
    const idx = months.findIndex(m => m.month === label && m.year === created.getFullYear());
    if (idx >= 0) months[idx].count++;
  });

  // Category distribution
  const categoryData = Object.entries(
    cases.reduce((acc, c) => {
      const cat = c.category || "Other";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  const COLORS = ["#1a2744", "#c9a84c", "#16a34a", "#d97706", "#dc2626", "#7c3aed"];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: "white", border: "1px solid #f0f0f0", borderRadius: 10, padding: "8px 14px", boxShadow: "0 4px 16px rgba(26,39,68,0.12)", fontFamily: "Inter,sans-serif", fontSize: "0.82rem" }}>
          <p style={{ margin: 0, fontWeight: 700, color: "#1a2744" }}>{payload[0].name}</p>
          <p style={{ margin: 0, color: "#6b7280" }}>{payload[0].value} case{payload[0].value !== 1 ? "s" : ""}</p>
        </div>
      );
    }
    return null;
  };

  if (cases.length === 0) return null;

  return (
    <>
      <style>{`
        .an-section { background: white; border-radius: 20px; padding: 28px 30px; box-shadow: 0 2px 16px rgba(26,39,68,0.06); border: 1px solid rgba(26,39,68,0.04); margin-bottom: 28px; }
        .an-title { font-family: 'Playfair Display', serif; font-size: 1.25rem; font-weight: 700; color: #1a2744; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }
        .an-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
        @media(max-width:700px){.an-grid{grid-template-columns:1fr;}}
        .an-chart-title { font-family: 'Inter', sans-serif; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; font-weight: 700; margin-bottom: 14px; }
        .an-legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
        .an-legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #374151; font-family: 'Inter', sans-serif; }
        .an-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
      `}</style>

      <div className="an-section">
        <h3 className="an-title">📊 Analytics Overview</h3>
        <div className="an-grid">
          {/* Status Pie */}
          <div>
            <p className="an-chart-title">Cases by Status</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={4} dataKey="value" stroke="none">
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="an-legend">
              {statusData.map((item, i) => (
                <div key={i} className="an-legend-item">
                  <div className="an-legend-dot" style={{ background: STATUS_COLORS[item.name] || COLORS[i] }} />
                  {item.name} ({item.value})
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Bar */}
          <div>
            <p className="an-chart-title">Cases per Month (Last 6 Months)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={months} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: "Inter" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: "Inter" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f0f4ff", radius: 4 }} />
                <Bar dataKey="count" fill="#1a2744" radius={[6, 6, 0, 0]} name="Cases" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Bar */}
          {categoryData.length > 0 && (
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="an-chart-title">Cases by Category</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={categoryData} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: "Inter" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#374151", fontFamily: "Inter" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f0f4ff" }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Cases">
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
