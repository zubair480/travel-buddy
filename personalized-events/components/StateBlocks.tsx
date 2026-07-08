import type React from "react";

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading local picks..." }: { label?: string }) {
  return <div className="loading">{label}</div>;
}

export function ErrorState({ label = "Something went wrong. Try refreshing.", action }: { label?: string; action?: React.ReactNode }) {
  return (
    <div className="error">
      <p>{label}</p>
      {action}
    </div>
  );
}
