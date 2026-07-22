import type {
  OperationStatus,
  OperatorExecutionDetail,
  OperatorExecutionOperations,
  OperatorExecutionsOverview,
} from '@erp/types';
import { api } from './client';

export function list(params?: {
  month?: string;
  page?: number;
  limit?: number;
  search?: string;
  signal?: AbortSignal;
}): Promise<OperatorExecutionsOverview> {
  const { signal, ...query } = params ?? {};
  return api.get<OperatorExecutionsOverview>('/operator-executions', { query, signal });
}

export function get(
  operatorId: string,
  params?: { month?: string; signal?: AbortSignal },
): Promise<OperatorExecutionDetail> {
  const { signal, ...query } = params ?? {};
  return api.get<OperatorExecutionDetail>(`/operator-executions/${operatorId}`, { query, signal });
}

export function operations(
  operatorId: string,
  params?: {
    month?: string;
    page?: number;
    limit?: number;
    status?: OperationStatus;
    view?: 'HISTORY' | 'AGENDA';
    signal?: AbortSignal;
  },
): Promise<OperatorExecutionOperations> {
  const { signal, ...query } = params ?? {};
  return api.get<OperatorExecutionOperations>(`/operator-executions/${operatorId}/operations`, {
    query,
    signal,
  });
}
