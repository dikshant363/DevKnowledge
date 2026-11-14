export interface Env {
  ENVIRONMENT: string;
  GITHUB_REPOSITORY: string;
  API_ORIGIN?: string;
  NEON_DATABASE_URL?: string;
  GITHUB_TOKEN?: string;
  RUNNER_API_KEY?: string;
}

// In-memory sliding window rate limiter (free-tier request safeguard)
const ipRequestWindow = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(clientIp: string, limit: number = 60, windowSeconds: number = 60): boolean {
  const now = Date.now();
  const entry = ipRequestWindow.get(clientIp);

  if (!entry || now > entry.resetAt) {
    ipRequestWindow.set(clientIp, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

export default {
  /**
   * Cloudflare Cron Trigger handler.
   * Invoked automatically every 15 minutes via cron trigger.
   * Dispatches crawler execution to GitHub Actions runner to ensure ₹0 operating cost.
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[Cron Trigger] Scheduled event triggered at ${new Date(event.scheduledTime).toISOString()}`);

    if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY) {
      console.warn("[Cron Trigger] GITHUB_TOKEN or GITHUB_REPOSITORY not configured. Skipping automated dispatch.");
      return;
    }

    try {
      const url = `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/dispatches`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
          "User-Agent": "DevKnowledge-Cloudflare-Worker/1.0",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: "devknowledge-crawl",
          client_payload: {
            triggered_by: "cloudflare_cron_trigger",
            scheduled_time: event.scheduledTime,
          },
        }),
      });

      if (response.ok || response.status === 204) {
        console.log(`[Cron Trigger] Successfully dispatched crawl runner to GitHub Actions: ${env.GITHUB_REPOSITORY}`);
      } else {
        const errorText = await response.text();
        console.error(`[Cron Trigger] Failed to dispatch workflow (${response.status}): ${errorText}`);
      }
    } catch (err) {
      console.error("[Cron Trigger] Error during GitHub Actions dispatch:", err);
    }
  },

  /**
   * HTTP Request handler for Cloudflare Worker API Gateway.
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const clientIp = request.headers.get("cf-connecting-ip") || "anonymous";

    // 1. Rate Limiting Check
    if (!checkRateLimit(clientIp, 120, 60)) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Safeguard active to prevent free-tier exhaustion.",
          retry_after_seconds: 60,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "60" },
        }
      );
    }

    // 2. Health Endpoint
    if (url.pathname === "/health" || url.pathname === "/api/v1/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          gateway: "cloudflare-workers",
          environment: env.ENVIRONMENT || "production",
          operating_cost_target: "₹0/month (Free Tier Protected)",
          safeguards: {
            max_cpu_ms: 50,
            rate_limited: true,
            cron_enabled: true,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Manual Dispatch Endpoint (Protected by RUNNER_API_KEY)
    if (url.pathname === "/api/v1/sync/dispatch" && request.method === "POST") {
      const authHeader = request.headers.get("Authorization");
      const runnerHeader = request.headers.get("X-Runner-Key");
      const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const providedKey = runnerHeader || bearerToken;

      if (env.RUNNER_API_KEY && providedKey !== env.RUNNER_API_KEY) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: valid RUNNER_API_KEY required for sync dispatch" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY) {
        return new Response(
          JSON.stringify({ error: "GITHUB_TOKEN or GITHUB_REPOSITORY not configured" }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      }

      const dispatchUrl = `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/dispatches`;
      const res = await fetch(dispatchUrl, {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
          "User-Agent": "DevKnowledge-Cloudflare-Worker/1.0",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: "devknowledge-crawl",
          client_payload: { triggered_by: "manual_api_dispatch" },
        }),
      });

      if (res.ok || res.status === 204) {
        return new Response(
          JSON.stringify({ status: "dispatched", target: env.GITHUB_REPOSITORY }),
          { status: 202, headers: { "Content-Type": "application/json" } }
        );
      }

      const errText = await res.text();
      return new Response(
        JSON.stringify({ error: "Dispatch failed", details: errText }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Reverse Proxy to FastAPI API Origin (if configured)
    if (env.API_ORIGIN) {
      const targetUrl = new URL(url.pathname + url.search, env.API_ORIGIN);
      const headers = new Headers(request.headers);
      headers.set("X-Forwarded-Host", url.host);
      headers.set("X-Forwarded-For", clientIp);

      try {
        const originResponse = await fetch(targetUrl.toString(), {
          method: request.method,
          headers: headers,
          body: request.body,
          redirect: "follow",
        });

        const responseHeaders = new Headers(originResponse.headers);
        responseHeaders.set("X-Served-By", "DevKnowledge-Cloudflare-Edge");

        return new Response(originResponse.body, {
          status: originResponse.status,
          headers: responseHeaders,
        });
      } catch (err: any) {
        return new Response(
          JSON.stringify({
            error: "Failed to connect to API origin",
            origin: env.API_ORIGIN,
            message: err.message,
          }),
          { status: 504, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        message: "DevKnowledge Cloudflare Gateway active",
        available_endpoints: ["/health", "/api/v1/health", "/api/v1/sync/dispatch"],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  },
};
