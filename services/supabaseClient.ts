
import { createClient } from '@supabase/supabase-js';

// Use environment-based credentials; never hardcode keys.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client = null;

if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local");
} else {
    // Validate anon key format - Supabase JWT tokens start with 'eyJ'
    if (!supabaseKey.startsWith('eyJ')) {
        console.error("⚠️ INVALID ANON KEY FORMAT! Supabase anon keys should start with 'eyJ...' (they are JWT tokens).");
        console.error("Your key starts with:", supabaseKey.substring(0, 20) + "...");
        console.error("Please get the correct anon key from: https://supabase.com/dashboard/project/" + supabaseUrl.split('//')[1].split('.')[0] + "/settings/api");
    }
    try {
        client = createClient(supabaseUrl, supabaseKey);
        console.log("✅ Supabase client initialized with URL:", supabaseUrl);
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
