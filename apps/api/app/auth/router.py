import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.auth.schemas import (
    AuthResponse,
    LoginRequest,
    OrganizationResponse,
    RegisterRequest,
    UserResponse,
)
from apps.api.app.auth.security import (
    create_access_token,
    get_current_user_and_org,
    get_password_hash,
    verify_password,
)
from apps.api.app.config import get_settings
from apps.api.app.database.models import Organization, OrganizationMember, User
from apps.api.app.database.session import get_db

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Authentication"])


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text or "org"


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    existing = await db.execute(select(User).where(User.email == req.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists",
        )

    user = User(
        email=req.email.lower(),
        password_hash=get_password_hash(req.password),
        display_name=req.display_name,
        account_status="active",
    )
    db.add(user)
    await db.flush()

    org_name = req.organization_name or f"{req.display_name}'s Org"
    slug_base = slugify(org_name)
    slug = f"{slug_base}-{uuid.uuid4().hex[:6]}"

    org = Organization(
        name=org_name,
        slug=slug,
        owner_user_id=user.id,
    )
    db.add(org)
    await db.flush()

    member = OrganizationMember(
        organization_id=org.id,
        user_id=user.id,
        role="owner",
    )
    db.add(member)
    await db.commit()

    token = create_access_token({"sub": user.id, "org_id": org.id})

    return AuthResponse(
        access_token=token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            account_status=user.account_status,
        ),
        organization=OrganizationResponse(
            id=org.id,
            name=org.name,
            slug=org.slug,
            role="owner",
        ),
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email.lower()))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Get primary organization
    mem_result = await db.execute(
        select(OrganizationMember, Organization)
        .join(Organization, OrganizationMember.organization_id == Organization.id)
        .where(OrganizationMember.user_id == user.id)
    )
    row = mem_result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User has no associated organization",
        )

    member, org = row
    token = create_access_token({"sub": user.id, "org_id": org.id})

    return AuthResponse(
        access_token=token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            account_status=user.account_status,
        ),
        organization=OrganizationResponse(
            id=org.id,
            name=org.name,
            slug=org.slug,
            role=member.role,
        ),
    )


@router.get("/me")
async def get_me(user_org=Depends(get_current_user_and_org)):
    user, org, role = user_org
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "account_status": user.account_status,
        },
        "organization": {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "role": role,
        },
    }
