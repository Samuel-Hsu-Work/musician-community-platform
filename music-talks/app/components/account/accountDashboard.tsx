"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatDateTime,
  formatTimezoneLabel,
} from "../../utils/datetime";
import {
  setCachedTimezone,
  resolveDisplayTimezone,
} from "../../utils/userTimezone";
import {
  getBrowserTimezone,
  TIMEZONE_OPTIONS,
  isValidTimezone,
} from "../../utils/timezone";
import TheoryLearningPreferences from "./TheoryLearningPreferences";

export interface AccountUser {
  id: string;
  username: string;
  email: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  id: string;
  language: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountData {
  user: AccountUser;
  preferences: UserPreferences;
  learningStyleCategoryIds?: string[];
}

interface AccountDashboardProps {
  onLogout: () => void;
  onAccountDeleted?: () => void;
}

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function AccountDashboard({ onLogout, onAccountDeleted }: AccountDashboardProps) {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [usernameForm, setUsernameForm] = useState("");
  const [preferencesForm, setPreferencesForm] = useState({
    language: "en",
    timezone: "UTC",
  });
  const [loading, setLoading] = useState(true);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [error, setError] = useState("");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");

  useEffect(() => {
    const fetchAccount = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${backendUrl}/api/account/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load account");
        }

        setAccount(data);
        const timezone = resolveDisplayTimezone(data.preferences.timezone);
        setCachedTimezone(timezone);
        setUsernameForm(data.user.username || "");
        setPreferencesForm({
          language: data.preferences.language || "en",
          timezone,
        });
      } catch (err: any) {
        setError(err.message || "Failed to load account");
      } finally {
        setLoading(false);
      }
    };

    fetchAccount();
  }, []);

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUsername(true);
    setUsernameMessage("");

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${backendUrl}/api/account/username`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: usernameForm.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update username");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setAccount((prev) =>
        prev ? { ...prev, user: data.user } : prev
      );
      setUsernameForm(data.user.username);
      setUsernameMessage("Username updated successfully");
    } catch (err: any) {
      setUsernameMessage(err.message || "Failed to update username");
    } finally {
      setSavingUsername(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPreferences(true);
    setPreferencesMessage("");

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${backendUrl}/api/account/preferences`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          language: preferencesForm.language,
          timezone: preferencesForm.timezone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update preferences");
      }

      setAccount((prev) =>
        prev ? { ...prev, preferences: data.preferences } : prev
      );
      setCachedTimezone(data.preferences.timezone);
      setPreferencesMessage("Preferences updated successfully");
    } catch (err: any) {
      setPreferencesMessage(err.message || "Failed to update preferences");
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !window.confirm(
        "Permanently delete your account? Your posts and comments will remain but show as \"This account no longer exists\". This cannot be undone."
      )
    ) {
      return;
    }

    setDeletingAccount(true);
    setDeleteMessage("");

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${backendUrl}/api/account`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      setDeletePassword("");
      if (onAccountDeleted) {
        onAccountDeleted();
      } else {
        onLogout();
      }
    } catch (err: unknown) {
      setDeleteMessage(
        err instanceof Error ? err.message : "Failed to delete account"
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading account...</p>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <p className="text-red-500 mb-4">{error || "Unable to load account"}</p>
          <button
            onClick={onLogout}
            className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  const usernameChanged =
    usernameForm.trim() !== account.user.username;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Account</h1>
            <p className="text-gray-600 mt-1">
              Manage your identity and preferences
            </p>
          </div>
          <button
            onClick={onLogout}
            className="self-start sm:self-auto bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>

        {account.user.role === "admin" && (
          <section className="bg-white rounded-xl shadow-sm border border-[#8844ff]/30 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Admin Panel</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage Forum learning, moderation, users, and Theory content.
                </p>
              </div>
              <Link
                href="/admin/learning"
                className="inline-flex justify-center bg-[#8844ff] text-white px-5 py-2 rounded-full font-semibold hover:bg-[#7733ee] transition-colors no-underline"
              >
                Open Admin Panel
              </Link>
            </div>
          </section>
        )}

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
              ID
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Login Identity</h2>
              <p className="text-sm text-gray-500">Sign in with your email and password</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-lg font-medium text-gray-900">{account.user.email}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="text-lg font-medium text-gray-900">
                {formatDateTime(account.user.createdAt, account.preferences.timezone)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Stored as UTC · displayed in {formatTimezoneLabel(account.preferences.timezone)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 md:col-span-2">
              <p className="text-sm text-gray-500">User ID</p>
              <p className="text-sm font-mono text-gray-700 break-all">{account.user.id}</p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold">
              PF
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
              <p className="text-sm text-gray-500">
                Your unique name shown in the forum
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveUsername} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={usernameForm}
                onChange={(e) => setUsernameForm(e.target.value)}
                className="w-full px-4 py-2 border-2 border-black rounded-md text-gray-900"
                placeholder="your_username"
                maxLength={30}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                3–30 characters. Letters, numbers, and underscores only. Must be unique.
              </p>
            </div>

            {usernameMessage && (
              <p
                className={`text-sm ${
                  usernameMessage.includes("success")
                    ? "text-green-600"
                    : "text-red-500"
                }`}
              >
                {usernameMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={savingUsername || !usernameForm.trim() || !usernameChanged}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400"
            >
              {savingUsername ? "Saving..." : "Save Username"}
            </button>
          </form>
        </section>

        <TheoryLearningPreferences
          initialCategoryIds={account?.learningStyleCategoryIds}
        />

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold">
              ⚙
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Preferences</h2>
              <p className="text-sm text-gray-500">Language and timezone settings</p>
            </div>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  value={preferencesForm.language}
                  onChange={(e) =>
                    setPreferencesForm({
                      ...preferencesForm,
                      language: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-black rounded-md text-gray-900"
                >
                  <option value="en">English</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Timezone
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setPreferencesForm((prev) => ({
                        ...prev,
                        timezone: getBrowserTimezone(),
                      }))
                    }
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Use device timezone
                  </button>
                </div>
                <select
                  value={preferencesForm.timezone}
                  onChange={(e) =>
                    setPreferencesForm({
                      ...preferencesForm,
                      timezone: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-black rounded-md text-gray-900"
                >
                  {TIMEZONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  {isValidTimezone(preferencesForm.timezone) &&
                    !TIMEZONE_OPTIONS.some(
                      (opt) => opt.value === preferencesForm.timezone
                    ) && (
                      <option value={preferencesForm.timezone}>
                        {preferencesForm.timezone}
                      </option>
                    )}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Timestamps are stored in UTC and shown in this timezone.
                </p>
              </div>
            </div>

            {preferencesMessage && (
              <p
                className={`text-sm ${
                  preferencesMessage.includes("success")
                    ? "text-green-600"
                    : "text-red-500"
                }`}
              >
                {preferencesMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={savingPreferences}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              {savingPreferences ? "Saving..." : "Save Preferences"}
            </button>
          </form>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-semibold">
              !
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Delete Account</h2>
              <p className="text-sm text-gray-500">
                Permanently remove your login identity and preferences
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-red-50 border border-red-100 p-4 mb-4 text-sm text-red-900 space-y-2">
            <p>When you delete your account:</p>
            <ul className="list-disc list-inside space-y-1 text-red-800">
              <li>Your email, password, and profile are permanently removed</li>
              <li>Your likes on posts and comments are removed</li>
              <li>
                Your community posts and comments stay visible, shown as
                &ldquo;This account no longer exists&rdquo;
              </li>
            </ul>
          </div>

          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm with your password
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-4 py-2 border-2 border-red-200 rounded-md text-gray-900 focus:border-red-400 focus:outline-none"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            {deleteMessage && (
              <p className="text-sm text-red-600">{deleteMessage}</p>
            )}

            <button
              type="submit"
              disabled={deletingAccount || !deletePassword}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400"
            >
              {deletingAccount ? "Deleting..." : "Delete My Account"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
