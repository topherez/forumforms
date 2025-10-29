// Thin wrapper around the Whop SDK client
// If the environment variable is not present, calls will fail at runtime.
// Adjust initialization as needed per SDK updates.

// Importing this way to be resilient to SDK naming changes.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sdkModule = require("@whop/sdk");

// Prefer Whop client class if exported, otherwise fall back to factory if present
const WhopClient = sdkModule.Whop || sdkModule.Client || sdkModule.default;

if (!WhopClient) {
  throw new Error("@whop/sdk not found or unsupported export shape.");
}

// Some SDKs accept request headers for contextual auth in iframe; pass-through if supported
export function getWhopSdk() {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    throw new Error("WHOP_API_KEY is not set in environment.");
  }
  const appId = process.env.WHOP_APP_ID || process.env.NEXT_PUBLIC_WHOP_APP_ID;
  if (!appId) {
    throw new Error("WHOP_APP_ID (or NEXT_PUBLIC_WHOP_APP_ID) is not set.");
  }

  try {
    // Try common constructor styles
    // eslint-disable-next-line new-cap
    const client = new WhopClient({ apiKey, appID: appId });
    return client;
  } catch {
    // Fallback: some SDKs expose a factory
    if (typeof sdkModule.createClient === "function") {
      return sdkModule.createClient({ apiKey, appID: appId });
    }
    throw new Error("Unable to initialize @whop/sdk client.");
  }
}


