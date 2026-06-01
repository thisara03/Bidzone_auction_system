from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url_sync: str = "mysql+pymysql://bidzone:bidzone@127.0.0.1:3306/bidzone?charset=utf8mb4"
    cors_origins: str = "http://localhost:5173"
    # Dev / MVP: allow POST /auctions before eKYC provider is wired.
    allow_unverified_sellers: bool = True

    redis_url: str = ""
    """e.g. redis://redis:6379/0 — empty disables Redis client."""

    jwt_secret: str = "change-me-in-production-use-openssl-rand-hex-32"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7

    # --- SMS (Twilio) — leave empty to use demo mode (logs code; never in production) ---
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    """E.164 sender, e.g. +15551234567"""
    twilio_from_number: str = ""
    sms_demo_log_code: bool = True
    """When Twilio is not configured, log the OTP to the logger if True."""

    # --- Phone OTP ---
    otp_pepper: str = ""
    """HMAC secret for OTP hashing; defaults to jwt_secret if empty."""
    otp_ttl_minutes: int = 10
    otp_max_sends_per_phone_hour: int = 5
    otp_max_sends_per_ip_hour: int = 25
    otp_max_wrong_attempts: int = 5
    trust_proxy_for_client_ip: bool = False
    """If True, use first X-Forwarded-For hop (only behind a trusted reverse proxy)."""

    # --- Email (SendGrid HTTP API) ---
    sendgrid_api_key: str = ""
    sendgrid_from_email: str = ""
    """Must match a verified sender in SendGrid."""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def otp_hmac_secret(self) -> str:
        return self.otp_pepper.strip() or self.jwt_secret


settings = Settings()
