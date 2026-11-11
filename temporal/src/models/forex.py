from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class PriceData:
    pair: str
    bid: float
    ask: float
    mid: float
    timestamp: str
    source: str


@dataclass
class PriceFetchResult:
    prices: list[PriceData] = field(default_factory=list)
    source: str = ""
    errors: list[str] = field(default_factory=list)


@dataclass
class TechnicalIndicators:
    pair_entity_id: str
    rsi_14: Optional[float] = None
    macd_signal: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None


@dataclass
class ChatInput:
    user_id: str
    conversation_id: str
    message: str
    context: Optional[dict] = None


@dataclass
class ChatOutput:
    response: str
    conversation_id: str
    tokens_used: int
    model: str = ""


@dataclass
class AlertCondition:
    alert_entity_id: str
    pair_entity_id: str
    condition_type: str
    threshold: float
    fact_type_key: str = "exchange_rate"


@dataclass
class AlertEvalResult:
    alerts_checked: int = 0
    alerts_triggered: int = 0
    triggered_ids: list[str] = field(default_factory=list)


@dataclass
class RecommendInput:
    user_id: str
    risk_profile: Optional[str] = None
    max_recommendations: int = 5


@dataclass
class RecommendOutput:
    recommendations: list[dict] = field(default_factory=list)
    model: str = ""
    tokens_used: int = 0


@dataclass
class AnalyzeInput:
    pair: str
    pair_entity_id: str
    timeframe: str = "daily"


@dataclass
class AnalyzeOutput:
    narrative: str = ""
    indicators: dict = field(default_factory=dict)
    model: str = ""
    tokens_used: int = 0
