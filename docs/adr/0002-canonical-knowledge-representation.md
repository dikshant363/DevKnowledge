# ADR 0002: Canonical Knowledge Representation (CKR)

## Status
Accepted

## Context
Documentation comes in dozens of raw formats (HTML, Markdown, OpenAPI, Docusaurus, Sphinx). If search, agents, and compilers each parse raw formats, maintenance becomes untenable and format drift occurs.

## Decision
All extracted documentation is converted into a **Canonical Knowledge Representation (CKR)** before storage or compilation.
The CKR preserves:
- Hierarchical section trees
- Code snippets with explicit language identifiers and line markers
- Extracted API signatures (functions, classes, parameters, return types)
- Deprecation tags and warning callouts
- Exact source URLs and content SHA-256 hashes

All downstream artifacts (`llms.txt`, `AGENTS.md`, `SKILL.md`, Markdown, vector chunks) compile exclusively from CKR.

## Consequences
- Single point of normalization and validation.
- Deterministic, reproducible artifact generation.
- Independent evolution of crawler adapters and output compilers.
