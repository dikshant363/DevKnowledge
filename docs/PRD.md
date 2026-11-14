# DevKnowledge — Product Requirements Document (PRD)

**Product:** DevKnowledge  
**Category:** Universal AI Developer Knowledge Infrastructure  
**Version:** 1.0 — Architecture Baseline  
**Status:** Approved for implementation  
**Deployment:** Cloud-first  
**Synchronization:** Fully automatic, with validation and safety gates  
**Local Runtime:** macOS, Windows, Linux  
**Initial Infrastructure Budget:** Target ₹0 using free tiers and self-hostable open-source components; paid infrastructure must be optional and explicitly configurable.

---

## 1. Executive Summary

DevKnowledge is a cloud-first, continuously synchronized technical documentation intelligence platform that transforms documentation websites into structured, searchable, version-aware knowledge accessible to AI coding agents and development tools.

Users register documentation sources by submitting their URLs.

DevKnowledge automatically:
1. Discovers documentation pages and website structure.
2. Crawls and extracts technical content.
3. Converts documentation into a canonical knowledge representation (CKR).
4. Organizes knowledge by technology, framework, platform, version, and topic.
5. Generates AI-native formats (llms.txt, llms-full.txt, AGENTS.md, SKILL.md, MCP, CLI).
6. Monitors registered websites for changes.
7. Updates its knowledge database incrementally.
8. Publishes updated knowledge to connected developer tools.
9. Maintains historical snapshots and source provenance.

## 2. Core Value Proposition

`One URL → Complete documentation ingestion → Structured knowledge → Automatic synchronization → Every connected coding agent.`

## 3. Supported Ecosystems & universal Compatibility

Works across all developer ecosystems without hardcoding site adapters:
- Mobile: Android, iOS, React Native, Flutter
- Systems: Rust, C, C++, Go, Zig
- Backend & Languages: Python, Java, Kotlin, Swift, TypeScript, Node.js, Next.js
- Infrastructure: Databases, Cloud, Networking, Security, DevOps
- Developer Tools: Design systems, CLI specifications, API documentation

## 4. Canonical Knowledge Representation (CKR)

Every extracted document conforms to CKR:
- Document ID & Source ID
- Canonical URL & Normalized Path
- Section Hierarchy & Headings
- Content Blocks & Code Examples
- API Signatures & Symbols
- Technology & Framework Tags
- Source Version & Content Fingerprint (SHA-256)
- Publication / Extraction Timestamps
- Provenance Metadata & Quality Status

## 5. Continuous Synchronization & Atomic Publishing

- Detection via Webhooks, Sitemaps, ETags, Last-Modified headers, content hash diffs.
- Safe automated publishing with immutable snapshots and release manifests.
- Quarantine gate for low-confidence extraction or suspicious content.
- Complete rollback capability to previous active snapshot.

## 6. Project-Aware Knowledge Profiles

- Ingest dependency files (`package.json`, `Cargo.toml`, `pyproject.toml`, `pom.xml`, `build.gradle.kts`, `Package.swift`).
- Pin exact dependency versions to prevent coding agents from hallucinating or using incompatible APIs.
- Provide deprecation warnings.
