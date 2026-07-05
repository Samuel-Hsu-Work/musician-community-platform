"use client";

import { useEffect, useState } from "react";
import {
  LEARNING_STYLE_CATEGORIES,
  getStoredLearningStyle,
  loadLearningStyleFromServer,
  setStoredLearningStyle,
  syncLearningStyleToServer,
  type PerspectiveCategoryId,
} from "../../theory/theoryLearningFlow";

interface TheoryLearningPreferencesProps {
  initialCategoryIds?: string[];
}

export default function TheoryLearningPreferences({
  initialCategoryIds,
}: TheoryLearningPreferencesProps) {
  const [selected, setSelected] = useState<PerspectiveCategoryId | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    setIsLoggedIn(Boolean(token));

    if (initialCategoryIds?.length) {
      const first = initialCategoryIds[0] as PerspectiveCategoryId;
      setSelected(first);
      setStoredLearningStyle(first);
      return;
    }

    loadLearningStyleFromServer()
      .then((ids) => setSelected(ids[0] ?? null))
      .catch(() => setSelected(getStoredLearningStyle()));
  }, [initialCategoryIds]);

  const selectNone = () => {
    setSelected(null);
    setSaved(false);
    setError("");
  };

  const selectOne = (id: PerspectiveCategoryId) => {
    setSelected((prev) => (prev === id ? null : id));
    setSaved(false);
    setError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      setStoredLearningStyle(selected);
      if (isLoggedIn) {
        await syncLearningStyleToServer(selected ? [selected] : []);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Could not save learning style. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const selectedMeta = selected
    ? LEARNING_STYLE_CATEGORIES.find((c) => c.id === selected)
    : null;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-semibold text-lg">
          🎓
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Learning style
          </h2>
          <p className="text-sm text-gray-500">
            One style for AI explanations in Theory
            {isLoggedIn ? " — saved to your account" : " — stored on this device"}
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
        Default is <strong>None</strong> — neutral AI text for anyone. Choose{" "}
        <strong>one</strong> style that matches how you like concepts explained
        (e.g. STEM friends vs everyday analogies). Tap the same option again to
        return to None.
      </p>

      <div className="space-y-3 mb-4" role="radiogroup" aria-label="Learning style">
        <button
          type="button"
          role="radio"
          aria-checked={selected === null}
          onClick={selectNone}
          className={`w-full flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
            selected === null
              ? "border-gray-400 bg-gray-50 ring-1 ring-gray-300"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <span className="text-2xl" aria-hidden>
            ⚪
          </span>
          <span>
            <span className="font-semibold text-gray-900 block">
              None (default)
            </span>
            <span className="text-xs text-gray-500">
              Balanced explanation — no style bias
            </span>
          </span>
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LEARNING_STYLE_CATEGORIES.map((cat) => {
            const active = selected === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => selectOne(cat.id)}
                className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                  active
                    ? "border-amber-400 bg-amber-50 ring-1 ring-amber-300"
                    : "border-gray-200 hover:border-amber-200"
                }`}
              >
                <span className="text-2xl" aria-hidden>
                  {cat.icon}
                </span>
                <span>
                  <span className="font-semibold text-gray-900 block">
                    {cat.label}
                  </span>
                  <span className="text-xs text-gray-500">{cat.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedMeta && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
          Selected: <strong>{selectedMeta.label}</strong>. AI will lean this way
          when explaining Theory topics.
        </p>
      )}

      {saved && (
        <p className="text-sm text-green-600 mb-3">Preferences saved.</p>
      )}
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 text-sm font-medium disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save learning style"}
      </button>
    </section>
  );
}
