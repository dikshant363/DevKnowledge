export type DocumentStatus = "indexed" | "pending" | "failed" | "quarantined" | "deprecated";

export interface SectionBlock {
  id: string;
  heading: string;
  level: number;
  content: string;
  content_hash: string;
}

export interface CodeSnippet {
  language: string;
  code: string;
  description?: string;
  line_count: number;
}

export interface APISymbol {
  name: string;
  symbol_type: "function" | "class" | "interface" | "type" | "enum" | "struct" | "variable";
  signature: string;
  description?: string;
  is_deprecated: boolean;
  deprecation_notice?: string;
}

export interface CanonicalDocument {
  id: string;
  source_id: string;
  canonical_url: string;
  normalized_path: string;
  title: string;
  sections: SectionBlock[];
  code_snippets: CodeSnippet[];
  api_symbols: APISymbol[];
  content_hash: string;
  status: DocumentStatus;
  updated_at: string;
}

export interface SourceInfo {
  id: string;
  name: string;
  root_url: string;
  canonical_domain: string;
  category: string;
  documentation_type: string;
  version?: string;
  active_snapshot_id?: string;
  last_synced_at?: string;
}

export interface SearchResult {
  document_id: string;
  source_id: string;
  title: string;
  canonical_url: string;
  section_heading?: string;
  snippet: string;
  score: number;
  version?: string;
}
