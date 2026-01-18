
import { createClient } from '@supabase/supabase-js';

// Hardcoded Supabase credentials
const supabaseUrl = 'https://iiphiigaksyshionjhmt.supabase.co';
const supabaseKey = 'sb_publishable_ECtk9UIokpPYAwI5eb7lGA_s7YtRSk4';

let client = null;

if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local");
} else {
    try {
        client = createClient(supabaseUrl, supabaseKey);
    } catch (e) {
        console.error("Supabase initialization failed:", e);
    }
}

export const supabase = client;

export const isSupabaseConfigured = () => !!supabase;

// Helper to check connection
export const checkSupabaseConnection = async () => {
    if (!supabase) return false;
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.error("Supabase Connection Check Error:", error);
            return false;
        }
        return true;
    } catch (e) {
        console.error("Supabase Connection Exception:", e);
        return false;
    }
};

// Get the current session
export const getCurrentSession = async () => {
    if (!supabase) return null;
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    } catch (e) {
        console.error("Error getting session:", e);
        return null;
    }
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (session: any) => void) => {
    if (!supabase) return () => {};
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(session);
    });

    return () => {
        subscription?.unsubscribe();
    };
};
