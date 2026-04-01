from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Stored as a comma-separated string to avoid pydantic-settings v2
    # attempting JSON-decode on list types from env vars.
    cors_origins: str = "http://localhost:5173"
    max_repo_size_mb: int = 500
    max_files: int = 10_000
    analysis_timeout_seconds: int = 120
    node_path: str = "node"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
