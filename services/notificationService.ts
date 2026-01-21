// Notification Service for Toast Messages and Backup Reminders

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

// Global listeners for toast notifications
const toastListeners = new Set<(toast: Toast) => void>();

// Subscribe to toast notifications
export const subscribeToToasts = (listener: (toast: Toast) => void) => {
  toastListeners.add(listener);
  return () => toastListeners.delete(listener);
};

// Show a toast notification
export const showToast = (message: string, type: ToastType = 'success', duration: number = 3000) => {
  const toast: Toast = {
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    message,
    type,
    duration
  };
  toastListeners.forEach(listener => listener(toast));
  return toast.id;
};

// Convenience functions
export const showSuccess = (message: string) => showToast(message, 'success');
export const showError = (message: string) => showToast(message, 'error', 5000);
export const showWarning = (message: string) => showToast(message, 'warning', 4000);
export const showInfo = (message: string) => showToast(message, 'info');

// ===== WEEKLY BACKUP SYSTEM =====

const BACKUP_STORAGE_KEY = 'db_weekly_backup_schedule';
const LAST_FRIDAY_REMINDER_KEY = 'db_last_friday_reminder';

interface BackupSchedule {
  lastBackup: string | null;
  lastReminder: string | null;
  autoBackupEnabled: boolean;
  reminderDay: number; // 0 = Sunday, 5 = Friday
  reminderTime: string; // HH:mm format
}

const getBackupSchedule = (): BackupSchedule => {
  try {
    const stored = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load backup schedule:', e);
  }
  return {
    lastBackup: null,
    lastReminder: null,
    autoBackupEnabled: true,
    reminderDay: 5, // Friday
    reminderTime: '09:00'
  };
};

const saveBackupSchedule = (schedule: BackupSchedule) => {
  try {
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(schedule));
  } catch (e) {
    console.error('Failed to save backup schedule:', e);
  }
};

// Check if today is Friday and we should show a reminder
export const checkFridayReminder = (): { shouldRemind: boolean; message: string } => {
  const now = new Date();
  const schedule = getBackupSchedule();
  
  // Check if it's Friday (day 5)
  if (now.getDay() !== schedule.reminderDay) {
    return { shouldRemind: false, message: '' };
  }
  
  // Check if we already reminded today
  const today = now.toISOString().split('T')[0];
  if (schedule.lastReminder === today) {
    return { shouldRemind: false, message: '' };
  }
  
  // Calculate days since last backup
  let daysSinceBackup = 'Never backed up';
  if (schedule.lastBackup) {
    const lastBackupDate = new Date(schedule.lastBackup);
    const diffTime = Math.abs(now.getTime() - lastBackupDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    daysSinceBackup = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
  
  // Mark reminder as shown for today
  schedule.lastReminder = today;
  saveBackupSchedule(schedule);
  
  return { 
    shouldRemind: true, 
    message: `📅 Weekly Backup Reminder: It's Friday! Last backup: ${daysSinceBackup}. Consider creating a backup now.`
  };
};

// Perform weekly backup
export const performWeeklyBackup = (): { success: boolean; data: string; filename: string } => {
  try {
    const schedule = getBackupSchedule();
    const now = new Date();
    
    // Create backup data
    const backupData = {
      version: '2.1.0',
      backupType: 'weekly',
      timestamp: now.toISOString(),
      createdAt: now.toLocaleString(),
      data: {
        billboards: JSON.parse(localStorage.getItem('db_billboards') || '[]'),
        contracts: JSON.parse(localStorage.getItem('db_contracts') || '[]'),
        clients: JSON.parse(localStorage.getItem('db_clients') || '[]'),
        invoices: JSON.parse(localStorage.getItem('db_invoices') || '[]'),
        expenses: JSON.parse(localStorage.getItem('db_expenses') || '[]'),
        users: JSON.parse(localStorage.getItem('db_users') || '[]'),
        tasks: JSON.parse(localStorage.getItem('db_tasks') || '[]'),
        maintenance_logs: JSON.parse(localStorage.getItem('db_maintenance_logs') || '[]'),
        outsourced: JSON.parse(localStorage.getItem('db_outsourced') || '[]'),
        printing: JSON.parse(localStorage.getItem('db_printing') || '[]'),
        audit_logs: JSON.parse(localStorage.getItem('db_logs') || '[]'),
        company_profile: JSON.parse(localStorage.getItem('db_company_profile') || '{}'),
        company_logo: localStorage.getItem('db_logo') || ''
      }
    };
    
    // Update last backup date
    schedule.lastBackup = now.toISOString();
    saveBackupSchedule(schedule);
    
    // Generate filename with date
    const dateStr = now.toISOString().split('T')[0];
    const filename = `dreambox-backup-${dateStr}.json`;
    
    return {
      success: true,
      data: JSON.stringify(backupData, null, 2),
      filename
    };
  } catch (e) {
    console.error('Weekly backup failed:', e);
    return { success: false, data: '', filename: '' };
  }
};

// Download backup file
export const downloadBackup = () => {
  const { success, data, filename } = performWeeklyBackup();
  
  if (!success) {
    showError('Failed to create backup. Please try again.');
    return false;
  }
  
  try {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess(`✅ Backup saved: ${filename}`);
    return true;
  } catch (e) {
    showError('Failed to download backup file.');
    return false;
  }
};

// Get backup status
export const getBackupStatus = (): { lastBackup: string | null; daysAgo: number | null; isOverdue: boolean } => {
  const schedule = getBackupSchedule();
  
  if (!schedule.lastBackup) {
    return { lastBackup: null, daysAgo: null, isOverdue: true };
  }
  
  const lastBackupDate = new Date(schedule.lastBackup);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lastBackupDate.getTime());
  const daysAgo = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return {
    lastBackup: lastBackupDate.toLocaleString(),
    daysAgo,
    isOverdue: daysAgo > 7
  };
};

// Enable/disable auto backup reminder
export const setAutoBackupEnabled = (enabled: boolean) => {
  const schedule = getBackupSchedule();
  schedule.autoBackupEnabled = enabled;
  saveBackupSchedule(schedule);
};

export const isAutoBackupEnabled = (): boolean => {
  return getBackupSchedule().autoBackupEnabled;
};
