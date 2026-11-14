from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.auth.security import get_current_user_and_org
from apps.api.app.database.session import get_db
from apps.api.app.projects.schemas import (
    DependencyImportRequest,
    DependencyItem,
    ProjectCreate,
    ProjectKnowledgeResponse,
    ProjectResponse,
)
from apps.api.app.projects.service import ProjectService

router = APIRouter(prefix="/projects", tags=["Project Intelligence"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    project = await ProjectService.create_project(db, org.id, data)
    return project


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    projects = await ProjectService.list_projects(db, org.id)
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    project = await ProjectService.get_project(db, org.id, project_id)
    return project


@router.post(
    "/{project_id}/dependencies/import",
    response_model=List[DependencyItem],
    status_code=status.HTTP_201_CREATED,
)
async def import_dependencies(
    project_id: str,
    req: DependencyImportRequest,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    imported = await ProjectService.import_dependencies(db, org.id, project_id, req)
    return [DependencyItem.model_validate(d) for d in imported]


@router.get("/{project_id}/knowledge", response_model=ProjectKnowledgeResponse)
async def get_project_knowledge(
    project_id: str,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    knowledge = await ProjectService.get_project_knowledge(db, org.id, project_id)
    return knowledge
