"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearCachedTimezone } from "../utils/userTimezone";

interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Toggle mobile menu
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Close mobile menu
  const closeMenu = () => {
    setMenuOpen(false);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    clearCachedTimezone();
    setUser(null);
    closeMenu();
    router.push("/");
  };

  // Lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [menuOpen]);

  const isAuthenticated = user !== null;

  return (
    <nav className="flex justify-between items-center bg-black px-4 md:px-16 h-[70px] text-white max-w-full mx-auto relative">
      {/* Logo */}
      <Link href="/" className="flex items-center">
        <span className="text-2xl font-bold text-white">MusicTalks</span>
      </Link>

      {/* Hamburger Menu Button (Mobile) */}
      <div
        className={`md:hidden cursor-pointer p-1 z-[101] ${
          menuOpen ? "menu-open" : ""
        }`}
        onClick={toggleMenu}
      >
        <div
          className={`w-6 h-0.5 bg-white my-1.5 transition-all duration-300 ${
            menuOpen ? "rotate-[-45deg] translate-y-2" : ""
          }`}
        ></div>
        <div
          className={`w-6 h-0.5 bg-white my-1.5 transition-all duration-300 ${
            menuOpen ? "opacity-0" : ""
          }`}
        ></div>
        <div
          className={`w-6 h-0.5 bg-white my-1.5 transition-all duration-300 ${
            menuOpen ? "rotate-45 -translate-y-2" : ""
          }`}
        ></div>
      </div>

      {/* Overlay (Mobile) */}
      {menuOpen && (
        <div
          className="md:hidden fixed top-0 left-0 w-full h-full bg-black/70 z-[99]"
          onClick={closeMenu}
        ></div>
      )}

      {/* Navigation Links */}
      <ul
        className={`flex flex-col md:flex-row list-none md:mr-8 fixed md:static top-0 right-[-100%] md:right-auto w-[70%] md:w-auto h-screen md:h-auto bg-[#111] md:bg-transparent m-0 pt-[70px] md:pt-0 items-center transition-all duration-500 ease-in-out z-[100] ${
          menuOpen ? "right-0" : ""
        }`}
      >
        <li className="py-4 md:py-0 md:px-4 w-full md:w-auto text-center">
          <Link
            href="/"
            onClick={closeMenu}
            className="text-white text-lg md:text-base font-medium transition-colors duration-300 hover:text-gray-300 no-underline"
          >
            Home
          </Link>
        </li>
        <li className="py-4 md:py-0 md:px-4 w-full md:w-auto text-center">
          <Link
            href="/theory"
            onClick={closeMenu}
            className="text-white text-lg md:text-base font-medium transition-colors duration-300 hover:text-gray-300 no-underline"
          >
            Theory
          </Link>
        </li>
        <li className="py-4 md:py-0 md:px-4 w-full md:w-auto text-center">
          <Link
            href="/forum"
            onClick={closeMenu}
            className="text-white text-lg md:text-base font-medium transition-colors duration-300 hover:text-gray-300 no-underline"
          >
            Forum
          </Link>
        </li>
        <li className="py-4 md:py-0 md:px-4 w-full md:w-auto text-center">
          <Link
            href="/account"
            onClick={closeMenu}
            className="text-white text-lg md:text-base font-medium transition-colors duration-300 hover:text-gray-300 no-underline"
          >
            Account
          </Link>
        </li>
        <li className="py-4 md:py-0 md:px-4 w-full md:w-auto text-center">
          <Link
            href="/contact"
            onClick={closeMenu}
            className="text-white text-lg md:text-base font-medium transition-colors duration-300 hover:text-gray-300 no-underline"
          >
            Contact
          </Link>
        </li>
      </ul>

      {/* Auth Section */}
      <div className="flex items-center">
        {isAuthenticated ? (
          <div className="flex items-center gap-4">
            <span className="text-white hidden md:inline">👤 {user?.username}</span>
            <button
              onClick={handleLogout}
              className="bg-[#8844ff] text-white px-5 py-2 rounded-full font-bold border-none cursor-pointer transition-colors duration-300 hover:bg-[#7733ee]"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link
            href="/account"
            className="bg-[#8844ff] text-white px-5 py-2 rounded-full font-bold border-none cursor-pointer transition-colors duration-300 hover:bg-[#7733ee] no-underline"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}