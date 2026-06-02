import React, { useState, useTransition } from 'react';
import { View } from './types';
import ScheduleView from './components/schedule/ScheduleView';
import SettingsView from './components/settings/SettingsView';
import DepartmentScheduleView from './components/department/DepartmentScheduleView';
import HolidayScheduleView from './components/holiday/HolidayScheduleView';
import { useScheduleData } from './hooks/useScheduleData';
import { useToast } from './hooks/useToast';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import Header from './components/layout/Header';
import ToastContainer from './components/common/ToastContainer';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoginView from './components/auth/LoginView';
import { editorEmail, isSupabaseConfigured } from './lib/supabase';
import {
  clearScheduleEditorEmail,
  hasScheduleEditorEmail,
  setScheduleEditorEmail,
  verifyScheduleEditorEmail,
} from './services/scheduleStorage';

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.SCHEDULE);
  const [lastScheduleView, setLastScheduleView] = useState<View>(View.SCHEDULE);
  const [, startTransition] = useTransition();
  const [contentVisible, setContentVisible] = useState(true);
  const [showEditLogin, setShowEditLogin] = useState(false);
  const [hasEditorAccess, setHasEditorAccess] = useState(hasScheduleEditorEmail());

  const { toasts, showToast, hideToast } = useToast();
  const auth = useSupabaseAuth();
  const canWrite = !isSupabaseConfigured || Boolean(auth.session) || hasEditorAccess;

  const scheduleData = useScheduleData({
    onError: (message) => showToast(message, 'error'),
    canWrite,
  });

  const changeView = (newView: View) => {
    if (view === newView) return;
    setContentVisible(false);
    setTimeout(() => {
      startTransition(() => {
        setView(newView);
      });
      setContentVisible(true);
    }, 150);
  };

  const handleToggleSettings = () => {
    if (view === View.SETTINGS) {
      changeView(lastScheduleView);
    } else {
      setLastScheduleView(view);
      changeView(View.SETTINGS);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      clearScheduleEditorEmail();
      setHasEditorAccess(false);
      setShowEditLogin(false);
    } catch {
      showToast('Không thể đăng xuất. Vui lòng thử lại.', 'error');
    }
  };

  const handleEmailOnlySignIn = async (email: string) => {
    const isEditor = await verifyScheduleEditorEmail(email);
    if (!isEditor) {
      throw new Error('Invalid editor email');
    }

    setScheduleEditorEmail(email);
    setHasEditorAccess(true);
    setShowEditLogin(false);
    showToast('Đã mở chế độ chỉnh sửa.', 'success');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen font-sans bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <Header view={view} onViewChange={changeView} onToggleSettings={handleToggleSettings} />

        <main
          className={`container mx-auto p-4 sm:p-6 lg:p-8 transition-opacity duration-150 ${contentVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          {isSupabaseConfigured && (
            <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
              <span className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-500 dark:text-slate-400">
                {canWrite ? 'Đang chỉnh sửa' : 'Chỉ xem'}
              </span>
              {canWrite ? (
                <button
                  onClick={handleSignOut}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Khóa chỉnh sửa
                </button>
              ) : (
                <button
                  onClick={() => setShowEditLogin(true)}
                  disabled={!auth.isReady}
                  className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  Chỉnh sửa
                </button>
              )}
            </div>
          )}

          {view === View.SCHEDULE && (
            <ScheduleView
              tours={scheduleData.tours}
              tourOrder={scheduleData.tourOrder}
              tourOverrides={scheduleData.tourOverrides}
              doctorOverrides={scheduleData.doctorOverrides}
              onSwapTours={scheduleData.handleSwapTours}
              onSwapDoctors={scheduleData.handleSwapDoctors}
              allDoctors={scheduleData.doctors}
              onReplaceDoctor={scheduleData.handleReplaceDoctor}
              onResetOverrides={scheduleData.handleResetOverrides}
              doctorsById={scheduleData.doctorsById}
              toursById={scheduleData.toursById}
              getDoctorsForDate={scheduleData.getDoctorsForDate}
              rotationStartDate={scheduleData.rotationStartDate}
              onViewDateChange={scheduleData.handleSetViewDate}
              holidaySchedule={scheduleData.holidaySchedule}
            />
          )}
          {view === View.DEPARTMENT_SCHEDULE && (
            <DepartmentScheduleView
              allDoctors={scheduleData.doctors}
              getDoctorsForDate={scheduleData.getDoctorsForDate}
              showPkdv={scheduleData.showPkdv}
              departmentAssignments={scheduleData.departmentAssignments}
              onUpdateDepartmentAssignments={scheduleData.handleUpdateDepartmentAssignments}
              holidaySchedule={scheduleData.holidaySchedule}
            />
          )}
          {view === View.HOLIDAY_SCHEDULE && (
            <HolidayScheduleView
              holidaySchedule={scheduleData.holidaySchedule}
              allDoctors={scheduleData.doctors}
              tours={scheduleData.tours}
              getDoctorsForDate={scheduleData.getDoctorsForDate}
              onSetHolidayPeriod={scheduleData.handleSetHolidayPeriod}
              onSetHolidayTour={scheduleData.handleSetHolidayTour}
              onSetHolidayInsertionIndex={scheduleData.handleSetHolidayInsertionIndex}
              onUpdateHolidayDoctors={scheduleData.handleUpdateHolidayDoctors}
              onResetHolidayDay={scheduleData.handleResetHolidayDay}
            />
          )}
          {view === View.SETTINGS && (
            <SettingsView
              doctors={scheduleData.doctors}
              tours={scheduleData.tours}
              tourOrder={scheduleData.tourOrder}
              showPkdv={scheduleData.showPkdv}
              rotationStartDate={scheduleData.rotationStartDate}
              onSetRotationStartDate={scheduleData.handleSetRotationStartDate}
              onAddDoctor={scheduleData.handleAddDoctor}
              onRemoveDoctor={scheduleData.handleRemoveDoctor}
              onUpdateDoctor={scheduleData.handleUpdateDoctor}
              onUpdateDoctorInTour={scheduleData.handleUpdateDoctorInTour}
              onReorderTours={scheduleData.handleReorderTours}
              onTogglePkdvVisibility={scheduleData.handleTogglePkdvVisibility}
              onAddDoctorToTour={scheduleData.handleAddDoctorToTour}
              onRemoveDoctorFromTour={scheduleData.handleRemoveDoctorFromTour}
              onImportData={scheduleData.handleImportData}
              dataToExport={{
                doctors: scheduleData.doctors,
                tours: scheduleData.tours,
                tourOrder: scheduleData.tourOrder,
                tourOverrides: scheduleData.tourOverrides,
                doctorOverrides: scheduleData.doctorOverrides,
                showPkdv: scheduleData.showPkdv,
                departmentAssignments: scheduleData.departmentAssignments,
              }}
              onDone={() => changeView(lastScheduleView)}
              showToast={showToast}
            />
          )}
        </main>

        <ToastContainer toasts={toasts} onDismiss={hideToast} />
        {showEditLogin && (
          <div className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <LoginView
              mode="dialog"
              defaultEmail={editorEmail}
              onSignIn={auth.signIn}
              onEmailOnlySignIn={handleEmailOnlySignIn}
              onCancel={() => setShowEditLogin(false)}
            />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
