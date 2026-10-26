// Checks that AMO API credentials work by asking AMO which account they belong to.
// Uploads nothing. Reads AMO_API_KEY (JWT issuer) and AMO_API_SECRET (JWT secret) from the environment.
//
//   PowerShell:  $env:AMO_API_KEY = "user:..."; $env:AMO_API_SECRET = "..."; node scripts/check-amo-credentials.mjs

import { createHmac, randomUUID } from "node:crypto";

const key = process.env.AMO_API_KEY?.trim();
const secret = process.env.AMO_API_SECRET?.trim();

if (!key || !secret) {
  console.error("AMO_API_KEY and/or AMO_API_SECRET is empty. Check the secret names in GitHub (or your environment variables).");
  process.exit(1);
}
if (!/^user:\d+:\d+$/.test(key)) {
  console.error(`AMO_API_KEY doesn't look like a JWT issuer ("user:12345678:123"). Did you swap the key and the secret?`);
  process.exit(1);
}

const base64url = (data) => Buffer.from(data).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
const payload = base64url(JSON.stringify({ iss: key, jti: randomUUID(), iat: now, exp: now + 60 }));
const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");

const response = await fetch("https://addons.mozilla.org/api/v5/accounts/profile/", {
  headers: { Authorization: `JWT ${header}.${payload}.${signature}` },
});

// exitCode rather than process.exit(): exiting while fetch is closing its handles crashes Node on Windows.
if (response.ok) {
  const profile = await response.json();
  console.log(`AMO credentials OK: they belong to "${profile.name || profile.username}" (user id ${profile.id}).`);
} else {
  const body = await response.text();
  console.error(`AMO rejected the credentials (HTTP ${response.status}): ${body.slice(0, 300)}`);
  console.error("Regenerate them at https://addons.mozilla.org/developers/addon/api/key/ and update both secrets.");
  process.exitCode = 1;
}
