from typing import List, Tuple, Optional, Dict, Any
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from apps.api.app.database.models import (
    ProjectProfile,
    ProjectDependency,
    DocumentationSource,
)
from apps.api.app.projects.parsers import DependencyManifestParser
from apps.api.app.projects.schemas import (
    ProjectCreate,
    ProjectUpdate,
    DependencyImportRequest,
    ProjectKnowledgeResponse,
    DependencyItem,
    VersionWarning,
)


class ProjectService:
    @staticmethod
    async def create_project(
        db: AsyncSession,
        org_id: str,
        data: ProjectCreate,
    ) -> ProjectProfile:
        project = ProjectProfile(
            organization_id=org_id,
            name=data.name,
            description=data.description,
            configuration=data.configuration or {},
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project

    @staticmethod
    async def list_projects(
        db: AsyncSession,
        org_id: str,
    ) -> List[ProjectProfile]:
        res = await db.execute(
            select(ProjectProfile)
            .where(ProjectProfile.organization_id == org_id)
            .order_by(ProjectProfile.created_at.desc())
        )
        return list(res.scalars().all())

    @staticmethod
    async def get_project(
        db: AsyncSession,
        org_id: str,
        project_id: str,
    ) -> ProjectProfile:
        res = await db.execute(
            select(ProjectProfile).where(
                and_(
                    ProjectProfile.id == project_id,
                    ProjectProfile.organization_id == org_id,
                )
            )
        )
        proj = res.scalar_one_or_none()
        if not proj:
            raise HTTPException(status_code=404, detail="Project profile not found")
        return proj

    @staticmethod
    async def import_dependencies(
        db: AsyncSession,
        org_id: str,
        project_id: str,
        req: DependencyImportRequest,
    ) -> List[ProjectDependency]:
        project = await ProjectService.get_project(db, org_id, project_id)

        parsed_deps = DependencyManifestParser.parse_any(req.filename, req.content)
        if not parsed_deps:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported or empty manifest file: '{req.filename}'",
            )

        # Look up existing documentation sources in the org to resolve attachments
        src_res = await db.execute(
            select(DocumentationSource).where(DocumentationSource.organization_id == org_id)
        )
        available_sources = list(src_res.scalars().all())

        imported: List[ProjectDependency] = []
        for d in parsed_deps:
            # Attempt to match package name with documentation source name or domain
            matching_source = None
            for s in available_sources:
                if d.package_name.lower() in s.name.lower() or d.package_name.lower() in s.canonical_domain.lower():
                    matching_source = s
                    break

            dep = ProjectDependency(
                project_profile_id=project.id,
                ecosystem=d.ecosystem,
                package_name=d.package_name,
                version_constraint=d.version_constraint,
                resolved_version=matching_source.source_version if matching_source else None,
                documentation_source_id=matching_source.id if matching_source else None,
            )
            db.add(dep)
            imported.append(dep)

        await db.commit()
        return imported

    @staticmethod
    async def get_project_knowledge(
        db: AsyncSession,
        org_id: str,
        project_id: str,
    ) -> ProjectKnowledgeResponse:
        project = await ProjectService.get_project(db, org_id, project_id)

        # Fetch dependencies
        dep_res = await db.execute(
            select(ProjectDependency).where(ProjectDependency.project_profile_id == project.id)
        )
        deps = list(dep_res.scalars().all())

        # Fetch attached sources
        source_ids = [d.documentation_source_id for d in deps if d.documentation_source_id]
        attached_sources_map: Dict[str, DocumentationSource] = {}
        if source_ids:
            src_res = await db.execute(
                select(DocumentationSource).where(DocumentationSource.id.in_(source_ids))
            )
            for s in src_res.scalars().all():
                attached_sources_map[s.id] = s

        warnings: List[VersionWarning] = []
        attached_sources_data = []

        for d in deps:
            if not d.documentation_source_id or d.documentation_source_id not in attached_sources_map:
                warnings.append(
                    VersionWarning(
                        package_name=d.package_name,
                        declared_version=d.version_constraint,
                        warning_type="missing_documentation",
                        message=f"No documentation source is registered for package '{d.package_name}' ({d.ecosystem}). AI coding agents may hallucinate APIs.",
                    )
                )
            else:
                source = attached_sources_map[d.documentation_source_id]
                attached_sources_data.append({
                    "id": source.id,
                    "name": source.name,
                    "root_url": source.root_url,
                    "version": source.source_version,
                    "active_snapshot_id": source.active_snapshot_id,
                })

                # Check version compatibility
                if source.source_version and d.version_constraint != "*":
                    if not source.source_version.startswith(d.version_constraint.replace("^", "").replace("~", "").split(".")[0]):
                        warnings.append(
                            VersionWarning(
                                package_name=d.package_name,
                                declared_version=d.version_constraint,
                                source_name=source.name,
                                available_version=source.source_version,
                                warning_type="version_mismatch",
                                message=f"Version mismatch: Project pins '{d.version_constraint}', but attached docs are version '{source.source_version}'. APIs may differ.",
                            )
                        )

        return ProjectKnowledgeResponse(
            project_id=project.id,
            project_name=project.name,
            dependencies=[
                DependencyItem(
                    id=d.id,
                    ecosystem=d.ecosystem,
                    package_name=d.package_name,
                    version_constraint=d.version_constraint,
                    resolved_version=d.resolved_version,
                    documentation_source_id=d.documentation_source_id,
                )
                for d in deps
            ],
            attached_sources=attached_sources_data,
            version_warnings=warnings,
        )
