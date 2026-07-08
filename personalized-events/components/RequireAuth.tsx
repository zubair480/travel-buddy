"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { LoadingState } from "@/components/StateBlocks";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return <LoadingState label="Checking your session..." />;
  }

  if (status === "anonymous") {
    return (
      <section className="empty auth-gate">
        <p className="eyebrow">Sign in required</p>
        <h1>Pick up your SF plan where you left off.</h1>
        <p>Sign in or create an account so your profile, saved events, and itinerary stay synced with the backend.</p>
        <div className="actions">
          <Link className="button" href="/auth">
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
