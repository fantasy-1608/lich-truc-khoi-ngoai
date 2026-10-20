import React from 'react';
import { Doctor, Tour, ImportData, RotationConfig, RotationVersion } from '../../types';
import { ToastType } from '../../hooks/useToast';
import RotationSettings from './RotationSettings';
import { ScheduleMonthStorageData } from '../../services/scheduleStorage';
import GeneralSettings from './GeneralSettings';

import DataManager from './DataManager';

interface SettingsViewProps {
  rotationConfig: RotationConfig;
  canWrite: boolean;
  onApplyRotation: (
    version: RotationVersion,
    base: string | null,
    months: Record<string, string | null>,
    data: ScheduleMonthStorageData,
  ) => Promise<void>;
  doctors: Doctor[];
  tours: Tour[];
  tourOrder: string[];
  showPkdv: boolean;
  showAddDoctorShortcut: boolean;
  rotationStartDate: string | null;
  onSetRotationStartDate: (date: string | null) => void;
  onAddDoctor: (name: string, isCtch: boolean) => void;
  onRemoveDoctor: (id: string) => void;
  onUpdateDoctor: (id: string, updatedDoctor: Partial<Omit<Doctor, 'id'>>) => void;
  onUpdateDoctorInTour: (tourId: string, doctorIndex: number, newDoctorId: string) => void;
  onReorderTours: (newOrder: string[]) => void;
  onTogglePkdvVisibility: () => void;
  onToggleAddDoctorShortcut: () => void;
  onAddDoctorToTour: (tourId: string) => void;
  onRemoveDoctorFromTour: (tourId: string, doctorIndex: number) => void;
  onImportData: (data: ImportData, onSuccess?: () => void) => void;
  dataToExport: ImportData;
  onDone: () => void;
  showToast: (message: string, type: ToastType) => void;
}

const SettingsView: React.FC<SettingsViewProps> = (props) => {
  const { onDone, showToast, ...restProps } = props;

  return (
    <div className="settings-workspace max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-8 px-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Cài đặt
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Quản lý bác sĩ, tua trực và dữ liệu hệ thống
          </p>
        </div>
        <button
          onClick={onDone}
          className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 active:scale-95"
        >
          Hoàn tất
        </button>
      </div>

      <RotationSettings
        config={props.rotationConfig}
        canWrite={props.canWrite}
        onApply={props.onApplyRotation}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="glass-card p-6">
          <GeneralSettings
            showPkdv={restProps.showPkdv}
            showAddDoctorShortcut={restProps.showAddDoctorShortcut}
            onTogglePkdvVisibility={restProps.onTogglePkdvVisibility}
            onToggleAddDoctorShortcut={restProps.onToggleAddDoctorShortcut}
            rotationStartDate={restProps.rotationStartDate}
            onSetRotationStartDate={restProps.onSetRotationStartDate}
          />
        </div>
        <div className="glass-card p-6">
          <DataManager
            onImport={restProps.onImportData}
            dataToExport={restProps.dataToExport}
            showToast={showToast}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
