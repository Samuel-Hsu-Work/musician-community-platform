"use client";

import { useState, useMemo } from "react";
import { fetchAndCacheUserTimezone } from "../../utils/userTimezone";
import { getBrowserTimezone } from "../../utils/timezone";
import {
  validateRegisterForm,
  hasRegisterErrors,
  validateRegisterFieldsOnBlur,
  isRegisterFormValid,
  type RegisterField,
  type RegisterFieldErrors,
  REGISTER_HINTS,
} from "../../utils/registerValidation";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    );
  }

  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  );
}

interface PasswordFieldProps {
  name: RegisterField;
  value: string;
  placeholder: string;
  autoComplete: string;
  visible: boolean;
  onToggleVisible: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  hasError: boolean;
}

function PasswordField({
  name,
  value,
  placeholder,
  autoComplete,
  visible,
  onToggleVisible,
  onChange,
  onBlur,
  hasError,
}: PasswordFieldProps) {
  return (
    <div className="relative">
      <input
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`w-full px-4 py-2 pr-11 border-2 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          hasError ? "border-red-500" : "border-black"
        }`}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={128}
      />
      <button
        type="button"
        onClick={onToggleVisible}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  );
}

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const isFormValid = useMemo(() => isRegisterFormValid(formData), [formData]);
  const canSubmit =
    isFormValid && !hasRegisterErrors(fieldErrors) && !isLoading;

  const inputClass = (field: RegisterField) =>
    `w-full px-4 py-2 border-2 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
      fieldErrors[field] ? "border-red-500" : "border-black"
    }`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const errors = validateRegisterForm(formData);
    setFieldErrors(errors);
    if (hasRegisterErrors(errors)) return;

    setIsLoading(true);

    try {
      const response = await fetch(`${backendUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          timezone: getBrowserTimezone(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.field === "username" || data.field === "email") {
          setFieldErrors((prev) => ({
            ...prev,
            [data.field]: data.error || "Already in use",
          }));
          return;
        }
        throw new Error(data.error || "Registration failed");
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        await fetchAndCacheUserTimezone(data.token, backendUrl);
      }

      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as RegisterField;

    setFormData((prev) => ({ ...prev, [field]: value }));

    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }

    if (
      (field === "password" || field === "confirmPassword") &&
      fieldErrors.confirmPassword
    ) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.confirmPassword;
        return next;
      });
    }
  };

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const field = e.target.name as RegisterField;
    const fieldsToValidate: RegisterField[] = [field];

    if (field === "password" && formData.confirmPassword) {
      fieldsToValidate.push("confirmPassword");
    }

    const blurErrors = validateRegisterFieldsOnBlur(fieldsToValidate, formData);

    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const f of fieldsToValidate) {
        if (blurErrors[f]) {
          next[f] = blurErrors[f];
        } else {
          delete next[f];
        }
      }
      return next;
    });

    if (blurErrors[field]) return;

    if (field === "username" || field === "email") {
      try {
        const payload =
          field === "username"
            ? { username: formData.username.trim() }
            : { email: formData.email.trim().toLowerCase() };

        const response = await fetch(
          `${backendUrl}/api/auth/check-availability`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        const data = await response.json();
        if (!response.ok) return;

        const check = field === "username" ? data.username : data.email;
        if (check && !check.available && check.error) {
          setFieldErrors((prev) => ({ ...prev, [field]: check.error }));
        }
      } catch {
        // Availability check is best-effort on blur; register API validates again
      }
    }
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
          placeholder="Username"
          autoComplete="username"
          maxLength={30}
        />
        <p className="text-xs text-gray-500 mt-1">
          {REGISTER_HINTS.username}
        </p>
        {fieldErrors.username && (
          <p className="text-red-500 text-sm mt-1">{fieldErrors.username}</p>
        )}
      </div>

      <div>
        <input
          name="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          className={inputClass("email")}
          type="email"
          placeholder="Email (e.g. name@example.com)"
          autoComplete="email"
          maxLength={254}
          inputMode="email"
        />
        {fieldErrors.email && (
          <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
        )}
      </div>

      <div>
        <PasswordField
          name="password"
          value={formData.password}
          placeholder="Password"
          autoComplete="new-password"
          visible={showPassword}
          onToggleVisible={() => setShowPassword((v) => !v)}
          onChange={handleChange}
          onBlur={handleBlur}
          hasError={!!fieldErrors.password}
        />
        <p className="text-xs text-gray-500 mt-1">{REGISTER_HINTS.password}</p>
        {fieldErrors.password && (
          <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>
        )}
      </div>

      <div>
        <PasswordField
          name="confirmPassword"
          value={formData.confirmPassword}
          placeholder="Confirm password"
          autoComplete="new-password"
          visible={showConfirmPassword}
          onToggleVisible={() => setShowConfirmPassword((v) => !v)}
          onChange={handleChange}
          onBlur={handleBlur}
          hasError={!!fieldErrors.confirmPassword}
        />
        {fieldErrors.confirmPassword && (
          <p className="text-red-500 text-sm mt-1">
            {fieldErrors.confirmPassword}
          </p>
        )}
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <button
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors duration-200 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        type="submit"
        disabled={!canSubmit}
      >
        {isLoading ? "Registering..." : "Register"}
      </button>
    </form>
  );
}
