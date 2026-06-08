import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;

type NotificationRow = {
  id: string;
  tenant_id: string;
  recipient_user_id: string;
  type: string;
  data: JsonRecord;
  source_table: string;
  source_id: string;
};

type PushTokenRow = {
  id: string;
  token: string;
  platform: string;
  app_id: string;
};

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

type PushPayload = {
  title: string;
  body: string;
  data: Record<string, string>;
};

type DeliveryResult = {
  tokenCount: number;
  successCount: number;
  failureCount: number;
  lastError: string | null;
};

const corsHeaders = {
  "content-type": "application/json",
};

const fcmScope = "https://www.googleapis.com/auth/firebase.messaging";
const oauthTokenUrl = "https://oauth2.googleapis.com/token";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const expectedSecret = Deno.env.get("PUSH_DISPATCH_SECRET")?.trim();
  const actualSecret = req.headers.get("x-push-dispatch-secret")?.trim();
  if (!expectedSecret || actualSecret !== expectedSecret) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase service credentials are missing." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let notificationId: string | null = null;
  try {
    const body = await req.json();
    notificationId = typeof body.notification_id === "string" ? body.notification_id.trim() : null;
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  if (!notificationId) {
    return jsonResponse({ error: "notification_id is required." }, 400);
  }

  const notification = await loadNotification(supabase, notificationId);
  if (!notification) {
    return jsonResponse({ error: "Notification not found." }, 404);
  }

  const tokens = await loadEnabledTokens(supabase, notification);
  if (tokens.length === 0) {
    await insertDeliveryLog(supabase, notification, {
      tokenCount: 0,
      successCount: 0,
      failureCount: 0,
      lastError: null,
    });
    return jsonResponse({ ok: true, tokenCount: 0, successCount: 0, failureCount: 0 });
  }

  const serviceAccount = parseFirebaseServiceAccount();
  if (!serviceAccount) {
    const lastError = "FIREBASE_SERVICE_ACCOUNT_JSON is missing or invalid.";
    await insertDeliveryLog(supabase, notification, {
      tokenCount: tokens.length,
      successCount: 0,
      failureCount: tokens.length,
      lastError,
    });
    return jsonResponse({ error: lastError }, 500);
  }

  const pushPayload = buildPushPayload(notification);
  if (!pushPayload) {
    const lastError = `Unsupported notification type: ${notification.type}`;
    await insertDeliveryLog(supabase, notification, {
      tokenCount: tokens.length,
      successCount: 0,
      failureCount: tokens.length,
      lastError,
    });
    return jsonResponse({ error: lastError }, 422);
  }

  let accessToken: string;
  try {
    accessToken = await getFirebaseAccessToken(serviceAccount);
  } catch (error) {
    const lastError = errorMessage(error);
    await insertDeliveryLog(supabase, notification, {
      tokenCount: tokens.length,
      successCount: 0,
      failureCount: tokens.length,
      lastError,
    });
    return jsonResponse({ error: lastError }, 500);
  }

  let successCount = 0;
  let failureCount = 0;
  let lastError: string | null = null;
  const attemptResults: Array<{
    token: PushTokenRow;
    success: boolean;
    errorMessage: string | null;
    errorCode: string | null;
    disabledToken: boolean;
  }> = [];

  for (const tokenRow of tokens) {
    try {
      await sendFirebaseMessage({
        accessToken,
        projectId: serviceAccount.project_id,
        token: tokenRow.token,
        payload: pushPayload,
      });
      successCount += 1;
      attemptResults.push({
        token: tokenRow,
        success: true,
        errorMessage: null,
        errorCode: null,
        disabledToken: false,
      });
    } catch (error) {
      const message = errorMessage(error);
      const errorCode = getPushProviderErrorCode(message);
      const shouldDisable = shouldDisableTokenForError(message);

      failureCount += 1;
      lastError = message;

      if (shouldDisable) {
        await disablePushToken(supabase, tokenRow.id);
      }

      attemptResults.push({
        token: tokenRow,
        success: false,
        errorMessage: message,
        errorCode,
        disabledToken: shouldDisable,
      });
    }
  }

  const deliveryLog = await insertDeliveryLog(supabase, notification, {
    tokenCount: tokens.length,
    successCount,
    failureCount,
    lastError,
  });

  await insertDeliveryAttempts(supabase, notification, deliveryLog?.id ?? null, attemptResults);

  return jsonResponse({
    ok: failureCount === 0,
    tokenCount: tokens.length,
    successCount,
    failureCount,
    lastError,
  });
});

async function loadNotification(
  supabase: ReturnType<typeof createClient>,
  notificationId: string,
): Promise<NotificationRow | null> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,tenant_id,recipient_user_id,type,data,source_table,source_id")
    .eq("id", notificationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load notification: ${error.message}`);
  }

  return data as NotificationRow | null;
}

async function loadEnabledTokens(
  supabase: ReturnType<typeof createClient>,
  notification: NotificationRow,
): Promise<PushTokenRow[]> {
  const { data, error } = await supabase
    .from("push_notification_tokens")
    .select("id,token,platform,app_id")
    .eq("tenant_id", notification.tenant_id)
    .eq("user_id", notification.recipient_user_id)
    .eq("enabled", true)
    .order("last_seen_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load push tokens: ${error.message}`);
  }

  return (data ?? []) as PushTokenRow[];
}

function buildPushPayload(notification: NotificationRow): PushPayload | null {
  if (notification.type !== "coach_feedback") {
    return null;
  }

  const programTitle = stringValue(notification.data.program_title);
  const sessionTitle = stringValue(notification.data.session_title);
  const title = "코치 피드백이 도착했어요";
  const body = sessionTitle
    ? `${programTitle} · ${sessionTitle} 코치 피드백을 확인해 보세요.`
    : `${programTitle} 프로그램의 코치 피드백을 확인해 보세요.`;

  return {
    title,
    body,
    data: {
      notification_id: notification.id,
      notification_type: notification.type,
      source_table: notification.source_table,
      source_id: notification.source_id,
      review_id: stringValue(notification.data.review_id),
      program_id: stringValue(notification.data.program_id),
      session_id: stringValue(notification.data.session_id),
    },
  };
}

async function insertDeliveryLog(
  supabase: ReturnType<typeof createClient>,
  notification: NotificationRow,
  result: DeliveryResult,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("push_notification_delivery_logs")
    .insert({
      notification_id: notification.id,
      tenant_id: notification.tenant_id,
      recipient_user_id: notification.recipient_user_id,
      notification_type: notification.type,
      token_count: result.tokenCount,
      success_count: result.successCount,
      failure_count: result.failureCount,
      last_error: result.lastError?.slice(0, 1000) ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to insert push notification delivery log", error);
    return null;
  }

  return data as { id: string } | null;
}

async function insertDeliveryAttempts(
  supabase: ReturnType<typeof createClient>,
  notification: NotificationRow,
  deliveryLogId: string | null,
  attempts: Array<{
    token: PushTokenRow;
    success: boolean;
    errorMessage: string | null;
    errorCode: string | null;
    disabledToken: boolean;
  }>,
) {
  if (attempts.length === 0) {
    return;
  }

  const { error } = await supabase.from("push_notification_delivery_attempts").insert(
    attempts.map((attempt) => ({
      delivery_log_id: deliveryLogId,
      notification_id: notification.id,
      push_token_id: attempt.token.id,
      tenant_id: notification.tenant_id,
      recipient_user_id: notification.recipient_user_id,
      notification_type: notification.type,
      platform: attempt.token.platform,
      app_id: attempt.token.app_id,
      token_prefix: `${attempt.token.token.slice(0, 24)}...`,
      success: attempt.success,
      error_code: attempt.errorCode,
      error_message: attempt.errorMessage?.slice(0, 1000) ?? null,
      disabled_token: attempt.disabledToken,
    })),
  );

  if (error) {
    console.error("Failed to insert push notification delivery attempts", error);
  }
}

async function disablePushToken(supabase: ReturnType<typeof createClient>, tokenId: string) {
  const { error } = await supabase.from("push_notification_tokens").update({ enabled: false }).eq("id", tokenId);

  if (error) {
    console.error("Failed to disable invalid push token", error);
  }
}

function parseFirebaseServiceAccount(): FirebaseServiceAccount | null {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<FirebaseServiceAccount>;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      return null;
    }
    return {
      project_id: parsed.project_id,
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    };
  } catch {
    return null;
  }
}

async function getFirebaseAccessToken(serviceAccount: FirebaseServiceAccount): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 3600;
  const assertion = await createJwtAssertion(serviceAccount, issuedAt, expiresAt);
  const response = await fetch(oauthTokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Firebase access token: ${await response.text()}`);
  }

  const json = await response.json();
  if (typeof json.access_token !== "string") {
    throw new Error("Firebase access token response is invalid.");
  }

  return json.access_token;
}

async function createJwtAssertion(
  serviceAccount: FirebaseServiceAccount,
  issuedAt: number,
  expiresAt: number,
): Promise<string> {
  const header = base64UrlEncodeJson({ alg: "RS256", typ: "JWT" });
  const payload = base64UrlEncodeJson({
    iss: serviceAccount.client_email,
    scope: fcmScope,
    aud: oauthTokenUrl,
    iat: issuedAt,
    exp: expiresAt,
  });
  const unsignedToken = `${header}.${payload}`;
  const privateKey = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(unsignedToken),
  );
  return `${unsignedToken}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;
}

async function importPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
  const normalizedPem = privateKeyPem.replace(/\\n/g, "\n");
  const pemBody = normalizedPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = Uint8Array.from(atob(pemBody), (char) => char.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    binary,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
}

async function sendFirebaseMessage(args: {
  accessToken: string;
  projectId: string;
  token: string;
  payload: PushPayload;
}) {
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${args.projectId}/messages:send`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${args.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token: args.token,
        notification: {
          title: args.payload.title,
          body: args.payload.body,
        },
        data: args.payload.data,
        apns: {
          payload: {
            aps: {
              sound: "default",
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`FCM send failed: ${response.status} ${await response.text()}`);
  }
}

function shouldDisableTokenForError(message: string) {
  return [
    "BadDeviceToken",
    "BadEnvironmentKeyInToken",
    "UNREGISTERED",
    "registration-token-not-registered",
    "Requested entity was not found",
  ].some((needle) => message.includes(needle));
}

function getPushProviderErrorCode(message: string): string | null {
  for (const code of [
    "BadDeviceToken",
    "BadEnvironmentKeyInToken",
    "UNREGISTERED",
    "THIRD_PARTY_AUTH_ERROR",
    "INVALID_ARGUMENT",
    "SENDER_ID_MISMATCH",
  ]) {
    if (message.includes(code)) {
      return code;
    }
  }

  return null;
}

function base64UrlEncodeJson(value: JsonRecord): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function jsonResponse(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}
