import React, { useState, useEffect } from 'react';
import { Calendar, Download, X, AlertCircle, Cloud, FileSpreadsheet } from 'lucide-react';
import { downloadBackup, getBackupStatus, showSuccess, showError } from '../services/notificationService';
import { getGoogleDriveConfig, backupToGoogleDrive } from '../services/googleDriveService';
import { downloadExcelBackup } from '../services/excelExportService';

interface FridayReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FridayReminderModal: React.FC<FridayReminderModalProps> = ({ isOpen, onClose }) => {
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupType, setBackupType] = useState<'local' | 'drive' | 'excel' | null>(null);

  useEffect(() => {
    const config = getGoogleDriveConfig();
    setIsGoogleDriveConnected(config.isConnected);
  }, [isOpen]);

  if (!isOpen) return null;

  const backupStatus = getBackupStatus();

  const handleLocalBackup = async () => {
    setBackupType('local');
    setIsBackingUp(true);
    try {
      downloadBackup();
      showSuccess('Local backup downloaded successfully!');
    } finally {
      setIsBackingUp(false);
      setBackupType(null);
      onClose();
    }
  };

  const handleExcelBackup = async () => {
    setBackupType('excel');
    setIsBackingUp(true);
    try {
      // downloadExcelBackup will fetch data internally from localStorage
      await downloadExcelBackup();
      showSuccess('Excel backup downloaded successfully!');
    } catch (error) {
      showError('Failed to create Excel backup');
      console.error('Excel backup error:', error);
    } finally {
      setIsBackingUp(false);
      setBackupType(null);
      onClose();
    }
  };

  const handleGoogleDriveBackup = async () => {
    setBackupType('drive');
    setIsBackingUp(true);
    try {
      // Gather data from localStorage for Google Drive backup
      const backupData = {
        version: '2.3.0',
        timestamp: new Date().toISOString(),
        data: {
          billboards: JSON.parse(localStorage.getItem('db_billboards') || '[]'),
          clients: JSON.parse(localStorage.getItem('db_clients') || '[]'),
          contracts: JSON.parse(localStorage.getItem('db_contracts') || '[]'),
          invoices: JSON.parse(localStorage.getItem('db_invoices') || '[]'),
          expenses: JSON.parse(localStorage.getItem('db_expenses') || '[]'),
          users: JSON.parse(localStorage.getItem('db_users') || '[]'),
          tasks: JSON.parse(localStorage.getItem('db_tasks') || '[]'),
          maintenance_logs: JSON.parse(localStorage.getItem('db_maintenance_logs') || '[]'),
          outsourced: JSON.parse(localStorage.getItem('db_outsourced') || '[]'),
          printing: JSON.parse(localStorage.getItem('db_printing') || '[]'),
          audit_logs: JSON.parse(localStorage.getItem('db_logs') || '[]'),
          company_profile: JSON.parse(localStorage.getItem('db_company_profile') || '{}')
        }
      };

      const result = await backupToGoogleDrive(backupData, true);
      if (result.success) {
        showSuccess('Backup uploaded to Google Drive successfully!');
      } else {
        showError(result.error || 'Failed to upload backup to Google Drive');
      }
    } catch (error) {
      showError('Failed to upload backup to Google Drive');
      console.error('Google Drive backup error:', error);
    } finally {
      setIsBackingUp(false);
      setBackupType(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-bounce-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Weekly Backup Reminder</h2>
              <p className="text-white/80 text-sm">It's Friday — time to back up!</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex items-start gap-3 mb-5 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800 font-medium">Backup Status</p>
              {backupStatus.lastBackup ? (
                <p className="text-sm text-amber-700 mt-1">
                  Last backup: <strong>{backupStatus.lastBackup}</strong>
                  <br />
                  <span className={backupStatus.isOverdue ? 'text-red-600' : 'text-emerald-600'}>
                    ({backupStatus.daysAgo} day{backupStatus.daysAgo !== 1 ? 's' : ''} ago)
                  </span>
                </p>
              ) : (
                <p className="text-sm text-red-600 mt-1 font-medium">
                  No backups found — please create one now!
                </p>
              )}
            </div>
          </div>

          <p className="text-slate-600 text-sm mb-6">
            Regular backups protect your data from accidental loss. We recommend creating a weekly 
            backup every Friday to keep your billboards, clients, contracts, and financial records safe.
          </p>

          <div className="flex flex-col gap-3">
            {/* Google Drive Backup - Show if connected */}
            {isGoogleDriveConnected && (
              <button
                onClick={handleGoogleDriveBackup}
                disabled={isBackingUp}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                <Cloud className="w-5 h-5" />
                {isBackingUp && backupType === 'drive' ? 'Uploading...' : 'Backup to Google Drive'}
              </button>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleLocalBackup}
                disabled={isBackingUp}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                {isBackingUp && backupType === 'local' ? 'Downloading...' : 'Download JSON'}
              </button>
              <button
                onClick={handleExcelBackup}
                disabled={isBackingUp}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-5 h-5" />
                {isBackingUp && backupType === 'excel' ? 'Exporting...' : 'Download Excel'}
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Remind Later
            </button>
          </div>
        </div>

        {/* Footer Tip */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center">
            💡 Tip: {isGoogleDriveConnected 
              ? 'Google Drive is connected — your backups can be saved to the cloud!'
              : 'Connect Google Drive in Settings for automatic cloud backups'}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.9); }
          50% { transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-bounce-in {
          animation: bounceIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default FridayReminderModal;
