import React, { useState, useMemo } from "react";
import { createRoot, Root } from "react-dom/client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

export interface DataPoint {
  section: string;
  shortSection: string;
  sentiment: number; // 0 - 100
  confidence: number; // 0 - 100
  [key: string]: any;
}

export interface KeywordMeta {
  word: string;
  color: string;
  totalCount: number;
}

export interface ChartPayload {
  topic: string;
  data: DataPoint[];
  keywords: KeywordMeta[];
  summary: {
    avgSentiment: number;
    sentimentTone: string;
    topKeyword: string;
    totalKeywordHits: number;
    peakSection: string;
  };
}

const PALETTE = [
  "#38bdf8", // Sky blue
  "#34d399", // Emerald
  "#fbbf24", // Amber
  "#a78bfa", // Purple
  "#f472b6", // Pink
  "#22d3ee", // Cyan
  "#f97316", // Orange
  "#818cf8", // Indigo
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const currentData = payload[0]?.payload as DataPoint;
  const sentimentVal = currentData?.sentiment;
  let sentimentBadgeClass = "sentiment-badge-neutral";
  let sentimentBadgeText = "Balanced / Objective";

  if (sentimentVal >= 70) {
    sentimentBadgeClass = "sentiment-badge-positive";
    sentimentBadgeText = "Positive / Bullish";
  } else if (sentimentVal <= 45) {
    sentimentBadgeClass = "sentiment-badge-cautious";
    sentimentBadgeText = "Critical / High Risk";
  }

  return (
    <div className="recharts-custom-tooltip">
      <div className="tooltip-header">
        <span className="tooltip-section-name">{currentData?.section || label}</span>
        {sentimentVal !== undefined && (
          <span className={`tooltip-badge ${sentimentBadgeClass}`}>
            {sentimentBadgeText} ({sentimentVal}%)
          </span>
        )}
      </div>
      <div className="tooltip-divider"></div>
      <div className="tooltip-list">
        {payload.map((entry: any, index: number) => {
          const isSentiment = entry.dataKey === "sentiment";
          const isConfidence = entry.dataKey === "confidence";
          return (
            <div key={`item-${index}`} className="tooltip-item">
              <span className="tooltip-dot" style={{ backgroundColor: entry.color }} />
              <span className="tooltip-name">{entry.name}:</span>
              <span className="tooltip-val">
                {isSentiment || isConfidence ? `${entry.value}%` : `${entry.value} mentions`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ResearchSynthesisChartComponent({ payload }: { payload: ChartPayload }) {
  const [activeTab, setActiveTab] = useState<"keywords" | "sentiment" | "combined">("keywords");
  const [visibleKeywords, setVisibleKeywords] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    (payload.keywords || []).forEach((k, idx) => {
      // Show top 4 keywords by default
      initial[k.word] = idx < 4;
    });
    return initial;
  });

  const toggleKeyword = (word: string) => {
    setVisibleKeywords((prev) => ({
      ...prev,
      [word]: !prev[word],
    }));
  };

  const selectAllKeywords = () => {
    const next: Record<string, boolean> = {};
    (payload.keywords || []).forEach((k) => {
      next[k.word] = true;
    });
    setVisibleKeywords(next);
  };

  const clearAllKeywords = () => {
    const next: Record<string, boolean> = {};
    (payload.keywords || []).forEach((k) => {
      next[k.word] = false;
    });
    setVisibleKeywords(next);
  };

  return (
    <div className="recharts-synthesis-widget">
      {/* Widget Header & Metric Callouts */}
      <div className="widget-header">
        <div className="widget-title-area">
          <div className="widget-badge">
            <span className="widget-badge-pulse"></span>
            <span>RECHARTS VISUALIZATION ENGINE</span>
          </div>
          <h4 className="widget-title">Synthesis Dynamics: Keywords &amp; Sentiment Trajectory</h4>
          <p className="widget-subtitle">
            Visualizing analytical keyword density and section-by-section sentiment trends across the research dossier.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="widget-tabs" role="tablist">
          <button
            type="button"
            className={`widget-tab-btn ${activeTab === "keywords" ? "active" : ""}`}
            onClick={() => setActiveTab("keywords")}
          >
            <span className="tab-icon">📊</span>
            <span>Keyword Frequency</span>
          </button>
          <button
            type="button"
            className={`widget-tab-btn ${activeTab === "sentiment" ? "active" : ""}`}
            onClick={() => setActiveTab("sentiment")}
          >
            <span className="tab-icon">📈</span>
            <span>Sentiment Trajectory</span>
          </button>
          <button
            type="button"
            className={`widget-tab-btn ${activeTab === "combined" ? "active" : ""}`}
            onClick={() => setActiveTab("combined")}
          >
            <span className="tab-icon">⚡</span>
            <span>Combined Synthesis</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="widget-kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Average Tone &amp; Sentiment</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{payload.summary?.avgSentiment || 75}%</span>
            <span className="kpi-trend positive">{payload.summary?.sentimentTone || "Positive"}</span>
          </div>
          <span className="kpi-desc">Calculated across verified evidence sections</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Dominant Synthesis Keyword</span>
          <div className="kpi-value-row">
            <span className="kpi-value-text">{payload.summary?.topKeyword || "Technology"}</span>
            <span className="kpi-badge">{payload.summary?.totalKeywordHits || 28} hits</span>
          </div>
          <span className="kpi-desc">Most referenced strategic term</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Peak Innovation / Evidence Section</span>
          <div className="kpi-value-row">
            <span className="kpi-value-text-small">{payload.summary?.peakSection || "Key Findings"}</span>
          </div>
          <span className="kpi-desc">Highest convergence of data citations</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Interactive Lines Tracked</span>
          <div className="kpi-value-row">
            <span className="kpi-value">
              {activeTab === "sentiment"
                ? "2 Signals"
                : `${Object.values(visibleKeywords).filter(Boolean).length} / ${payload.keywords.length} Keywords`}
            </span>
          </div>
          <span className="kpi-desc">Click chips below to toggle lines</span>
        </div>
      </div>

      {/* Keyword Filter Chips (Shown when Keywords or Combined is active) */}
      {activeTab !== "sentiment" && (
        <div className="keyword-chips-bar">
          <div className="chips-label-group">
            <span className="chips-title">Filter Keywords:</span>
            <button type="button" className="btn-chip-action" onClick={selectAllKeywords}>
              All
            </button>
            <button type="button" className="btn-chip-action" onClick={clearAllKeywords}>
              None
            </button>
          </div>
          <div className="chips-list">
            {(payload.keywords || []).map((kw, i) => {
              const isChecked = Boolean(visibleKeywords[kw.word]);
              const color = kw.color || PALETTE[i % PALETTE.length];
              return (
                <button
                  key={kw.word}
                  type="button"
                  className={`keyword-chip-btn ${isChecked ? "active" : "inactive"}`}
                  style={{
                    borderColor: isChecked ? color : "rgba(255, 255, 255, 0.15)",
                    backgroundColor: isChecked ? `${color}20` : "transparent",
                  }}
                  onClick={() => toggleKeyword(kw.word)}
                >
                  <span className="chip-dot" style={{ backgroundColor: color }} />
                  <span className="chip-text">{kw.word}</span>
                  <span className="chip-count">({kw.totalCount})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Dynamic Recharts Canvas Container */}
      <div className="recharts-container-box">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={payload.data}
            margin={{ top: 15, right: 30, left: 0, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
            <XAxis
              dataKey="shortSection"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              dy={8}
            />
            {activeTab === "sentiment" ? (
              <YAxis
                domain={[0, 100]}
                unit="%"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                dx={-5}
              />
            ) : activeTab === "combined" ? (
              <>
                <YAxis
                  yAxisId="left"
                  domain={[0, "auto"]}
                  stroke="#38bdf8"
                  fontSize={12}
                  tickLine={false}
                  label={{ value: "Keyword Count", angle: -90, position: "insideLeft", fill: "#38bdf8", dy: 40 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  unit="%"
                  stroke="#10b981"
                  fontSize={12}
                  tickLine={false}
                  label={{ value: "Sentiment", angle: 90, position: "insideRight", fill: "#10b981", dy: 20 }}
                />
              </>
            ) : (
              <YAxis
                domain={[0, "auto"]}
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                allowDecimals={false}
                dx={-5}
              />
            )}

            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ paddingBottom: "10px", fontSize: "12px" }}
            />

            {/* Reference baseline for sentiment */}
            {(activeTab === "sentiment" || activeTab === "combined") && (
              <ReferenceLine
                y={50}
                yAxisId={activeTab === "combined" ? "right" : undefined}
                stroke="rgba(255, 255, 255, 0.2)"
                strokeDasharray="4 4"
                label={{ value: "Neutral Baseline (50%)", fill: "rgba(255,255,255,0.4)", fontSize: 10, position: "insideTopRight" }}
              />
            )}

            {/* Sentiment Trajectory Line */}
            {(activeTab === "sentiment" || activeTab === "combined") && (
              <Line
                yAxisId={activeTab === "combined" ? "right" : undefined}
                type="monotone"
                dataKey="sentiment"
                name="Sentiment Score (%)"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, fill: "#10b981", stroke: "#0f172a", strokeWidth: 2 }}
                activeDot={{ r: 7, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
              />
            )}

            {/* Confidence Trajectory Line */}
            {activeTab === "sentiment" && (
              <Line
                type="monotone"
                dataKey="confidence"
                name="Evidence Confidence (%)"
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: "#6366f1" }}
                activeDot={{ r: 6, fill: "#6366f1" }}
              />
            )}

            {/* Dynamic Keyword Frequency Lines */}
            {(activeTab === "keywords" || activeTab === "combined") &&
              (payload.keywords || []).map((kw, i) => {
                if (!visibleKeywords[kw.word]) return null;
                const color = kw.color || PALETTE[i % PALETTE.length];
                return (
                  <Line
                    key={kw.word}
                    yAxisId={activeTab === "combined" ? "left" : undefined}
                    type="monotone"
                    dataKey={kw.word}
                    name={kw.word}
                    stroke={color}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: color, stroke: "#0f172a", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: color, stroke: "#fff", strokeWidth: 2 }}
                  />
                );
              })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="widget-footer-meta">
        <span className="footer-meta-item">
          <span className="footer-icon">⚡</span>
          <span>Dynamic Recharts engine rendered via React 18</span>
        </span>
        <span className="footer-meta-item">
          <span className="footer-icon">📌</span>
          <span>Hover data points to inspect exact section metrics &amp; source citations</span>
        </span>
      </div>
    </div>
  );
}

// Global window renderer for seamless vanilla JS integration
declare global {
  interface Window {
    renderResearchSynthesisChart: (containerId: string, payload: ChartPayload) => void;
    destroyResearchSynthesisChart: (containerId: string) => void;
  }
}

const activeRoots: Record<string, Root> = {};

window.renderResearchSynthesisChart = function (containerId: string, payload: ChartPayload) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container #${containerId} not found for Recharts synthesis.`);
    return;
  }

  // Clean existing root if any
  if (activeRoots[containerId]) {
    try {
      activeRoots[containerId].render(<ResearchSynthesisChartComponent payload={payload} />);
      return;
    } catch (e) {
      activeRoots[containerId].unmount();
      delete activeRoots[containerId];
    }
  }

  const root = createRoot(container);
  activeRoots[containerId] = root;
  root.render(<ResearchSynthesisChartComponent payload={payload} />);
};

window.destroyResearchSynthesisChart = function (containerId: string) {
  if (activeRoots[containerId]) {
    try {
      activeRoots[containerId].unmount();
    } catch (e) {}
    delete activeRoots[containerId];
  }
};
