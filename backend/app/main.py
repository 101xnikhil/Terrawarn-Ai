from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models.node import Node
from app.models.telemetry import Telemetry
from app.api import api_router, ws_router
from app.services.mock_generator import mock_generator
from app.services.telemetry_service import telemetry_service
from app.services.auth_service import auth_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("landguard")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event: create tables, seed default users, default node and initial telemetry history."""
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    # Automatically add missing columns if upgrading existing SQLite databases
    if "sqlite" in settings.DATABASE_URL:
        from sqlalchemy import text
        with engine.connect() as conn:
            for col_sql in [
                "ALTER TABLE alerts ADD COLUMN trigger_reason TEXT;",
                "ALTER TABLE alerts ADD COLUMN created_at DATETIME;",
                "ALTER TABLE alerts ADD COLUMN sms_sent BOOLEAN DEFAULT 0;",
                "ALTER TABLE alerts ADD COLUMN sms_sent_at DATETIME;",
                "ALTER TABLE alerts ADD COLUMN sms_error TEXT;",
            ]:
                try:
                    conn.execute(text(col_sql))
                    conn.commit()
                except Exception:
                    pass

    # Seed default users & default node
    db = SessionLocal()
    try:
        # 1. Seed RBAC Users (admin, operator, analyst, viewer)
        logger.info("Seeding default authentication accounts...")
        auth_service.seed_default_users(db)

        # 2. Seed default node LG-N01
        node = db.query(Node).filter(Node.node_id == settings.DEFAULT_NODE_ID).first()
        if not node:
            logger.info(f"Seeding default station node '{settings.DEFAULT_NODE_ID}'...")
            node = Node(
                node_id=settings.DEFAULT_NODE_ID,
                name="Slope Monitor Alpha",
                latitude=31.1048,
                longitude=77.1734,
                altitude_m=2276.0,
                description="Shimla Ridge — Northern face, Sector 7",
                status="online",
                firmware_version="v0.1.3-proto",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                last_seen=datetime.utcnow(),
            )
            db.add(node)
            db.commit()

        # 3. Seed initial history if empty
        telemetry_count = db.query(Telemetry).filter(Telemetry.node_id == settings.DEFAULT_NODE_ID).count()
        if telemetry_count == 0:
            logger.info("Seeding initial baseline telemetry buffer (5 data points)...")
            for _ in range(5):
                reading_payload = mock_generator.generate_reading(scenario="dry_stable")
                await telemetry_service.process_and_store_telemetry(db=db, data=reading_payload)

    except Exception as e:
        logger.error(f"Error during database startup seed: {e}")
    finally:
        db.close()

    yield
    logger.info("Terrawarn-Ai Backend shutting down.")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.APP_VERSION,
        description="""
# 🛡️ Terrawarn-Ai — Geotechnical Landslide Monitoring & Early Warning System

### 🔐 Authorization & Security
This API is protected by **JWT Bearer Token Authentication** and **Role-Based Access Control (RBAC)**:
- **`admin`**: Full administrative system control, user management, and configuration.
- **`operator`**: Control room operator (acknowledge alerts, run scenarios, trigger public warning).
- **`analyst`**: Data analysis and physics explainability access.
- **`viewer`**: Read-only public hazard telemetry monitoring.

### 🔑 Pre-Seeded Demonstration Accounts:
- **`admin`** / **`admin123`**
- **`operator`** / **`operator123`**
- **`analyst`** / **`analyst123`**
- **`viewer`** / **`viewer123`**

Click the **Authorize 🔓** button above to authenticate interactively!
        """,
        lifespan=lifespan,
    )

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register Routers
    app.include_router(api_router, prefix=settings.API_PREFIX)
    if settings.API_PREFIX != "/api/v1":
        app.include_router(api_router, prefix="/api/v1")
    app.include_router(ws_router)

    # Root route
    @app.get("/", tags=["Root"])
    def root():
        return {
            "system": "Terrawarn-Ai Backend",
            "version": settings.APP_VERSION,
            "docs": "/docs",
            "auth": f"{settings.API_PREFIX}/auth/login",
            "health": f"{settings.API_PREFIX}/health",
            "websocket": "/ws/telemetry",
        }

    return app


app = create_app()
