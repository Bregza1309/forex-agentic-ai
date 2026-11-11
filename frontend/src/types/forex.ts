export interface CurrencyPair {
  id: string;
  entity_type: string;
  source_record_id: string;
  data: {
    base: string;
    quote: string;
    pip_size: number;
    typical_spread: number;
    description: string;
  };
}

export interface PairFact {
  id: string;
  entity_id: string;
  fact_type_key: string;
  value: number;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  tokens_used?: number;
  created_at: string;
}

export interface Trade {
  id: string;
  pair: string;
  direction: 'buy' | 'sell';
  entry_price: number;
  exit_price?: number;
  size: number;
  status: string;
  pnl?: number;
  notes?: string;
  created_at: string;
}

export interface Alert {
  id: string;
  pair: string;
  condition_type: string;
  threshold: number;
  is_active: boolean;
  last_triggered_at?: string;
}

export interface UserProfile {
  id: string;
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
  preferred_pairs: string[];
  timezone: string;
  notification_prefs: {
    in_app: boolean;
    email: boolean;
  };
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  content: string;
  order: number;
  completed?: boolean;
}

export interface PortfolioSummary {
  total_pnl: number;
  win_rate: number;
  total_trades: number;
  best_pair: string;
  open_positions: number;
}
