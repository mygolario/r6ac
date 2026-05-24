import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

// Players Hooks
export function usePlayers(params: { page: number; limit: number; search?: string; banStatus?: string }) {
  return useQuery({
    queryKey: ['players', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: params.page.toString(),
        limit: params.limit.toString(),
        ...(params.search && { search: params.search }),
        ...(params.banStatus && { banStatus: params.banStatus }),
      });
      const res = await apiClient(`/players?${queryParams}`);
      return res.data;
    },
  });
}

export function useUpdateBanStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiClient(`/players/${id}/ban-status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
}

export function usePlayer(id: string) {
  return useQuery({
    queryKey: ['players', id],
    queryFn: async () => {
      const res = await apiClient(`/players/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useResetHwid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient(`/players/${id}/reset-hwid`, {
        method: 'POST',
      });
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['players', id] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
}

// Tournaments Hooks
export function useTournaments(params?: { page: number; limit: number; status?: string }) {
  return useQuery({
    queryKey: ['tournaments', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: params?.page ? params.page.toString() : '1',
        limit: params?.limit ? params.limit.toString() : '10',
        ...(params?.status && { status: params.status }),
      });
      const res = await apiClient(`/tournaments?${queryParams}`);
      return res.data;
    },
  });
}

export function useTournament(id: string) {
  return useQuery({
    queryKey: ['tournaments', id],
    queryFn: async () => {
      const res = await apiClient(`/tournaments/${id}`);
      return res.data;
    },
  });
}

export function useCreateTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { nameFA: string; name: string; prizePool: number; startDate: string }) => {
      const res = await apiClient('/tournaments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function useBracket(id: string) {
  return useQuery({
    queryKey: ['tournaments', id, 'bracket'],
    queryFn: async () => {
      const res = await apiClient(`/tournaments/${id}/bracket`);
      return res.data;
    },
  });
}

// Live Matches Hook
export function useLiveMatches() {
  return useQuery({
    queryKey: ['live-matches'],
    queryFn: async () => {
      const res = await apiClient('/tournaments/matches/live');
      return res.data;
    },
  });
}

// Reports Hooks
export function useReports(params: { page: number; limit: number; reviewStatus?: string }) {
  return useQuery({
    queryKey: ['reports', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: params.page.toString(),
        limit: params.limit.toString(),
        ...(params.reviewStatus && { reviewStatus: params.reviewStatus }),
      });
      const res = await apiClient(`/reports?${queryParams}`);
      return res.data;
    },
  });
}

export function useReviewReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiClient(`/reports/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
}

// Settings Hooks
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await apiClient('/settings');
      return res.data;
    },
    staleTime: 30000, // 30 seconds
  });
}

export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { platformName?: string; defaultLanguage?: 'fa' | 'en'; logoUrl?: string | null }) => {
      const res = await apiClient('/settings/platform', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useUpdateTournamentSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { defaultMaxTeams?: number; defaultMatchFormat?: string; defaultCurrency?: 'IRR' | 'USDT' }) => {
      const res = await apiClient('/settings/tournament', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useUpdateAntiCheatSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      autoFlagThreshold?: number;
      autoKickThreshold?: number;
      autoKickEnabled?: boolean;
      enabledDetectionTypes?: string[];
    }) => {
      const res = await apiClient('/settings/anticheat', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
