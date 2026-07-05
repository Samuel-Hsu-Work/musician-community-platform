"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PERSPECTIVE_CATEGORIES,
  getShuffledMockPerspectives,
  getStoredPerspectivePrefs,
  loadLearningStyleFromServer,
  selectStoredLearningStyle,
  syncLearningStyleToServer,
  type PerspectiveCategoryId,
  type PerspectiveVariant,
} from "../../theory/theoryLearningFlow";

interface TheoryAnswerCardProps {
  title: string;
  badge: string;
  subtitle?: string;
  content: string | null;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  borderClass: string;
  accentBarClass: string;
}

function TheoryAnswerCard({
  title,
  badge,
  subtitle,
  content,
  loading = false,
  error = null,
  emptyMessage = "Not available.",
  borderClass,
  accentBarClass,
}: TheoryAnswerCardProps) {
  return (
    <section
      className={`overflow-hidden rounded-xl border bg-white shadow-sm ${borderClass}`}
    >
      <div className={`h-1 ${accentBarClass}`} />
      <div className="p-6">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {badge}
          </span>
        </div>
        {subtitle && (
          <p className="mb-4 text-xs text-gray-500 leading-relaxed">{subtitle}</p>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-gray-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="text-sm">Loading...</p>
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : content ? (
          <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
            {content}
          </p>
        ) : (
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
}

function PerspectiveVariantCard({
  variant,
  isPreferredCategory,
  onHelpful,
  helpfulActive,
}: {
  variant: PerspectiveVariant;
  isPreferredCategory: boolean;
  onHelpful: () => void;
  helpfulActive: boolean;
}) {
  const category = PERSPECTIVE_CATEGORIES.find(
    (c) => c.id === variant.categoryId
  );

  return (
    <article
      className={`rounded-xl border p-5 transition-shadow ${
        isPreferredCategory
          ? "border-amber-200 bg-amber-50/40 shadow-sm"
          : "border-gray-200 bg-gray-50/50"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            {category?.icon ?? "💡"}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {category?.label ?? variant.categoryId}
            </p>
            <h4 className="font-semibold text-gray-900">{variant.title}</h4>
          </div>
        </div>
        {isPreferredCategory && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
            Your style
          </span>
        )}
      </div>

      <p className="mb-2 text-xs text-gray-500">{variant.sourceLabel}</p>
      <p className="mb-4 text-sm text-gray-700 leading-relaxed">
        {variant.preview}
      </p>
      {variant.forumHint && (
        <p className="mb-4 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-xs text-gray-500">
          {variant.forumHint}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onHelpful}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            helpfulActive
              ? "bg-green-600 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:border-green-400 hover:text-green-700"
          }`}
        >
          {helpfulActive ? "✓ Helps me" : "This helps me"}
        </button>
      </div>
    </article>
  );
}

export interface TheoryLearningPanelProps {
  notationId: string;
  notationName: string;
  standardContent: string | null;
  standardLoading: boolean;
  standardError: string | null;
  aiContent: string | null;
  aiLoading: boolean;
  aiError: string | null;
  aiPersonalized?: boolean;
  communityInsightCount?: number;
}

export default function TheoryLearningPanel({
  notationId,
  notationName,
  standardContent,
  standardLoading,
  standardError,
  aiContent,
  aiLoading,
  aiError,
  aiPersonalized = false,
  communityInsightCount = 0,
}: TheoryLearningPanelProps) {
  const [prefs, setPrefs] = useState<PerspectiveCategoryId[]>([]);
  const [showPerspectives, setShowPerspectives] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadLearningStyleFromServer()
      .then(setPrefs)
      .catch(() => setPrefs(getStoredPerspectivePrefs()));
  }, [notationId]);

  const perspectives = useMemo(
    (): PerspectiveVariant[] =>
      getShuffledMockPerspectives(notationId, notationName),
    [notationId, notationName]
  );

  const preferredLabel = prefs[0]
    ? PERSPECTIVE_CATEGORIES.find((c) => c.id === prefs[0])?.label ?? prefs[0]
    : null;

  const handleHelpful = async (variant: PerspectiveVariant) => {
    const next = selectStoredLearningStyle(variant.categoryId);
    setPrefs(getStoredPerspectivePrefs());

    try {
      await syncLearningStyleToServer(getStoredPerspectivePrefs());
    } catch {
      // localStorage already updated; server sync is best-effort for guests
    }

    const label = PERSPECTIVE_CATEGORIES.find(
      (c) => c.id === variant.categoryId
    )?.label;
    setToast(
      next
        ? `Preference saved: ${label}. AI explanations will lean this way.`
        : "Learning style cleared."
    );
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {toast}
        </div>
      )}

      <TheoryAnswerCard
        title="Standard explanation"
        badge="Reference"
        subtitle="Fixed professional definition from the database — the anchor for correctness."
        content={standardContent}
        loading={standardLoading}
        error={standardError}
        emptyMessage="Run backend seed to load standard definitions."
        borderClass="border-blue-100"
        accentBarClass="bg-blue-500"
      />

      <TheoryAnswerCard
        title="AI explanation"
        badge={aiPersonalized ? "Personalized" : "Generated"}
        subtitle={
          aiPersonalized
            ? [
                preferredLabel ? `Learning style: ${preferredLabel}.` : null,
                communityInsightCount > 0
                  ? `Includes ${communityInsightCount} community-learned angle${communityInsightCount > 1 ? "s" : ""}.`
                  : null,
              ]
                .filter(Boolean)
                .join(" ") || "Personalized for you."
            : preferredLabel
              ? `Reload topic after changing preferences. Current style: ${preferredLabel}.`
              : "On-demand AI overview. Set a learning style in Account or tap \"This helps me\" below."
        }
        content={aiContent}
        loading={aiLoading}
        error={aiError}
        emptyMessage="AI explanation requires OPENAI_API_KEY on the backend."
        borderClass="border-purple-100"
        accentBarClass="bg-purple-500"
      />

      <section className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white">
        <button
          type="button"
          onClick={() => setShowPerspectives((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              More ways to understand
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              Sample explanations in different learning styles — tap one that
              clicks to save your preference
            </p>
          </div>
          <span className="text-gray-400 text-sm font-medium">
            {showPerspectives ? "Hide" : "Show"} ({perspectives.length})
          </span>
        </button>

        {showPerspectives && (
          <div className="space-y-4 border-t border-amber-100 px-5 pb-5 pt-4">
            <div className="flex flex-wrap gap-2">
              {PERSPECTIVE_CATEGORIES.map((cat) => (
                <span
                  key={cat.id}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    prefs.includes(cat.id)
                      ? "bg-amber-200 text-amber-900"
                      : "bg-white border border-gray-200 text-gray-600"
                  }`}
                >
                  <span aria-hidden>{cat.icon}</span>
                  {cat.shortLabel}
                </span>
              ))}
            </div>

            {perspectives.map((variant) => (
              <PerspectiveVariantCard
                key={variant.id}
                variant={variant}
                isPreferredCategory={prefs.includes(variant.categoryId)}
                helpfulActive={prefs.includes(variant.categoryId)}
                onHelpful={() => handleHelpful(variant)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
