import path from "node:path";

export function getConfig(rootDir) {
  return {
    appName: "Signal SF",
    port: Number(process.env.PORT ?? 4180),
    databasePath: process.env.DATABASE_PATH ?? path.join(rootDir, "data", "signal-sf.db"),
    adminIngestToken: process.env.ADMIN_INGEST_TOKEN ?? "dev-admin-token",
    sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? 30),
    cookieName: "signal_sf_session",
  };
}
