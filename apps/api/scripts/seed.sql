-- Seed DevKnowledge Authoritative Knowledge Data

DO $$
DECLARE
    v_user_id VARCHAR := '00000000-0000-0000-0000-000000000001';
    v_org_id VARCHAR := '00000000-0000-0000-0000-000000000002';
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Dev User
    INSERT INTO users (id, email, password_hash, display_name, account_status, created_at, updated_at)
    VALUES (v_user_id, 'dev@devknowledge.dev', '$2b$12$e0X7U9hBqW1z1yv.P7GzNu0B1v8x7x9v1x.x1x1x1x1x1x1x1x1x1', 'DevKnowledge Architect', 'active', v_now, v_now)
    ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name;

    -- 2. Dev Org
    INSERT INTO organizations (id, name, slug, owner_user_id, created_at)
    VALUES (v_org_id, 'Default Dev Org', 'default-dev-org', v_user_id, v_now)
    ON CONFLICT (slug) DO NOTHING;

    -- Ensure member
    INSERT INTO organization_members (id, organization_id, user_id, role, created_at)
    VALUES ('00000000-0000-0000-0000-000000000003', v_org_id, v_user_id, 'owner', v_now)
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    -- 3. Technologies
    INSERT INTO technologies (id, name, slug, category, ecosystem, description, website_url, is_official, created_at, updated_at)
    VALUES
    ('tech-rust', 'Rust', 'rust', 'programming_language', 'rust', 'Empowering everyone to build reliable and efficient software.', 'https://www.rust-lang.org', true, v_now, v_now),
    ('tech-python', 'Python', 'python', 'programming_language', 'python', 'High-level language for rapid application and AI development.', 'https://www.python.org', true, v_now, v_now),
    ('tech-typescript', 'TypeScript', 'typescript', 'programming_language', 'javascript', 'Typed superset of JavaScript that compiles to plain JavaScript.', 'https://www.typescriptlang.org', true, v_now, v_now),
    ('tech-dart', 'Dart', 'dart', 'programming_language', 'android', 'Client-optimized language for fast apps on any platform.', 'https://dart.dev', true, v_now, v_now),
    ('tech-swift', 'Swift', 'swift', 'programming_language', 'apple', 'Intuitive programming language for Apple platforms.', 'https://developer.apple.com/swift/', true, v_now, v_now),
    ('tech-k8s', 'Kubernetes', 'kubernetes', 'cloud_service', 'cloud', 'Automated container orchestration system.', 'https://kubernetes.io', true, v_now, v_now),
    ('tech-react', 'React', 'react', 'framework', 'javascript', 'Library for web and native user interfaces.', 'https://react.dev', true, v_now, v_now),
    ('tech-fastapi', 'FastAPI', 'fastapi', 'framework', 'python', 'Modern high-performance web framework for Python.', 'https://fastapi.tiangolo.com', true, v_now, v_now),
    ('tech-tokio', 'Tokio', 'tokio', 'library', 'rust', 'Asynchronous runtime for the Rust programming language.', 'https://tokio.rs', true, v_now, v_now),
    ('tech-axum', 'Axum', 'axum', 'framework', 'rust', 'Ergonomic and modular web framework built with Tokio.', 'https://github.com/tokio-rs/axum', true, v_now, v_now),
    ('tech-pytorch', 'PyTorch', 'pytorch', 'framework', 'python', 'Deep learning framework for researchers and production.', 'https://pytorch.org', true, v_now, v_now),
    ('tech-flutter', 'Flutter', 'flutter', 'framework', 'android', 'Cross-platform mobile and desktop widget framework.', 'https://flutter.dev', true, v_now, v_now)
    ON CONFLICT (slug) DO NOTHING;

    -- Tech Relations
    INSERT INTO technology_relations (id, source_tech_id, target_tech_id, relation_type, created_at)
    VALUES
    ('rel-1', 'tech-rust', 'tech-tokio', 'library', v_now),
    ('rel-2', 'tech-rust', 'tech-axum', 'framework', v_now),
    ('rel-3', 'tech-python', 'tech-fastapi', 'framework', v_now),
    ('rel-4', 'tech-python', 'tech-pytorch', 'framework', v_now),
    ('rel-5', 'tech-typescript', 'tech-react', 'framework', v_now),
    ('rel-6', 'tech-dart', 'tech-flutter', 'framework', v_now)
    ON CONFLICT DO NOTHING;

    -- 4. Documentation Sources
    INSERT INTO documentation_sources (id, organization_id, name, root_url, canonical_domain, category, documentation_type, source_version, crawl_config, sync_policy, status, active_snapshot_id, last_checked_at, last_successful_sync_at, created_at, updated_at)
    VALUES
    ('src-tokio', v_org_id, 'Tokio', 'https://docs.rs/tokio', 'docs.rs', 'rust', 'official', '1.38.0', '{"max_depth": 5}', '{"interval_hours": 6}', 'active', 'snap-tokio', v_now - INTERVAL '10 minutes', v_now - INTERVAL '1 hour', v_now - INTERVAL '7 days', v_now),
    ('src-axum', v_org_id, 'Axum', 'https://docs.rs/axum', 'docs.rs', 'rust', 'official', '0.7.5', '{"max_depth": 5}', '{"interval_hours": 6}', 'active', 'snap-axum', v_now - INTERVAL '20 minutes', v_now - INTERVAL '2 hours', v_now - INTERVAL '7 days', v_now),
    ('src-fastapi', v_org_id, 'FastAPI', 'https://fastapi.tiangolo.com', 'fastapi.tiangolo.com', 'python', 'official', '0.111.0', '{"max_depth": 5}', '{"interval_hours": 6}', 'active', 'snap-fastapi', v_now - INTERVAL '30 minutes', v_now - INTERVAL '3 hours', v_now - INTERVAL '7 days', v_now),
    ('src-k8s', v_org_id, 'Kubernetes', 'https://kubernetes.io/docs/', 'kubernetes.io', 'cloud', 'official', '1.30.0', '{"max_depth": 5}', '{"interval_hours": 12}', 'active', 'snap-k8s', v_now - INTERVAL '40 minutes', v_now - INTERVAL '4 hours', v_now - INTERVAL '7 days', v_now),
    ('src-react', v_org_id, 'React', 'https://react.dev', 'react.dev', 'javascript', 'official', '18.3.1', '{"max_depth": 5}', '{"interval_hours": 6}', 'active', 'snap-react', v_now - INTERVAL '15 minutes', v_now - INTERVAL '5 hours', v_now - INTERVAL '7 days', v_now),
    ('src-pytorch', v_org_id, 'PyTorch', 'https://pytorch.org/docs/stable/', 'pytorch.org', 'python', 'official', '2.3.0', '{"max_depth": 5}', '{"interval_hours": 12}', 'active', 'snap-pytorch', v_now - INTERVAL '10 minutes', v_now - INTERVAL '6 hours', v_now - INTERVAL '7 days', v_now),
    ('src-flutter', v_org_id, 'Flutter', 'https://docs.flutter.dev', 'docs.flutter.dev', 'android', 'official', '3.22.0', '{"max_depth": 5}', '{"interval_hours": 6}', 'active', 'snap-flutter', v_now - INTERVAL '5 minutes', v_now - INTERVAL '7 hours', v_now - INTERVAL '7 days', v_now),
    ('src-swift', v_org_id, 'Swift', 'https://developer.apple.com/documentation/swift', 'developer.apple.com', 'apple', 'official', '5.10', '{"max_depth": 5}', '{"interval_hours": 24}', 'active', 'snap-swift', v_now - INTERVAL '25 minutes', v_now - INTERVAL '8 hours', v_now - INTERVAL '7 days', v_now)
    ON CONFLICT DO NOTHING;

    -- 5. Source Snapshots
    INSERT INTO source_snapshots (id, source_id, version_number, snapshot_hash, manifest_location, status, page_count, compiler_version, created_at, published_at)
    VALUES
    ('snap-tokio', 'src-tokio', 1, 'sha256:7f4a2b91c8e3100234ab', 'snapshots/src-tokio/manifest.json', 'published', 284, '1.0.0', v_now - INTERVAL '1 hour', v_now - INTERVAL '1 hour'),
    ('snap-axum', 'src-axum', 1, 'sha256:3d1e998a442b9812cc90', 'snapshots/src-axum/manifest.json', 'published', 142, '1.0.0', v_now - INTERVAL '2 hours', v_now - INTERVAL '2 hours'),
    ('snap-fastapi', 'src-fastapi', 1, 'sha256:1a84f50912cb9981ef44', 'snapshots/src-fastapi/manifest.json', 'published', 195, '1.0.0', v_now - INTERVAL '3 hours', v_now - INTERVAL '3 hours'),
    ('snap-k8s', 'src-k8s', 1, 'sha256:9c801ba901ef0021bb55', 'snapshots/src-k8s/manifest.json', 'published', 420, '1.0.0', v_now - INTERVAL '4 hours', v_now - INTERVAL '4 hours'),
    ('snap-react', 'src-react', 1, 'sha256:5e1289ab0123cc88aa11', 'snapshots/src-react/manifest.json', 'published', 310, '1.0.0', v_now - INTERVAL '5 hours', v_now - INTERVAL '5 hours'),
    ('snap-pytorch', 'src-pytorch', 1, 'sha256:4a9088bc0192de33bb22', 'snapshots/src-pytorch/manifest.json', 'published', 512, '1.0.0', v_now - INTERVAL '6 hours', v_now - INTERVAL '6 hours'),
    ('snap-flutter', 'src-flutter', 1, 'sha256:88bc0192de33bb224a90', 'snapshots/src-flutter/manifest.json', 'published', 380, '1.0.0', v_now - INTERVAL '7 hours', v_now - INTERVAL '7 hours'),
    ('snap-swift', 'src-swift', 1, 'sha256:de33bb224a9088bc0192', 'snapshots/src-swift/manifest.json', 'published', 260, '1.0.0', v_now - INTERVAL '8 hours', v_now - INTERVAL '8 hours')
    ON CONFLICT DO NOTHING;

    -- 6. Documentation Pages
    INSERT INTO documentation_pages (id, source_id, canonical_url, normalized_path, title, content_type, current_content_hash, page_status, last_seen_at, created_at, updated_at)
    VALUES
    ('pg-tokio-1', 'src-tokio', 'https://docs.rs/tokio/latest/tokio/', '/', 'Tokio Overview & Crate Root', 'text/markdown', 'hash-tokio-root', 'indexed', v_now, v_now, v_now),
    ('pg-tokio-2', 'src-tokio', 'https://docs.rs/tokio/latest/tokio/task/', '/task', 'Tokio Asynchronous Task Scheduling', 'text/markdown', 'hash-tokio-task', 'indexed', v_now, v_now, v_now),
    ('pg-tokio-3', 'src-tokio', 'https://docs.rs/tokio/latest/tokio/sync/', '/sync', 'Tokio Concurrency Primitives & Channels', 'text/markdown', 'hash-tokio-sync', 'indexed', v_now, v_now, v_now),
    ('pg-fastapi-1', 'src-fastapi', 'https://fastapi.tiangolo.com/', '/', 'FastAPI Framework Tutorial', 'text/markdown', 'hash-fastapi-root', 'indexed', v_now, v_now, v_now),
    ('pg-fastapi-2', 'src-fastapi', 'https://fastapi.tiangolo.com/tutorial/dependencies/', '/tutorial/dependencies', 'FastAPI Dependency Injection System', 'text/markdown', 'hash-fastapi-dep', 'indexed', v_now, v_now, v_now),
    ('pg-react-1', 'src-react', 'https://react.dev/reference/react', '/reference/react', 'React Built-in Hooks & Components', 'text/markdown', 'hash-react-hooks', 'indexed', v_now, v_now, v_now),
    ('pg-k8s-1', 'src-k8s', 'https://kubernetes.io/docs/concepts/overview/', '/concepts/overview', 'Kubernetes Architecture & Control Plane', 'text/markdown', 'hash-k8s-arch', 'indexed', v_now, v_now, v_now)
    ON CONFLICT DO NOTHING;

    -- 7. Crawl Jobs
    INSERT INTO crawl_jobs (id, source_id, job_type, status, priority, progress, pages_discovered, pages_processed, pages_failed, attempt_count, max_attempts, scheduled_at, started_at, completed_at, error_summary, worker_id)
    VALUES
    ('job-1', 'src-tokio', 'incremental_sync', 'completed', 0, 1.0, 284, 284, 0, 1, 3, v_now - INTERVAL '45 minutes', v_now - INTERVAL '45 minutes', v_now - INTERVAL '40 minutes', NULL, 'runner-01'),
    ('job-2', 'src-axum', 'incremental_sync', 'completed', 0, 1.0, 142, 142, 0, 1, 3, v_now - INTERVAL '2 hours', v_now - INTERVAL '2 hours', v_now - INTERVAL '1 hour 55 minutes', NULL, 'runner-01'),
    ('job-3', 'src-fastapi', 'full_crawl', 'completed', 0, 1.0, 195, 195, 0, 1, 3, v_now - INTERVAL '3 hours', v_now - INTERVAL '3 hours', v_now - INTERVAL '2 hours 50 minutes', NULL, 'runner-02'),
    ('job-4', 'src-k8s', 'incremental_sync', 'completed', 0, 1.0, 420, 420, 0, 1, 3, v_now - INTERVAL '4 hours', v_now - INTERVAL '4 hours', v_now - INTERVAL '3 hours 40 minutes', NULL, 'runner-01'),
    ('job-5', 'src-pytorch', 'full_crawl', 'running', 10, 0.68, 512, 348, 2, 1, 3, v_now - INTERVAL '15 minutes', v_now - INTERVAL '15 minutes', NULL, 'Timeout on mirror chunk #42', 'gha-runner-mac-01'),
    ('job-6', 'src-flutter', 'scheduled_sync', 'pending', 0, 0.0, 0, 0, 0, 0, 3, v_now + INTERVAL '30 minutes', NULL, NULL, NULL, NULL)
    ON CONFLICT DO NOTHING;

    -- 8. Discovery Candidates
    INSERT INTO discovery_candidates (id, candidate_url, canonical_domain, documentation_type, category, discovery_provider, confidence_score, classification, verification_status, evidence, discovered_at)
    VALUES
    ('cand-1', 'https://docs.rs/serde', 'docs.rs', 'api_reference', 'rust', 'crates_io', 0.99, 'verified_official', 'pending_review', '{"name": "Serde", "summary": "Serialization framework for Rust"}', v_now - INTERVAL '1 hour'),
    ('cand-2', 'https://docs.pydantic.dev', 'pydantic.dev', 'official_docs', 'python', 'pypi', 0.98, 'verified_official', 'pending_review', '{"name": "Pydantic", "summary": "Data validation using Python type annotations"}', v_now - INTERVAL '2 hours'),
    ('cand-3', 'https://nextjs.org/docs', 'nextjs.org', 'official_docs', 'javascript', 'npm', 0.99, 'verified_official', 'approved', '{"name": "Next.js", "summary": "The React framework for the Web"}', v_now - INTERVAL '3 hours'),
    ('cand-4', 'https://deno.land/manual', 'deno.land', 'official_docs', 'javascript', 'website_discovery', 0.94, 'verified_official', 'pending_review', '{"name": "Deno", "summary": "Modern secure runtime for TS/JS"}', v_now - INTERVAL '4 hours'),
    ('cand-5', 'https://tauri.app/v1/guides', 'tauri.app', 'guide', 'rust', 'github_api', 0.92, 'likely_official', 'pending_review', '{"name": "Tauri", "summary": "Fast lightweight native desktop apps with web frontends"}', v_now - INTERVAL '5 hours'),
    ('cand-6', 'https://docs.pola.rs', 'pola.rs', 'api_reference', 'python', 'pypi', 0.96, 'verified_official', 'pending_review', '{"name": "Polars", "summary": "Lightning-fast DataFrame library"}', v_now - INTERVAL '6 hours'),
    ('cand-7', 'https://zod.dev', 'zod.dev', 'official_docs', 'javascript', 'npm', 0.97, 'verified_official', 'pending_review', '{"name": "Zod", "summary": "TypeScript-first schema validation"}', v_now - INTERVAL '7 hours'),
    ('cand-8', 'https://diesel.rs/guides', 'diesel.rs', 'guide', 'rust', 'crates_io', 0.91, 'likely_official', 'pending_review', '{"name": "Diesel", "summary": "Safe extensible ORM and Query Builder for Rust"}', v_now - INTERVAL '8 hours')
    ON CONFLICT DO NOTHING;

    -- 9. Generated Artifacts
    INSERT INTO generated_artifacts (id, source_id, snapshot_id, artifact_type, artifact_version, storage_location, checksum, generation_status, created_at)
    VALUES
    ('art-1', 'src-tokio', 'snap-tokio', 'llms_txt', '1.0.0', 'artifacts/src-tokio/llms.txt', 'sha256:tokio-llms-txt', 'ready', v_now - INTERVAL '1 hour'),
    ('art-2', 'src-tokio', 'snap-tokio', 'llms_full_txt', '1.0.0', 'artifacts/src-tokio/llms-full.txt', 'sha256:tokio-llms-full', 'ready', v_now - INTERVAL '1 hour'),
    ('art-3', 'src-tokio', 'snap-tokio', 'skill_md', '1.0.0', 'artifacts/src-tokio/SKILL.md', 'sha256:tokio-skill', 'ready', v_now - INTERVAL '1 hour'),
    ('art-4', 'src-tokio', 'snap-tokio', 'agents_md', '1.0.0', 'artifacts/src-tokio/AGENTS.md', 'sha256:tokio-agents', 'ready', v_now - INTERVAL '1 hour'),
    ('art-5', 'src-fastapi', 'snap-fastapi', 'llms_txt', '1.0.0', 'artifacts/src-fastapi/llms.txt', 'sha256:fastapi-llms', 'ready', v_now - INTERVAL '3 hours'),
    ('art-6', 'src-fastapi', 'snap-fastapi', 'llms_full_txt', '1.0.0', 'artifacts/src-fastapi/llms-full.txt', 'sha256:fastapi-llms-full', 'ready', v_now - INTERVAL '3 hours'),
    ('art-7', 'src-react', 'snap-react', 'llms_txt', '1.0.0', 'artifacts/src-react/llms.txt', 'sha256:react-llms', 'ready', v_now - INTERVAL '5 hours'),
    ('art-8', 'src-k8s', 'snap-k8s', 'agents_md', '1.0.0', 'artifacts/src-k8s/AGENTS.md', 'sha256:k8s-agents', 'ready', v_now - INTERVAL '4 hours')
    ON CONFLICT DO NOTHING;

    -- 10. Sync Events
    INSERT INTO sync_events (id, source_id, event_type, previous_hash, new_hash, classification, status, details, detected_at, published_at)
    VALUES
    ('evt-1', 'src-tokio', 'content_update', 'sha256:tokio-old', 'sha256:tokio-new', 'content_update', 'processed', '{"pages_affected": 2, "trigger": "sitemap"}', v_now - INTERVAL '1 hour', v_now - INTERVAL '50 minutes'),
    ('evt-2', 'src-fastapi', 'version_bump', '0.110.0', '0.111.0', 'version_bump', 'processed', '{"release_tag": "0.111.0", "pypi_release": true}', v_now - INTERVAL '3 hours', v_now - INTERVAL '2 hours 55 minutes'),
    ('evt-3', 'src-react', 'content_update', 'sha256:react-old', 'sha256:react-new', 'content_update', 'processed', '{"pages_affected": 1}', v_now - INTERVAL '5 hours', v_now - INTERVAL '4 hours 50 minutes')
    ON CONFLICT DO NOTHING;

END $$;
