from __future__ import annotations
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    temporal_address: str = Field("temporal:7233", env="TEMPORAL_ADDRESS")
    temporal_namespace: str = Field("default", env="TEMPORAL_NAMESPACE")
    temporal_task_queue: str = Field("main", env="TEMPORAL_TASK_QUEUE")
    supabase_url: str = Field("http://host.docker.internal:54321", env="SUPABASE_URL")
    supabase_service_role_key: str = Field("dev-service-role-key", env="SUPABASE_SERVICE_ROLE_KEY")

    alpha_vantage_api_key: str = Field("", env="ALPHA_VANTAGE_API_KEY")
    fred_api_key: str = Field("", env="FRED_API_KEY")
    news_api_key: str = Field("", env="NEWS_API_KEY")
    aws_region: str = Field("eu-west-1", env="AWS_REGION")
    bedrock_model_chat: str = Field("anthropic.claude-haiku-5-5-v1", env="BEDROCK_MODEL_CHAT")
    bedrock_model_analysis: str = Field("anthropic.claude-sonnet-5-5-v1", env="BEDROCK_MODEL_ANALYSIS")

    class Config:
        case_sensitive = False


settings = Settings()
