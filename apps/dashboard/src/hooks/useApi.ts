import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { mockPlayers, mockTournaments, mockDetectionReports, mockMatches, mockTeams } from '../lib/mock-data';

// Players Hooks
export function usePlayers(params: { page: number; limit: number; search?: string; banStatus?: string }) {
  return useQuery({
    queryKey: ['players', params],
    queryFn: async () => {
      try {
        const queryParams = new URLSearchParams({
          page: params.page.toString(),
          limit: params.limit.toString(),
          ...(params.search && { search: params.search }),
          ...(params.banStatus && { banStatus: params.banStatus }),
        });
        const res = await apiClient(`/players?${queryParams}`);
        return res.data;
      } catch (err) {
        // Fallback to mock data if API is offline
        let list = mockPlayers;
        if (params.search) {
          list = list.filter((p) => p.username.toLowerCase().includes(params.search!.toLowerCase()));
        }
        if (params.banStatus) {
          list = list.filter((p) => p.banStatus === params.banStatus);
        }
        const offset = (params.page - 1) * params.limit;
        return {
          players: list.slice(offset, offset + params.limit),
          total: list.length,
        };
      }
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

// Tournaments Hooks
export function useTournaments(params?: { page: number; limit: number; status?: string }) {
  return useQuery({
    queryKey: ['tournaments', params],
    queryFn: async () => {
      try {
        const queryParams = new URLSearchParams({
          page: params?.page ? params.page.toString() : '1',
          limit: params?.limit ? params.limit.toString() : '10',
          ...(params?.status && { status: params.status }),
        });
        const res = await apiClient(`/tournaments?${queryParams}`);
        return res.data;
      } catch (err) {
        let list = mockTournaments;
        if (params?.status) {
          list = list.filter((t) => t.status === params.status);
        }
        return {
          tournaments: list,
          total: list.length,
        };
      }
    },
  });
}

export function useTournament(id: string) {
  return useQuery({
    queryKey: ['tournaments', id],
    queryFn: async () => {
      try {
        const res = await apiClient(`/tournaments/${id}`);
        return res.data;
      } catch (err) {
        const t = mockTournaments.find((m) => m.id === id);
        return t ? { ...t, registeredTeamsList: mockTeams.slice(0, t.registeredTeams) } : null;
      }
    },
  });
}

export function useBracket(id: string) {
  return useQuery({
    queryKey: ['tournaments', id, 'bracket'],
    queryFn: async () => {
      try {
        const res = await apiClient(`/tournaments/${id}/bracket`);
        return res.data;
      } catch (err) {
        return mockMatches.filter((m) => m.tournamentId === id);
      }
    },
  });
}

// Reports Hooks
export function useReports(params: { page: number; limit: number; reviewStatus?: string }) {
  return useQuery({
    queryKey: ['reports', params],
    queryFn: async () => {
      try {
        const queryParams = new URLSearchParams({
          page: params.page.toString(),
          limit: params.limit.toString(),
          ...(params.reviewStatus && { reviewStatus: params.reviewStatus }),
        });
        const res = await apiClient(`/reports?${queryParams}`);
        return res.data;
      } catch (err) {
        let list = mockDetectionReports;
        if (params.reviewStatus) {
          list = list.filter((r) => (params.reviewStatus === 'pending' ? !r.reviewedBy : !!r.reviewedBy));
        }
        const offset = (params.page - 1) * params.limit;
        return {
          reports: list.slice(offset, offset + params.limit),
          total: list.length,
        };
      }
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
