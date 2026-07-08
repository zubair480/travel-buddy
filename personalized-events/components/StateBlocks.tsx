export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

export function LoadingState({ label = "Loading local picks..." }: { label?: string }) {
  return <div className="loading">{label}</div>;
}

export function ErrorState({ label = "Something went wrong. Try refreshing." }: { label?: string }) {
  return <div className="error">{label}</div>;
}
