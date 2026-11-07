// Kopiert nur die Zahlungs-Webhooks und ihre Hilfsdateien in diesen Ordner.
// Der Webhook-Host veröffentlicht dadurch keine Shop-, Admin- oder Kassen-Route.
import { mkdir, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const hier = dirname(fileURLToPath(import.meta.url));
const repo = join(hier, "../..");

const dateien = [
  ["api/stripe-webhook.js", "lib/stripe-webhook.js"],
  ["api/gocardless-webhook.js", "lib/gocardless-webhook.js"],
  ["api/_activate-membership.js", "lib/_activate-membership.js"],
  ["api/_shopify-order.js", "lib/_shopify-order.js"],
  ["api/_teile-bestellung.js", "lib/_teile-bestellung.js"],
  ["api/_intern.js", "lib/_intern.js"],
  ["api/membership-email.js", "lib/membership-email.js"],
  ["shared/empfehlung.js", "shared/empfehlung.js"],
  ["shared/zahlungs-isolation.js", "shared/zahlungs-isolation.js"],
  ["shared/mitgliedspreise.js", "shared/mitgliedspreise.js"],
  ["shared/produktabo.js", "shared/produktabo.js"],
  ["shared/abo-kategorien.js", "shared/abo-kategorien.js"],
  ["shared/teileboerse-schalter.js", "shared/teileboerse-schalter.js"],
];

for (const [von, nach] of dateien) {
  const ziel = join(hier, nach);
  await mkdir(dirname(ziel), { recursive: true });
  await copyFile(join(repo, von), ziel);
}
