"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthHeaders } from "../../utils/apiAuth";

interface ForumTopic {
  id: string;
  title: string;
  content: string;
  type: string;
  hidden: boolean;
  authorUsername: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

type HiddenFilter = "all" | "visible" | "hidden";

export default function ForumModerationAdmin() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [hiddenFilter, setHiddenFilter] = useState<HiddenFilter>("all");
  const [typeFilter, setTypeFilter] = useState("community_post");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      type: typeFilter,
      limit: "30",
    });
    if (search.trim()) params.set("search", search.trim());
    if (hiddenFilter === "hidden") params.set("hidden", "true");
    if (hiddenFilter === "visible") params.set("hidden", "false");

    try {
      const response = await fetch(
        `${backendUrl}/api/admin/forum/topics?${params}`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load topics");
      }

      setTopics(data.topics ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load topics");
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, hiddenFilter, search, typeFilter]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const setHidden = async (topicId: string, hidden: boolean) => {
    setUpdatingId(topicId);
    setError("");

    try {
      const response = await fetch(
        `${backendUrl}/api/admin/forum/topics/${topicId}`,
        {
          method: "PATCH",
          headers: getAuthHeaders(true),
          body: JSON.stringify({ hidden }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update topic");
      }

      await fetchTopics();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update topic");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, content, author…"
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md text-gray-900"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-gray-900"
        >
          <option value="community_post">Community posts</option>
          <option value="daily_discussion">Daily discussions</option>
        </select>
        <select
          value={hiddenFilter}
          onChange={(e) => setHiddenFilter(e.target.value as HiddenFilter)}
          className="px-3 py-2 border border-gray-300 rounded-md text-gray-900"
        >
          <option value="all">All visibility</option>
          <option value="visible">Visible only</option>
          <option value="hidden">Hidden only</option>
        </select>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading posts…</p>
      ) : topics.length === 0 ? (
        <p className="text-gray-500">No posts match your filters.</p>
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => (
            <article
              key={topic.id}
              className={`bg-white rounded-lg shadow-md p-4 border ${
                topic.hidden ? "border-red-200" : "border-transparent"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{topic.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {topic.authorUsername ?? "Unknown"} · {topic.type} ·{" "}
                    {topic.likeCount} likes · {topic.commentCount} comments
                  </p>
                </div>
                {topic.hidden && (
                  <span className="text-xs font-semibold uppercase px-2 py-1 rounded bg-red-100 text-red-800">
                    Hidden
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                {topic.content}
              </p>

              <div className="flex flex-wrap gap-2">
                {topic.hidden ? (
                  <button
                    onClick={() => setHidden(topic.id, false)}
                    disabled={updatingId === topic.id}
                    className="bg-green-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-400"
                  >
                    Unhide
                  </button>
                ) : (
                  <button
                    onClick={() => setHidden(topic.id, true)}
                    disabled={updatingId === topic.id}
                    className="bg-white text-red-600 border border-red-300 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                  >
                    Hide from Forum
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
