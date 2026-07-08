"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status, user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/auth");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark" />
          <span>Fogline</span>
        </Link>
        <nav className="nav" aria-label="Primary">
          <Link href="/discover">Discover</Link>
          <Link href="/saved">Saved</Link>
          <Link href="/planner">Planner</Link>
          <Link href="/preferences">Preferences</Link>
        </nav>
        <div className="session-nav">
          {status === "authenticated" ? (
            <>
              <span>{user?.displayName || user?.email}</span>
              <button className="link-button" type="button" onClick={handleLogout} disabled={isLoggingOut}>
                {isLoggingOut ? "Signing out..." : "Logout"}
              </button>
            </>
          ) : status === "loading" ? (
            <span>Checking session...</span>
          ) : (
            <Link className="button secondary compact" href="/auth">
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main className="page">{children}</main>
    </div>
  );
}
