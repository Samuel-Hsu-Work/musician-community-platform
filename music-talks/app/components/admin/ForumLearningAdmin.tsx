"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAuthHeaders } from "../../utils/apiAuth";

type InsightStatus = "draft" | "approved" | "rejected" | "all";

interface AdminInsight {
  id: string;
  theoryTopicId: string;
  theoryTopicName: string;
  categoryId: string;
  categoryLabel: string;
  title: string;
  content: string;
  promptSummary: string;
  sourceType: string;
  sourceRef: string;
  sourceLikeCount: number;
  sourcePreview: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface PipelineSkipDetail {
  sourceType: string;
  sourceRef: string;
  sourceLabel: string;
  likeCount: number;
  reason: "already_processed" | "ai_rejected" | "invalid_response";
  detail: string;
  existingInsightStatus?: string;
  theoryTopicId?: string;
  theoryTopicName?: string;
  domainId?: string;
  domainLabel?: string;
  categoryId?: string;
  categoryLabel?: string;
  matrixCell?: string;
}

interface PipelineStoredDetail {
  insightId: string;
  theoryTopicId: string;
  theoryTopicName: string;
  domainId: string;
  domainLabel: string;
  categoryId: string;
  categoryLabel: string;
  matrixCell: string;
  title: string;
  sourceType: string;
  sourceRef: string;
  sourceLabel: string;
  status: string;
}

interface PipelineResult {
  scanned: number;
  stored: number;
  skipped: number;
  errors: string[];
  skipDetails: PipelineSkipDetail[];
  storedDetails: PipelineStoredDetail[];
}

interface LearningTableSummary {
  approved: number;
  draft: number;
  rejected: number;
  total: number;
}

const STATUS_TABS: { id: InsightStatus; label: string }[] = [
  { id: "draft", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

const SKIP_REASON_LABEL: Record<PipelineSkipDetail["reason"], string> = {
  already_processed: "Already in table",
  ai_rejected: "AI rejected",
  invalid_response: "Invalid AI response",
};

const CATEGORY_BADGE: Record<string, string> = {
  "music-core": "bg-blue-100 text-blue-800 border-blue-200",
  art: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  "everyday-life": "bg-teal-100 text-teal-800 border-teal-200",
  performance: "bg-orange-100 text-orange-800 border-orange-200",
};

function InsightMetaBadges({ insight }: { insight: AdminInsight }) {
  const categoryClass =
    CATEGORY_BADGE[insight.categoryId] ??
    "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <div className="flex flex-col gap-1 min-w-[140px] flex-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Theory topic
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-sm font-semibold text-indigo-900">
            {insight.theoryTopicName}
          </span>
          <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-mono text-gray-600">
            {insight.theoryTopicId}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1 min-w-[120px]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Learning style
        </span>
        <span
          className={`inline-flex items-center rounded-md border px-2.5 py-1 text-sm font-semibold ${categoryClass}`}
        >
          {insight.categoryLabel}
        </span>
      </div>

      <div className="flex flex-col gap-1 min-w-[72px]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Forum likes
        </span>
        <span className="inline-flex items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-sm font-bold text-rose-800">
          {insight.sourceLikeCount}
        </span>
      </div>
    </div>
  );
}

function InsightCard({
  insight,
  updatingId,
  onUpdateStatus,
  showActions = true,
}: {
  insight: AdminInsight;
  updatingId: string | null;
  onUpdateStatus: (
    id: string,
    status: "approved" | "rejected" | "draft"
  ) => void;
  showActions?: boolean;
}) {
  return (
    <article className="border border-gray-200 rounded-lg p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{insight.title}</h3>
          <InsightMetaBadges insight={insight} />
          <p className="text-xs text-gray-400 mt-2 font-mono">{insight.sourceRef}</p>
        </div>
        <span
          className={`text-xs font-semibold uppercase px-2 py-1 rounded ${
            insight.status === "approved"
              ? "bg-green-100 text-green-800"
              : insight.status === "rejected"
                ? "bg-red-100 text-red-800"
                : "bg-amber-100 text-amber-800"
          }`}
        >
          {insight.status}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Theory UI content
        </p>
        <p className="text-gray-800 text-sm">{insight.content}</p>
      </div>

      <div className="mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          AI prompt injection
        </p>
        <p className="text-sm text-gray-700 bg-purple-50 p-3 rounded">
          {insight.promptSummary}
        </p>
      </div>

      {insight.sourcePreview && (
        <details className="text-sm text-gray-600 mb-4">
          <summary className="cursor-pointer font-medium text-gray-700">
            Forum source ({insight.sourceType})
          </summary>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-gray-700 bg-gray-50 p-3 rounded">
            {insight.sourcePreview}
          </pre>
        </details>
      )}

      {showActions && (
        <div className="flex flex-wrap gap-2">
          {insight.status !== "approved" && (
            <button
              onClick={() => onUpdateStatus(insight.id, "approved")}
              disabled={updatingId === insight.id}
              className="bg-green-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-400"
            >
              Approve → learning table
            </button>
          )}
          {insight.status !== "rejected" && (
            <button
              onClick={() => onUpdateStatus(insight.id, "rejected")}
              disabled={updatingId === insight.id}
              className="bg-white text-red-600 border border-red-300 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
          )}
          {insight.status === "rejected" && (
            <button
              onClick={() => onUpdateStatus(insight.id, "draft")}
              disabled={updatingId === insight.id}
              className="bg-white text-gray-700 border border-gray-300 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Move to pending
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default function ForumLearningAdmin() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const [statusFilter, setStatusFilter] = useState<InsightStatus>("draft");
  const [insights, setInsights] = useState<AdminInsight[]>([]);
  const [learningTable, setLearningTable] = useState<AdminInsight[]>([]);
  const [tableSummary, setTableSummary] = useState<LearningTableSummary | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);
  const [running, setRunning] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(
    null
  );

  const fetchLearningTable = useCallback(async () => {
    setLoadingTable(true);

    try {
      const response = await fetch(
        `${backendUrl}/api/admin/insights/learning-table`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load learning table");
      }

      setLearningTable(data.insights ?? []);
      setTableSummary(data.summary ?? null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load learning table"
      );
    } finally {
      setLoadingTable(false);
    }
  }, [backendUrl]);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${backendUrl}/api/admin/insights?status=${statusFilter}`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load insights");
      }

      setInsights(data.insights ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load insights");
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, statusFilter]);

  useEffect(() => {
    fetchInsights();
    fetchLearningTable();
  }, [fetchInsights, fetchLearningTable]);

  const refreshAll = async () => {
    await Promise.all([fetchInsights(), fetchLearningTable()]);
  };

  const runPipeline = async () => {
    setRunning(true);
    setError("");
    setPipelineResult(null);

    try {
      const response = await fetch(
        `${backendUrl}/api/admin/forum-insights/run`,
        {
          method: "POST",
          headers: getAuthHeaders(true),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Pipeline failed");
      }

      setPipelineResult({
        scanned: data.scanned ?? 0,
        stored: data.stored ?? 0,
        skipped: data.skipped ?? 0,
        errors: data.errors ?? [],
        skipDetails: data.skipDetails ?? [],
        storedDetails: data.storedDetails ?? [],
      });

      await refreshAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Pipeline failed");
    } finally {
      setRunning(false);
    }
  };

  const updateStatus = async (
    id: string,
    status: "approved" | "rejected" | "draft"
  ) => {
    setUpdatingId(id);
    setError("");

    try {
      const response = await fetch(`${backendUrl}/api/admin/insights/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update insight");
      }

      await refreshAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update insight");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Forum Learning Pipeline
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          Scan high-like Forum posts and comments. AI extracts theory insights as{" "}
          <strong>pending</strong> — approve here to add them to the{" "}
          <Link href="/admin/learning-table" className="text-[#8844ff] hover:underline">
            AI learning table
          </Link>
          .
        </p>

        <button
          onClick={runPipeline}
          disabled={running}
          className="bg-[#8844ff] text-white px-5 py-2 rounded-full font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-[#7733ee] transition-colors"
        >
          {running ? "Running pipeline…" : "Run pipeline now"}
        </button>

        {pipelineResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md text-sm text-gray-800 space-y-3">
            <p>
              Scanned: {pipelineResult.scanned} · New drafts:{" "}
              {pipelineResult.stored} · Skipped: {pipelineResult.skipped}
            </p>

            {pipelineResult.storedDetails.length > 0 && (
              <div>
                <p className="font-medium text-gray-900 mb-2">
                  Added to learning table (pending approval)
                </p>
                <ul className="space-y-2">
                  {pipelineResult.storedDetails.map((item) => (
                    <li
                      key={item.insightId}
                      className="bg-amber-50 border border-amber-200 rounded p-3"
                    >
                      <p className="font-semibold text-gray-900">
                        {item.matrixCell}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 font-mono">
                        {item.theoryTopicId} · {item.categoryId}
                      </p>
                      <p className="text-sm text-gray-800 mt-2">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Source: {item.sourceType} · {item.sourceLabel}
                      </p>
                      <Link
                        href="/admin/learning-table"
                        className="text-xs text-[#8844ff] hover:underline mt-1 inline-block"
                      >
                        View in AI Learning Table →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {pipelineResult.skipDetails.length > 0 && (
              <div>
                <p className="font-medium text-gray-900 mb-2">Skip details</p>
                <ul className="space-y-2">
                  {pipelineResult.skipDetails.map((item) => (
                    <li
                      key={item.sourceRef}
                      className="bg-white border border-gray-200 rounded p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {SKIP_REASON_LABEL[item.reason]}
                        </span>
                        <span className="text-xs text-gray-500">
                          {item.sourceType} · {item.likeCount} likes
                        </span>
                      </div>
                      {item.matrixCell && (
                        <p className="text-sm font-medium text-[#8844ff] mb-1">
                          Learning table cell: {item.matrixCell}
                          {item.existingInsightStatus
                            ? ` (${item.existingInsightStatus})`
                            : ""}
                        </p>
                      )}
                      <p className="text-gray-900">{item.sourceLabel}</p>
                      <p className="text-gray-600 mt-1">{item.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {pipelineResult.errors.length > 0 && (
              <ul className="text-red-600 list-disc list-inside">
                {pipelineResult.errors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              AI Learning Table
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Approved rows — injected into AI explain prompts when the topic
              is explained (not shown on Theory UI).
            </p>
          </div>
          {tableSummary && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm text-gray-600 bg-green-50 px-3 py-2 rounded-md">
                Live: <strong>{tableSummary.approved}</strong> · Pending:{" "}
                {tableSummary.draft} · Rejected: {tableSummary.rejected}
              </div>
              <Link
                href="/admin/learning-table"
                className="text-sm text-[#8844ff] hover:underline font-medium"
              >
                View matrix by topic & style →
              </Link>
            </div>
          )}
        </div>

        {loadingTable ? (
          <p className="text-gray-500">Loading learning table…</p>
        ) : learningTable.length === 0 ? (
          <p className="text-gray-500">
            No approved insights yet. Approve pending items below to populate the
            table.
          </p>
        ) : (
          <div className="space-y-4">
            {learningTable.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                updatingId={updatingId}
                onUpdateStatus={updateStatus}
                showActions={false}
              />
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Review Queue
        </h2>

        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 font-medium transition-colors ${
                statusFilter === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading insights…</p>
        ) : insights.length === 0 ? (
          <p className="text-gray-500">
            No {statusFilter === "draft" ? "pending" : statusFilter} insights.
          </p>
        ) : (
          <div className="space-y-4">
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                updatingId={updatingId}
                onUpdateStatus={updateStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
