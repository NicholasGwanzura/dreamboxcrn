import React from 'react';
import { Calendar, Download, X, AlertCircle } from 'lucide-react';
import { downloadBackup, getBackupStatus } from '../services/notificationService';

interface FridayReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FridayReminderModal: React.FC<FridayReminderModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const backupStatus = getBackupStatus();

  const handleBackupNow = () => {
    downloadBackup();
    onClose();
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

          <div className="flex gap-3">
            <button
              onClick={handleBackupNow}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/20"
            >
              <Download className="w-5 h-5" />
              Backup Now
            </button>
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
            💡 Tip: You can also access backups from Settings → Data Management
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
