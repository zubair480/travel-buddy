import { ingestSourceRecords } from "./ingestion.js";
import { fetchSourceEvents, listSourceProviders } from "./sourceIntegrations.js";

export async function syncConfiguredSourcesAtStartup(config) {
  const providers = listSourceProviders(config)
    .filter((provider) => provider.configured)
    .map((provider) => provider.id);

  if (!providers.length) {
    console.log("Startup source sync skipped: no providers configured.");
    return;
  }

  try {
    const sourceEvents = await fetchSourceEvents({ config, providers });
    const imported = ingestSourceRecords(sourceEvents.records);
    console.log(
      `Startup source sync complete: providers=${providers.join(",")} fetched=${sourceEvents.records.length} imported=${imported.length}`,
    );
  } catch (error) {
    console.warn(`Startup source sync failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
