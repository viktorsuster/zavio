import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

// Jediný zdroj pravdy pre kredity je externý systém KREDITA (cez náš backend).
export const KREDITA_BALANCE_QUERY_KEY = ['kreditaBalance'];

export function useKreditaBalance(enabled = true) {
  return useQuery({
    queryKey: KREDITA_BALANCE_QUERY_KEY,
    queryFn: () => apiService.getKreditaBalance(),
    enabled,
    staleTime: 1000 * 30,
  });
}
