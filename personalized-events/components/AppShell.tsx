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
          <span className="brand-lockup">
            <strong>SF Buddy</strong>
            <span className="brand-kicker">San Francisco plans with taste</span>
          </span>
        </Link>
        <nav className="nav" aria-label="Primary">
          <Link href="/discover">Discover</Link>
          <Link href="/saved">Saved</Link>
          <Link href="/planner">Planner</Link>
          <Link href="/preferences">Setup</Link>
        </nav>
        <div className="session-nav">
          {status === "authenticated" ? (
            <>
              <span className="session-user">{user?.displayName || user?.email}</span>
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
