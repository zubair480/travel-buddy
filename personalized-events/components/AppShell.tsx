import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
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
      </header>
      <main className="page">{children}</main>
    </div>
  );
}
