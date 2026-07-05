"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthHeaders } from "../../utils/apiAuth";

interface TheoryTopicRow {
  id: string;
  catalogName: string;
  name: string;
  category: string;
  domainId: string;
  kind: string;
  hasDefinition: boolean;
  standardDefinitionPreview: string | null;
  updatedAt: string | null;
}

const DOMAINS = [
  { id: "", label: "All domains" },
  { id: "notation-reading", label: "Notation & Reading" },
  { id: "rhythm-meter", label: "Rhythm & Meter" },
  { id: "pitch-scales-keys", label: "Pitch, Scales & Keys" },
  { id: "intervals", label: "Intervals" },
  { id: "chords-harmony", label: "Chords & Harmony" },
  { id: "form-analysis", label: "Form & Analysis" },
];

export default function TheoryCmsAdmin() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const [topics, setTopics] = useState<TheoryTopicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [domainId, setDomainId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDefinition, setEditDefinition] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({ limit: "100" });
    if (search.trim()) params.set("search", search.trim());
    if (domainId) params.set("domainId", domainId);

    try {
      const response = await fetch(
        `${backendUrl}/api/admin/theory/topics?${params}`,
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
  }, [backendUrl, domainId, search]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const openEditor = async (topicId: string) => {
    setSelectedId(topicId);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${backendUrl}/api/admin/theory/topics/${topicId}`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load topic");
      }

      const definition = data.topic?.definition;
      const catalog = data.topic?.catalog;

      setEditName(definition?.name ?? catalog?.name ?? "");
      setEditCategory(definition?.category ?? catalog?.category ?? "");
      setEditDefinition(definition?.standardDefinition ?? "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load topic");
      setSelectedId(null);
    }
  };

  const saveTopic = async () => {
    if (!selectedId) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${backendUrl}/api/admin/theory/topics/${selectedId}`,
        {
          method: "PATCH",
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            name: editName,
            category: editCategory,
            standardDefinition: editDefinition,
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save topic");
      }

      setMessage("Saved. Standard card on Theory will use this text.");
      await fetchTopics();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save topic");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topic id or name…"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
          />
          <select
            value={domainId}
            onChange={(e) => setDomainId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
          >
            {DOMAINS.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.label}
              </option>
            ))}
          </select>
        </div>

        {error && !selectedId && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading topics…</p>
        ) : (
          <div className="bg-white rounded-lg shadow-md max-h-[70vh] overflow-y-auto">
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => openEditor(topic.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${
                  selectedId === topic.id ? "bg-purple-50" : ""
                }`}
              >
                <div className="font-medium text-gray-900">{topic.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {topic.id} · {topic.domainId}
                  {!topic.hasDefinition && (
                    <span className="ml-2 text-amber-600">No DB text</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {!selectedId ? (
          <p className="text-gray-500">
            Select a topic to edit its standard definition (Standard card on
            Theory pages).
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display name (DB)
              </label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category (DB)
              </label>
              <input
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Standard definition
              </label>
              <textarea
                value={editDefinition}
                onChange={(e) => setEditDefinition(e.target.value)}
                rows={14}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 font-mono text-sm"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
            {message && (
              <div className="text-green-700 text-sm bg-green-50 p-3 rounded-md">
                {message}
              </div>
            )}

            <button
              onClick={saveTopic}
              disabled={saving || !editDefinition.trim()}
              className="bg-[#8844ff] text-white px-5 py-2 rounded-full font-semibold disabled:bg-gray-400 hover:bg-[#7733ee]"
            >
              {saving ? "Saving…" : "Save standard text"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
