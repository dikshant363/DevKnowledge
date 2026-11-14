# ADR 0003: SSRF-Hardened Crawler Pipeline

## Status
Accepted

## Context
Allowing users to register arbitrary documentation URLs opens severe Server-Side Request Forgery (SSRF) and local network enumeration attack vectors. Naive URL validation is insufficient due to DNS rebinding, IP literal encodings, and malicious redirects.

## Decision
All crawler and sync requests must execute through the `SafeHTTPClient`:
1. DNS pre-flight check resolves target domain to IPv4/IPv6 addresses.
2. Checks ensure the target is not in loopback (`127.0.0.0/8`, `::1`), private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`, `fe80::/10`), or cloud metadata endpoints (`169.254.169.254`).
3. HTTP redirects are intercepted and re-validated before following.
4. Requests connect directly to the verified IP with proper `Host` headers to prevent Time-of-Check to Time-of-Use (TOCTOU) DNS rebinding attacks.

## Consequences
- Guaranteed defense against internal cloud and local network probing.
- Safe execution in any hosting environment.
