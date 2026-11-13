'use client';

import type {
  AppointmentCreateInput,
  AppointmentDTO,
  AppointmentStatus,
  AppointmentUpdateInput,
  AvailabilityDTO,
  DashboardDTO,
  FinanceCategoryDTO,
  FinanceCategoryInput,
  FinanceCategoryUpdateInput,
  FinanceEntryDTO,
  FinanceEntryInput,
  FinanceEntryUpdateInput,
  FinanceListDTO,
  FinanceListQuery,
  FinanceSummaryDTO,
  Paginated,
  ServiceInput,
  ServiceTypeDTO,
  ServiceUpdateInput,
  SessionUser,
  SettingsDTO,
  SettingsInput,
  SiteReviewDTO,
  SiteReviewInput,
  SiteReviewUpdateInput,
} from '@orts/backend/contracts';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, query } from '@/lib/api';

export const keys = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  appointments: ['appointments'] as const,
  range: (from: string, to: string) => ['appointments', 'range', from, to] as const,
  search: (params: object) => ['appointments', 'search', params] as const,
  appointment: (id: string) => ['appointments', 'item', id] as const,
  availability: (date: string, duration: number, excludeId?: string) => ['availability', date, duration, excludeId ?? ''] as const,
  services: ['services'] as const,
  settings: ['settings'] as const,
  finance: ['finance'] as const,
  financeSummary: (month: string) => ['finance', 'summary', month] as const,
  financeEntries: (params: object) => ['finance', 'entries', params] as const,
  financeCategories: ['finance', 'categories'] as const,
  siteReviews: ['site-reviews'] as const,
};

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: ({ signal }) => api.get<{ user: SessionUser }>('/auth/me', signal).then((r) => r.user),
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: keys.dashboard,
    queryFn: ({ signal }) => api.get<{ dashboard: DashboardDTO }>('/dashboard', signal).then((r) => r.dashboard),
    refetchInterval: 60_000,
  });
}

/** Atendimentos de um intervalo de datas (agenda). */
export function useAppointmentsRange(from: string, to: string) {
  return useQuery({
    queryKey: keys.range(from, to),
    queryFn: ({ signal }) =>
      api.get<Paginated<AppointmentDTO>>(`/appointments${query({ from, to, pageSize: 500 })}`, signal).then((r) => r.items),
    placeholderData: (previous) => previous,
    refetchInterval: 60_000,
  });
}

export type SearchParams = { search?: string; status?: AppointmentStatus[]; from?: string; to?: string; order?: 'asc' | 'desc' };

export function useAppointmentsSearch(params: SearchParams) {
  return useInfiniteQuery({
    queryKey: keys.search(params),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api.get<Paginated<AppointmentDTO>>(
        `/appointments${query({
          search: params.search,
          status: params.status?.join(','),
          from: params.from,
          to: params.to,
          order: params.order,
          page: pageParam,
          pageSize: 30,
        })}`,
        signal,
      ),
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    placeholderData: (previous) => previous,
  });
}

export function useAppointment(id: string | null) {
  return useQuery({
    queryKey: keys.appointment(id ?? ''),
    queryFn: ({ signal }) => api.get<{ appointment: AppointmentDTO }>(`/appointments/${id}`, signal).then((r) => r.appointment),
    enabled: Boolean(id),
  });
}

export function useAvailability(date: string | null, duration: number, excludeId?: string) {
  return useQuery({
    queryKey: keys.availability(date ?? '', duration, excludeId),
    queryFn: ({ signal }) =>
      api.get<{ availability: AvailabilityDTO }>(`/availability${query({ date, durationMinutes: duration, excludeId })}`, signal).then((r) => r.availability),
    enabled: Boolean(date) && duration >= 15,
    placeholderData: (previous) => previous,
  });
}

export function useServices() {
  return useQuery({
    queryKey: keys.services,
    queryFn: ({ signal }) => api.get<{ services: ServiceTypeDTO[] }>('/services', signal).then((r) => r.services),
    staleTime: 5 * 60_000,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: keys.settings,
    queryFn: ({ signal }) => api.get<{ settings: SettingsDTO }>('/settings', signal).then((r) => r.settings),
    staleTime: 5 * 60_000,
  });
}

function useInvalidateAgenda() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: keys.appointments });
    qc.invalidateQueries({ queryKey: keys.dashboard });
    qc.invalidateQueries({ queryKey: ['availability'] });
    qc.invalidateQueries({ queryKey: keys.finance });
  };
}

export function useCreateAppointment() {
  const invalidate = useInvalidateAgenda();
  return useMutation({
    mutationFn: (input: AppointmentCreateInput) => api.post<{ appointment: AppointmentDTO }>('/appointments', input).then((r) => r.appointment),
    onSuccess: invalidate,
  });
}

export function useUpdateAppointment() {
  const invalidate = useInvalidateAgenda();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AppointmentUpdateInput }) =>
      api.patch<{ appointment: AppointmentDTO }>(`/appointments/${id}`, input).then((r) => r.appointment),
    onSuccess: invalidate,
  });
}

export function useChangeStatus() {
  const invalidate = useInvalidateAgenda();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      api.patch<{ appointment: AppointmentDTO }>(`/appointments/${id}/status`, { status }).then((r) => r.appointment),
    onSuccess: invalidate,
  });
}

export function useDeleteAppointment() {
  const invalidate = useInvalidateAgenda();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/appointments/${id}`),
    onSuccess: invalidate,
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SettingsInput) => api.put<{ settings: SettingsDTO }>('/settings', input).then((r) => r.settings),
    onSuccess: (settings) => {
      qc.setQueryData(keys.settings, settings);
      qc.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useSaveService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ServiceInput | ServiceUpdateInput }) =>
      id
        ? api.patch<{ service: ServiceTypeDTO }>(`/services/${id}`, input).then((r) => r.service)
        : api.post<{ service: ServiceTypeDTO }>('/services', input).then((r) => r.service),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.services });
      qc.invalidateQueries({ queryKey: keys.appointments });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) => api.post<{ ok: true }>('/auth/password', input),
  });
}

// ---------- financeiro ----------

function useInvalidateFinance() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: keys.finance });
    qc.invalidateQueries({ queryKey: keys.dashboard });
  };
}

export function useFinanceSummary(month: string) {
  return useQuery({
    queryKey: keys.financeSummary(month),
    queryFn: ({ signal }) => api.get<{ summary: FinanceSummaryDTO }>(`/finance/summary${query({ month })}`, signal).then((r) => r.summary),
    placeholderData: (previous) => previous,
  });
}

export function useFinanceEntries(params: FinanceListQuery, enabled = true) {
  return useQuery({
    queryKey: keys.financeEntries(params),
    queryFn: ({ signal }) => api.get<FinanceListDTO>(`/finance/entries${query(params as Record<string, string | number | undefined>)}`, signal),
    placeholderData: (previous) => previous,
    enabled,
  });
}

export function useFinanceCategories() {
  return useQuery({
    queryKey: keys.financeCategories,
    queryFn: ({ signal }) => api.get<{ categories: FinanceCategoryDTO[] }>('/finance/categories', signal).then((r) => r.categories),
    staleTime: 60_000,
  });
}

export function useSaveFinanceEntry() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: FinanceEntryInput | FinanceEntryUpdateInput }) =>
      (id ? api.patch<{ entry: FinanceEntryDTO }>(`/finance/entries/${id}`, input) : api.post<{ entry: FinanceEntryDTO }>('/finance/entries', input)).then((r) => r.entry),
    onSuccess: invalidate,
  });
}

export function useDeleteFinanceEntry() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/finance/entries/${id}`),
    onSuccess: invalidate,
  });
}

export function useSaveFinanceCategory() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: FinanceCategoryInput | FinanceCategoryUpdateInput }) =>
      (id
        ? api.patch<{ category: FinanceCategoryDTO }>(`/finance/categories/${id}`, input)
        : api.post<{ category: FinanceCategoryDTO }>('/finance/categories', input)
      ).then((r) => r.category),
    onSuccess: invalidate,
  });
}

export function useDeleteFinanceCategory() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ deleted: boolean; archived: boolean }>(`/finance/categories/${id}`),
    onSuccess: invalidate,
  });
}

/** Avaliações exibidas no site (copiadas do Google). */
export function useSiteReviews() {
  return useQuery({
    queryKey: keys.siteReviews,
    queryFn: ({ signal }) => api.get<{ reviews: SiteReviewDTO[] }>('/site-reviews', signal).then((r) => r.reviews),
    staleTime: 60_000,
  });
}

export function useSaveSiteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: SiteReviewInput | SiteReviewUpdateInput }) =>
      (id ? api.patch<{ review: SiteReviewDTO }>(`/site-reviews/${id}`, input) : api.post<{ review: SiteReviewDTO }>('/site-reviews', input)).then((r) => r.review),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.siteReviews }),
  });
}

export function useDeleteSiteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/site-reviews/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.siteReviews }),
  });
}
