# DevKnowledge — Deployment Guide

## 1. Zero-Cost / Self-Hostable Baseline

DevKnowledge is designed to run completely on free-tier infrastructure and self-hostable open-source components:
- **Compute**: Single VPS (Hetzner, DigitalOcean, Oracle Cloud Free Tier) or Docker on personal hardware.
- **Database**: PostgreSQL 16+ with `pgvector` extension.
- **Queue**: Redis 7+.
- **Object Storage**: Local file system directory or MinIO / Cloudflare R2 free tier.

## 2. Docker Compose Deployment

### Quickstart
```bash
# 1. Clone repository
git clone https://github.com/devknowledge/devknowledge.git
cd devknowledge

# 2. Copy environment variables
cp .env.example .env

# 3. Build and launch services
docker compose up -d --build

# 4. Check status
docker compose ps
```

The web console is accessible at `http://localhost:3000`.
The API Gateway is accessible at `http://localhost:8000/docs` (OpenAPI Swagger UI).

## 3. Production Hardening Checklist
- Configure SSL/TLS using Caddy or Nginx reverse proxy.
- Set strong random values for `SECRET_KEY` and database passwords.
- Configure daily database backups with WAL archiving.
- Restrict internal docker network egress for crawler worker sandbox.
