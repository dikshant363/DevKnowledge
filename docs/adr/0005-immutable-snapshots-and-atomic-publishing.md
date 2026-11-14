# ADR 0005: Immutable Snapshots and Atomic Publishing

## Status
Accepted

## Context
Coding agents must never receive partially indexed or half-updated documentation during a crawl. If a crawl fails midway or an upstream documentation site corrupts its navigation, connected agents could receive broken knowledge.

## Decision
- Every successful crawl/sync produces an **immutable `source_snapshot`**.
- Content publishing is **atomic**: the `active_snapshot_id` pointer is updated only after all pages are parsed, normalized, validated, and compiled into artifacts.
- If extraction fails or triggers quarantine thresholds, the previous active snapshot remains intact.
- Full rollback capability allows instantly reverting to any historical snapshot.

## Consequences
- 100% consistency guarantee for connected coding agents and local runtimes.
- Clear provenance and auditability.
