#!/usr/bin/env node

import {
  constants as fsConstants,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
} from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");
const keysDir = path.join(root, "apps", "api", "keys");
const privateKeyPath = path.join(keysDir, "private.pem");
const publicKeyPath = path.join(keysDir, "public.pem");
const sessionPlaceholder = "replace-with-openssl-rand-hex-32-output";

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

if (!existsSync(envPath)) {
  if (!existsSync(examplePath)) fail(".env.example was not found.");
  copyFileSync(examplePath, envPath, fsConstants.COPYFILE_EXCL);
  console.log("Created .env from .env.example.");
} else {
  console.log("Preserving existing .env values.");
}

let envContents = readFileSync(envPath, "utf8");
const sessionLines = envContents.split(/\r?\n/);
let sessionSecretUpdated = false;
for (let index = sessionLines.length - 1; index >= 0; index -= 1) {
  const match = sessionLines[index].match(/^(\s*SESSION_SECRET\s*=\s*)(.*)$/);
  if (!match) continue;

  const currentValue = match[2]
    .trim()
    .replace(/^(['"])(.*)\1$/, "$2")
    .trim();
  if (
    currentValue === "" ||
    currentValue === sessionPlaceholder ||
    /^(?:changeme|change-me|placeholder|your[-_](?:session[-_]?secret|secret)(?:[-_].*)?)$/i.test(
      currentValue,
    )
  ) {
    sessionLines[index] = `${match[1]}${randomBytes(32).toString("hex")}`;
    sessionSecretUpdated = true;
  }
  break;
}
if (sessionSecretUpdated) {
  envContents = sessionLines.join("\n");
  writeFileSync(envPath, envContents);
  console.log("Generated SESSION_SECRET (32 random bytes, hex encoded).");
} else if (!/^\s*SESSION_SECRET\s*=/m.test(envContents)) {
  const separator =
    envContents.length > 0 && !/[\r\n]$/.test(envContents) ? "\n" : "";
  envContents = `${envContents}${separator}SESSION_SECRET=${randomBytes(32).toString("hex")}\n`;
  writeFileSync(envPath, envContents);
  console.log("Generated SESSION_SECRET (32 random bytes, hex encoded).");
} else {
  console.log("SESSION_SECRET is already configured; preserving it.");
}

mkdirSync(keysDir, { recursive: true });
const hasPrivateKey = existsSync(privateKeyPath);
const hasPublicKey = existsSync(publicKeyPath);

if (!hasPrivateKey && hasPublicKey) {
  fail(
    "apps/api/keys/public.pem exists without private.pem. Bootstrap will not replace an existing key; restore the matching private key or remove the public key and rerun.",
  );
}

if (hasPrivateKey && !hasPublicKey) {
  const publicKey = createPublicKey(readFileSync(privateKeyPath));
  writeFileSync(
    publicKeyPath,
    publicKey.export({ type: "spki", format: "pem" }),
    {
      flag: "wx",
      mode: 0o644,
    },
  );
  console.log(
    "Derived the missing RS256 public key from the existing private key.",
  );
} else if (!hasPrivateKey && !hasPublicKey) {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  writeFileSync(privateKeyPath, privateKey, { flag: "wx", mode: 0o600 });
  writeFileSync(publicKeyPath, publicKey, { flag: "wx", mode: 0o644 });
  console.log("Generated an RS256 keypair in apps/api/keys.");
} else {
  try {
    const derivedPublic = createPublicKey(
      createPrivateKey(readFileSync(privateKeyPath)),
    ).export({ type: "spki", format: "pem" });
    const configuredPublic = createPublicKey(
      readFileSync(publicKeyPath),
    ).export({
      type: "spki",
      format: "pem",
    });
    if (derivedPublic !== configuredPublic)
      fail("Existing RS256 private and public keys do not match.");
  } catch (error) {
    fail(
      `Existing RS256 key files could not be read: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  console.log("RS256 keypair already exists; preserving it.");
}

const optionalSecrets = [
  ["ANTHROPIC_API_KEY", "AI chat and completion features"],
  ["RESEND_API_KEY", "magic-link and other Resend email delivery"],
  ["GITHUB_CLIENT_ID", "GitHub OAuth sign-in"],
  ["GOOGLE_CLIENT_ID", "Google OAuth sign-in"],
  ["GITLAB_CLIENT_ID", "GitLab OAuth sign-in"],
];
const envValues = new Map(
  envContents.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) return [];
    return [
      [
        match[1],
        match[2]
          .trim()
          .replace(/^(['"])(.*)\1$/, "$2")
          .trim(),
      ],
    ];
  }),
);
const unsetSecrets = optionalSecrets.filter(([name]) => !envValues.get(name));

if (unsetSecrets.length > 0) {
  console.log("\nOptional integrations currently disabled:");
  for (const [name, feature] of unsetSecrets) {
    console.log(`  - ${name} is unset: ${feature} will be unavailable.`);
  }
} else {
  console.log("\nAll listed optional integration secrets are configured.");
}

console.log("\nBootstrap complete.");
