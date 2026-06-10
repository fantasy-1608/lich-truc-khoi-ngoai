import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ShiftRequest, ShiftRequestCount, ShiftRequestDraft, ShiftRequestStatus } from '../types';
import {
  createShiftRequest,
  loadShiftRequestCounts,
  loadShiftRequestsForEditor,
  updateShiftRequestReview,
} from '../services/shiftRequestStorage';

interface UseShiftRequestsOptions {
  canManage: boolean;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

export const useShiftRequests = ({ canManage, onError, onSuccess }: UseShiftRequestsOptions) => {
  const [counts, setCounts] = useState<ShiftRequestCount[]>([]);
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const onErrorRef = useRef(onError);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onErrorRef.current = onError;
    onSuccessRef.current = onSuccess;
  }, [onError, onSuccess]);

  const refreshCounts = useCallback(async () => {
    try {
      const nextCounts = await loadShiftRequestCounts();
      setCounts(nextCounts);
    } catch (error) {
      console.error('Failed to load shift request counts:', error);
      onErrorRef.current?.('Không thể tải số lượng yêu cầu trực.');
    }
  }, []);

  const refreshRequests = useCallback(async () => {
    if (!canManage) {
      setRequests([]);
      return;
    }

    setIsLoading(true);
    try {
      const nextRequests = await loadShiftRequestsForEditor();
      setRequests(nextRequests);
    } catch (error) {
      console.error('Failed to load shift requests:', error);
      onErrorRef.current?.('Không thể tải danh sách yêu cầu trực.');
    } finally {
      setIsLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    void refreshRequests();
  }, [refreshRequests]);

  const pendingCountsByDate = useMemo(
    () =>
      counts.reduce<Record<string, number>>((acc, count) => {
        acc[count.date] = count.pendingCount;
        return acc;
      }, {}),
    [counts],
  );

  const submitRequest = useCallback(
    async (draft: ShiftRequestDraft) => {
      try {
        const request = await createShiftRequest(draft);
        setCounts((current) => {
          const existing = current.find((count) => count.date === request.date);
          if (existing) {
            return current.map((count) =>
              count.date === request.date
                ? { ...count, pendingCount: count.pendingCount + 1 }
                : count,
            );
          }
          return [...current, { date: request.date, pendingCount: 1 }];
        });
        if (canManage) {
          setRequests((current) => [request, ...current]);
        }
        onSuccessRef.current?.('Đã gửi yêu cầu trực.');
      } catch (error) {
        console.error('Failed to submit shift request:', error);
        onErrorRef.current?.('Không thể gửi yêu cầu. Vui lòng thử lại.');
        throw error;
      }
    },
    [canManage],
  );

  const updateReview = useCallback(
    async (id: string, status: ShiftRequestStatus, reviewNote: string) => {
      try {
        const updatedRequest = await updateShiftRequestReview(id, status, reviewNote);
        setRequests((current) =>
          current.map((request) => (request.id === id ? updatedRequest : request)),
        );
        await refreshCounts();
        onSuccessRef.current?.('Đã cập nhật yêu cầu trực.');
      } catch (error) {
        console.error('Failed to update shift request:', error);
        onErrorRef.current?.('Không thể cập nhật yêu cầu. Vui lòng thử lại.');
        throw error;
      }
    },
    [refreshCounts],
  );

  return {
    isLoading,
    requests,
    pendingCountsByDate,
    refreshRequests,
    submitRequest,
    updateReview,
  };
};
