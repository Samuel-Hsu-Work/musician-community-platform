"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import TheoryNavbar from "./theoryNavbar";

interface TheoryPageShellProps {
  children: ReactNode;
  sidebar: ReactNode;
}

const STORAGE_KEY = "theorySidebarWidth";
const DEFAULT_SIDEBAR_WIDTH = 240;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 400;

function clampWidth(width: number) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
}

export default function TheoryPageShell({
  children,
  sidebar,
}: TheoryPageShellProps) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(DEFAULT_SIDEBAR_WIDTH);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const parsed = Number.parseInt(stored, 10);
    if (!Number.isNaN(parsed)) {
      setSidebarWidth(clampWidth(parsed));
    }
  }, []);

  const persistWidth = useCallback((width: number) => {
    localStorage.setItem(STORAGE_KEY, String(width));
  }, []);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = sidebarWidth;
      setIsResizing(true);
    },
    [sidebarWidth]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current;
      const next = clampWidth(resizeStartWidth.current + delta);
      setSidebarWidth(next);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setSidebarWidth((w) => {
        persistWidth(w);
        return w;
      });
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, persistWidth]);

  return (
    <div className="flex h-[calc(100vh-70px)] min-h-0 flex-col bg-gray-50">
      <div className="relative flex min-h-0 min-w-0 flex-1">
        <aside
          style={{ width: sidebarWidth }}
          className={`flex h-full min-h-0 flex-shrink-0 flex-col overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-xl ${
            isResizing ? "select-none" : ""
          }`}
        >
          <div className="flex-shrink-0">
            <TheoryNavbar />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-gray-700">
            {sidebar}
          </div>
        </aside>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          aria-valuenow={sidebarWidth}
          aria-valuemin={MIN_SIDEBAR_WIDTH}
          aria-valuemax={MAX_SIDEBAR_WIDTH}
          onMouseDown={handleResizeStart}
          className={`group/resize relative z-30 -ml-1.5 mr-0 flex w-3 flex-shrink-0 cursor-col-resize touch-none flex-col items-center justify-center self-stretch ${
            isResizing ? "bg-blue-500/10" : "hover:bg-gray-200/80"
          }`}
          title="Drag to resize"
        >
          <div
            className={`pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors ${
              isResizing
                ? "bg-blue-500"
                : "bg-gray-300 group-hover/resize:bg-gray-400"
            }`}
          />
          <div
            className={`relative z-10 flex flex-col items-center justify-center gap-1 rounded-full border px-1 py-2.5 shadow-md transition-all duration-150 ${
              isResizing
                ? "scale-105 border-blue-500 bg-white ring-2 ring-blue-500/30"
                : "border-gray-300 bg-white group-hover/resize:border-blue-400 group-hover/resize:shadow-md"
            }`}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`block h-1 w-1 rounded-full transition-colors ${
                  isResizing
                    ? "bg-blue-500"
                    : "bg-gray-400 group-hover/resize:bg-blue-500"
                }`}
              />
            ))}
          </div>
        </div>

        <div
          className={`theory-content relative z-0 h-full min-h-0 min-w-0 flex-1 overflow-y-auto bg-gray-50 ${
            isResizing ? "pointer-events-none select-none" : ""
          }`}
        >
          {children}
        </div>

        {isResizing && (
          <>
            <div
              className="pointer-events-none absolute top-1/2 z-40 -translate-y-1/2 rounded-md border border-gray-700 bg-gray-900 px-2 py-1 text-xs font-medium tabular-nums text-blue-200 shadow-lg"
              style={{ left: sidebarWidth + 6 }}
              aria-hidden
            >
              {sidebarWidth}px
            </div>
            <div
              className="pointer-events-none fixed inset-0 z-20 cursor-col-resize"
              aria-hidden
            />
          </>
        )}
      </div>
    </div>
  );
}
