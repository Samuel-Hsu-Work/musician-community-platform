"use client";

import type { TheoryDomain } from "../../theory/theoryDomains";
import TheoryPageShell from "./TheoryPageShell";

interface TheoryComingSoonProps {
  domain: TheoryDomain;
}

export default function TheoryComingSoon({ domain }: TheoryComingSoonProps) {
  return (
    <TheoryPageShell
      sidebar={<div className="p-3" />}
    >
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-6 min-h-full">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10">
            <span className="text-5xl mb-4 block" aria-hidden>
              {domain.icon}
            </span>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
              Coming soon
            </p>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {domain.label}
            </h1>
            <p className="text-gray-600 leading-relaxed">{domain.description}</p>
            <p className="text-sm text-gray-500 mt-6">
              Browse live sections from the left sidebar in the meantime.
            </p>
          </div>
        </div>
      </div>
    </TheoryPageShell>
  );
}
