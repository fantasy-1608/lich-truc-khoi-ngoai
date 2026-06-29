import React, { Suspense } from 'react';
import { View } from './types';
import ScheduleView from './components/schedule/ScheduleView';
import Header from './components/layout/Header';
import ToastContainer from './components/common/ToastContainer';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoginView from './components/auth/LoginView';
import { useAppController } from './hooks/useAppController';

// Lazy-loaded views — code-split into separate chunks for faster initial load
const SettingsView = React.lazy(() => import('./components/settings/SettingsView'));
const DepartmentScheduleView = React.lazy(
  () => import('./components/department/DepartmentScheduleView'),
);
const HolidayScheduleView = React.lazy(() => import('./components/holiday/HolidayScheduleView'));

const LazyFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
  </div>
);

const App: React.FC = () => {
  const {
    view,
    contentVisible,
    showEditLogin,
    showMobileEditNotice,
    isMobilePortrait,
    canWrite,
    scheduleData,
    shiftRequests,
    toasts,
    showToast,
    hideToast,
    auth,
    editorEmail,
    isSupabaseConfigured,
    changeView,
    handleToggleSettings,
    handleToggleEditLock,
    handleEmailOnlySignIn,
    setShowEditLogin,
    lastScheduleView,
  } = useAppController();

  return (
    <ErrorBoundary>
      <div
        className="ui-redesign min-h-screen bg-slate-50 font-sans text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100"
        data-ui-design="new"
      >
        <Header
          view={view}
          onViewChange={changeView}
          onToggleSettings={handleToggleSettings}
          showEditLock={isSupabaseConfigured}
          canEdit={canWrite}
          onToggleEditLock={handleToggleEditLock}
        />

        <main
          className={`app-main mx-auto w-full max-w-[1800px] p-4 sm:p-6 lg:p-8 transition-opacity duration-150 ${contentVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          {view === View.SCHEDULE && (
            <ScheduleView
              tours={scheduleData.tours}
              tourOrder={scheduleData.tourOrder}
              tourOverrides={scheduleData.tourOverrides}
              doctorOverrides={scheduleData.doctorOverrides}
              scheduleSnapshots={scheduleData.scheduleSnapshots}
              showAddDoctorShortcut={scheduleData.showAddDoctorShortcut}
              onSwapTours={scheduleData.handleSwapTours}
              onSwapDoctors={scheduleData.handleSwapDoctors}
              allDoctors={scheduleData.doctors}
              onReplaceDoctor={scheduleData.handleReplaceDoctor}
              onAddDoctorToDate={scheduleData.handleAddDoctorToDate}
              onResetOverrides={scheduleData.handleResetOverrides}
              doctorsById={scheduleData.doctorsById}
              toursById={scheduleData.toursById}
              getDoctorsForDate={scheduleData.getDoctorsForDate}
              rotationStartDate={scheduleData.rotationStartDate}
              onViewDateChange={scheduleData.handleSetViewDate}
              holidaySchedule={scheduleData.holidaySchedule}
              canManageShiftRequests={canWrite}
              canEdit={canWrite}
              isMobilePortrait={isMobilePortrait}
              showMobileEditNotice={showMobileEditNotice}
              shiftRequests={shiftRequests.requests}
              shiftRequestsLoading={shiftRequests.isLoading}
              pendingRequestCountsByDate={shiftRequests.pendingCountsByDate}
              onSubmitShiftRequest={shiftRequests.submitRequest}
              onUpdateShiftRequestReview={shiftRequests.updateReview}
              departmentAssignments={scheduleData.departmentAssignments}
            />
          )}
          {view === View.DEPARTMENT_SCHEDULE && (
            <Suspense fallback={<LazyFallback />}>
              <DepartmentScheduleView
                allDoctors={scheduleData.doctors}
                getDoctorsForDate={scheduleData.getDoctorsForDate}
                showPkdv={scheduleData.showPkdv}
                departmentAssignments={scheduleData.departmentAssignments}
                onUpdateDepartmentAssignments={scheduleData.handleUpdateDepartmentAssignments}
                holidaySchedule={scheduleData.holidaySchedule}
              />
            </Suspense>
          )}
          {view === View.HOLIDAY_SCHEDULE && (
            <Suspense fallback={<LazyFallback />}>
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
                canEdit={canWrite}
              />
            </Suspense>
          )}
          {view === View.SETTINGS && (
            <Suspense fallback={<LazyFallback />}>
              <SettingsView
                doctors={scheduleData.doctors}
                tours={scheduleData.tours}
                tourOrder={scheduleData.tourOrder}
                showPkdv={scheduleData.showPkdv}
                showAddDoctorShortcut={scheduleData.showAddDoctorShortcut}
                rotationStartDate={scheduleData.rotationStartDate}
                onSetRotationStartDate={scheduleData.handleSetRotationStartDate}
                onAddDoctor={scheduleData.handleAddDoctor}
                onRemoveDoctor={scheduleData.handleRemoveDoctor}
                onUpdateDoctor={scheduleData.handleUpdateDoctor}
                onUpdateDoctorInTour={scheduleData.handleUpdateDoctorInTour}
                onReorderTours={scheduleData.handleReorderTours}
                onTogglePkdvVisibility={scheduleData.handleTogglePkdvVisibility}
                onToggleAddDoctorShortcut={scheduleData.handleToggleAddDoctorShortcut}
                onAddDoctorToTour={scheduleData.handleAddDoctorToTour}
                onRemoveDoctorFromTour={scheduleData.handleRemoveDoctorFromTour}
                onImportData={scheduleData.handleImportData}
                dataToExport={{
                  doctors: scheduleData.doctors,
                  tours: scheduleData.tours,
                  tourOrder: scheduleData.tourOrder,
                  tourOverrides: scheduleData.tourOverrides,
                  doctorOverrides: scheduleData.doctorOverrides,
                  scheduleSnapshots: scheduleData.scheduleSnapshots,
                  showPkdv: scheduleData.showPkdv,
                  showAddDoctorShortcut: scheduleData.showAddDoctorShortcut,
                  departmentAssignments: scheduleData.departmentAssignments,
                }}
                onDone={() => changeView(lastScheduleView)}
                showToast={showToast}
              />
            </Suspense>
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
