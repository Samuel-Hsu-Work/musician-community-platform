"use client";

import { useState, useMemo } from "react";
import { fetchAndCacheUserTimezone } from "../../utils/userTimezone";
import {
  validateLoginForm,
  hasLoginErrors,
  validateLoginFieldsOnBlur,
  isLoginFormValid,
  LOGIN_HINTS,
  type LoginField,
  type LoginFieldErrors,
} from "../../utils/loginValidation";

export default function LoginForm() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const isFormValid = useMemo(() => isLoginFormValid(formData), [formData]);
  const canSubmit =
    isFormValid && !hasLoginErrors(fieldErrors) && !isLoading;

  const inputClass = (field: LoginField) =>
    `w-full px-4 py-2 border-2 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
      fieldErrors[field] ? "border-red-500" : "border-black"
    }`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const errors = validateLoginForm(formData);
    setFieldErrors(errors);
    if (hasLoginErrors(errors)) return;

    setIsLoading(true);

    try {
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        await fetchAndCacheUserTimezone(data.token, backendUrl);
      }

      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const field = e.target.name as LoginField;
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const field = e.target.name as LoginField;
    const blurErrors = validateLoginFieldsOnBlur([field], formData);

    setFieldErrors((prev) => {
      const next = { ...prev };
      if (blurErrors[field]) {
        next[field] = blurErrors[field];
      } else {
        delete next[field];
      }
      return next;
    });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div>
        <input
          name="username"
          value={formData.username}
          onChange={handleChange}
          onBlur={handleBlur}
          className={inputClass("username")}
          type="text"
          placeholder="Username or Email"
          autoComplete="username"
          maxLength={254}
        />
        <p className="text-xs text-gray-500 mt-1">Username or email address</p>
        {fieldErrors.username && (
          <p className="text-red-500 text-sm mt-1">{fieldErrors.username}</p>
        )}
      </div>

      <div>
        <input
          name="password"
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          className={inputClass("password")}
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          maxLength={128}
        />
        <p className="text-xs text-gray-500 mt-1">{LOGIN_HINTS.password}</p>
        {fieldErrors.password && (
          <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>
        )}
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <button
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors duration-200 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        type="submit"
        disabled={!canSubmit}
      >
        {isLoading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
