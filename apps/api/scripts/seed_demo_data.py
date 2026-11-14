"""
DevKnowledge Database Seeder
Populates PostgreSQL with authoritative initial documentation sources,
technologies, discovery candidates, crawl jobs, and compiled CKR artifacts.
"""

import asyncio
import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.auth.security import get_password_hash
from apps.api.app.database.models import (
    APISymbolModel,
    CodeExampleModel,
    CrawlJob,
    DiscoveryCandidate,
    DocumentationPage,
    DocumentationSource,
    GeneratedArtifact,
    KnowledgeChunk,
    Organization,
    OrganizationMember,
    PageVersion,
    SourceSnapshot,
    SyncEvent,
    Technology,
    TechnologyRelation,
    User,
)
from apps.api.app.database.session import engine


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


async def seed():
    print("Starting DevKnowledge Database Seeding...")
    async with AsyncSession(engine) as session:
        # 1. Organization & Dev User
        user_res = await session.execute(select(User).where(User.email == "dev@devknowledge.dev"))
        user = user_res.scalar_one_or_none()
        if not user:
            user = User(
                email="dev@devknowledge.dev",
                password_hash=get_password_hash("development_pass_123"),
                display_name="DevKnowledge Architect",
                account_status="active",
            )
            session.add(user)
            await session.flush()

            org = Organization(
                name="Default Dev Org",
                slug="default-dev-org",
                owner_user_id=user.id,
            )
            session.add(org)
            await session.flush()

            member = OrganizationMember(
                organization_id=org.id,
                user_id=user.id,
                role="owner",
            )
            session.add(member)
            await session.flush()
        else:
            org_res = await session.execute(
                select(Organization).join(OrganizationMember).where(OrganizationMember.user_id == user.id)
            )
            org = org_res.scalar_one_or_none()

        print(f"User: {user.email}, Org: {org.name} ({org.id})")

        # 2. Technologies Catalog
        tech_data = [
            ("Rust", "rust", "programming_language", "rust", "A language empowering everyone to build reliable and efficient software.", "https://www.rust-lang.org"),
            ("Python", "python", "programming_language", "python", "Python is a programming language that lets you work quickly and integrate systems effectively.", "https://www.python.org"),
            ("TypeScript", "typescript", "programming_language", "javascript", "TypeScript extends JavaScript by adding types to the language.", "https://www.typescriptlang.org"),
            ("Dart", "dart", "programming_language", "android", "Dart is a client-optimized language for fast apps on any platform.", "https://dart.dev"),
            ("Swift", "swift", "programming_language", "apple", "Swift is a powerful and intuitive programming language for iOS, iPadOS, macOS, tvOS, and watchOS.", "https://developer.apple.com/swift/"),
            ("Kubernetes", "kubernetes", "cloud_service", "cloud", "Automated container orchestration system for deploying, scaling, and managing containerized applications.", "https://kubernetes.io"),
            ("React", "react", "framework", "javascript", "The library for web and native user interfaces.", "https://react.dev"),
            ("FastAPI", "fastapi", "framework", "python", "FastAPI is a modern, fast (high-performance), web framework for building APIs with Python 3.8+.", "https://fastapi.tiangolo.com"),
            ("Tokio", "tokio", "library", "rust", "An asynchronous runtime for the Rust programming language.", "https://tokio.rs"),
            ("Axum", "axum", "framework", "rust", "Ergonomic and modular web framework built with Tokio, Tower, and Hyper.", "https://github.com/tokio-rs/axum"),
            ("PyTorch", "pytorch", "framework", "python", "An open source machine learning framework that accelerates the path from research to deployment.", "https://pytorch.org"),
            ("Flutter", "flutter", "framework", "android", "Flutter transforms the development process. Build, test, and deploy beautiful mobile, web, desktop, and embedded apps from a single codebase.", "https://flutter.dev"),
        ]

        tech_map = {}
        for name, slug, category, ecosystem, desc, url in tech_data:
            existing = await session.execute(select(Technology).where(Technology.slug == slug))
            tech = existing.scalar_one_or_none()
            if not tech:
                tech = Technology(
                    name=name,
                    slug=slug,
                    category=category,
                    ecosystem=ecosystem,
                    description=desc,
                    website_url=url,
                    is_official=True,
                )
                session.add(tech)
                await session.flush()
            tech_map[slug] = tech

        # Hierarchy relations
        relations = [
            ("rust", "tokio", "library"),
            ("rust", "axum", "framework"),
            ("python", "fastapi", "framework"),
            ("python", "pytorch", "framework"),
            ("typescript", "react", "framework"),
            ("dart", "flutter", "framework"),
        ]
        for src_slug, tgt_slug, rel_type in relations:
            src = tech_map[src_slug]
            tgt = tech_map[tgt_slug]
            rel_exists = await session.execute(
                select(TechnologyRelation).where(
                    TechnologyRelation.source_tech_id == src.id,
                    TechnologyRelation.target_tech_id == tgt.id,
                    TechnologyRelation.relation_type == rel_type,
                )
            )
            if not rel_exists.scalar_one_or_none():
                session.add(TechnologyRelation(
                    source_tech_id=src.id,
                    target_tech_id=tgt.id,
                    relation_type=rel_type,
                ))

        await session.flush()
        print(f"Seeded {len(tech_map)} Technologies and relations.")

        # 3. Documentation Sources
        sources_data = [
            {
                "name": "Tokio",
                "root_url": "https://docs.rs/tokio",
                "canonical_domain": "docs.rs",
                "category": "rust",
                "documentation_type": "official",
                "source_version": "1.38.0",
                "doc_count": 284,
                "status": "active",
                "desc": "Asynchronous runtime for Rust with green-thread tasks and non-blocking I/O.",
            },
            {
                "name": "Axum",
                "root_url": "https://docs.rs/axum",
                "canonical_domain": "docs.rs",
                "category": "rust",
                "documentation_type": "official",
                "source_version": "0.7.5",
                "doc_count": 142,
                "status": "active",
                "desc": "Ergonomic web application framework built on top of Tokio, Tower, and Hyper.",
            },
            {
                "name": "FastAPI",
                "root_url": "https://fastapi.tiangolo.com",
                "canonical_domain": "fastapi.tiangolo.com",
                "category": "python",
                "documentation_type": "official",
                "source_version": "0.111.0",
                "doc_count": 195,
                "status": "active",
                "desc": "High performance Python web framework based on Starlette and Pydantic.",
            },
            {
                "name": "Kubernetes",
                "root_url": "https://kubernetes.io/docs/",
                "canonical_domain": "kubernetes.io",
                "category": "cloud",
                "documentation_type": "official",
                "source_version": "1.30.0",
                "doc_count": 420,
                "status": "active",
                "desc": "Production-grade container orchestration documentation from CNCF.",
            },
            {
                "name": "React",
                "root_url": "https://react.dev",
                "canonical_domain": "react.dev",
                "category": "javascript",
                "documentation_type": "official",
                "source_version": "18.3.1",
                "doc_count": 310,
                "status": "active",
                "desc": "Official React documentation covering hooks, components, and server components.",
            },
            {
                "name": "PyTorch",
                "root_url": "https://pytorch.org/docs/stable/",
                "canonical_domain": "pytorch.org",
                "category": "python",
                "documentation_type": "official",
                "source_version": "2.3.0",
                "doc_count": 512,
                "status": "active",
                "desc": "PyTorch deep learning framework tensor and autograd documentation.",
            },
            {
                "name": "Flutter",
                "root_url": "https://docs.flutter.dev",
                "canonical_domain": "docs.flutter.dev",
                "category": "android",
                "documentation_type": "official",
                "source_version": "3.22.0",
                "doc_count": 380,
                "status": "active",
                "desc": "Cross-platform mobile and desktop widget framework documentation.",
            },
            {
                "name": "Swift",
                "root_url": "https://developer.apple.com/documentation/swift",
                "canonical_domain": "developer.apple.com",
                "category": "apple",
                "documentation_type": "official",
                "source_version": "5.10",
                "doc_count": 260,
                "status": "active",
                "desc": "Apple Swift standard library, concurrency, and Foundation APIs.",
            },
        ]

        source_map = {}
        for sdata in sources_data:
            existing = await session.execute(
                select(DocumentationSource).where(
                    DocumentationSource.organization_id == org.id,
                    DocumentationSource.name == sdata["name"],
                )
            )
            src = existing.scalar_one_or_none()
            if not src:
                src = DocumentationSource(
                    organization_id=org.id,
                    name=sdata["name"],
                    root_url=sdata["root_url"],
                    canonical_domain=sdata["canonical_domain"],
                    category=sdata["category"],
                    documentation_type=sdata["documentation_type"],
                    source_version=sdata["source_version"],
                    crawl_config={"max_depth": 5, "allowed_paths": ["/*"], "respect_robots": True},
                    sync_policy={"interval_hours": 6, "mode": "etag_and_sitemap"},
                    status=sdata["status"],
                    last_checked_at=utc_now() - timedelta(minutes=15),
                    last_successful_sync_at=utc_now() - timedelta(hours=1),
                )
                session.add(src)
                await session.flush()
            source_map[sdata["name"]] = src

        print(f"Seeded {len(source_map)} Documentation Sources.")

        # 4. Snapshots & Pages for Sources
        for sname, src in source_map.items():
            # Check snapshot
            snap_res = await session.execute(
                select(SourceSnapshot).where(SourceSnapshot.source_id == src.id)
            )
            snap = snap_res.scalar_one_or_none()
            if not snap:
                snap_hash = hashlib.sha256(f"{src.name}-{src.source_version}".encode()).hexdigest()
                snap = SourceSnapshot(
                    source_id=src.id,
                    version_number=1,
                    snapshot_hash=snap_hash,
                    manifest_location=f"snapshots/{src.id}/manifest.json",
                    status="published",
                    page_count=25,
                    compiler_version="1.0.0",
                    created_at=utc_now() - timedelta(hours=2),
                    published_at=utc_now() - timedelta(hours=2),
                )
                session.add(snap)
                await session.flush()
                src.active_snapshot_id = snap.id

                # Create sample pages
                page_titles = [
                    (f"{sname} Overview & Quickstart", f"{src.root_url}/getting-started", "/getting-started"),
                    (f"{sname} Core API Architecture", f"{src.root_url}/api/core", "/api/core"),
                    (f"{sname} Configuration & Options", f"{src.root_url}/config", "/config"),
                    (f"{sname} Error Handling & Diagnostics", f"{src.root_url}/errors", "/errors"),
                    (f"{sname} Advanced Best Practices", f"{src.root_url}/guides/advanced", "/guides/advanced"),
                ]

                for p_title, p_url, p_path in page_titles:
                    content_text = f"# {p_title}\n\nAuthoritative documentation for {sname} version {src.source_version}.\n\n## Summary\nComprehensive reference guide for production software engineers."
                    c_hash = hashlib.sha256(content_text.encode()).hexdigest()
                    
                    page = DocumentationPage(
                        source_id=src.id,
                        canonical_url=p_url,
                        normalized_path=p_path,
                        title=p_title,
                        content_type="text/markdown",
                        current_content_hash=c_hash,
                        page_status="indexed",
                        last_seen_at=utc_now(),
                    )
                    session.add(page)
                    await session.flush()

                    pv = PageVersion(
                        page_id=page.id,
                        snapshot_id=snap.id,
                        content_hash=c_hash,
                        extracted_content=content_text,
                        structured_content={"title": p_title, "sections": [{"heading": "Summary", "level": 2}]},
                        source_metadata={"authoritative": True, "ecosystem": src.category},
                        extraction_status="success",
                    )
                    session.add(pv)
                    await session.flush()
                    page.current_version_id = pv.id

                    # Chunks
                    chunk = KnowledgeChunk(
                        page_version_id=pv.id,
                        section_path=p_path,
                        content=content_text,
                        content_hash=c_hash,
                        token_count=120,
                        chunk_type="section",
                        metadata_json={"title": p_title, "source": sname},
                    )
                    session.add(chunk)

                    # API Symbol
                    sym = APISymbolModel(
                        page_version_id=pv.id,
                        symbol_name=f"{sname.lower()}::Builder",
                        symbol_type="struct",
                        signature=f"pub struct Builder {{ config: Config }}",
                        description=f"Primary construction type for {sname} services.",
                        language=src.category,
                        version_metadata={"introduced": src.source_version},
                        deprecation_status=False,
                    )
                    session.add(sym)

                    # Code Example
                    ex = CodeExampleModel(
                        page_version_id=pv.id,
                        language=src.category if src.category in ("rust", "python", "javascript") else "text",
                        code=f"// Example initialization for {sname}\nlet client = {sname}::builder().build();",
                        description=f"Basic setup pattern for {sname}.",
                        validation_status="validated",
                    )
                    session.add(ex)

                # Generated CKR Artifacts
                artifacts = [
                    ("llms_txt", f"artifacts/{src.id}/llms.txt", "text/plain"),
                    ("llms_full_txt", f"artifacts/{src.id}/llms-full.txt", "text/plain"),
                    ("skill_md", f"artifacts/{src.id}/SKILL.md", "text/markdown"),
                    ("agents_md", f"artifacts/{src.id}/AGENTS.md", "text/markdown"),
                ]
                for art_type, art_loc, _ in artifacts:
                    art = GeneratedArtifact(
                        source_id=src.id,
                        snapshot_id=snap.id,
                        artifact_type=art_type,
                        artifact_version="1.0.0",
                        storage_location=art_loc,
                        checksum=hashlib.sha256(f"{src.id}-{art_type}".encode()).hexdigest(),
                        generation_status="ready",
                    )
                    session.add(art)

        await session.flush()
        print("Seeded Snapshots, Pages, Chunks, Symbols, Examples, and CKR Artifacts.")

        # 5. Crawl Jobs
        jobs_data = [
            ("Tokio", "incremental_sync", "completed", 1.0, 284, 284, 0, 1, utc_now() - timedelta(minutes=45), utc_now() - timedelta(minutes=40)),
            ("Axum", "incremental_sync", "completed", 1.0, 142, 142, 0, 1, utc_now() - timedelta(hours=2), utc_now() - timedelta(hours=1, minutes=55)),
            ("FastAPI", "full_crawl", "completed", 1.0, 195, 195, 0, 1, utc_now() - timedelta(hours=4), utc_now() - timedelta(hours=3, minutes=50)),
            ("Kubernetes", "incremental_sync", "completed", 1.0, 420, 420, 0, 1, utc_now() - timedelta(hours=5), utc_now() - timedelta(hours=4, minutes=40)),
            ("PyTorch", "full_crawl", "running", 0.68, 512, 348, 2, 1, utc_now() - timedelta(minutes=12), None),
            ("Flutter", "scheduled_sync", "pending", 0.0, 0, 0, 0, 0, utc_now() + timedelta(minutes=30), None),
        ]
        for sname, jtype, jstatus, jprog, jdisc, jproc, jfail, jatt, jstart, jcomp in jobs_data:
            src = source_map.get(sname)
            if not src:
                continue
            job = CrawlJob(
                source_id=src.id,
                job_type=jtype,
                status=jstatus,
                priority=10 if jstatus == "running" else 0,
                progress=jprog,
                pages_discovered=jdisc,
                pages_processed=jproc,
                pages_failed=jfail,
                attempt_count=jatt,
                max_attempts=3,
                scheduled_at=jstart,
                started_at=jstart if jstatus != "pending" else None,
                completed_at=jcomp,
                error_summary="Timeout on secondary mirror" if jfail > 0 else None,
                worker_id="gha-runner-mac-01" if jstatus == "running" else None,
            )
            session.add(job)

        await session.flush()
        print("Seeded Crawl Jobs.")

        # 6. Discovery Candidates
        candidates_data = [
            ("Serde", "https://docs.rs/serde", "docs.rs", "rust", "crates_io", 0.99, "verified_official", "pending_review", "Standard serialization framework for Rust"),
            ("Pydantic", "https://docs.pydantic.dev", "pydantic.dev", "python", "pypi", 0.98, "verified_official", "pending_review", "Data validation library for Python"),
            ("Next.js", "https://nextjs.org/docs", "nextjs.org", "javascript", "npm", 0.99, "verified_official", "approved", "The React framework for the web"),
            ("Deno", "https://deno.land/manual", "deno.land", "javascript", "website_discovery", 0.94, "verified_official", "pending_review", "Secure runtime for JavaScript and TypeScript"),
            ("Tauri", "https://tauri.app/v1/guides", "tauri.app", "rust", "github_api", 0.92, "likely_official", "pending_review", "Framework for building cross-platform apps with web tech"),
            ("Polars", "https://docs.pola.rs", "pola.rs", "python", "pypi", 0.96, "verified_official", "pending_review", "Fast multi-threaded DataFrame library"),
            ("Zod", "https://zod.dev", "zod.dev", "javascript", "npm", 0.97, "verified_official", "pending_review", "TypeScript-first schema validation with static type inference"),
            ("Diesel", "https://diesel.rs/guides", "diesel.rs", "rust", "crates_io", 0.91, "likely_official", "pending_review", "Safe, extensible ORM and Query Builder for Rust"),
        ]
        for cname, curl, cdom, ccat, cprov, cconf, cclass, cverif, creas in candidates_data:
            existing = await session.execute(
                select(DiscoveryCandidate).where(DiscoveryCandidate.candidate_url == curl)
            )
            if not existing.scalar_one_or_none():
                cand = DiscoveryCandidate(
                    candidate_url=curl,
                    canonical_domain=cdom,
                    category=ccat,
                    discovery_provider=cprov,
                    confidence_score=cconf,
                    classification=cclass,
                    verification_status=cverif,
                    evidence={"name": cname, "summary": creas, "automated_checks": ["dns_ok", "tls_ok", "robots_ok"]},
                )
                session.add(cand)

        await session.flush()
        print("Seeded Discovery Candidates.")

        # 7. Sync Events
        for sname, src in list(source_map.items())[:4]:
            evt = SyncEvent(
                source_id=src.id,
                event_type="content_update",
                previous_hash="hash-v1-old",
                new_hash="hash-v2-new",
                classification="content_update",
                status="processed",
                details={"pages_affected": 3, "trigger": "sitemap_change"},
                detected_at=utc_now() - timedelta(hours=1),
                published_at=utc_now() - timedelta(minutes=50),
            )
            session.add(evt)

        await session.commit()
        print("Successfully committed all DevKnowledge seed data to PostgreSQL!")


if __name__ == "__main__":
    asyncio.run(seed())
