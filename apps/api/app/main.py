from contextlib import asynccontextmanager

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware

from apps.api.app.auth.router import router as auth_router
from apps.api.app.compiler.router import router as compiler_router
from apps.api.app.config import get_settings
from apps.api.app.database.session import Base, engine
from apps.api.app.discovery.router import router as discovery_router
from apps.api.app.health.router import router as health_router
from apps.api.app.jobs.router import router as jobs_router
from apps.api.app.knowledge.router import router as knowledge_router
from apps.api.app.observability.metrics import router as metrics_router
from apps.api.app.projects.router import router as project_router
from apps.api.app.quota.router import router as quota_router
from apps.api.app.registry.router import router as registry_router
from apps.api.app.sync.router import router as sync_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is initialized on startup in development
    if "sqlite" in settings.DATABASE_URL:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="DevKnowledge API",
    description="Universal AI Developer Knowledge Infrastructure API Gateway",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(registry_router, prefix="/api/v1")
app.include_router(compiler_router, prefix="/api/v1")
app.include_router(sync_router)
app.include_router(knowledge_router)
app.include_router(project_router, prefix="/api/v1")
app.include_router(jobs_router, prefix="/api/v1")
app.include_router(quota_router, prefix="/api/v1")
app.include_router(discovery_router, prefix="/api/v1")
app.include_router(metrics_router)


@app.get("/api/v1/ready", status_code=status.HTTP_200_OK, tags=["Health"])
async def readiness_check():
    # Verify DB connectivity
    try:
        async with engine.connect() as conn:
            await conn.execute(Base.metadata.tables["users"].select().limit(1))
        db_status = "connected"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "ready" if "unhealthy" not in db_status else "degraded",
        "database": db_status,
    }
