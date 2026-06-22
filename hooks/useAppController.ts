import { useCallback, useEffect, useState, useTransition } from 'react';
import { View } from '../types';
import { useScheduleData } from './useScheduleData';
import { useToast } from './useToast';
import { useSupabaseAuth } from './useSupabaseAuth';
import { useShiftRequests } from './useShiftRequests';
import { editorEmail, isSupabaseConfigured } from '../lib/supabase';
import {
  clearScheduleEditorEmail,
  setScheduleEditorEmail,
  verifyScheduleEditorEmail,
} from '../services/scheduleStorage';
import {
  clearShiftRequestEditorEmail,
  setShiftRequestEditorEmail,
} from '../services/shiftRequestStorage';

export const useAppController = () => {
  const [view, setView] = useState<View>(View.SCHEDULE);
  const [lastScheduleView, setLastScheduleView] = useState<View>(View.SCHEDULE);
  const [, startTransition] = useTransition();
  const [contentVisible, setContentVisible] = useState(true);
  const [showEditLogin, setShowEditLogin] = useState(false);
  const [showMobileEditNotice, setShowMobileEditNotice] = useState(false);
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const [hasEditorAccess, setHasEditorAccess] = useState(false);

  const { toasts, showToast, hideToast } = useToast();
  const auth = useSupabaseAuth();
  const canWrite = !isSupabaseConfigured || hasEditorAccess;

  const scheduleData = useScheduleData({
    onError: (message) => showToast(message, 'error'),
    canWrite,
  });
  const shiftRequests = useShiftRequests({
    canManage: canWrite,
    onError: (message) => showToast(message, 'error'),
    onSuccess: (message) => showToast(message, 'success'),
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 639px) and (orientation: portrait)');
    const syncMobilePortrait = () => setIsMobilePortrait(mediaQuery.matches);

    syncMobilePortrait();
    mediaQuery.addEventListener('change', syncMobilePortrait);

    return () => mediaQuery.removeEventListener('change', syncMobilePortrait);
  }, []);

  const changeView = useCallback(
    (newView: View) => {
      if (view === newView) return;
      setContentVisible(false);
      setTimeout(() => {
        startTransition(() => {
          setView(newView);
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setContentVisible(true);
      }, 150);
    },
    [view, startTransition],
  );

  const handleToggleSettings = useCallback(() => {
    if (view === View.SETTINGS) {
      changeView(lastScheduleView);
    } else {
      setLastScheduleView(view);
      changeView(View.SETTINGS);
    }
  }, [view, lastScheduleView, changeView]);

  const handleSignOut = useCallback(async () => {
    try {
      await auth.signOut();
      clearScheduleEditorEmail();
      clearShiftRequestEditorEmail();
      setHasEditorAccess(false);
      setShowEditLogin(false);
      setShowMobileEditNotice(false);
    } catch {
      showToast('Không thể đăng xuất. Vui lòng thử lại.', 'error');
    }
  }, [auth, showToast]);

  const handleToggleEditLock = useCallback(() => {
    if (canWrite) {
      void handleSignOut();
      return;
    }

    if (isMobilePortrait) {
      setShowMobileEditNotice(true);
      setShowEditLogin(false);
      return;
    }

    setShowMobileEditNotice(false);
    setShowEditLogin(true);
  }, [canWrite, isMobilePortrait, handleSignOut]);

  const handleEmailOnlySignIn = useCallback(
    async (email: string) => {
      const isEditor = await verifyScheduleEditorEmail(email);
      if (!isEditor) {
        throw new Error('Invalid editor email');
      }

      setScheduleEditorEmail(email);
      setShiftRequestEditorEmail(email);
      setHasEditorAccess(true);
      setShowEditLogin(false);
      setShowMobileEditNotice(false);
      showToast('Đã mở chế độ chỉnh sửa.', 'success');
    },
    [showToast],
  );

  return {
    // View state
    view,
    contentVisible,
    showEditLogin,
    showMobileEditNotice,
    isMobilePortrait,
    canWrite,

    // Data hooks
    scheduleData,
    shiftRequests,

    // Toast
    toasts,
    showToast,
    hideToast,

    // Auth
    auth,
    editorEmail,
    isSupabaseConfigured,

    // Handlers
    changeView,
    handleToggleSettings,
    handleToggleEditLock,
    handleEmailOnlySignIn,
    setShowEditLogin,

    // For SettingsView
    lastScheduleView,
  };
};
