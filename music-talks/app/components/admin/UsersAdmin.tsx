"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthHeaders } from "../../utils/apiAuth";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  topicCount: number;
  commentCount: number;
  createdAt: string;
}

export default function UsersAdmin() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({ limit: "50" });
    if (search.trim()) params.set("search", search.trim());

    try {
      const response = await fetch(
        `${backendUrl}/api/admin/users?${params}`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load users");
      }

      setUsers(data.users ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateRole = async (userId: string, role: "user" | "admin") => {
    setUpdatingId(userId);
    setError("");

    try {
      const response = await fetch(`${backendUrl}/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ role }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update user");
      }

      await fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-md p-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search username or email…"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="text-gray-500">No users found.</p>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Activity</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{user.username}</div>
                    <div className="text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold uppercase px-2 py-1 rounded ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {user.topicCount} posts · {user.commentCount} comments
                  </td>
                  <td className="px-4 py-3">
                    {user.role === "admin" ? (
                      <button
                        onClick={() => updateRole(user.id, "user")}
                        disabled={updatingId === user.id}
                        className="text-sm text-gray-700 border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 disabled:opacity-50"
                      >
                        Remove admin
                      </button>
                    ) : (
                      <button
                        onClick={() => updateRole(user.id, "admin")}
                        disabled={updatingId === user.id}
                        className="text-sm bg-[#8844ff] text-white px-3 py-1 rounded hover:bg-[#7733ee] disabled:bg-gray-400"
                      >
                        Make admin
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
