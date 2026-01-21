import { supabase, isSupabaseConfigured as checkSupabaseConfigured } from './supabaseClient';
import { User } from '../types';
import { getUsers, pullAllDataFromSupabase } from './mockData';

// Try to fetch users through a secured Supabase Edge Function that holds the service role key.
const fetchUsersViaEdge = async (): Promise<User[]> => {
    console.log("📡 Calling admin-list-users Edge Function...");
    const { data, error } = await supabase.functions.invoke('admin-list-users');
    
    if (error) {
        console.error("❌ Edge Function error:", error);
        throw error;
    }
    
    console.log("📥 Edge Function response:", data);
    
    if (!data || !Array.isArray(data)) {
        console.error("❌ Invalid response format - expected array, got:", typeof data, data);
        throw new Error('Invalid response from admin-list-users function');
    }
    
    console.log(`✅ Found ${data.length} users from Supabase Auth`);
    return data.map((u: any) => ({
        id: u.id,
        email: u.email || '',
        firstName: u.user_metadata?.firstName || '',
        lastName: u.user_metadata?.lastName || '',
        role: u.user_metadata?.role || 'Staff',
        status: u.user_metadata?.status || 'Active',
        username: u.email?.split('@')[0] || ''
    }));
};

// Create user via Edge Function (service role key stays server-side)
export const createUserViaEdge = async (userData: {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: 'Admin' | 'Manager' | 'Staff';
    status?: 'Active' | 'Pending' | 'Rejected';
}): Promise<{ user: User; tempPassword: string }> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: userData,
    });
    if (error) throw new Error(error.message || 'Failed to create user');
    if (data?.error) throw new Error(data.error);
    return {
        user: {
            id: data.user.id,
            email: data.user.email || '',
            firstName: data.user.user_metadata?.firstName || '',
            lastName: data.user.user_metadata?.lastName || '',
            role: data.user.user_metadata?.role || 'Staff',
            status: data.user.user_metadata?.status || 'Active',
            username: data.user.email?.split('@')[0] || ''
        },
        tempPassword: data.tempPassword
    };
};

// Delete user via Edge Function (service role key stays server-side)
export const deleteUserViaEdge = async (userId: string): Promise<void> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId },
    });
    if (error) throw new Error(error.message || 'Failed to delete user');
    if (data?.error) throw new Error(data.error);
};

/**
 * Re-export isSupabaseConfigured from supabaseClient
 */
export const isSupabaseConfigured = checkSupabaseConfigured;

/**
 * Sign up a new user with Supabase
 */
export const register = async (firstName: string, lastName: string, email: string, password: string): Promise<any> => {
    if (!isSupabaseConfigured()) {
        // Production requires Supabase - no mock fallback
        throw new Error("Registration service not configured. Please contact your administrator.");
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    firstName,
                    lastName,
                }
            }
        });

        if (error) throw error;
        return data;
    } catch (err: any) {
        throw new Error(err.message || 'Registration failed');
    }
};

/**
 * Sign in with email and password
 */
export const login = async (identifier: string, password: string): Promise<User | null> => {
    if (!isSupabaseConfigured()) {
        // Production requires Supabase - no mock fallback
        throw new Error("Authentication service not configured. Please contact your administrator.");
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: identifier,
            password
        });

        if (error) throw error;

        // Return user data from session
        if (data.user) {
            const userData = {
                id: data.user.id,
                email: data.user.email || '',
                firstName: data.user.user_metadata?.firstName || '',
                lastName: data.user.user_metadata?.lastName || '',
                role: data.user.user_metadata?.role || 'Staff',
                status: data.user.user_metadata?.status || 'Active',
                username: data.user.email?.split('@')[0] || ''
            };

            // Store user session
            try {
                localStorage.setItem('billboard_user', JSON.stringify(userData));
            } catch (e) {
                console.warn('Failed to save user session to localStorage');
            }

            // MANDATORY: Pull all data from Supabase before returning (blocking)
            console.log('🔄 Fetching latest data from Supabase (mandatory sync)...');
            try {
                const syncSuccess = await pullAllDataFromSupabase();
                if (syncSuccess) {
                    console.log('✅ All data synced from Supabase - billboards loaded');
                } else {
                    console.warn('⚠️ Data sync incomplete - some data may not have loaded');
                }
            } catch (syncErr) {
                console.error('❌ Error syncing data:', syncErr);
                // Don't block login, but log the error
            }

            return userData;
        }
        return null;
    } catch (err: any) {
        throw new Error(err.message || 'Login failed');
    }
};

/**
 * Sign out the current user
 */
export const logout = async (): Promise<void> => {
    localStorage.removeItem('billboard_user');

    if (!isSupabaseConfigured()) return;

    try {
        await supabase.auth.signOut();
    } catch (err: any) {
        console.error('Logout error:', err);
    }
};

/**
 * Get current user from session
 */
export const getCurrentUser = async (): Promise<User | null> => {
    // Check localStorage for cached session first
    const stored = localStorage.getItem('billboard_user');
    const cachedUser = stored ? JSON.parse(stored) : null;
    
    if (!isSupabaseConfigured()) {
        return cachedUser;
    }

    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) return null;

        const user = session.user;
        return {
            id: user.id,
            email: user.email || '',
            firstName: user.user_metadata?.firstName || '',
            lastName: user.user_metadata?.lastName || '',
            role: user.user_metadata?.role || 'Staff',
            status: user.user_metadata?.status || 'Active',
            username: user.email?.split('@')[0] || ''
        };
    } catch (err: any) {
        console.error('Error getting current user:', err);
        return null;
    }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
    if (!isSupabaseConfigured()) {
        throw new Error("Password reset service not configured. Please contact your administrator.");
    }

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;
    } catch (err: any) {
        throw new Error(err.message || 'Password reset failed');
    }
};

/**
 * Update password with reset token
 */
export const updatePassword = async (newPassword: string): Promise<void> => {
    if (!isSupabaseConfigured()) {
        throw new Error("Supabase not configured");
    }

    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;
    } catch (err: any) {
        throw new Error(err.message || 'Password update failed');
    }
};

/**
 * Listen to authentication state changes
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
    if (!isSupabaseConfigured()) return () => {};

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
            const user = session.user;
            callback({
                id: user.id,
                email: user.email || '',
                firstName: user.user_metadata?.firstName || '',
                lastName: user.user_metadata?.lastName || '',
                role: user.user_metadata?.role || 'Staff',
                status: user.user_metadata?.status || 'Active',
                username: user.email?.split('@')[0] || ''
            });
        } else {
            callback(null);
        }
    });

    return () => {
        subscription?.unsubscribe();
    };
};

/**
 * Invite a new user via email (Admin only)
 */
export const inviteUser = async (email: string, firstName: string, lastName: string, role: 'Admin' | 'Manager' | 'Staff' = 'Staff'): Promise<any> => {
    if (!isSupabaseConfigured()) {
        throw new Error("User management requires Supabase to be configured");
    }

    try {
        // Create user with temporary password
        const tempPassword = Math.random().toString(36).slice(-12);
        
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: false, // Require email confirmation
            user_metadata: {
                firstName,
                lastName,
                role,
                status: 'Pending'
            }
        });

        if (error) throw error;

        // TODO: Send invitation email with reset password link
        // For now, return the temporary password
        return { 
            user: data.user, 
            tempPassword,
            message: `User invited. They should receive an email to set up their password.`
        };
    } catch (err: any) {
        throw new Error(err.message || 'Failed to invite user');
    }
};

/**
 * Get all users (Admin only)
 */
export const getAllUsers = async (): Promise<{ users: User[]; source: 'mock' | 'supabase'; note?: string }> => {
    if (!isSupabaseConfigured()) {
        // Fallback to mock data when Supabase is not wired up
        return { users: getUsers(), source: 'mock', note: 'Supabase not configured; showing local mock users.' };
    }

    // Preferred path: call Edge Function that uses service role key on the server
    try {
        const edgeUsers = await fetchUsersViaEdge();
        return { users: edgeUsers, source: 'supabase' };
    } catch (edgeErr: any) {
        const msg = edgeErr?.message || edgeErr?.error || '';
        const unauthorized = msg.toLowerCase().includes('401') || msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('unauthorized');
        if (unauthorized) {
            throw new Error('admin-list-users edge function denied access. Ensure the function exists and your anon key can invoke it.');
        }
        console.warn('Edge function admin-list-users failed, falling back to admin API:', edgeErr);
    }

    // Fallback (requires service role key; will error in browser if not proxied through backend)
    try {
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        
        if (error) throw error;

        return {
            source: 'supabase',
            users: users.map(u => ({
                id: u.id,
                email: u.email || '',
                firstName: u.user_metadata?.firstName || '',
                lastName: u.user_metadata?.lastName || '',
                role: u.user_metadata?.role || 'Staff',
                status: u.user_metadata?.status || 'Active',
                username: u.email?.split('@')[0] || ''
            }))
        };
    } catch (err: any) {
        const message = err?.message?.toLowerCase().includes('unauthorized')
            ? 'Supabase admin APIs need a service role key on a backend/Edge Function. Do not put the service key in the frontend.'
            : err?.message || 'Failed to fetch users';
        console.error('Error fetching users:', err);
        throw new Error(message);
    }
};

/**
 * Update user role and status (Admin only)
 */
export const updateUserRole = async (userId: string, role: 'Admin' | 'Manager' | 'Staff', status: 'Active' | 'Pending' | 'Rejected' = 'Active'): Promise<void> => {
    if (!isSupabaseConfigured()) {
        throw new Error("User management requires Supabase to be configured");
    }

    try {
        const { error } = await supabase.auth.admin.updateUserById(userId, {
            user_metadata: {
                role,
                status
            }
        });

        if (error) throw error;
    } catch (err: any) {
        throw new Error(err.message || 'Failed to update user');
    }
};

/**
 * Delete a user (Admin only)
 */
export const deleteUserAccount = async (userId: string): Promise<void> => {
    if (!isSupabaseConfigured()) {
        throw new Error("User management requires Supabase to be configured");
    }

    try {
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) throw error;
    } catch (err: any) {
        throw new Error(err.message || 'Failed to delete user');
    }
};

/**
 * Resend email confirmation to user
 * Uses Supabase's built-in email service
 */
export const resendConfirmationEmail = async (email: string): Promise<void> => {
    if (!isSupabaseConfigured()) {
        throw new Error("Email confirmation requires Supabase to be configured");
    }

    try {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email
        });

        if (error) throw error;
    } catch (err: any) {
        throw new Error(err.message || 'Failed to resend confirmation email');
    }
};

