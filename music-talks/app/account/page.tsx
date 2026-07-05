"use client";

import { useState, useEffect } from "react";

import LoginForm from "../components/account/loginForm";
import RegisterForm from "../components/account/registerForm";
import AccountDashboard from "../components/account/accountDashboard";
import { clearCachedTimezone } from "../utils/userTimezone";

export default function Account() {
  const [isLogin, setIsLogin] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    setIsAuthenticated(Boolean(storedUser && storedToken));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    clearCachedTimezone();
    setIsAuthenticated(false);
  };

  if (isAuthenticated) {
    return <AccountDashboard onLogout={handleLogout} onAccountDeleted={handleLogout} />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-10 px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setIsLogin(true)}
            className={`px-4 py-2 font-medium transition-colors duration-200 ${
              isLogin
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`px-4 py-2 font-medium transition-colors duration-200 ${
              !isLogin
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Register
          </button>
        </div>

        {isLogin ? <LoginForm /> : <RegisterForm />}
      </div>
    </div>
  );
}
