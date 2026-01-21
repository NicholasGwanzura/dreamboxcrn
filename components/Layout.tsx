
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Map, Users, FileText, CreditCard, Receipt, Settings as SettingsIcon,
  Menu, X, Bell, LogOut, Globe, PieChart, Wallet, CheckSquare, Wrench, Database, RefreshCw, ChevronDown, Banknote
} from 'lucide-react';
import { getCurrentUser, logout } from '../services/authService';
import { getSystemAlertCount, triggerAutoBackup, runAutoBilling, runMaintenanceCheck, triggerFullSync } from '../services/mockData';
import { isSupabaseConfigured, checkSupabaseConnection } from '../services/supabaseClient';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

// Grouped navigation for cleaner sidebar
const navGroups = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'analytics', label: 'Analytics', icon: PieChart },
    ]
  },
  {
    label: 'Operations',
    items: [
      { id: 'billboards', label: 'Billboards', icon: Map },
      { id: 'rentals', label: 'Rentals', icon: FileText },
      { id: 'clients', label: 'Clients', icon: Users },
      { id: 'outsourced', label: 'Outsourced', icon: Globe },
    ]
  },
  {
    label: 'Finance',
    items: [
      { id: 'financials', label: 'Invoices', icon: CreditCard },
      { id: 'payments', label: 'Payments', icon: Wallet },
      { id: 'expenses', label: 'Expenses', icon: Banknote },
    ]
  },
  {
    label: 'Management',
    items: [
      { id: 'tasks', label: 'Tasks', icon: CheckSquare },
      { id: 'maintenance', label: 'Maintenance', icon: Wrench },
      { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ]
  }
];

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [dbConnected, setDbConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const user = getCurrentUser();

  useEffect(() => {
    setAlertCount(getSystemAlertCount());
    triggerAutoBackup();
    runAutoBilling();
    runMaintenanceCheck();
    
    // Check actual Supabase connection
    const checkConnection = async () => {
      setIsCheckingConnection(true);
      if (isSupabaseConfigured()) {
        const connected = await checkSupabaseConnection();
        setDbConnected(connected);
      } else {
        setDbConnected(false);
      }
      setIsCheckingConnection(false);
    };
    
    checkConnection();
    // Re-check connection every 30 seconds
    const connectionCheckInterval = setInterval(checkConnection, 30000);

    const interval = setInterval(() => setAlertCount(getSystemAlertCount()), 10000);
    const backupInterval = setInterval(() => triggerAutoBackup(), 5 * 60 * 1000);
    const billingInterval = setInterval(() => runAutoBilling(), 60 * 60 * 1000);
    const maintenanceInterval = setInterval(() => runMaintenanceCheck(), 60 * 60 * 1000);
    
    const performSync = async () => {
        if(dbConnected) {
            setIsSyncing(true);
            await triggerFullSync();
            setTimeout(() => setIsSyncing(false), 800);
        }
    };

    const syncInterval = setInterval(performSync, 5000);
    const handleFocus = () => performSync();
    window.addEventListener('focus', handleFocus);

    return () => { 
        clearInterval(interval); 
        clearInterval(backupInterval);
        clearInterval(billingInterval);
        clearInterval(maintenanceInterval);
        clearInterval(syncInterval);
        clearInterval(connectionCheckInterval);
        window.removeEventListener('focus', handleFocus);
    };
  }, [currentPage, dbConnected]);

  const handleLogout = () => { logout(); onLogout(); };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 font-sans">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Streamlined */}
      <aside 
        className={`fixed inset-y-0 left-0 z-[100] w-64 transform transition-transform duration-300 ease-out lg:translate-x-0 lg:relative flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-slate-900`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-lg">D</div>
             <div>
                <span className="font-semibold text-white text-lg">Dreambox</span>
             </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navGroups.map((group, groupIdx) => (
            <div key={group.label} className={groupIdx > 0 ? 'mt-6' : ''}>
              <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}
                      className={`flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon size={18} className="mr-3 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-slate-800">
           <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 transition-colors">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold text-white">
                  {user?.firstName?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-medium text-white truncate">{user?.firstName || 'User'} {user?.lastName || ''}</p>
                 <p className="text-xs text-slate-500 truncate">{user?.role || 'Guest'}</p>
              </div>
              <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors p-1.5" title="Logout">
                 <LogOut size={16} />
              </button>
           </div>
           
           <div className="flex items-center justify-between text-[10px] text-slate-500 mt-3 px-2">
              <span className={`flex items-center gap-1.5 ${dbConnected ? 'text-emerald-400' : isCheckingConnection ? 'text-amber-400' : 'text-red-400'}`}>
                  {isSyncing ? (
                    <RefreshCw size={10} className="animate-spin" />
                  ) : (
                    <span className="relative flex h-2.5 w-2.5">
                      {dbConnected && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dbConnected ? 'bg-emerald-500' : isCheckingConnection ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                    </span>
                  )}
                  {isCheckingConnection ? 'Checking...' : dbConnected ? (isSyncing ? 'Syncing' : 'Supabase Connected') : 'Disconnected'}
              </span>
              <span className="font-mono">v2.2.0</span>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full bg-slate-50">
        {/* Header */}
        <header className="sticky top-0 z-40 h-16 flex items-center justify-between px-4 sm:px-6 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-4">
             <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
               <Menu size={20} />
             </button>
             <h1 className="text-lg font-semibold text-slate-900 capitalize">
               {currentPage === 'financials' ? 'Invoices & Quotes' : currentPage.replace('-', ' ')}
             </h1>
          </div>
          
          <div className="flex items-center gap-3">
             <button onClick={() => onNavigate('dashboard')} className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Notifications">
                <Bell size={20} />
                {alertCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                        {alertCount > 9 ? '9+' : alertCount}
                    </span>
                )}
             </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
           <div className="max-w-7xl mx-auto">
             {children}
           </div>
        </div>
      </main>
    </div>
  );
};
