# ADR 0004: Rust Local Runtime and CLI

## Status
Accepted

## Context
Developers and coding agents need offline, zero-latency access to technical documentation on macOS, Windows, and Linux. Distributing a heavy Python or Node.js environment locally creates version conflicts, runtime bloat, and cross-platform installation failures.

## Decision
Build the local runtime and CLI in **Rust**:
- Single static binary `devknowledge`.
- Embedded SQLite cache (`rusqlite`) for offline search and storage.
- Embedded local Model Context Protocol (MCP) server.
- Cross-platform support for macOS (arm64, x86_64), Linux, and Windows.

## Consequences
- Single binary installation with zero external runtime dependencies.
- Sub-millisecond local search queries.
- High memory efficiency and safety.
