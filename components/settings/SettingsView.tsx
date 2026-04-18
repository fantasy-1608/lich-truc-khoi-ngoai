import React from 'react';
import { Doctor, Tour, ImportData } from '../../types';
import { ToastType } from '../../hooks/useToast';
import ReorderToursList from './ReorderToursList';
import GeneralSettings from './GeneralSettings';
import DoctorManager from './DoctorManager';
import DataManager from './DataManager';

interface SettingsViewProps {
  doctors: Doctor[];
  tours: Tour[];
  tourOrder: string[];
  showPkdv: boolean;
  rotationStartDate: string | null;
  onSetRotationStartDate: (date: string | null) => void;
  onAddDoctor: (name: string, isCtch: boolean) => void;
  onRemoveDoctor: (id: string) => void;
  onUpdateDoctor: (id: string, updatedDoctor: Partial<Omit<Doctor, 'id'>>) => void;
  onUpdateDoctorInTour: (tourId: string, doctorIndex: number, newDoctorId: string) => void;
  onReorderTours: (newOrder: string[]) => void;
  onTogglePkdvVisibility: () => void;
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
    <div className="max-w-7xl mx-auto mt-20 pb-12">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-8">
          <div className="glass-card rounded-3xl p-6 sm:p-8">
            <DoctorManager
              doctors={restProps.doctors}
              onAddDoctor={restProps.onAddDoctor}
              onRemoveDoctor={restProps.onRemoveDoctor}
              onUpdateDoctor={restProps.onUpdateDoctor}
            />
          </div>

          <div className="glass-card rounded-3xl p-6 sm:p-8">
            <GeneralSettings
              showPkdv={restProps.showPkdv}
              onTogglePkdvVisibility={restProps.onTogglePkdvVisibility}
              rotationStartDate={restProps.rotationStartDate}
              onSetRotationStartDate={restProps.onSetRotationStartDate}
            />
          </div>
        </div>

        <div className="lg:col-span-7 space-y-8">
          <div className="glass-card rounded-3xl p-6 sm:p-8">
            <ReorderToursList
              doctors={restProps.doctors}
              tours={restProps.tours}
              tourOrder={restProps.tourOrder}
              onReorderTours={restProps.onReorderTours}
              onUpdateDoctorInTour={restProps.onUpdateDoctorInTour}
              onAddDoctorToTour={restProps.onAddDoctorToTour}
              onRemoveDoctorFromTour={restProps.onRemoveDoctorFromTour}
            />
          </div>

          <div className="glass-card rounded-3xl p-6 sm:p-8">
            <DataManager
              onImport={restProps.onImportData}
              dataToExport={restProps.dataToExport}
              showToast={showToast}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
