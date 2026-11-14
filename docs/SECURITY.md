# DevKnowledge — Security Policy & Threat Model

## 1. Threat Model & Boundaries

The crawler interacts with external, untrusted network resources. Every external website, HTML document, code example, and URL redirect must be treated as hostile input.

## 2. Server-Side Request Forgery (SSRF) Protection

All outgoing crawler requests pass through the `SafeHTTPClient` / `SSRFValidator`:
1. **Scheme Restriction**: Strictly `http` and `https`. Schemes like `file://`, `gopher://`, `ftp://`, `ldap://` are rejected at parse time.
2. **DNS Resolution Verification**:
   - Hostnames are resolved to IP addresses *before* making the connection.
   - The resolved IP is evaluated against blacklists:
     - Loopback addresses (`127.0.0.0/8`, `::1`)
     - Private network ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
     - Link-local ranges (`169.254.0.0/16`, `fe80::/10`)
     - Cloud provider metadata IP (`169.254.169.254`)
     - Multicast and reserved ranges (`224.0.0.0/4`, `240.0.0.0/4`)
3. **Redirect Protection**: HTTP redirects are not followed blindly. Every redirect location undergoes complete scheme and DNS resolution validation.
4. **DNS Rebinding Defense**: Requests are dispatched directly to the pre-validated IP address with the `Host` header set to the target domain, preventing DNS rebinding between check and fetch.

## 3. Prompt Injection Defense

Documentation pages may contain adversarial instructions attempting to hijack connected AI coding agents:
- Extracted content is stored and processed strictly as data, never as executable code or system instructions.
- AI Knowledge Compilers explicitly delineate raw documentation content inside quoted code/markdown blocks with clear system boundaries.
- No AI model involved in extraction or summarization is given access to credentials, API keys, or administrative tools.

## 4. Tenant Isolation

All resources (`documentation_sources`, `crawl_jobs`, `project_profiles`, `audit_logs`) are strictly bound to an `organization_id`.
All database queries enforce organization scoping.

## 5. Local Runtime Credential Protection

The Rust CLI and local runtime:
- Never write raw access tokens in plain text configuration files.
- Store encrypted credentials or use platform keystores where available.
- Wipe temporary cache on `devknowledge logout`.
