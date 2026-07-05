"use client";

import { useState, useEffect, type ReactNode } from "react";
import TheoryLearningPanel from "./TheoryLearningPanel";
import { getAuthHeaders } from "../../utils/apiAuth";
import { getStoredPerspectivePrefs } from "../../theory/theoryLearningFlow";

export interface TheoryTopicDetailProps {
  topicId: string;
  topicName: string;
  topContent?: ReactNode;
  children?: ReactNode;
}

export default function TheoryTopicDetail({
  topicId,
  topicName,
  topContent,
  children,
}: TheoryTopicDetailProps) {
  const [standardDefinition, setStandardDefinition] = useState<string | null>(
    null
  );
  const [standardLoading, setStandardLoading] = useState(false);
  const [standardError, setStandardError] = useState<string | null>(null);

  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPersonalized, setAiPersonalized] = useState(false);
  const [communityInsightCount, setCommunityInsightCount] = useState(0);

  useEffect(() => {
    if (!topicId) {
      setStandardDefinition(null);
      setStandardError(null);
      setStandardLoading(false);
      setAiExplanation(null);
      setAiError(null);
      setAiLoading(false);
      setAiPersonalized(false);
      setCommunityInsightCount(0);
      return;
    }

    let cancelled = false;
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const fetchStandard = async () => {
      setStandardLoading(true);
      setStandardError(null);
      setStandardDefinition(null);

      try {
        const response = await fetch(
          `${backendUrl}/api/theory/notations/${topicId}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load standard explanation");
        }

        if (!cancelled) {
          setStandardDefinition(data.definition?.standardDefinition ?? null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setStandardError(
            err instanceof Error
              ? err.message
              : "Failed to load standard explanation"
          );
        }
      } finally {
        if (!cancelled) {
          setStandardLoading(false);
        }
      }
    };

    const fetchAi = async () => {
      setAiLoading(true);
      setAiError(null);
      setAiExplanation(null);
      setAiPersonalized(false);
      setCommunityInsightCount(0);

      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const categoryIds = token ? undefined : getStoredPerspectivePrefs();

      try {
        const response = await fetch(`${backendUrl}/api/ai/explain-notation`, {
          method: "POST",
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            notation: topicName,
            theoryTopicId: topicId,
            ...(categoryIds?.length ? { categoryIds } : {}),
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to get AI explanation");
        }

        if (!cancelled) {
          setAiExplanation(data.explanation ?? null);
          setAiPersonalized(Boolean(data.personalized));
          setCommunityInsightCount(Number(data.communityInsightCount) || 0);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setAiError(
            err instanceof Error ? err.message : "Failed to load AI explanation"
          );
        }
      } finally {
        if (!cancelled) {
          setAiLoading(false);
        }
      }
    };

    fetchStandard();
    fetchAi();

    return () => {
      cancelled = true;
    };
  }, [topicId, topicName]);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {topContent}
        <TheoryLearningPanel
          notationId={topicId}
          notationName={topicName}
          standardContent={standardDefinition}
          standardLoading={standardLoading}
          standardError={standardError}
          aiContent={aiExplanation}
          aiLoading={aiLoading}
          aiError={aiError}
          aiPersonalized={aiPersonalized}
          communityInsightCount={communityInsightCount}
        />
        {children}
      </div>
    </div>
  );
}
