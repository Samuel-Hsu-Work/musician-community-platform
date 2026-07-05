"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const isAuthenticated = user !== null;

  return (
    <div className="min-h-screen w-full bg-[#0a0020] bg-gradient-to-r from-[#0a0020] to-[#1a0040] text-white flex items-center justify-center p-8 overflow-hidden relative">
      <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Text Content */}
        <div className="flex-1 text-left md:pr-8 order-2 md:order-1">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-white">
            {isAuthenticated ? (
              <>
                Welcome back, <br />
                <span className="text-[#93a4ff] text-4xl md:text-5xl">{user?.username}</span> <br />
                to MusicTalks
              </>
            ) : (
              <>
                Explore Your <br />
                Music <br />
                <span className="text-[#93a4ff] text-4xl md:text-5xl">with MusicTalks</span>
              </>
            )}
          </h1>
          <p className="text-lg md:text-xl leading-relaxed mb-10 max-w-md mx-auto md:mx-0">
            Without music, your life will Bb
          </p>
          <div className="flex gap-4 justify-center md:justify-start">
            {isAuthenticated ? (
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/theory"
                  className="px-8 py-3 bg-[#be4bdb] text-white rounded-full font-semibold text-base cursor-pointer transition-all duration-300 hover:bg-[#d170f0] hover:-translate-y-0.5 text-center"
                >
                  Start Learning
                </Link>
                <Link
                  href="/forum"
                  className="px-8 py-3 bg-transparent border-2 border-[#be4bdb] text-white rounded-full font-semibold text-base cursor-pointer transition-all duration-300 hover:bg-[#be4bdb]/20 hover:-translate-y-0.5 text-center"
                >
                  Join Discussion
                </Link>
              </div>
            ) : (
              <Link
                href="/account"
                className="px-8 py-3 bg-[#be4bdb] text-white rounded-full font-semibold text-base cursor-pointer transition-all duration-300 hover:bg-[#d170f0] hover:-translate-y-0.5 text-center"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Card Container - Placeholder for now */}
        <div className="flex-1 flex items-center justify-center order-1 md:order-2 w-full md:w-auto mb-8 md:mb-0">
          <div className="bg-gradient-to-br from-[#be4bdb]/10 to-[#93a4ff]/10 border border-[#be4bdb]/30 rounded-2xl p-8 min-h-[400px] max-h-[600px] backdrop-blur-md shadow-[0_8px_32px_rgba(190,75,219,0.2)] transition-all duration-300 hover:border-[#be4bdb]/50 hover:shadow-[0_12px_40px_rgba(190,75,219,0.3)] hover:-translate-y-0.5 w-full">
            <div className="text-center mb-6">
              <h3 className="text-[#93a4ff] text-2xl font-bold mb-2">🎵 Music Theory Explorer</h3>
              <p className="text-white/80 text-sm">Coming soon: Analyze your favorite songs with AI</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
