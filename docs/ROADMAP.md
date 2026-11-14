# DevKnowledge — Milestone Implementation Roadmap

| Milestone | Title | Status | Scope |
|---|---|---|---|
| **M0** | **Engineering Foundation** | **Completed** | Monorepo setup, CI baseline, 5 ADRs, Database setup, Threat model, Rust & Python workspaces |
| **M1** | **Documentation Registry** | **Completed** | URL registration, auth/RBAC, categorization, crawl configuration, tenant isolation |
| **M2** | **Universal Crawler** | **Completed** | SSRF-safe crawler, sitemap parser, framework adapters (Docusaurus, MkDocs, Sphinx, Generic), link discovery |
| **M3** | **Canonical Knowledge Compiler** | **Completed** | CKR normalization, llms.txt, llms-full.txt, AGENTS.md, SKILL.md, immutable release snapshots |
| **M4** | **Automatic Synchronization** | **Completed** | Change detector, hash diffing, sync audit trail, atomic publishing, rollback capability |
| **M5** | **Search & Knowledge Retrieval** | **Completed** | Full-text search, hybrid relevance ranking, provenance citations, tenant boundary enforcement |
| **M6** | **MCP Integration** | **Completed** | Model Context Protocol server (10 read-only tools, resource templates, stdio client test) |
| **M7** | **Local Runtime & CLI** | **Completed** | Cross-platform Rust CLI (`devknowledge`), SQLite offline cache, status, doctor, login/logout |
| **M8** | **Project Intelligence** | **Completed** | Dependency parser (package.json, Cargo.toml, pyproject.toml), version pinning, compatibility warnings |
| **M9** | **Production Release** | **Completed** | Prometheus metrics endpoint, backup & restore verification, full E2E system sign-off |
