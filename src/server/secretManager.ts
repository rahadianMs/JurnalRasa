import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config({ path: [".env.local", ".env"] });

interface SecretCacheItem {
  value: string;
  source: "secret-manager" | "environment";
  expiresAt: number;
}

const secretCache: Map<string, SecretCacheItem> = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL

let secretClient: SecretManagerServiceClient | null = null;
let cachedProjectId: string | null = null;

/**
 * Lazily initialize the Google Cloud Secret Manager client
 */
function getSecretClient(): SecretManagerServiceClient {
  if (!secretClient) {
    secretClient = new SecretManagerServiceClient();
  }
  return secretClient;
}

/**
 * Resolve the current Google Cloud Project ID
 */
export async function getGcpProjectId(): Promise<string | null> {
  if (cachedProjectId) {
    return cachedProjectId;
  }

  // 1. Check standard GCP environment variables
  const envProject =
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.GCLOUD_PROJECT;

  if (envProject && envProject.trim()) {
    cachedProjectId = envProject.trim();
    return cachedProjectId;
  }

  // 2. Query Cloud Run / GCE Metadata server if running in GCP
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const response = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/project/project-id",
      {
        headers: { "Metadata-Flavor": "Google" },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const projectId = (await response.text()).trim();
      if (projectId) {
        cachedProjectId = projectId;
        return cachedProjectId;
      }
    }
  } catch {
    // Metadata server unreachable (normal in local development or preview container)
  }

  return null;
}

/**
 * Securely retrieve an API key or secret.
 * Strategy:
 * 1. Return valid in-memory cached value if available.
 * 2. If USE_SECRET_MANAGER is true or secret is missing from process.env,
 *    attempt retrieval from Google Cloud Secret Manager.
 * 3. Fall back to process.env if Secret Manager is not configured or fails.
 */
export async function getSecret(
  secretName: string,
  fallbackEnvNames: string[] = [secretName]
): Promise<string | undefined> {
  const now = Date.now();
  const cached = secretCache.get(secretName);

  if (cached && cached.expiresAt > now && cached.value) {
    return cached.value;
  }

  const useSecretManagerExplicit =
    process.env.USE_SECRET_MANAGER === "true" ||
    process.env.ENABLE_SECRET_MANAGER === "true";

  // Check process.env first if Secret Manager is not strictly forced
  let envValue: string | undefined;
  for (const envName of fallbackEnvNames) {
    const val = process.env[envName]?.trim();
    if (val) {
      envValue = val;
      break;
    }
  }

  // If we have an env value and Secret Manager is not explicitly forced, use env value
  if (envValue && !useSecretManagerExplicit) {
    secretCache.set(secretName, {
      value: envValue,
      source: "environment",
      expiresAt: now + CACHE_TTL_MS,
    });
    return envValue;
  }

  // Attempt retrieval from Google Cloud Secret Manager
  try {
    const projectId = await getGcpProjectId();
    if (projectId) {
      const client = getSecretClient();
      const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
      
      const [version] = await client.accessSecretVersion({ name });
      const payload = version.payload?.data?.toString();
      
      if (payload && payload.trim()) {
        const secretVal = payload.trim();
        secretCache.set(secretName, {
          value: secretVal,
          source: "secret-manager",
          expiresAt: now + CACHE_TTL_MS,
        });
        console.log(`[SecretManager] Successfully retrieved '${secretName}' from GCP Secret Manager (Project: ${projectId})`);
        return secretVal;
      }
    }
  } catch (err: any) {
    // Safe error log without exposing values
    const errorMsg = err?.message || String(err);
    if (!errorMsg.includes("Could not load the default credentials")) {
      console.warn(`[SecretManager] Note: Could not fetch '${secretName}' from Secret Manager: ${errorMsg}. Using environment fallback.`);
    }
  }

  // Fallback to process.env if Secret Manager was attempted but failed
  if (envValue) {
    secretCache.set(secretName, {
      value: envValue,
      source: "environment",
      expiresAt: now + CACHE_TTL_MS,
    });
    return envValue;
  }

  return undefined;
}

/**
 * Synchronous getter for Gemini API Key from warm cache or process.env
 */
export function getSyncGeminiApiKey(): string | undefined {
  const cached = secretCache.get("GEMINI_API_KEY");
  if (cached?.value) {
    return cached.value;
  }
  return process.env.GEMINI_API_KEY?.trim();
}

/**
 * Asynchronous getter for Gemini API Key
 */
export async function getGeminiApiKey(): Promise<string | undefined> {
  return getSecret("GEMINI_API_KEY", ["GEMINI_API_KEY"]);
}

/**
 * Synchronous getter for Google Maps API Key from warm cache or process.env
 */
export function getSyncGoogleMapsApiKey(): string | undefined {
  const cached = secretCache.get("GOOGLE_MAPS_API_KEY");
  if (cached?.value) {
    return cached.value;
  }
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  );
}

/**
 * Asynchronous getter for Google Maps API Key
 */
export async function getGoogleMapsApiKey(): Promise<string | undefined> {
  return getSecret("GOOGLE_MAPS_API_KEY", [
    "GOOGLE_MAPS_API_KEY",
    "VITE_GOOGLE_MAPS_API_KEY",
  ]);
}

/**
 * Pre-warm secrets on server startup so synchronous handlers have immediate access
 */
export async function warmUpSecrets(): Promise<void> {
  try {
    await Promise.allSettled([
      getGeminiApiKey(),
      getGoogleMapsApiKey(),
    ]);
  } catch (err) {
    console.warn("[SecretManager] Warm-up encountered an issue:", err);
  }
}

/**
 * Safe status reporting for diagnostics (zero secret leaks)
 */
export async function getSecretsStatus(): Promise<{
  gcpProjectId: string | null;
  gemini: { configured: boolean; source: string };
  maps: { configured: boolean; source: string };
}> {
  const projectId = await getGcpProjectId();
  const geminiKey = await getGeminiApiKey();
  const mapsKey = await getGoogleMapsApiKey();

  const geminiSource = secretCache.get("GEMINI_API_KEY")?.source || (process.env.GEMINI_API_KEY ? "environment" : "none");
  const mapsSource = secretCache.get("GOOGLE_MAPS_API_KEY")?.source || (process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY ? "environment" : "none");

  return {
    gcpProjectId: projectId,
    gemini: {
      configured: Boolean(geminiKey),
      source: geminiSource,
    },
    maps: {
      configured: Boolean(mapsKey),
      source: mapsSource,
    },
  };
}
