from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

import bcrypt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.config import get_settings
from apps.api.app.database.models import Organization, OrganizationMember, User
from apps.api.app.database.session import get_db

settings = get_settings()
security_bearer = HTTPBearer(auto_error=False)

ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        return bcrypt.checkpw(pw_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_user_and_org(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> Tuple[User, Organization, str]:
    """
    Validates bearer token or falls back to default tenant in development mode.
    Returns (user, organization, role).
    """
    if credentials:
        token = credentials.credentials
        payload = decode_access_token(token)
        if not payload or "sub" not in payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = payload["sub"]
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        # Fetch primary organization membership
        mem_result = await db.execute(
            select(OrganizationMember, Organization)
            .join(Organization, OrganizationMember.organization_id == Organization.id)
            .where(OrganizationMember.user_id == user.id)
        )
        membership_row = mem_result.first()
        if not membership_row:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="No organization membership found"
            )

        member, org = membership_row
        return user, org, member.role

    # Development fallback tenant if enabled in development mode
    if settings.ENVIRONMENT == "development":
        # Look up or create default development user and organization
        result = await db.execute(select(User).where(User.email == "dev@devknowledge.dev"))
        dev_user = result.scalar_one_or_none()
        if not dev_user:
            dev_user = User(
                email="dev@devknowledge.dev",
                password_hash=get_password_hash("development_pass_123"),
                display_name="Developer",
                account_status="active",
            )
            db.add(dev_user)
            await db.flush()

            dev_org = Organization(
                name="Default Dev Org",
                slug="default-dev-org",
                owner_user_id=dev_user.id,
            )
            db.add(dev_org)
            await db.flush()

            member = OrganizationMember(
                organization_id=dev_org.id,
                user_id=dev_user.id,
                role="owner",
            )
            db.add(member)
            await db.commit()
            return dev_user, dev_org, "owner"
        else:
            mem_result = await db.execute(
                select(OrganizationMember, Organization)
                .join(Organization, OrganizationMember.organization_id == Organization.id)
                .where(OrganizationMember.user_id == dev_user.id)
            )
            membership_row = mem_result.first()
            if membership_row:
                member, org = membership_row
                return dev_user, org, member.role

            dev_org = Organization(
                name="Default Dev Org",
                slug=f"default-dev-org-{dev_user.id[:6]}",
                owner_user_id=dev_user.id,
            )
            db.add(dev_org)
            await db.flush()

            member = OrganizationMember(
                organization_id=dev_org.id,
                user_id=dev_user.id,
                role="owner",
            )
            db.add(member)
            await db.commit()
            return dev_user, dev_org, "owner"

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )
