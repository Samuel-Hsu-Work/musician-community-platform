"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getAuthHeaders } from "../../utils/apiAuth";

const NAV_ITEMS = [
  { href: "/admin/learning", label: "Forum Learning" },
  { href: "/admin/learning-table", label: "AI Learning Table" },
  { href: "/admin/forum", label: "Forum Posts" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/theory", label: "Theory Content Management" },
];

interface AdminShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export default function AdminShell({
  title,
  description,
  children,
}: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/account");
      return;
    }

    const verifyAdmin = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/admin/me`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          router.replace("/");
          return;
        }

        setAuthorized(true);
      } catch {
        router.replace("/");
      } finally {
        setChecking(false);
      }
    };

    verifyAdmin();
  }, [backendUrl, router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Checking admin access…</p>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin</h1>
        <p className="text-gray-600 mt-2">{description}</p>

        <nav className="flex flex-wrap gap-2 mt-6 border-b border-gray-200 pb-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === item.href ||
                (item.href !== "/admin/learning" &&
                  pathname.startsWith(`${item.href}/`)) ||
                (item.href === "/admin/learning" && pathname === "/admin/learning")
                  ? "bg-[#8844ff] text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
