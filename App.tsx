
import React, { useState, useEffect, ReactNode } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { BillboardList } from './components/BillboardList';
import { ClientList } from './components/ClientList';
import { Rentals } from './components/Rentals';
import { Financials } from './components/Financials';
import { Expenses } from './components/Expenses';
import { Settings } from './components/Settings';
import { OutsourcedList } from './components/OutsourcedList';
import { Analytics } from './components/Analytics';
import { Payments } from './components/Payments';
import { Tasks } from './components/Tasks';
import { Maintenance } from './components/Maintenance';
import { Auth } from './components/Auth';
import { ClientPortal } from './components/ClientPortal';
import { PublicView } from './components/PublicView';
import { ResetPassword } from './components/ResetPassword';
import { GoogleCallback } from './components/GoogleCallback';
import { ToastContainer } from './components/ToastContainer';
import { FridayReminderModal } from './components/FridayReminderModal';
import { getCurrentUser, onAuthStateChange, isSupabaseConfigured } from './services/authService';
import { pullAllDataFromSupabase } from './services/mockData';
import { checkFridayReminder } from './services/notificationService';
import { User } from './types';


interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-900 p-6">
           <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-md w-full border border-slate-100">
             <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
             </div>
             <h1 className="text-xl font-bold mb-2 text-slate-900">Application Error</h1>
             <p className="text-slate-500 mb-6 text-sm leading-relaxed">
               {this.state.error?.message || "An unexpected error occurred while rendering the application."}
             </p>
             <button onClick={() => window.location.reload()} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs hover:bg-slate-800 transition-all w-full shadow-lg shadow-slate-900/20">
               Reload Application
             </button>
           </div>
        </div>
      );
    }

    return (this as any).props.children || null;
  }
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [portalMode, setPortalMode] = useState<{active: boolean, clientId: string | null}>({ active: false, clientId: null });
  const [publicMode, setPublicMode] = useState<{active: boolean, type: 'billboard' | 'map', id?: string}>({ active: false, type: 'map' });
  const [showFridayReminder, setShowFridayReminder] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [googleCallbackMode, setGoogleCallbackMode] = useState(false);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          
          // MANDATORY: Pull data from Supabase on app init if user already logged in
          if (isSupabaseConfigured()) {
            console.log('🔄 User session restored - syncing data from Supabase...');
            try {
              const syncSuccess = await pullAllDataFromSupabase();
              if (syncSuccess) {
                console.log('✅ Data synced from Supabase - billboards loaded');
              } else {
                console.warn('⚠️ Data sync incomplete');
              }
            } catch (syncErr) {
              console.error('❌ Error syncing data on init:', syncErr);
            }
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChange((user) => {
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Check for Friday backup reminder when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const { shouldRemind } = checkFridayReminder();
      if (shouldRemind) {
        // Show reminder after a short delay so it doesn't feel intrusive
        setTimeout(() => setShowFridayReminder(true), 2000);
      }
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      
      // Check for Google Drive OAuth callback
      if (window.location.pathname === '/google-callback') {
          setGoogleCallbackMode(true);
          return;
      }
      
      // Check for Password Reset (from Supabase email link)
      // Supabase uses hash fragments like #access_token=...&type=recovery
      if (window.location.pathname === '/reset-password' || hash.includes('type=recovery')) {
          setResetPasswordMode(true);
          return;
      }
      
      // Check for Client Portal
      const isPortal = params.get('portal') === 'true';
      const clientId = params.get('clientId');
      if (isPortal && clientId) {
          setPortalMode({ active: true, clientId });
          return;
      }

      // Check for Public Share
      const isPublic = params.get('public') === 'true';
      const type = params.get('type'); // 'billboard' or 'map'
      const id = params.get('id');

      if (isPublic) {
          setPublicMode({ 
              active: true, 
              type: (type === 'billboard' || type === 'map') ? type : 'map', 
              id: id || undefined 
          });
      }
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'analytics': return <Analytics />;
      case 'billboards': return <BillboardList />;
      case 'outsourced': return <OutsourcedList />;
      case 'payments': return <Payments />;
      case 'clients': return <ClientList />;
      case 'rentals': return <Rentals />;
      case 'tasks': return <Tasks />;
      case 'maintenance': return <Maintenance />;
      case 'financials': return <Financials initialTab="Invoices" />;
      case 'receipts': return <Financials initialTab="Receipts" />;
      case 'expenses': return <Expenses />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#020617]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/20 mb-4 animate-pulse">
            <span className="text-white font-black text-2xl">D</span>
          </div>
          <p className="text-slate-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Public View Routing (No Auth Required)
  if (publicMode.active) {
      return (
          <ErrorBoundary>
              <PublicView type={publicMode.type} billboardId={publicMode.id} />
          </ErrorBoundary>
      )
  }

  // Google Drive OAuth Callback (No Auth Required)
  if (googleCallbackMode) {
      return (
          <ErrorBoundary>
              <GoogleCallback onComplete={() => {
                  setGoogleCallbackMode(false);
                  window.history.replaceState(null, '', '/');
              }} />
          </ErrorBoundary>
      );
  }

  // Password Reset Routing (No Auth Required)
  if (resetPasswordMode) {
      return (
          <ErrorBoundary>
              <ResetPassword onComplete={() => {
                  setResetPasswordMode(false);
                  window.history.replaceState(null, '', '/');
              }} />
          </ErrorBoundary>
      );
  }

  // Client Portal Routing (No Auth Required)
  if (portalMode.active && portalMode.clientId) {
      return (
          <ErrorBoundary>
              <ClientPortal clientId={portalMode.clientId} />
          </ErrorBoundary>
      );
  }

  // Main App Routing (Auth Required)
  if (!isAuthenticated) {
      return (
        <ErrorBoundary>
            <Auth onLogin={() => setIsAuthenticated(true)} />
        </ErrorBoundary>
      );
  }

  return (
    <ErrorBoundary>
        <Layout 
            currentPage={currentPage} 
            onNavigate={setCurrentPage}
            onLogout={() => setIsAuthenticated(false)}
        >
          {renderPage()}
        </Layout>
        <ToastContainer />
        <FridayReminderModal 
          isOpen={showFridayReminder} 
          onClose={() => setShowFridayReminder(false)} 
        />
    </ErrorBoundary>
  );
};

export default App;
