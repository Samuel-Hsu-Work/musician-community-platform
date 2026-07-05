"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAuthHeaders } from "../../utils/apiAuth";

interface LearningStyleColumn {
  id: string;
  label: string;
  shortLabel: string;
  aiGuidance: string;
}

interface InsightCell {
  id: string;
  title: string;
  content: string;
  promptSummary: string;
  categoryId: string;
  categoryLabel: string;
  status: string;
  sourceLikeCount: number;
  sourceRef: string;
}

interface TopicRow {
  topicId: string;
  topicName: string;
  domainId: string;
  kind: string;
  insights: InsightCell[];
  coveredStyleIds: string[];
}

interface DomainGroup {
  domainId: string;
  domainLabel: string;
  topicCount: number;
  insightCount: number;
  topicsWithInsights: number;
  topics: TopicRow[];
}

interface MatrixData {
  summary: {
    approved: number;
    draft: number;
    rejected: number;
    total: number;
    topicsWithApproved: number;
  };
  learningStyles: LearningStyleColumn[];
  domains: DomainGroup[];
}

const DOMAIN_OPTIONS = [
  { id: "", label: "All domains" },
  { id: "notation-reading", label: "Notation & Reading" },
  { id: "rhythm-meter", label: "Rhythm & Meter" },
  { id: "pitch-scales-keys", label: "Pitch, Scales & Keys" },
  { id: "intervals", label: "Intervals" },
  { id: "chords-harmony", label: "Chords & Harmony" },
  { id: "form-analysis", label: "Form & Analysis" },
];

const CATEGORY_BADGE: Record<string, string> = {
  "music-core": "bg-blue-100 text-blue-800 border-blue-200",
  art: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  "everyday-life": "bg-teal-100 text-teal-800 border-teal-200",
  performance: "bg-orange-100 text-orange-800 border-orange-200",
};

interface SelectedInsight {
  insight: InsightCell;
  topicName: string;
  topicId: string;
}

function InsightDetailModal({
  selected,
  onClose,
}: {
  selected: SelectedInsight;
  onClose: () => void;
}) {
  const { insight, topicName, topicId } = selected;
  const categoryClass =
    CATEGORY_BADGE[insight.categoryId] ??
    "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="insight-detail-title"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="insight-detail-title"
              className="font-semibold text-gray-900 text-lg"
            >
              {insight.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-sm font-medium text-indigo-900">
                {topicName}
              </span>
              <span className="text-xs font-mono text-gray-400">{topicId}</span>
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${categoryClass}`}
              >
                {insight.categoryLabel}
              </span>
              <span
                className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                  insight.status === "approved"
                    ? "bg-green-100 text-green-800"
                    : insight.status === "draft"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {insight.status}
              </span>
              <span className="text-xs text-rose-700 font-medium">
                {insight.sourceLikeCount} likes
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-600 text-xl leading-none px-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Theory UI content
            </p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {insight.content}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              AI prompt injection
            </p>
            <p className="text-sm text-purple-800 bg-purple-50 p-3 rounded whitespace-pre-wrap">
              {insight.promptSummary}
            </p>
          </div>

          <p className="text-xs text-gray-400 font-mono break-all">
            {insight.sourceRef}
          </p>
        </div>
      </div>
    </div>
  );
}

function insightForStyle(
  topic: TopicRow,
  styleId: string
): InsightCell | undefined {
  return topic.insights.find((i) => i.categoryId === styleId);
}

export default function LearningTableMatrixAdmin() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const [matrix, setMatrix] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"approved" | "all">(
    "approved"
  );
  const [domainFilter, setDomainFilter] = useState("");
  const [withInsightsOnly, setWithInsightsOnly] = useState(true);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [expandedStyle, setExpandedStyle] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] =
    useState<SelectedInsight | null>(null);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      status: statusFilter,
      withInsightsOnly: String(withInsightsOnly),
    });
    if (domainFilter) params.set("domainId", domainFilter);

    try {
      const response = await fetch(
        `${backendUrl}/api/admin/insights/learning-table/matrix?${params}`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load learning table");
      }

      setMatrix(data.matrix ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setMatrix(null);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, domainFilter, statusFilter, withInsightsOnly]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  useEffect(() => {
    if (!selectedInsight) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedInsight(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedInsight]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap gap-3 items-center">
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "approved" | "all")
          }
          className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
        >
          <option value="approved">Live (approved only)</option>
          <option value="all">All statuses</option>
        </select>
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
        >
          {DOMAIN_OPTIONS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={withInsightsOnly}
            onChange={(e) => setWithInsightsOnly(e.target.checked)}
          />
          Only topics with insights
        </label>
        <Link
          href="/admin/learning"
          className="text-sm text-[#8844ff] hover:underline ml-auto"
        >
          ← Forum Learning / Approve
        </Link>
      </div>

      {matrix && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Live insights" value={matrix.summary.approved} />
          <StatCard
            label="Topics covered"
            value={matrix.summary.topicsWithApproved}
          />
          <StatCard label="Pending" value={matrix.summary.draft} />
          <StatCard label="Total rows" value={matrix.summary.total} />
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading learning table…</p>
      ) : !matrix ? null : (
        <>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Learning style lenses (AI defaults)
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              These guide AI explain prompts. Community insights below add
              per-topic angles on top.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {matrix.learningStyles.map((style) => (
                <div key={style.id} className="border border-gray-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedStyle(
                        expandedStyle === style.id ? null : style.id
                      )
                    }
                    className="w-full text-left px-3 py-2 flex justify-between items-center hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900 text-sm">
                      {style.label}
                    </span>
                    <span className="text-xs text-gray-400">{style.id}</span>
                  </button>
                  {expandedStyle === style.id && (
                    <p className="px-3 pb-3 text-xs text-gray-600 border-t border-gray-100 pt-2">
                      {style.aiGuidance}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {matrix.domains.map((domain) => (
            <div
              key={domain.domainId}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-wrap justify-between gap-2">
                <h3 className="font-semibold text-gray-900">
                  {domain.domainLabel}
                </h3>
                <span className="text-sm text-gray-600">
                  {domain.topicsWithInsights}/{domain.topicCount} topics ·{" "}
                  {domain.insightCount} insight
                  {domain.insightCount === 1 ? "" : "s"}
                </span>
              </div>

              {domain.topics.length === 0 ? (
                <p className="p-4 text-gray-500 text-sm">
                  No topics match this filter.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="text-left text-gray-600 border-b border-gray-100">
                        <th className="px-3 py-2 font-medium sticky left-0 bg-white min-w-[180px]">
                          Theory topic
                        </th>
                        {matrix.learningStyles.map((style) => (
                          <th
                            key={style.id}
                            className="px-3 py-2 font-medium min-w-[140px]"
                          >
                            {style.shortLabel}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {domain.topics.map((topic) => {
                        const rowKey = `${domain.domainId}:${topic.topicId}`;
                        const isExpanded = expandedTopic === rowKey;

                        return (
                          <Fragment key={rowKey}>
                            <tr className="border-b border-gray-50 hover:bg-gray-50/50">
                              <td className="px-3 py-2 sticky left-0 bg-white">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedTopic(
                                      isExpanded ? null : rowKey
                                    )
                                  }
                                  className="text-left"
                                >
                                  <div className="font-medium text-gray-900">
                                    {topic.topicName}
                                  </div>
                                  <div className="text-xs text-gray-400 font-mono">
                                    {topic.topicId}
                                  </div>
                                </button>
                              </td>
                              {matrix.learningStyles.map((style) => {
                                const cell = insightForStyle(topic, style.id);
                                return (
                                  <td key={style.id} className="px-3 py-2 align-top">
                                    {cell ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSelectedInsight({
                                            insight: cell,
                                            topicName: topic.topicName,
                                            topicId: topic.topicId,
                                          })
                                        }
                                        className={`w-full text-left rounded p-2 text-xs cursor-pointer transition hover:ring-2 hover:ring-[#8844ff]/40 ${
                                          cell.status === "approved"
                                            ? "bg-green-50 border border-green-200 hover:bg-green-100/80"
                                            : cell.status === "draft"
                                              ? "bg-amber-50 border border-amber-200 hover:bg-amber-100/80"
                                              : "bg-red-50 border border-red-200 hover:bg-red-100/80"
                                        }`}
                                      >
                                        <div className="font-medium text-gray-900 line-clamp-2">
                                          {cell.title}
                                        </div>
                                        <div className="text-gray-500 mt-1 uppercase">
                                          {cell.status}
                                        </div>
                                      </button>
                                    ) : (
                                      <span className="text-gray-300">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                            {isExpanded && (
                              <tr key={`${rowKey}-detail`}>
                                <td
                                  colSpan={matrix.learningStyles.length + 1}
                                  className="px-4 py-3 bg-gray-50"
                                >
                                  <div className="space-y-3">
                                    {topic.insights.length === 0 ? (
                                      <p className="text-gray-500 text-sm">
                                        No community insights for this topic
                                        yet.
                                      </p>
                                    ) : (
                                      topic.insights.map((insight) => (
                                        <div
                                          key={insight.id}
                                          className="bg-white border border-gray-200 rounded-lg p-3"
                                        >
                                          <div className="flex flex-wrap gap-2 mb-2">
                                            <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-gray-100">
                                              {insight.categoryLabel}
                                            </span>
                                            <span
                                              className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                                                insight.status === "approved"
                                                  ? "bg-green-100 text-green-800"
                                                  : insight.status === "draft"
                                                    ? "bg-amber-100 text-amber-800"
                                                    : "bg-red-100 text-red-800"
                                              }`}
                                            >
                                              {insight.status}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              {insight.sourceLikeCount} likes
                                            </span>
                                          </div>
                                          <p className="text-sm font-medium text-gray-900">
                                            {insight.title}
                                          </p>
                                          <p className="text-sm text-gray-700 mt-1">
                                            <span className="font-medium text-gray-500">
                                              UI:{" "}
                                            </span>
                                            {insight.content}
                                          </p>
                                          <p className="text-sm text-purple-800 mt-2 bg-purple-50 p-2 rounded">
                                            <span className="font-medium">
                                              AI prompt:{" "}
                                            </span>
                                            {insight.promptSummary}
                                          </p>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {selectedInsight && (
        <InsightDetailModal
          selected={selectedInsight}
          onClose={() => setSelectedInsight(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow-md px-4 py-3">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
