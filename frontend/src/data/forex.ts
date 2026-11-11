import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { CurrencyPair, PairFact, ChatMessage, Trade, Alert, UserProfile } from '@/types/forex';

export function useCurrencyPairs() {
  return useQuery({
    queryKey: ['currency-pairs'],
    queryFn: async (): Promise<CurrencyPair[]> => {
      const { data: entities, error } = await supabase
        .from('entities')
        .select('id, entity_type, source_record_id')
        .eq('entity_type', 'currency_pair');
      if (error) throw error;

      const ids = (entities ?? []).map((e) => e.id);
      if (ids.length === 0) return [];

      const { data: versions, error: vErr } = await supabase
        .from('entity_versions')
        .select('entity_id, data')
        .in('entity_id', ids)
        .eq('is_current', true);
      if (vErr) throw vErr;

      const versionMap = new Map((versions ?? []).map((v) => [v.entity_id, v.data]));
      return (entities ?? []).map((e) => ({
        ...e,
        data: versionMap.get(e.id) ?? { base: '', quote: '', pip_size: 0.0001, typical_spread: 0, description: '' },
      }));
    },
    staleTime: 60_000,
  });
}

export function usePairFacts(pairId: string | undefined) {
  return useQuery({
    queryKey: ['pair-facts', pairId],
    queryFn: async (): Promise<PairFact[]> => {
      const { data, error } = await supabase
        .from('entity_facts')
        .select('id, entity_id, value, updated_at, fact_types(key)')
        .eq('entity_id', pairId!);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id,
        entity_id: row.entity_id,
        fact_type_key: row.fact_types?.key ?? '',
        value: row.value,
        updated_at: row.updated_at,
      }));
    },
    enabled: !!pairId,
    refetchInterval: 60_000,
  });
}

export function usePairPriceHistory(pairId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ['pair-price-history', pairId, limit],
    queryFn: async () => {
      const { data: factType } = await supabase
        .from('fact_types')
        .select('id')
        .eq('key', 'exchange_rate')
        .single();

      const { data, error } = await supabase
        .from('time_series_points')
        .select('id, observed_at, data_payload')
        .eq('entity_id', pairId!)
        .eq('fact_type_id', factType?.id ?? '')
        .order('observed_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!pairId,
    refetchInterval: 60_000,
  });
}

export function useChatMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['chat-messages', conversationId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!conversationId,
    refetchInterval: 3_000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ message, conversationId }: { message: string; conversationId: string }) => {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { message, conversation_id: conversationId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', variables.conversationId] });
    },
  });
}

export function usePortfolioTrades(portfolioId: string | undefined) {
  return useQuery({
    queryKey: ['portfolio-trades', portfolioId],
    queryFn: async (): Promise<Trade[]> => {
      const { data: rels, error: rErr } = await supabase
        .from('relationships_v2')
        .select('child_id')
        .eq('parent_id', portfolioId!)
        .eq('relationship_type', 'portfolio_contains_trade')
        .eq('is_current', true);
      if (rErr) throw rErr;

      const ids = (rels ?? []).map((r) => r.child_id);
      if (ids.length === 0) return [];

      const { data: versions, error: vErr } = await supabase
        .from('entity_versions')
        .select('entity_id, data, created_at')
        .in('entity_id', ids)
        .eq('is_current', true);
      if (vErr) throw vErr;

      return (versions ?? []).map((v: any) => ({
        id: v.entity_id,
        pair: v.data?.pair ?? '',
        direction: v.data?.direction ?? 'buy',
        entry_price: v.data?.entry_price ?? 0,
        exit_price: v.data?.exit_price,
        size: v.data?.size ?? 0,
        status: v.data?.status ?? 'open',
        pnl: v.data?.pnl,
        notes: v.data?.notes,
        created_at: v.created_at,
      }));
    },
    enabled: !!portfolioId,
  });
}

export function useAlerts(userId: string | undefined) {
  return useQuery({
    queryKey: ['alerts', userId],
    queryFn: async (): Promise<Alert[]> => {
      const { data: rels, error: rErr } = await supabase
        .from('relationships_v2')
        .select('child_id')
        .eq('parent_id', userId!)
        .eq('relationship_type', 'user_has_alert')
        .eq('is_current', true);
      if (rErr) throw rErr;

      const ids = (rels ?? []).map((r) => r.child_id);
      if (ids.length === 0) return [];

      const { data: versions, error: vErr } = await supabase
        .from('entity_versions')
        .select('entity_id, data')
        .in('entity_id', ids)
        .eq('is_current', true);
      if (vErr) throw vErr;

      return (versions ?? []).map((v: any) => ({
        id: v.entity_id,
        pair: v.data?.pair ?? '',
        condition_type: v.data?.condition_type ?? '',
        threshold: v.data?.threshold ?? 0,
        is_active: v.data?.is_active ?? true,
        last_triggered_at: v.data?.last_triggered_at,
      }));
    },
    enabled: !!userId,
  });
}

export function useUserProfile() {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: async (): Promise<UserProfile | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: entity } = await supabase
        .from('entities')
        .select('id')
        .eq('entity_type', 'user_profile')
        .eq('source_record_id', user.id)
        .single();
      if (!entity) return null;

      const { data: version } = await supabase
        .from('entity_versions')
        .select('data')
        .eq('entity_id', entity.id)
        .eq('is_current', true)
        .single();

      return {
        id: entity.id,
        experience_level: version?.data?.experience_level ?? 'beginner',
        risk_tolerance: version?.data?.risk_tolerance ?? 'moderate',
        preferred_pairs: version?.data?.preferred_pairs ?? [],
        timezone: version?.data?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        notification_prefs: version?.data?.notification_prefs ?? { in_app: true, email: false },
      };
    },
  });
}
