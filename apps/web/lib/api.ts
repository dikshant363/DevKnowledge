/**
 * DevKnowledge Universal API Client
 * Type-safe interface to the FastAPI Backend and Cloudflare Gateway
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Common API Response Error
export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errData = null;
      try {
        errData = await res.json();
      } catch {
        // non-json response
      }
      throw new ApiError(
        errData?.detail || `HTTP Error ${res.status}: ${res.statusText}`,
        res.status,
        errData
      );
    }
    if (res.status === 204) {
      return {} as T;
    }
    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err?.message || "Failed to connect to DevKnowledge API Gateway", 0);
  }
}

// ----------------------------------------------------------------------
// Interfaces
// ----------------------------------------------------------------------

export interface SourceRecord {
  id: string;
  name: string;
  root_url: string;
  canonical_domain: string;
  category: string;
  documentation_type: string;
  source_version?: string;
  crawl_config: Record<string, any>;
  sync_policy: Record<string, any>;
  status: string;
  active_snapshot_id?: string;
  last_checked_at?: string;
  last_successful_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SourceListResponse {
  items: SourceRecord[];
  total: number;
}

export interface SourceStatusResponse {
  source_id: string;
  status: string;
  active_snapshot_id?: string;
  pages_indexed: number;
  last_checked_at?: string;
  last_successful_sync_at?: string;
  latest_job_id?: string;
  job_progress: number;
}

export interface CrawlJobRecord {
  id: string;
  source_id: string;
  job_type: string;
  status: string;
  priority: number;
  progress: number;
  pages_discovered: number;
  pages_processed: number;
  pages_failed: number;
  attempt_count: number;
  max_attempts: number;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  error_summary?: string;
  worker_id?: string;
}

export interface JobListResponse {
  items: CrawlJobRecord[];
  total: number;
}

export interface DiscoveryCandidateRecord {
  id: string;
  candidate_url: string;
  canonical_domain: string;
  documentation_type: string;
  category: string;
  discovery_provider: string;
  confidence_score: number;
  classification: string;
  verification_status: string;
  evidence: Record<string, any>;
  discovered_at: string;
}

export interface DiscoveryListResponse {
  items: DiscoveryCandidateRecord[];
  total: number;
}

export interface TechnologyRecord {
  id: string;
  name: string;
  slug: string;
  category: string;
  ecosystem: string;
  description?: string;
  website_url?: string;
  is_official: boolean;
}

export interface ArtifactRecord {
  id: string;
  source_id: string;
  snapshot_id: string;
  artifact_type: string;
  artifact_version: string;
  storage_location: string;
  checksum: string;
  generation_status: string;
  created_at: string;
}

export interface SearchResultItem {
  id: string;
  title: string;
  url: string;
  source_name: string;
  source_id: string;
  version: string;
  score: number;
  snippet: string;
  code_snippets: string[];
  canonical_url: string;
}

export interface SearchResponse {
  query: string;
  total_hits: number;
  execution_time_ms: number;
  results: SearchResultItem[];
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
  checks?: {
    database?: { status: string };
    storage?: { status: string; backend?: string };
    cache?: { status: string; backend?: string };
  };
}

export interface QuotaMetricsResponse {
  organization_id: string;
  metrics: {
    sources_registered: number;
    sources_max: number;
    pages_indexed: number;
    pages_max: number;
    active_jobs: number;
    storage_bytes: number;
  };
}

// ----------------------------------------------------------------------
// API Methods
// ----------------------------------------------------------------------

export const api = {
  // Health
  getHealth: () => request<HealthResponse>("/api/v1/health"),
  getReadiness: () => request<{ status: string; database: string }>("/api/v1/ready"),

  // Sources
  listSources: (params?: { category?: string; q?: string; skip?: number; limit?: number }) => {
    const qp = new URLSearchParams();
    if (params?.category) qp.append("category", params.category);
    if (params?.q) qp.append("q", params.q);
    if (params?.skip) qp.append("skip", String(params.skip));
    if (params?.limit) qp.append("limit", String(params.limit));
    return request<SourceListResponse>(`/api/v1/sources?${qp.toString()}`);
  },
  getSource: (id: string) => request<SourceRecord>(`/api/v1/sources/${id}`),
  getSourceStatus: (id: string) => request<SourceStatusResponse>(`/api/v1/sources/${id}/status`),
  createSource: (data: {
    name: string;
    root_url: string;
    category?: string;
    documentation_type?: string;
    source_version?: string;
    crawl_config?: Record<string, any>;
    sync_policy?: Record<string, any>;
  }) =>
    request<SourceRecord>("/api/v1/sources", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteSource: (id: string) =>
    request<void>(`/api/v1/sources/${id}`, { method: "DELETE" }),
  triggerSourceSync: (id: string) =>
    request<{ source_id: string; job_id: string; status: string; message: string }>(
      `/api/v1/sources/${id}/sync`,
      { method: "POST" }
    ),

  // Jobs
  listJobs: (params?: { status?: string; source_id?: string; skip?: number; limit?: number }) => {
    const qp = new URLSearchParams();
    if (params?.status) qp.append("status", params.status);
    if (params?.source_id) qp.append("source_id", params.source_id);
    if (params?.skip) qp.append("skip", String(params.skip));
    if (params?.limit) qp.append("limit", String(params.limit));
    return request<JobListResponse>(`/api/v1/jobs?${qp.toString()}`);
  },
  getJob: (id: string) => request<CrawlJobRecord>(`/api/v1/jobs/${id}`),
  retryJob: (id: string) =>
    request<{ job_id: string; status: string; message: string }>(`/api/v1/jobs/${id}/retry`, {
      method: "POST",
    }),

  // Discovery
  listCandidates: (params?: { status?: string; skip?: number; limit?: number }) => {
    const qp = new URLSearchParams();
    if (params?.status) qp.append("status", params.status);
    if (params?.skip) qp.append("skip", String(params.skip));
    if (params?.limit) qp.append("limit", String(params.limit));
    return request<DiscoveryListResponse>(`/api/v1/discovery/candidates?${qp.toString()}`);
  },
  verifyCandidate: (id: string, action: "approve" | "reject", reason?: string) =>
    request<{ candidate_id: string; status: string }>(
      `/api/v1/discovery/candidates/${id}/verify`,
      {
        method: "POST",
        body: JSON.stringify({ action, reason }),
      }
    ),
  triggerSweep: (provider?: string) =>
    request<{ sweep_id: string; candidates_found: number }>(`/api/v1/discovery/sweep`, {
      method: "POST",
      body: JSON.stringify({ provider: provider || "all" }),
    }),
  listTechnologies: () => request<TechnologyRecord[]>("/api/v1/discovery/technologies"),

  // Search
  search: (query: string, options?: { mode?: "hybrid" | "fts" | "vector"; technology?: string; limit?: number }) =>
    request<SearchResponse>("/api/v1/knowledge/search", {
      method: "POST",
      body: JSON.stringify({
        query,
        mode: options?.mode || "hybrid",
        technology: options?.technology,
        limit: options?.limit || 20,
      }),
    }),

  // Artifacts
  listArtifacts: () => request<ArtifactRecord[]>("/api/v1/compiler/artifacts"),

  // Quotas & Metrics
  getQuotaMetrics: () => request<QuotaMetricsResponse>("/api/v1/quota/metrics"),

  // Project Intelligence
  importManifest: (manifestType: string, content: string) =>
    request<{ project_id: string; detected_dependencies: any[] }>(
      "/api/v1/projects/import-manifest",
      {
        method: "POST",
        body: JSON.stringify({ manifest_type: manifestType, content }),
      }
    ),
};
