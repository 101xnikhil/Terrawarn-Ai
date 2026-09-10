from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    PROJECT_NAME: str = "Terrawarn-Ai Backend"
    API_PREFIX: str = "/api"
    APP_VERSION: str = "0.1.0-prototype"
    BACKEND_URL: str = "http://127.0.0.1:8000"
    DATABASE_URL: str = "sqlite:///./landguard.db"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "*",
    ]
    DEFAULT_NODE_ID: str = "TW-N01"
    SIMULATION_MODE: bool = True
    DEMO_MODE: bool = True
    DEMO_DISCLAIMER: str = "Controlled laboratory prototype demonstration"
    DEMO_STAGE_INTERVAL_SECONDS: int = 8

    # JWT Authentication & Authorization Settings
    JWT_SECRET_KEY: str = "landguard-super-secret-jwt-key-sih-2026-auth"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Cybersecurity & Edge Authorization Settings (Phase 14)
    GATEWAY_API_KEY: str = "landguard-edge-gw-sih2026-key"
    REQUIRE_API_KEY: bool = False
    AUTHORIZED_NODES: List[str] = ["TW-N01", "LG-N01", "LG-N02", "LG-N03", "LG-N04"]

    # SMS Gateway & Cellular Alert Broadcast Settings
    SMS_ENABLED: bool = True
    SMS_PROVIDER: str = "auto"  # "auto", "twilio", "fast2sms", "webhook", "simulated"
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""
    FAST2SMS_API_KEY: str = ""
    CUSTOM_SMS_GATEWAY_URL: str = ""
    CUSTOM_SMS_API_KEY: str = ""
    EMERGENCY_PHONE_NUMBERS: Union[List[str], str] = [
        "+916393829250",
        "+917521061191",
        "+918707786851",
        "+917607989426",
        "+919506758710",
        "+919928968494",
    ]

    # Fast2SMS Quick Route (q) Live Alert Settings
    ALERT_SMS_RECIPIENTS: Union[List[str], str] = (
        "6393829250,7521061191,8707786851,7607989426,9506758710,9928968494"
    )
    SMS_ALERTS_ENABLED: bool = True
    SMS_MIN_SEVERITY: str = "HIGH"
    SMS_MAX_PER_DAY: int = 50

    # Google Cloud & Blynk Integration Settings
    BLYNK_AUTH_TOKEN: str = ""
    BLYNK_TEMPLATE_ID: str = ""
    BLYNK_TEMPLATE_NAME: str = ""
    BLYNK_SERVER_URL: str = "https://blynk.cloud/external/api"
    GCP_WEBHOOK_URL: str = ""

    # External XGBoost ML Server API Integration
    XGBOOST_API_URL: str = ""
    XGBOOST_TIMEOUT_SECONDS: float = 4.0

    # Local Ollama UI translation (offline, no cloud API)
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    TRANSLATION_TIMEOUT_SECONDS: float = 60.0
    TRANSLATION_CHUNK_SIZE: int = 16
    UI_LANGUAGES: List[str] = ["en", "hi", "ne", "as", "bn", "mni", "ml", "ta", "kn"]

    @property
    def emergency_phones(self) -> List[str]:
        if isinstance(self.EMERGENCY_PHONE_NUMBERS, list):
            return self.EMERGENCY_PHONE_NUMBERS
        if isinstance(self.EMERGENCY_PHONE_NUMBERS, str):
            clean = self.EMERGENCY_PHONE_NUMBERS.strip()
            if clean.startswith("[") and clean.endswith("]"):
                try:
                    import json
                    return json.loads(clean)
                except Exception:
                    pass
            return [p.strip() for p in clean.split(",") if p.strip()]
        return ["+919506758710"]

    @property
    def alert_sms_recipients_list(self) -> List[str]:
        raw_list: List[str] = []
        if isinstance(self.ALERT_SMS_RECIPIENTS, list):
            raw_list = self.ALERT_SMS_RECIPIENTS
        elif isinstance(self.ALERT_SMS_RECIPIENTS, str):
            clean = self.ALERT_SMS_RECIPIENTS.strip()
            if clean.startswith("[") and clean.endswith("]"):
                try:
                    import json
                    raw_list = json.loads(clean)
                except Exception:
                    raw_list = [p.strip() for p in clean.split(",") if p.strip()]
            else:
                raw_list = [p.strip() for p in clean.split(",") if p.strip()]

        clean_numbers = []
        for item in raw_list:
            digits = "".join(ch for ch in str(item) if ch.isdigit())
            if len(digits) >= 10:
                clean_numbers.append(digits[-10:])
            elif digits:
                clean_numbers.append(digits)
        return clean_numbers

    @property
    def all_sms_recipients(self) -> List[str]:
        """Unique 10-digit Indian mobiles for one-shot alert broadcast."""
        seen = set()
        merged: List[str] = []
        for item in list(self.alert_sms_recipients_list) + list(self.emergency_phones):
            digits = "".join(ch for ch in str(item) if ch.isdigit())
            key = digits[-10:] if len(digits) >= 10 else digits
            if key and key not in seen:
                seen.add(key)
                merged.append(key)
        return merged


settings = Settings()

