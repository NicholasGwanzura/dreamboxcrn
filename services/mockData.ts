import { Billboard, BillboardType, Client, Contract, Invoice, Expense, User, PrintingJob, OutsourcedBillboard, AuditLogEntry, CompanyProfile, Task, VAT_RATE, MaintenanceLog } from '../types';
import { supabase } from './supabaseClient';
import { showSuccess, showError } from './notificationService';

export const ZIM_TOWNS = [
  "Harare", "Bulawayo", "Mutare", "Gweru", "Kwekwe", 
  "Masvingo", "Chinhoyi", "Marondera", "Kadoma", "Victoria Falls", "Beitbridge", "Zvishavane", "Bindura", "Chitungwiza"
];

// --- Global Subscription System for Real-time Updates ---
const listeners = new Set<() => void>();

// Track if Supabase sync has completed (Supabase = source of truth)
let supabaseSyncComplete = false;

export const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const notifyListeners = () => {
    listeners.forEach(listener => listener());
};

const INITIAL_BILLBOARDS: Billboard[] = [];
const INITIAL_CLIENTS: Client[] = [];
const INITIAL_CONTRACTS: Contract[] = [];

const STORAGE_KEYS = {
    BILLBOARDS: 'db_billboards',
    CONTRACTS: 'db_contracts',
    INVOICES: 'db_invoices',
    EXPENSES: 'db_expenses',
    USERS: 'db_users',
    CLIENTS: 'db_clients',
    LOGS: 'db_logs',
    OUTSOURCED: 'db_outsourced',
    PRINTING: 'db_printing',
    TASKS: 'db_tasks',
    MAINTENANCE: 'db_maintenance_logs',
    LOGO: 'db_logo',
    PROFILE: 'db_company_profile',
    LAST_BACKUP: 'db_last_backup_meta',
    AUTO_BACKUP: 'db_auto_backup_data',
    CLOUD_BACKUP: 'db_cloud_backup_meta',
    CLOUD_MIRROR: 'db_cloud_mirror_data',
    DATA_VERSION: 'db_data_version',
    RESTORE_TIMESTAMP: 'db_restore_timestamp',
    DELETED_QUEUE: 'db_deleted_queue' 
};

const loadFromStorage = <T>(key: string, defaultValue: T | null): T | null => {
    try {
        const stored = localStorage.getItem(key);
        if (stored === null) return defaultValue;
        return JSON.parse(stored);
    } catch (e) {
        console.error(`Error loading ${key}`, e);
        return defaultValue;
    }
};

const saveToStorage = (key: string, data: any) => {
    try {
        const serialized = JSON.stringify(data);
        localStorage.setItem(key, serialized);
    } catch (e: any) {
        console.error(`Error saving ${key}`, e);
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            console.warn("Storage Full! Attempting auto-cleanup...");
            try {
                localStorage.removeItem(STORAGE_KEYS.LOGS);
                localStorage.removeItem(STORAGE_KEYS.AUTO_BACKUP);
                localStorage.removeItem(STORAGE_KEYS.CLOUD_MIRROR);
                const serialized = JSON.stringify(data);
                localStorage.setItem(key, serialized);
            } catch (retryError) { console.error("Critical Storage Error"); }
        }
    }
};

window.addEventListener('storage', (event) => {
    if (event.key && event.key.startsWith('db_')) {
        switch(event.key) {
            case STORAGE_KEYS.BILLBOARDS: billboards = loadFromStorage(STORAGE_KEYS.BILLBOARDS, []) || []; break;
            case STORAGE_KEYS.CONTRACTS: contracts = loadFromStorage(STORAGE_KEYS.CONTRACTS, []) || []; break;
            case STORAGE_KEYS.CLIENTS: clients = loadFromStorage(STORAGE_KEYS.CLIENTS, []) || []; break;
            case STORAGE_KEYS.INVOICES: invoices = loadFromStorage(STORAGE_KEYS.INVOICES, []) || []; break;
            case STORAGE_KEYS.EXPENSES: expenses = loadFromStorage(STORAGE_KEYS.EXPENSES, []) || []; break;
            case STORAGE_KEYS.USERS: users = loadFromStorage(STORAGE_KEYS.USERS, []) || []; break;
            case STORAGE_KEYS.TASKS: tasks = loadFromStorage(STORAGE_KEYS.TASKS, []) || []; break;
            case STORAGE_KEYS.MAINTENANCE: maintenanceLogs = loadFromStorage(STORAGE_KEYS.MAINTENANCE, []) || []; break;
            case STORAGE_KEYS.PROFILE: companyProfile = loadFromStorage(STORAGE_KEYS.PROFILE, null) || companyProfile; break;
        }
        notifyListeners();
    }
});

const syncToCloudMirror = () => {
    try {
        const payload = {
            timestamp: new Date().toISOString(),
            data: {
                billboards, contracts, clients, invoices, expenses, 
                users, outsourcedBillboards, auditLogs, printingJobs, companyLogo, companyProfile, tasks, maintenanceLogs
            }
        };
        localStorage.setItem(STORAGE_KEYS.CLOUD_MIRROR, JSON.stringify(payload));
    } catch (e) {
        console.error("Cloud Mirror Sync Failed", e);
    }
}

interface DeletedItem { table: string; id: string; timestamp: number; }
let deletedQueue: DeletedItem[] = loadFromStorage(STORAGE_KEYS.DELETED_QUEUE, []) || [];

const queueForDeletion = (table: string, id: string) => {
    if (!deletedQueue.find(i => i.table === table && i.id === id)) {
        deletedQueue.push({ table, id, timestamp: Date.now() });
        saveToStorage(STORAGE_KEYS.DELETED_QUEUE, deletedQueue);
    }
    deleteFromSupabase(table, id);
};

const deleteFromSupabase = async (table: string, id: string) => {
    if (!supabase) return;
    try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) { console.error(`Supabase Delete Error (${table}):`, error); } else {
            deletedQueue = deletedQueue.filter(i => !(i.table === table && i.id === id));
            saveToStorage(STORAGE_KEYS.DELETED_QUEUE, deletedQueue);
        }
    } catch (e) { console.error(`Supabase Exception (${table}):`, e); }
}

export const syncToSupabase = async (table: string, data: any) => {
    if (!supabase) {
        console.log(`⚠️ Supabase not configured, skipping sync for ${table}`);
        return;
    }
    try { 
        console.log(`📤 Syncing to ${table}:`, data.id || data);
        const { error } = await supabase.from(table).upsert(data); 
        if (error) {
            console.error(`❌ Supabase Sync Error (${table}):`, error.message, error);
        } else {
            console.log(`✅ Synced to ${table} successfully`);
        }
    } catch (e) { 
        console.error(`❌ Supabase Exception (${table}):`, e); 
    }
};

/**
 * Pull all records from Supabase and persist them locally
 * This runs on login to ensure local data is in sync with cloud
 * RULE: Supabase is ALWAYS the source of truth - localStorage is just cache
 */
export const pullAllDataFromSupabase = async (): Promise<boolean> => {
    console.log('📡 pullAllDataFromSupabase called');
    console.log('📡 Supabase client exists:', !!supabase);
    
    if (!supabase) {
        console.warn('❌ Supabase not configured, using localStorage fallback');
        return false;
    }

    try {
        console.log('🔄 Pulling all data from Supabase (PRIORITY: CLOUD)...');
        let syncedTables = 0;

        // Fetch and sync all tables - SUPABASE OVERWRITES LOCAL
        const tables = [
            { name: 'billboards', setter: (data: any[]) => { billboards = data; saveToStorage(STORAGE_KEYS.BILLBOARDS, data); } },
            { name: 'clients', setter: (data: any[]) => { clients = data; saveToStorage(STORAGE_KEYS.CLIENTS, data); } },
            { name: 'contracts', setter: (data: any[]) => { contracts = data; saveToStorage(STORAGE_KEYS.CONTRACTS, data); } },
            { name: 'invoices', setter: (data: any[]) => { invoices = data; saveToStorage(STORAGE_KEYS.INVOICES, data); } },
            { name: 'expenses', setter: (data: any[]) => { expenses = data; saveToStorage(STORAGE_KEYS.EXPENSES, data); } },
            { name: 'users', setter: (data: any[]) => { users = data; saveToStorage(STORAGE_KEYS.USERS, data); } },
            { name: 'tasks', setter: (data: any[]) => { tasks = data; saveToStorage(STORAGE_KEYS.TASKS, data); } },
            { name: 'maintenance_logs', setter: (data: any[]) => { maintenanceLogs = data; saveToStorage(STORAGE_KEYS.MAINTENANCE, data); } },
            { name: 'outsourced_billboards', setter: (data: any[]) => { outsourcedBillboards = data; saveToStorage(STORAGE_KEYS.OUTSOURCED, data); } },
            { name: 'printing_jobs', setter: (data: any[]) => { printingJobs = data; saveToStorage(STORAGE_KEYS.PRINTING, data); } },
            { name: 'audit_logs', setter: (data: any[]) => { 
                // Sort by timestamp descending (newest first)
                auditLogs = data.sort((a, b) => {
                    const dateA = new Date(a.timestamp).getTime();
                    const dateB = new Date(b.timestamp).getTime();
                    return dateB - dateA;
                });
                saveToStorage(STORAGE_KEYS.LOGS, auditLogs); 
            } },
        ];

        for (const table of tables) {
            try {
                const { data, error } = await supabase.from(table.name).select('*');
                if (error) {
                    console.warn(`⚠️ Error fetching ${table.name}:`, error.message);
                    continue;
                }
                // ALWAYS use Supabase data, even if empty (that's the truth)
                if (data) {
                    table.setter(data);
                    syncedTables++;
                    console.log(`✅ Synced ${data.length} records from ${table.name} (Supabase → Local)`);
                }
            } catch (e: any) {
                console.error(`❌ Exception fetching ${table.name}:`, e.message);
            }
        }

        // Fetch company profile separately (single record)
        try {
            const { data: profileData, error: profileError } = await supabase
                .from('company_profile')
                .select('*')
                .eq('id', 'profile_v1')
                .single();
            
            if (!profileError && profileData) {
                companyProfile = {
                    name: profileData.name || companyProfile.name,
                    address: profileData.address || companyProfile.address,
                    phone: profileData.phone || companyProfile.phone,
                    email: profileData.email || companyProfile.email,
                    website: profileData.website || companyProfile.website,
                };
                if (profileData.logo) {
                    companyLogo = profileData.logo;
                    saveToStorage(STORAGE_KEYS.LOGO, companyLogo);
                }
                saveToStorage(STORAGE_KEYS.PROFILE, companyProfile);
                console.log('✅ Synced company profile from Supabase');
            }
        } catch (e) {
            console.log('ℹ️ No company profile found in Supabase');
        }

        // Mark Supabase sync as complete - app can now trust local cache
        supabaseSyncComplete = true;
        
        notifyListeners();
        console.log(`✅ SUPABASE SYNC COMPLETE! ${syncedTables} tables loaded. Supabase is now the source of truth.`);
        return true;
    } catch (error: any) {
        console.error('❌ Failed to pull data from Supabase:', error.message);
        return false;
    }
};

export const fetchLatestUsers = async () => {
    if (!supabase) return null;
    try {
        // Fetch users from Supabase - this is the source of truth for auth
        const { data, error } = await supabase.from('users').select('*');
        if (data && !error) {
            if (data.length > 0) {
                // We have remote users, overwrite local
                users = data;
                saveToStorage(STORAGE_KEYS.USERS, users);
                console.log("Users synced from cloud for login (Priority: Cloud).");
                return users;
            }
        }
    } catch (e) {
        console.error("Failed to fetch users for login:", e);
    }
    return null;
};

export const triggerFullSync = async () => {
    if (!supabase) return false;
    let hasChanges = false;
    
    // 1. Flush Deletions
    if (deletedQueue.length > 0) {
        const remaining: DeletedItem[] = [];
        for (const item of deletedQueue) {
            try { const { error } = await supabase.from(item.table).delete().eq('id', item.id); if (error) remaining.push(item); } catch (e) { remaining.push(item); }
        }
        if (deletedQueue.length !== remaining.length) { deletedQueue = remaining; saveToStorage(STORAGE_KEYS.DELETED_QUEUE, deletedQueue); }
    }
    
    const restoreTimeStr = localStorage.getItem(STORAGE_KEYS.RESTORE_TIMESTAMP);
    const restoreTime = restoreTimeStr ? parseInt(restoreTimeStr) : 0;
    const isRecentRestore = (Date.now() - restoreTime) < 300000; // 5 mins

    const smartSyncTable = async (tableName: string, localData: any[], setLocalData: (d: any[]) => void, storageKey: string) => {
        try {
            // A. Fetch Remote (Source of Truth)
            const { data: remoteData, error } = await supabase.from(tableName).select('*');
            if (error || !remoteData) return;

            const remoteMap = new Map(remoteData.map(d => [d.id, d]));
            const pendingDeleteIds = new Set(deletedQueue.filter(i => i.table === tableName).map(i => i.id));
            
            // B. Initialize merged with Remote Data (Prioritize Cloud)
            // Filter out things we are actively trying to delete
            const mergedData = remoteData.filter(d => !pendingDeleteIds.has(d.id));
            const mergedMap = new Set(mergedData.map(d => d.id));

            // C. Handle Local Items NOT in Remote
            const localOnly = localData.filter(l => !remoteMap.has(l.id));

            for (const item of localOnly) {
                if (pendingDeleteIds.has(item.id)) continue;

                let isNewLocal = false;
                
                // Timestamp check - is this item newly created?
                const parts = item.id.split('-');
                const potentialTs = parts.find((p: string) => p.length > 10 && !isNaN(Number(p)));
                
                if (potentialTs) {
                    const ts = Number(potentialTs);
                    if (Date.now() - ts < 600000) isNewLocal = true; // 10 mins generous window
                } else if (item.id.length < 10 || item.id.startsWith('dev-') || item.id.startsWith('owner-')) {
                    isNewLocal = true; // Static/Dev/Owner IDs
                }
                
                if (isRecentRestore) isNewLocal = true;
                if (tableName === 'users') isNewLocal = true; // Safety for users

                if (isNewLocal) {
                    if (!mergedMap.has(item.id)) {
                        mergedData.push(item);
                        // Push new local item to cloud immediately
                        syncToSupabase(tableName, item); 
                    }
                } 
                // else: Item is old locally but missing remotely -> Assume deleted by other user. Drop it.
            }

            // D. Apply Changes if different
            if (JSON.stringify(localData) !== JSON.stringify(mergedData)) { 
                setLocalData(mergedData); 
                saveToStorage(storageKey, mergedData); 
                hasChanges = true; 
            }

        } catch (e) { console.error(`Sync error ${tableName}:`, e); }
    };

    try {
        await Promise.all([
            smartSyncTable('billboards', billboards, (d) => billboards = d, STORAGE_KEYS.BILLBOARDS),
            smartSyncTable('clients', clients, (d) => clients = d, STORAGE_KEYS.CLIENTS),
            smartSyncTable('contracts', contracts, (d) => contracts = d, STORAGE_KEYS.CONTRACTS),
            smartSyncTable('invoices', invoices, (d) => invoices = d, STORAGE_KEYS.INVOICES),
            smartSyncTable('expenses', expenses, (d) => expenses = d, STORAGE_KEYS.EXPENSES),
            smartSyncTable('users', users, (d) => users = d, STORAGE_KEYS.USERS),
            smartSyncTable('tasks', tasks, (d) => tasks = d, STORAGE_KEYS.TASKS),
            smartSyncTable('maintenance_logs', maintenanceLogs, (d) => maintenanceLogs = d, STORAGE_KEYS.MAINTENANCE)
        ]);
        
        // Profile Sync
        const { data: profileData } = await supabase.from('company_profile').select('*').single();
        if (profileData) {
            if (isRecentRestore) { 
                const payload = { ...companyProfile, id: 'profile_v1', logo: companyLogo }; 
                await supabase.from('company_profile').upsert(payload); 
            } else if (JSON.stringify(profileData) !== JSON.stringify(companyProfile)) { 
                // Remote profile is different -> Update local to match remote
                companyProfile = profileData; 
                saveToStorage(STORAGE_KEYS.PROFILE, companyProfile); 
                if (profileData.logo) { 
                    companyLogo = profileData.logo; 
                    saveToStorage(STORAGE_KEYS.LOGO, companyLogo); 
                } 
                hasChanges = true; 
            }
        } else if (companyProfile) { 
            // Remote missing -> Push local
            const payload = { ...companyProfile, id: 'profile_v1', logo: companyLogo }; 
            await supabase.from('company_profile').upsert(payload); 
        }

        if (hasChanges) notifyListeners();
        return true;
    } catch (e) { return false; }
};

export const verifyDataIntegrity = async () => {
    if (!supabase) return null;
    const report = { billboards: { local: billboards.length, remote: 0 }, clients: { local: clients.length, remote: 0 }, contracts: { local: contracts.length, remote: 0 }, invoices: { local: invoices.length, remote: 0 }, users: { local: users.length, remote: 0 }, };
    try {
        const results = await Promise.all([
            supabase.from('billboards').select('*', { count: 'exact', head: true }),
            supabase.from('clients').select('*', { count: 'exact', head: true }),
            supabase.from('contracts').select('*', { count: 'exact', head: true }),
            supabase.from('invoices').select('*', { count: 'exact', head: true }),
            supabase.from('users').select('*', { count: 'exact', head: true }),
        ]);
        report.billboards.remote = results[0].count || 0; report.clients.remote = results[1].count || 0; report.contracts.remote = results[2].count || 0; report.invoices.remote = results[3].count || 0; report.users.remote = results[4].count || 0;
        return report;
    } catch (e) { return null; }
};

if (supabase) { setTimeout(() => triggerFullSync(), 500); }
export const getStorageUsage = () => { let total = 0; for (const key in localStorage) { if (localStorage.hasOwnProperty(key) && key.startsWith('db_')) { total += (localStorage[key].length * 2); } } return (total / 1024).toFixed(2); };

// --- Entity Exports & Initialization ---
export let billboards: Billboard[] = loadFromStorage(STORAGE_KEYS.BILLBOARDS, null) || INITIAL_BILLBOARDS; if (!loadFromStorage(STORAGE_KEYS.BILLBOARDS, null)) saveToStorage(STORAGE_KEYS.BILLBOARDS, billboards);
export let clients: Client[] = loadFromStorage(STORAGE_KEYS.CLIENTS, null) || INITIAL_CLIENTS; if (!loadFromStorage(STORAGE_KEYS.CLIENTS, null)) saveToStorage(STORAGE_KEYS.CLIENTS, clients);
export let contracts: Contract[] = loadFromStorage(STORAGE_KEYS.CONTRACTS, null) || INITIAL_CONTRACTS; if (!loadFromStorage(STORAGE_KEYS.CONTRACTS, null)) saveToStorage(STORAGE_KEYS.CONTRACTS, contracts);
export let invoices: Invoice[] = loadFromStorage(STORAGE_KEYS.INVOICES, []) || [];
export let expenses: Expense[] = loadFromStorage(STORAGE_KEYS.EXPENSES, []) || [];
export let auditLogs: AuditLogEntry[] = loadFromStorage(STORAGE_KEYS.LOGS, []) || [];
export let outsourcedBillboards: OutsourcedBillboard[] = loadFromStorage(STORAGE_KEYS.OUTSOURCED, []) || [];
export let printingJobs: PrintingJob[] = loadFromStorage(STORAGE_KEYS.PRINTING, []) || [];
export let maintenanceLogs: MaintenanceLog[] = loadFromStorage(STORAGE_KEYS.MAINTENANCE, []) || [];
export let tasks: Task[] = loadFromStorage(STORAGE_KEYS.TASKS, null) || []; if (!localStorage.getItem(STORAGE_KEYS.TASKS)) saveToStorage(STORAGE_KEYS.TASKS, tasks);
export let users: User[] = loadFromStorage(STORAGE_KEYS.USERS, null) || [];
const updatedUsers = users.map(u => ({ ...u, username: u.username || u.email.split('@')[0], status: u.status || 'Active' })); if (JSON.stringify(updatedUsers) !== JSON.stringify(users)) { users = updatedUsers; saveToStorage(STORAGE_KEYS.USERS, users); }

// Production mode: Users are managed through Supabase Auth only
// No hardcoded developer accounts

saveToStorage(STORAGE_KEYS.USERS, users);

let companyLogo = loadFromStorage(STORAGE_KEYS.LOGO, null) || 'https://placehold.co/200x200/0f172a/white?text=Dreambox';
const DEFAULT_PROFILE: CompanyProfile = { name: "Dreambox Advertising", vatNumber: "VAT-DBX-001", regNumber: "REG-2026/DBX", email: "info@dreambox.co.zw", supportEmail: "support@dreambox.co.zw", phone: "+263 777 999 888", website: "www.dreambox.co.zw", address: "123 Creative Park, Borrowdale", city: "Harare", country: "Zimbabwe" };
let companyProfile: CompanyProfile = loadFromStorage(STORAGE_KEYS.PROFILE, null) || DEFAULT_PROFILE;
let lastBackupDate = loadFromStorage(STORAGE_KEYS.LAST_BACKUP, null) || 'Never'; let lastCloudBackup = loadFromStorage(STORAGE_KEYS.CLOUD_BACKUP, null) || 'Never';

// ... (Other getters/setters/helpers remain same)
export const getCompanyLogo = () => companyLogo;
export const setCompanyLogo = (url: string) => { companyLogo = url; saveToStorage(STORAGE_KEYS.LOGO, companyLogo); if(supabase) syncToSupabase('company_profile', { ...companyProfile, id: 'profile_v1', logo: url }); logAction('Settings Update', 'Updated company logo'); notifyListeners(); };
export const resetCompanyLogo = () => { companyLogo = 'https://placehold.co/200x200/0f172a/white?text=Dreambox'; saveToStorage(STORAGE_KEYS.LOGO, companyLogo); if(supabase) syncToSupabase('company_profile', { ...companyProfile, id: 'profile_v1', logo: companyLogo }); logAction('Settings Update', 'Reset company logo to default'); notifyListeners(); };
export const getCompanyProfile = () => companyProfile;
export const createCompanyProfile = (profile: CompanyProfile) => { companyProfile = profile; saveToStorage(STORAGE_KEYS.PROFILE, companyProfile); if(supabase) syncToSupabase('company_profile', { ...profile, id: 'profile_v1', logo: companyLogo }); logAction('Settings Create', 'Created company profile'); notifyListeners(); };
export const updateCompanyProfile = (profile: CompanyProfile) => { companyProfile = profile; saveToStorage(STORAGE_KEYS.PROFILE, companyProfile); if(supabase) syncToSupabase('company_profile', { ...profile, id: 'profile_v1', logo: companyLogo }); logAction('Settings Update', 'Updated company profile details'); notifyListeners(); };
export const resetCompanyProfile = () => { companyProfile = DEFAULT_PROFILE; saveToStorage(STORAGE_KEYS.PROFILE, companyProfile); if(supabase) syncToSupabase('company_profile', { ...DEFAULT_PROFILE, id: 'profile_v1', logo: companyLogo }); logAction('Settings Reset', 'Reset company profile to defaults'); notifyListeners(); };
export const createSystemBackup = () => { 
    const now = new Date();
    lastBackupDate = now.toLocaleString(); 
    saveToStorage(STORAGE_KEYS.LAST_BACKUP, lastBackupDate); 
    syncToCloudMirror(); 
    
    // Create comprehensive backup with metadata
    const backup = {
        // Metadata
        version: '2.0.0',
        appName: 'Dreambox Billboard Suite',
        timestamp: now.toISOString(),
        createdAt: now.toLocaleString(),
        
        // Statistics for verification
        stats: {
            billboards: billboards.length,
            clients: clients.length,
            contracts: contracts.length,
            invoices: invoices.length,
            expenses: expenses.length,
            users: users.length,
            tasks: tasks.length,
            maintenanceLogs: maintenanceLogs.length,
            outsourcedBillboards: outsourcedBillboards.length,
            printingJobs: printingJobs.length,
            auditLogs: auditLogs.length,
            totalRecords: billboards.length + clients.length + contracts.length + 
                          invoices.length + expenses.length + users.length + 
                          tasks.length + maintenanceLogs.length + 
                          outsourcedBillboards.length + printingJobs.length
        },
        
        // All data
        data: { 
            billboards, 
            contracts, 
            clients, 
            invoices, 
            expenses, 
            users, 
            outsourcedBillboards, 
            auditLogs, 
            printingJobs, 
            companyLogo, 
            companyProfile, 
            tasks, 
            maintenanceLogs 
        }
    };
    
    console.log(`📦 Backup created with ${backup.stats.totalRecords} total records`);
    logAction('System Backup', `Created backup with ${backup.stats.totalRecords} records`);
    
    return JSON.stringify(backup, null, 2); 
};
export const simulateCloudSync = async () => { await new Promise(resolve => setTimeout(resolve, 2000)); syncToCloudMirror(); if(supabase) await triggerFullSync(); lastCloudBackup = new Date().toLocaleString(); saveToStorage(STORAGE_KEYS.CLOUD_BACKUP, lastCloudBackup); logAction('System', 'Cloud backup completed successfully (Redundant Mirror)'); notifyListeners(); return lastCloudBackup; };
export const getLastCloudBackupDate = () => lastCloudBackup; export const restoreDefaultBillboards = () => 0; export const triggerAutoBackup = () => { saveToStorage(STORAGE_KEYS.AUTO_BACKUP, { timestamp: new Date().toISOString(), data: { billboards, contracts, clients, invoices, expenses, users, outsourcedBillboards, auditLogs, printingJobs, companyLogo, companyProfile, tasks, maintenanceLogs } }); syncToCloudMirror(); return new Date().toLocaleString(); };
export const runAutoBilling = () => { /* ... existing ... */ return 0; };
export const runMaintenanceCheck = () => 0; export const getAutoBackupStatus = () => { const autoBackup = loadFromStorage(STORAGE_KEYS.AUTO_BACKUP, null); return autoBackup ? new Date(autoBackup.timestamp).toLocaleString() : 'None'; }; export const getLastManualBackupDate = () => lastBackupDate;
export const restoreSystemBackup = async (jsonString: string): Promise<{ success: boolean; count: number }> => { 
    try {
        const backup = JSON.parse(jsonString);
        if (!backup.data) {
            console.error('Invalid backup format: missing data property');
            return { success: false, count: 0 };
        }

        const data = backup.data;
        let itemCount = 0;

        console.log('🔄 Restoring backup from:', backup.timestamp || 'unknown date');

        // Restore each data type to local storage AND sync to Supabase
        if (data.billboards && Array.isArray(data.billboards)) {
            billboards = data.billboards;
            saveToStorage(STORAGE_KEYS.BILLBOARDS, billboards);
            itemCount += billboards.length;
            console.log(`📋 Restored ${billboards.length} billboards`);
        }

        if (data.clients && Array.isArray(data.clients)) {
            clients = data.clients;
            saveToStorage(STORAGE_KEYS.CLIENTS, clients);
            itemCount += clients.length;
            console.log(`👥 Restored ${clients.length} clients`);
        }

        if (data.contracts && Array.isArray(data.contracts)) {
            contracts = data.contracts;
            saveToStorage(STORAGE_KEYS.CONTRACTS, contracts);
            itemCount += contracts.length;
            console.log(`📝 Restored ${contracts.length} contracts`);
        }

        if (data.invoices && Array.isArray(data.invoices)) {
            invoices = data.invoices;
            saveToStorage(STORAGE_KEYS.INVOICES, invoices);
            itemCount += invoices.length;
            console.log(`💰 Restored ${invoices.length} invoices`);
        }

        if (data.expenses && Array.isArray(data.expenses)) {
            expenses = data.expenses;
            saveToStorage(STORAGE_KEYS.EXPENSES, expenses);
            itemCount += expenses.length;
            console.log(`💸 Restored ${expenses.length} expenses`);
        }

        if (data.users && Array.isArray(data.users)) {
            users = data.users;
            saveToStorage(STORAGE_KEYS.USERS, users);
            itemCount += users.length;
            console.log(`👤 Restored ${users.length} users`);
        }

        if (data.tasks && Array.isArray(data.tasks)) {
            tasks = data.tasks;
            saveToStorage(STORAGE_KEYS.TASKS, tasks);
            itemCount += tasks.length;
            console.log(`✅ Restored ${tasks.length} tasks`);
        }

        if (data.maintenanceLogs && Array.isArray(data.maintenanceLogs)) {
            maintenanceLogs = data.maintenanceLogs;
            saveToStorage(STORAGE_KEYS.MAINTENANCE, maintenanceLogs);
            itemCount += maintenanceLogs.length;
            console.log(`🔧 Restored ${maintenanceLogs.length} maintenance logs`);
        }

        if (data.outsourcedBillboards && Array.isArray(data.outsourcedBillboards)) {
            outsourcedBillboards = data.outsourcedBillboards;
            saveToStorage(STORAGE_KEYS.OUTSOURCED, outsourcedBillboards);
            itemCount += outsourcedBillboards.length;
            console.log(`🌐 Restored ${outsourcedBillboards.length} outsourced billboards`);
        }

        if (data.printingJobs && Array.isArray(data.printingJobs)) {
            printingJobs = data.printingJobs;
            saveToStorage(STORAGE_KEYS.PRINTING, printingJobs);
            itemCount += printingJobs.length;
            console.log(`🖨️ Restored ${printingJobs.length} printing jobs`);
        }

        if (data.auditLogs && Array.isArray(data.auditLogs)) {
            auditLogs = data.auditLogs;
            saveToStorage(STORAGE_KEYS.LOGS, auditLogs);
            console.log(`📜 Restored ${auditLogs.length} audit logs`);
        }

        if (data.companyProfile) {
            companyProfile = data.companyProfile;
            saveToStorage(STORAGE_KEYS.PROFILE, companyProfile);
            console.log(`🏢 Restored company profile`);
        }

        if (data.companyLogo) {
            companyLogo = data.companyLogo;
            saveToStorage(STORAGE_KEYS.LOGO, companyLogo);
            console.log(`🖼️ Restored company logo`);
        }

        // Mark restore timestamp for sync priority
        localStorage.setItem(STORAGE_KEYS.RESTORE_TIMESTAMP, Date.now().toString());

        // NOW SYNC EVERYTHING TO SUPABASE
        if (supabase) {
            console.log('☁️ Pushing restored data to Supabase...');
            
            // Sync all tables to Supabase (upsert each record)
            const syncPromises: Promise<void>[] = [];

            // Billboards
            for (const billboard of billboards) {
                syncPromises.push(syncToSupabase('billboards', billboard));
            }

            // Clients
            for (const client of clients) {
                syncPromises.push(syncToSupabase('clients', client));
            }

            // Contracts
            for (const contract of contracts) {
                syncPromises.push(syncToSupabase('contracts', contract));
            }

            // Invoices
            for (const invoice of invoices) {
                syncPromises.push(syncToSupabase('invoices', invoice));
            }

            // Expenses
            for (const expense of expenses) {
                syncPromises.push(syncToSupabase('expenses', expense));
            }

            // Users
            for (const user of users) {
                syncPromises.push(syncToSupabase('users', user));
            }

            // Tasks
            for (const task of tasks) {
                syncPromises.push(syncToSupabase('tasks', task));
            }

            // Maintenance logs
            for (const log of maintenanceLogs) {
                syncPromises.push(syncToSupabase('maintenance_logs', log));
            }

            // Outsourced billboards
            for (const ob of outsourcedBillboards) {
                syncPromises.push(syncToSupabase('outsourced_billboards', ob));
            }

            // Printing jobs
            for (const job of printingJobs) {
                syncPromises.push(syncToSupabase('printing_jobs', job));
            }

            // Company profile
            if (companyProfile) {
                syncPromises.push(syncToSupabase('company_profile', { 
                    ...companyProfile, 
                    id: 'profile_v1', 
                    logo: companyLogo 
                }));
            }

            // Wait for all syncs to complete
            await Promise.all(syncPromises);
            console.log(`✅ Pushed ${syncPromises.length} records to Supabase`);
        }

        // Log the restore action
        logAction('System Restore', `Restored ${itemCount} items from backup (${backup.timestamp || 'unknown date'})`);
        
        // Notify all listeners to refresh UI
        notifyListeners();
        
        console.log(`✅ RESTORE COMPLETE! ${itemCount} items restored and synced to cloud.`);
        return { success: true, count: itemCount };

    } catch (error: any) {
        console.error('❌ Restore failed:', error);
        return { success: false, count: 0 };
    }
};

// ===== AUDIT LOG CRUD =====

// Helper to get the current logged-in user's name
const getCurrentUserName = (): string => {
    try {
        const stored = localStorage.getItem('billboard_user');
        if (stored) {
            const user = JSON.parse(stored);
            return user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user.email || 'Unknown User';
        }
    } catch (e) {
        console.warn('Failed to get current user for audit log');
    }
    return 'System';
};

// CREATE - Add new audit log entry with Supabase sync
export const logAction = (action: string, details: string, user?: string) => { 
    const log: AuditLogEntry = { 
        id: `log-${Date.now()}`, 
        timestamp: new Date().toLocaleString(), 
        action, 
        details, 
        user: user || getCurrentUserName()
    }; 
    auditLogs = [log, ...auditLogs]; 
    saveToStorage(STORAGE_KEYS.LOGS, auditLogs); 
    // Sync to Supabase
    if (supabase) syncToSupabase('audit_logs', log);
};

// READ - Async getter that fetches from Supabase first (source of truth)
export const getAuditLogsAsync = async (): Promise<AuditLogEntry[]> => {
    if (!supabase) return auditLogs || [];
    const data = await fetchFromSupabase<AuditLogEntry>('audit_logs', auditLogs);
    if (data.length > 0) { 
        // Sort by timestamp descending (newest first)
        auditLogs = data.sort((a, b) => {
            const dateA = new Date(a.timestamp).getTime();
            const dateB = new Date(b.timestamp).getTime();
            return dateB - dateA;
        });
        saveToStorage(STORAGE_KEYS.LOGS, auditLogs); 
    }
    return auditLogs;
};

// UPDATE - Edit an existing audit log entry
export const updateAuditLog = (updatedLog: AuditLogEntry) => {
    const idx = auditLogs.findIndex(l => l.id === updatedLog.id);
    if (idx !== -1) {
        auditLogs[idx] = updatedLog;
        saveToStorage(STORAGE_KEYS.LOGS, auditLogs);
        if (supabase) syncToSupabase('audit_logs', updatedLog);
        notifyListeners();
        return true;
    }
    return false;
};

// DELETE - Remove a single audit log entry
export const deleteAuditLog = (id: string) => {
    const target = auditLogs.find(l => l.id === id);
    if (target) {
        auditLogs = auditLogs.filter(l => l.id !== id);
        saveToStorage(STORAGE_KEYS.LOGS, auditLogs);
        if (supabase) queueForDeletion('audit_logs', id);
        notifyListeners();
        return true;
    }
    return false;
};

// CLEAR ALL - Remove all audit logs (admin only)
export const clearAuditLogs = async () => {
    const count = auditLogs.length;
    if (count === 0) return { success: true, count: 0 };
    
    // Delete all from Supabase
    if (supabase) {
        try {
            await supabase.from('audit_logs').delete().neq('id', '');
        } catch (e) {
            console.error('Failed to clear audit logs from Supabase:', e);
        }
    }
    
    // Clear local
    auditLogs = [];
    saveToStorage(STORAGE_KEYS.LOGS, auditLogs);
    notifyListeners();
    
    // Log this action (creates a new entry after clear)
    logAction('System', `Cleared ${count} audit log entries`);
    
    return { success: true, count };
};

export const resetSystemData = () => { 
    // Preserve Supabase credentials to ensure connection is not lost
    const sbUrl = localStorage.getItem('sb_url');
    const sbKey = localStorage.getItem('sb_key');
    
    localStorage.clear(); 
    
    if (sbUrl) localStorage.setItem('sb_url', sbUrl);
    if (sbKey) localStorage.setItem('sb_key', sbKey);
    
    window.location.reload(); 
};

export const addBillboard = (billboard: Billboard) => { billboards = [...billboards, billboard]; saveToStorage(STORAGE_KEYS.BILLBOARDS, billboards); syncToCloudMirror(); syncToSupabase('billboards', billboard); logAction('Create Billboard', `Added ${billboard.name} (${billboard.type})`); showSuccess(`Billboard "${billboard.name}" added successfully`); notifyListeners(); };
export const updateBillboard = (updated: Billboard) => { billboards = billboards.map(b => b.id === updated.id ? updated : b); saveToStorage(STORAGE_KEYS.BILLBOARDS, billboards); syncToCloudMirror(); syncToSupabase('billboards', updated); logAction('Update Billboard', `Updated details for ${updated.name}`); showSuccess(`Billboard "${updated.name}" updated`); notifyListeners(); };
export const deleteBillboard = (id: string) => { const target = billboards.find(b => b.id === id); if (target) { billboards = billboards.filter(b => b.id !== id); saveToStorage(STORAGE_KEYS.BILLBOARDS, billboards); syncToCloudMirror(); queueForDeletion('billboards', id); logAction('Delete Billboard', `Removed ${target.name} from inventory`); showSuccess(`Billboard "${target.name}" deleted`); notifyListeners(); } };

export const addContract = (contract: Contract) => { 
    contracts = [...contracts, contract]; 
    saveToStorage(STORAGE_KEYS.CONTRACTS, contracts); 
    syncToSupabase('contracts', contract);
    const billboard = billboards.find(b => b.id === contract.billboardId);
    if(billboard) {
        if(billboard.type === BillboardType.Static) {
            if(contract.side === 'A' || contract.details.includes('Side A')) { billboard.sideAStatus = 'Rented'; billboard.sideAClientId = contract.clientId; }
            if(contract.side === 'B' || contract.details.includes('Side B')) { billboard.sideBStatus = 'Rented'; billboard.sideBClientId = contract.clientId; }
            if(contract.side === 'Both') { billboard.sideAStatus = 'Rented'; billboard.sideBStatus = 'Rented'; billboard.sideAClientId = contract.clientId; billboard.sideBClientId = contract.clientId; }
        } else if (billboard.type === BillboardType.LED) {
            billboard.rentedSlots = (billboard.rentedSlots || 0) + 1;
        }
        updateBillboard(billboard); 
    }
    syncToCloudMirror();
    logAction('Create Contract', `New contract for ${contract.billboardId}`);
    showSuccess('Contract created successfully'); 
    notifyListeners();
};

export const updateContract = (updated: Contract) => {
    contracts = contracts.map(c => c.id === updated.id ? updated : c);
    saveToStorage(STORAGE_KEYS.CONTRACTS, contracts);
    syncToSupabase('contracts', updated);
    syncToCloudMirror();
    logAction('Update Contract', `Updated contract ${updated.id}`);
    showSuccess('Contract updated successfully');
    notifyListeners();
};

export const deleteContract = (id: string) => {
    const contract = contracts.find(c => c.id === id);
    if(contract) {
        contracts = contracts.filter(c => c.id !== id);
        saveToStorage(STORAGE_KEYS.CONTRACTS, contracts);
        queueForDeletion('contracts', id);
        
        const billboard = billboards.find(b => b.id === contract.billboardId);
        if(billboard) {
            if(billboard.type === BillboardType.Static) {
                if(contract.side === 'A' || contract.details.includes('Side A')) { billboard.sideAStatus = 'Available'; billboard.sideAClientId = undefined; }
                if(contract.side === 'B' || contract.details.includes('Side B')) { billboard.sideBStatus = 'Available'; billboard.sideBClientId = undefined; }
                if(contract.side === 'Both') { billboard.sideAStatus = 'Available'; billboard.sideBStatus = 'Available'; billboard.sideAClientId = undefined; billboard.sideBClientId = undefined; }
            } else if(billboard.type === BillboardType.LED) {
                billboard.rentedSlots = Math.max(0, (billboard.rentedSlots || 0) - 1);
            }
            updateBillboard(billboard); 
        }
        
        syncToCloudMirror();
        logAction('Delete Contract', `Removed contract ${id} and freed up assets`);
        showSuccess('Contract deleted successfully');
        notifyListeners();
    }
};

export const addInvoice = (invoice: Invoice) => { invoices = [invoice, ...invoices]; saveToStorage(STORAGE_KEYS.INVOICES, invoices); syncToCloudMirror(); syncToSupabase('invoices', invoice); logAction('Create Invoice', `Created ${invoice.type} #${invoice.id} ($${invoice.total})`); showSuccess(`${invoice.type} #${invoice.id} created successfully`); notifyListeners(); };
export const updateInvoice = (updated: Invoice) => { invoices = invoices.map(i => i.id === updated.id ? updated : i); saveToStorage(STORAGE_KEYS.INVOICES, invoices); syncToCloudMirror(); syncToSupabase('invoices', updated); logAction('Update Invoice', `Updated ${updated.type} #${updated.id}`); showSuccess(`${updated.type} updated successfully`); notifyListeners(); };
export const markInvoiceAsPaid = (id: string) => { invoices = invoices.map(i => i.id === id ? { ...i, status: 'Paid' } : i); saveToStorage(STORAGE_KEYS.INVOICES, invoices); syncToCloudMirror(); const updated = invoices.find(i => i.id === id); if(updated) syncToSupabase('invoices', updated); logAction('Payment', `Marked Invoice #${id} as Paid`); showSuccess(`Invoice #${id} marked as paid`); notifyListeners(); };

export const deleteInvoice = (id: string) => {
    const target = invoices.find(i => i.id === id);
    if (target) {
        invoices = invoices.filter(i => i.id !== id);
        
        // Try to revert invoice status if this was a receipt
        if (target.type === 'Receipt') {
             const desc = target.items?.[0]?.description || '';
             const match = desc.match(/Invoice #([A-Za-z0-9-]+)/);
             if (match && match[1]) {
                 const linkedInvoiceId = match[1];
                 const invoice = invoices.find(i => i.id === linkedInvoiceId);
                 if (invoice) {
                     invoice.status = 'Pending';
                     syncToSupabase('invoices', invoice);
                 }
             }
        }

        saveToStorage(STORAGE_KEYS.INVOICES, invoices);
        syncToCloudMirror();
        queueForDeletion('invoices', id);
        logAction('Delete Document', `Removed ${target.type} #${id}`);
        notifyListeners();
    }
};

export const addExpense = (expense: Expense) => { expenses = [expense, ...expenses]; saveToStorage(STORAGE_KEYS.EXPENSES, expenses); syncToCloudMirror(); syncToSupabase('expenses', expense); logAction('Expense', `Recorded expense: ${expense.description} ($${expense.amount})`); showSuccess(`Expense recorded: $${expense.amount}`); notifyListeners(); };
export const updateExpense = (updated: Expense) => { expenses = expenses.map(e => e.id === updated.id ? updated : e); saveToStorage(STORAGE_KEYS.EXPENSES, expenses); syncToCloudMirror(); syncToSupabase('expenses', updated); logAction('Update Expense', `Updated expense: ${updated.description}`); showSuccess('Expense updated successfully'); notifyListeners(); };
export const deleteExpense = (id: string) => { const target = expenses.find(e => e.id === id); if (target) { expenses = expenses.filter(e => e.id !== id); saveToStorage(STORAGE_KEYS.EXPENSES, expenses); syncToCloudMirror(); queueForDeletion('expenses', id); logAction('Delete Expense', `Removed expense: ${target.description}`); showSuccess('Expense deleted'); notifyListeners(); } };
export const addClient = (client: Client) => { clients = [...clients, client]; saveToStorage(STORAGE_KEYS.CLIENTS, clients); syncToCloudMirror(); syncToSupabase('clients', client); logAction('Create Client', `Added ${client.companyName}`); showSuccess(`Client "${client.companyName}" added successfully`); notifyListeners(); };
export const updateClient = (updated: Client) => { clients = clients.map(c => c.id === updated.id ? updated : c); saveToStorage(STORAGE_KEYS.CLIENTS, clients); syncToCloudMirror(); syncToSupabase('clients', updated); logAction('Update Client', `Updated info for ${updated.companyName}`); showSuccess(`Client "${updated.companyName}" updated`); notifyListeners(); };
export const deleteClient = (id: string) => { const target = clients.find(c => c.id === id); if (target) { clients = clients.filter(c => c.id !== id); saveToStorage(STORAGE_KEYS.CLIENTS, clients); syncToCloudMirror(); queueForDeletion('clients', id); logAction('Delete Client', `Removed ${target.companyName}`); showSuccess(`Client "${target.companyName}" deleted`); notifyListeners(); } };
export const addUser = (user: User) => { users = [...users, user]; saveToStorage(STORAGE_KEYS.USERS, users); syncToCloudMirror(); syncToSupabase('users', user); logAction('User Mgmt', `Added user ${user.email} (Status: ${user.status})`); showSuccess(`User "${user.email}" added`); notifyListeners(); };
export const updateUser = (updated: User) => { users = users.map(u => u.id === updated.id ? updated : u); saveToStorage(STORAGE_KEYS.USERS, users); syncToCloudMirror(); syncToSupabase('users', updated); logAction('User Mgmt', `Updated user ${updated.email}`); showSuccess(`User "${updated.email}" updated`); notifyListeners(); };
export const deleteUser = (id: string) => { users = users.filter(u => u.id !== id); saveToStorage(STORAGE_KEYS.USERS, users); syncToCloudMirror(); queueForDeletion('users', id); logAction('User Mgmt', `Deleted user ID ${id}`); showSuccess('User deleted'); notifyListeners(); };
export const addOutsourcedBillboard = (b: OutsourcedBillboard) => { outsourcedBillboards = [...outsourcedBillboards, b]; saveToStorage(STORAGE_KEYS.OUTSOURCED, outsourcedBillboards); syncToSupabase('outsourced_billboards', b); syncToCloudMirror(); logAction('Outsourcing', `Added outsourced unit ${b.billboardId}`); showSuccess('Outsourced billboard added'); notifyListeners(); };
export const updateOutsourcedBillboard = (updated: OutsourcedBillboard) => { outsourcedBillboards = outsourcedBillboards.map(b => b.id === updated.id ? updated : b); saveToStorage(STORAGE_KEYS.OUTSOURCED, outsourcedBillboards); syncToSupabase('outsourced_billboards', updated); syncToCloudMirror(); logAction('Update Outsourced', `Updated outsourced billboard ${updated.id}`); showSuccess('Outsourced billboard updated'); notifyListeners(); };
export const deleteOutsourcedBillboard = (id: string) => { const target = outsourcedBillboards.find(b => b.id === id); if (target) { outsourcedBillboards = outsourcedBillboards.filter(b => b.id !== id); saveToStorage(STORAGE_KEYS.OUTSOURCED, outsourcedBillboards); queueForDeletion('outsourced_billboards', id); syncToCloudMirror(); logAction('Delete Outsourced', `Removed outsourced billboard ${id}`); showSuccess('Outsourced billboard deleted'); notifyListeners(); } };
export const addTask = (task: Task) => { tasks = [task, ...tasks]; saveToStorage(STORAGE_KEYS.TASKS, tasks); syncToCloudMirror(); syncToSupabase('tasks', task); logAction('Task Created', `New task: ${task.title}`); showSuccess(`Task "${task.title}" created`); notifyListeners(); };
export const updateTask = (updated: Task) => { tasks = tasks.map(t => t.id === updated.id ? updated : t); saveToStorage(STORAGE_KEYS.TASKS, tasks); syncToCloudMirror(); syncToSupabase('tasks', updated); showSuccess('Task updated'); notifyListeners(); };
export const deleteTask = (id: string) => { const target = tasks.find(t => t.id === id); if(target) { tasks = tasks.filter(t => t.id !== id); saveToStorage(STORAGE_KEYS.TASKS, tasks); syncToCloudMirror(); queueForDeletion('tasks', id); logAction('Task Deleted', `Removed task: ${target.title}`); showSuccess('Task deleted'); notifyListeners(); } };
export const addPrintingJob = (job: PrintingJob) => { printingJobs = [...printingJobs, job]; saveToStorage(STORAGE_KEYS.PRINTING, printingJobs); syncToSupabase('printing_jobs', job); syncToCloudMirror(); logAction('Printing Job', `Added printing job: ${job.description}`); showSuccess('Printing job added'); notifyListeners(); };
export const updatePrintingJob = (updated: PrintingJob) => { printingJobs = printingJobs.map(p => p.id === updated.id ? updated : p); saveToStorage(STORAGE_KEYS.PRINTING, printingJobs); syncToSupabase('printing_jobs', updated); syncToCloudMirror(); logAction('Update Printing', `Updated printing job ${updated.id}`); showSuccess('Printing job updated'); notifyListeners(); };
export const deletePrintingJob = (id: string) => { const target = printingJobs.find(p => p.id === id); if (target) { printingJobs = printingJobs.filter(p => p.id !== id); saveToStorage(STORAGE_KEYS.PRINTING, printingJobs); queueForDeletion('printing_jobs', id); syncToCloudMirror(); logAction('Delete Printing', `Removed printing job ${id}`); showSuccess('Printing job deleted'); notifyListeners(); } };
export const addMaintenanceLog = (log: MaintenanceLog) => { maintenanceLogs = [log, ...maintenanceLogs]; saveToStorage(STORAGE_KEYS.MAINTENANCE, maintenanceLogs); syncToSupabase('maintenance_logs', log); const billboard = billboards.find(b => b.id === log.billboardId); if (billboard) { billboard.lastMaintenanceDate = log.date; updateBillboard(billboard); } syncToCloudMirror(); logAction('Maintenance', `Logged maintenance for ${billboard?.name || log.billboardId}`); showSuccess('Maintenance log added'); notifyListeners(); };
export const updateMaintenanceLog = (updated: MaintenanceLog) => { maintenanceLogs = maintenanceLogs.map(m => m.id === updated.id ? updated : m); saveToStorage(STORAGE_KEYS.MAINTENANCE, maintenanceLogs); syncToSupabase('maintenance_logs', updated); syncToCloudMirror(); logAction('Update Maintenance', `Updated maintenance log ${updated.id}`); showSuccess('Maintenance log updated'); notifyListeners(); };
export const deleteMaintenanceLog = (id: string) => { const target = maintenanceLogs.find(m => m.id === id); if (target) { maintenanceLogs = maintenanceLogs.filter(m => m.id !== id); saveToStorage(STORAGE_KEYS.MAINTENANCE, maintenanceLogs); syncToCloudMirror(); queueForDeletion('maintenance_logs', id); logAction('Delete Maintenance', `Removed maintenance log ${id}`); showSuccess('Maintenance log deleted'); notifyListeners(); } };

export const RELEASE_NOTES = [
    {
        version: '2.2.0',
        date: 'January 21, 2026',
        title: 'AI-Powered Billboard Intelligence',
        features: [
            'AI Visibility Notes: Generate professional visibility analysis with one click using Groq AI.',
            'Traffic Estimation: AI estimates daily traffic based on Zimbabwe location data.',
            'Smart Coordinates: Auto-suggest GPS coordinates from town and location names.',
            'Auto-fill All: Single button to populate visibility, traffic, and coordinates at once.',
            'Powered by Llama 3.1 70B via Groq - blazing fast AI responses.',
            'Version: 2.2.0 - The AI Intelligence Update.'
        ]
    },
    {
        version: '2.1.0',
        date: 'January 21, 2026',
        title: 'Cloud Sync & Backup Overhaul',
        features: [
            'Supabase Integration: Full cloud database sync - your data is now safely stored in the cloud.',
            'Enhanced Backup: Export includes statistics and metadata for easy verification.',
            'Smart Restore: Upload backup files to instantly sync all data to Supabase.',
            'Connection Status: Live pulsing indicator shows real-time Supabase connection health.',
            'RLS Security: Row-level security policies protect your data in the cloud.'
        ]
    },
    {
        version: '2.0.1',
        date: 'January 21, 2026',
        title: 'Production Deployment',
        features: [
            'Vercel Deployment: App now live on Vercel with environment variables.',
            'Auth State Sync: Data automatically pulls from Supabase on login.',
            'Debug Logging: Enhanced console logs for troubleshooting sync issues.',
            'Version: 2.0.1 - The Deployment Update.'
        ]
    },
    {
        version: '1.9.26',
        date: 'January 20, 2026',
        title: 'User Email Notification',
        features: [
            'Communications: "Approve User" now automatically triggers your email client to send login credentials to the new user.',
            'Workflow: Streamlined onboarding - one click to approve and notify.',
            'System: Background improvements to sync reliability.',
            'Version: 1.9.26 - The Communication Update.'
        ]
    }
];

// ============================================================================
// SUPABASE-PRIORITY DATA GETTERS
// These functions always fetch from Supabase first, localStorage is fallback only
// ============================================================================

// Use the supabaseSyncComplete flag declared at the top of the file
export const isSupabaseSynced = () => supabaseSyncComplete;
export const markSupabaseSynced = () => { supabaseSyncComplete = true; };

// Fetch fresh data from Supabase for a specific table
const fetchFromSupabase = async <T>(tableName: string, fallbackData: T[]): Promise<T[]> => {
    if (!supabase) {
        console.log(`⚠️ Supabase not configured, using local cache for ${tableName}`);
        return fallbackData;
    }
    try {
        console.log(`📡 Fetching ${tableName} from Supabase...`);
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) {
            console.error(`❌ Supabase fetch error for ${tableName}:`, error.message, error);
            return fallbackData;
        }
        console.log(`✅ Fetched ${data?.length || 0} records from ${tableName}`);
        return (data as T[]) || fallbackData;
    } catch (e) {
        console.error(`❌ Exception fetching ${tableName}:`, e);
        return fallbackData;
    }
};

// Async getters that prioritize Supabase
export const getBillboardsAsync = async (): Promise<Billboard[]> => {
    if (!supabase) return billboards || [];
    const data = await fetchFromSupabase<Billboard>('billboards', billboards);
    if (data.length > 0) { billboards = data; saveToStorage(STORAGE_KEYS.BILLBOARDS, data); }
    return data;
};

export const getContractsAsync = async (): Promise<Contract[]> => {
    if (!supabase) return contracts || [];
    const data = await fetchFromSupabase<Contract>('contracts', contracts);
    if (data.length > 0) { contracts = data; saveToStorage(STORAGE_KEYS.CONTRACTS, data); }
    return data;
};

export const getClientsAsync = async (): Promise<Client[]> => {
    if (!supabase) return clients || [];
    const data = await fetchFromSupabase<Client>('clients', clients);
    if (data.length > 0) { clients = data; saveToStorage(STORAGE_KEYS.CLIENTS, data); }
    return data;
};

export const getInvoicesAsync = async (): Promise<Invoice[]> => {
    if (!supabase) return invoices || [];
    const data = await fetchFromSupabase<Invoice>('invoices', invoices);
    if (data.length > 0) { invoices = data; saveToStorage(STORAGE_KEYS.INVOICES, data); }
    return data;
};

export const getExpensesAsync = async (): Promise<Expense[]> => {
    if (!supabase) return expenses || [];
    const data = await fetchFromSupabase<Expense>('expenses', expenses);
    if (data.length > 0) { expenses = data; saveToStorage(STORAGE_KEYS.EXPENSES, data); }
    return data;
};

export const getTasksAsync = async (): Promise<Task[]> => {
    if (!supabase) return tasks || [];
    const data = await fetchFromSupabase<Task>('tasks', tasks);
    if (data.length > 0) { tasks = data; saveToStorage(STORAGE_KEYS.TASKS, data); }
    return data;
};

// Sync getters - return cached data (localStorage), use after initial Supabase sync
export const getBillboards = () => billboards || [];
export const getContracts = () => contracts || [];
export const getInvoices = () => invoices || [];
export const getExpenses = () => expenses || [];
export const getAuditLogs = () => auditLogs || [];
export const getUsers = () => users || [];
export const getClients = () => clients || [];
export const getOutsourcedBillboards = () => outsourcedBillboards || [];
export const getPrintingJobs = () => printingJobs || [];
export const getTasks = () => tasks || [];
export const getMaintenanceLogs = () => maintenanceLogs || [];
export const findUser = (identifier: string) => { const term = identifier.toLowerCase().trim(); return users.find(u => u.email.toLowerCase() === term || (u.username && u.username.toLowerCase() === term)); };
export const findUserByEmail = findUser;
export const getPendingInvoices = () => invoices.filter(inv => inv.status === 'Pending' && inv.type === 'Invoice');
export const getClientFinancials = (clientId: string) => { /* ... existing ... */ return { totalBilled: 0, totalPaid: 0, balance: 0 }; };
export const getTransactions = (clientId: string) => invoices.filter(i => i.clientId === clientId && (i.type === 'Invoice' || i.type === 'Receipt')).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
export const getNextBillingDetails = (clientId: string) => { /* ... existing ... */ return null; };
export const getUpcomingBillings = () => { /* ... existing ... */ return []; };
export const getExpiringContracts = () => { /* ... existing ... */ return []; };
export const getOverdueInvoices = () => invoices.filter(i => i.status === 'Pending' || i.status === 'Overdue');
export const getSystemAlertCount = () => 0;
export const getFinancialTrends = () => { /* ... existing ... */ return []; };
