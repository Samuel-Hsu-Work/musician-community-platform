"use client";

import { useMemo, useState } from "react";
import NotationSymbol from "./NotationSymbol";
import TheoryPageShell from "./TheoryPageShell";
import TheoryTopicDetail from "./TheoryTopicDetail";
import { getScaleFrequencies } from "../../theory/scaleData";
import { getCategoryLabel, type TheoryTopic } from "../../theory/theoryTopicTypes";
import { getDomainConfig } from "../../theory/theoryDomainConfig";
import { getTheoryDomain, type TheoryDomainId } from "../../theory/theoryDomains";

type CategoryFilter = string | "all";

interface TheoryDomainPageProps {
  domainId: TheoryDomainId;
}

function ScaleGrids({ topic }: { topic: TheoryTopic }) {
  if (!topic.notes?.length || topic.rootFrequency === undefined) return null;

  const frequencies = getScaleFrequencies({
    id: topic.id,
    name: topic.name,
    category: "major",
    notes: topic.notes,
    rootFrequency: topic.rootFrequency,
  }).map((f) => `${f.toFixed(2)} Hz`);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
          Scale Degrees
        </h3>
        <div className="flex flex-wrap justify-center gap-3">
          {topic.notes.map((note) => (
            <div
              key={note}
              className="flex items-center justify-center rounded-xl font-bold shadow-md w-16 h-16 text-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white"
            >
              {note}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
          Note Frequencies
        </h3>
        <div className="flex flex-wrap justify-center gap-3">
          {frequencies.map((freq) => (
            <div
              key={freq}
              className="flex items-center justify-center rounded-xl font-bold shadow-md px-4 py-3 text-sm min-w-[120px] bg-gradient-to-br from-purple-500 to-purple-600 text-white"
            >
              {freq}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopicIcon({ topic, active }: { topic: TheoryTopic; active: boolean }) {
  if (topic.kind === "symbol") {
    return <NotationSymbol id={topic.id} active={active} />;
  }

  if (topic.kind === "scale" && topic.notes?.[0]) {
    return (
      <span
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          active ? "bg-blue-500/30 text-white" : "bg-gray-700/80 text-gray-200"
        }`}
      >
        {topic.notes[0]}
      </span>
    );
  }

  return (
    <span
      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
        active ? "bg-blue-500/30 text-white" : "bg-gray-700/80 text-gray-200"
      }`}
    >
      {topic.name.charAt(0)}
    </span>
  );
}

export default function TheoryDomainPage({ domainId }: TheoryDomainPageProps) {
  getTheoryDomain(domainId);
  const { categories, topics } = getDomainConfig(domainId);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [selectedTopic, setSelectedTopic] = useState<TheoryTopic | null>(null);

  const groupedTopics = useMemo(() => {
    const query = search.trim().toLowerCase();

    const matches = topics.filter((topic) => {
      if (categoryFilter !== "all" && topic.category !== categoryFilter) {
        return false;
      }
      if (!query) return true;
      const categoryLabel = getCategoryLabel(categories, topic.category);
      return (
        topic.name.toLowerCase().includes(query) ||
        categoryLabel.toLowerCase().includes(query) ||
        topic.id.toLowerCase().includes(query)
      );
    });

    return categories
      .map((category) => ({
        ...category,
        items: matches.filter((t) => t.category === category.id),
      }))
      .filter((group) => group.items.length > 0);
  }, [search, categoryFilter, topics, categories]);

  const hasResults = groupedTopics.length > 0;

  const header = selectedTopic ? (
    <div className="flex items-center gap-4">
      {selectedTopic.kind === "symbol" ? (
        <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-800 shadow-sm">
          <NotationSymbol id={selectedTopic.id} className="scale-125" />
        </div>
      ) : selectedTopic.kind === "scale" && selectedTopic.notes?.[0] ? (
        <span className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-xl font-bold text-blue-700 shadow-sm">
          {selectedTopic.notes[0]}
        </span>
      ) : null}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{selectedTopic.name}</h2>
        {selectedTopic.kind === "scale" && selectedTopic.notes && (
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedTopic.notes.length} notes
            {selectedTopic.rootFrequency
              ? ` · root ${selectedTopic.rootFrequency.toFixed(2)} Hz`
              : ""}
          </p>
        )}
      </div>
    </div>
  ) : null;

  return (
    <TheoryPageShell
      sidebar={
        <div className="p-3">
          <div className="relative mb-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search topics..."
              className="w-full px-4 py-2.5 pl-10 bg-gray-800/50 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {categories.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  categoryFilter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryFilter(category.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    categoryFilter === category.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  {category.shortLabel}
                </button>
              ))}
            </div>
          )}

          {hasResults ? (
            <div className="space-y-5">
              {groupedTopics.map((group) => (
                <div key={group.id}>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                    {group.label}
                  </h3>
                  <div className="space-y-1.5">
                    {group.items.map((topic) => {
                      const isSelected = selectedTopic?.id === topic.id;
                      return (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => setSelectedTopic(topic)}
                          title={topic.name}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                              : "bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white"
                          }`}
                        >
                          <TopicIcon topic={topic} active={isSelected} />
                          <span className="font-medium text-sm truncate">
                            {topic.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No topics found
            </p>
          )}
        </div>
      }
    >
      {!selectedTopic ? (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-6 min-h-full">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <p className="text-gray-500 text-center py-16">
                Select a topic from the sidebar
              </p>
            </div>
          </div>
        </div>
      ) : (
        <TheoryTopicDetail
          topicId={selectedTopic.id}
          topicName={selectedTopic.name}
          topContent={header}
        >
          {selectedTopic.kind === "scale" ? (
            <ScaleGrids topic={selectedTopic} />
          ) : null}
        </TheoryTopicDetail>
      )}
    </TheoryPageShell>
  );
}
