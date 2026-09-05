import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

logger = logging.getLogger("landguard.database")

# ─────────────────────────────────────────────────────────────
# Normalize Database URL (Supports Neon PostgreSQL & SQLite)
# ─────────────────────────────────────────────────────────────
raw_db_url = settings.DATABASE_URL.strip()

# Neon / Heroku / AWS often provide "postgres://" which SQLAlchemy 2.0 requires as "postgresql://"
if raw_db_url.startswith("postgres://"):
    normalized_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
else:
    normalized_db_url = raw_db_url

is_postgres = "postgresql" in normalized_db_url
is_sqlite = "sqlite" in normalized_db_url

if is_postgres:
    logger.info("Configuring PostgreSQL / Neon Serverless DB connection pool...")
    engine = create_engine(
        normalized_db_url,
        pool_pre_ping=True,      # Tests connection before use (auto-reconnects when Neon wakes up)
        pool_recycle=60,         # Recycle connections every 60s to prevent stale serverless sockets
        pool_size=10,            # Active connection pool size
        max_overflow=20,         # Maximum burst overflow connections
        connect_args={
            "connect_timeout": 15,
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 10,
            "keepalives_count": 5,
        },
    )
else:
    logger.info("Configuring local SQLite database engine with WAL mode...")
    engine = create_engine(
        normalized_db_url,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )

    # Enable WAL mode & busy timeout for concurrent SQLite reads and writes
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA busy_timeout=5000;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    """Create all model tables and execute schema migrations if needed."""
    try:
        import app.models  # Ensure all model classes are registered with Base metadata
    except Exception as e:
        logger.warning(f"Model import error: {e}")

    try:
        Base.metadata.create_all(bind=engine)
        logger.info(f"Database schema initialized successfully on {engine.url.drivername}")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")

    if is_sqlite:
        from sqlalchemy import text
        with engine.connect() as conn:
            for col_sql in [
                "ALTER TABLE alerts ADD COLUMN trigger_reason TEXT;",
                "ALTER TABLE alerts ADD COLUMN created_at DATETIME;",
            ]:
                try:
                    conn.execute(text(col_sql))
                    conn.commit()
                except Exception:
                    pass


# Initialize tables and migrations on load
init_db()


def get_db():
    """Dependency for obtaining a database session per request."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
