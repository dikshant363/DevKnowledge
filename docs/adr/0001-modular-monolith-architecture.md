# ADR 0001: Modular Monolith Architecture

## Status
Accepted

## Context
DevKnowledge must handle website discovery, crawling, extraction, knowledge compilation, search, synchronization, and agent distribution. Microservices introduce premature complexity, distributed transaction failure modes, and operational overhead conflicting with the ₹0 initial infrastructure budget.

## Decision
We adopt a **modular monolith** with independent background workers:
- `apps/api`: FastAPI handles API requests, authentication, and search queries.
- `apps/worker`: ARQ/Redis workers handle asynchronous crawling, parsing, and sync tasks.
- Shared domain models and canonical schemas prevent duplication.
- Scale-out is achieved by scaling worker containers independently of the API Gateway.

## Consequences
- Fast local development with minimal moving parts.
- Strong transactional guarantees within PostgreSQL.
- Easy transition to partitioned worker clusters as load grows.
