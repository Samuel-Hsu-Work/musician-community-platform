"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { THEORY_DOMAINS } from "../../theory/theoryDomains";

export default function TheoryNavbar() {
  const pathname = usePathname();

  return (
    <ul className="pt-3 px-3 border-b border-gray-700 pb-3 space-y-0.5">
      {THEORY_DOMAINS.map((domain) => {
        const isActive =
          pathname === domain.href ||
          (pathname === "/theory" &&
            domain.id === "notation-reading") ||
          (domain.id === "pitch-scales-keys" &&
            pathname === "/theory/scales");

        const isComingSoon = domain.status === "coming-soon";

        return (
          <li key={domain.id}>
            <Link
              href={domain.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : isComingSoon
                    ? "text-gray-400 hover:bg-gray-700/80 hover:text-gray-200"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
            >
              <span className="text-lg flex-shrink-0" aria-hidden>
                {domain.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm leading-tight truncate">
                  {domain.label}
                </span>
                {isComingSoon && (
                  <span className="block text-[10px] font-normal text-gray-500 mt-0.5">
                    Coming soon
                  </span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
