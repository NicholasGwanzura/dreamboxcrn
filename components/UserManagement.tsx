import React, { useEffect, useState } from 'react';
import { Users, RefreshCw, AlertTriangle, Plus, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { User as UserType } from '../types';
import { getAllUsers, isSupabaseConfigured, createUserViaEdge, deleteUserViaEdge } from '../services/authService';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<UserType[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [note, setNote] = useState<string | undefined>();
    const [showAddModal, setShowAddModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // New user form state
    const [newUser, setNewUser] = useState({
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        role: 'Staff' as 'Admin' | 'Manager' | 'Staff',
        status: 'Active' as 'Active' | 'Pending' | 'Rejected'
    });
    const [showPassword, setShowPassword] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        setError(null);
        setNote(undefined);
        try {
            const result = await getAllUsers();
            setUsers(result.users);
            if (result.note) setNote(result.note);
            if (result.users.length === 0 && result.source === 'supabase') {
                setNote('No users returned. Ensure a backend/Edge Function with the service role key is set up to call auth.admin.listUsers.');
            }
        } catch (err: any) {
            setError(err?.message || 'Unable to load users');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async () => {
        if (!newUser.email) {
            setError('Email is required');
            return;
        }
        setActionLoading(true);
        setError(null);
        try {
            const result = await createUserViaEdge({
                email: newUser.email,
                password: newUser.password || undefined,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                role: newUser.role,
                status: newUser.status
            });
            setSuccessMessage(`User created! ${newUser.password ? '' : `Temp password: ${result.tempPassword}`}`);
            setShowAddModal(false);
            setNewUser({ email: '', firstName: '', lastName: '', password: '', role: 'Staff', status: 'Active' });
            loadUsers();
        } catch (err: any) {
            setError(err?.message || 'Failed to create user');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        setActionLoading(true);
        setError(null);
        try {
            await deleteUserViaEdge(userId);
            setSuccessMessage('User deleted successfully');
            setDeleteConfirm(null);
            loadUsers();
        } catch (err: any) {
            setError(err?.message || 'Failed to delete user');
        } finally {
            setActionLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900">
            <div className="flex items-start gap-3">
                <Users size={20} className="mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold mb-1">User Management</h3>
                            <p className="text-sm">Live list pulled from Supabase when admin access is available; falls back to local mock data otherwise.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="inline-flex items-center gap-1 text-xs font-medium bg-amber-600 text-white px-3 py-1.5 rounded hover:bg-amber-700"
                                disabled={!isSupabaseConfigured()}
                            >
                                <Plus size={14} />
                                Add User
                            </button>
                            <button
                                onClick={loadUsers}
                                className="inline-flex items-center gap-2 text-xs font-medium text-amber-900 hover:text-amber-700"
                                disabled={loading}
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {!isSupabaseConfigured() && (
                        <div className="mt-3 flex items-start gap-2 text-xs text-amber-800">
                            <AlertTriangle size={14} className="mt-0.5" />
                            <span>Supabase credentials are not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment to enable live data.</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="mt-3 bg-green-100 border border-green-300 text-green-800 text-sm p-3 rounded">
                            {successMessage}
                        </div>
                    )}

                    {error && (
                        <div className="mt-3 bg-red-100 border border-red-300 text-red-800 text-sm p-3 rounded">
                            {error}
                        </div>
                    )}

                    {note && !error && (
                        <div className="mt-3 bg-amber-100 border border-amber-200 text-amber-900 text-sm p-3 rounded">
                            {note}
                        </div>
                    )}

                    <div className="mt-4 bg-white border border-amber-200 rounded-lg overflow-hidden">
                        <div className="grid grid-cols-5 text-xs font-semibold text-amber-900 bg-amber-100 px-4 py-2">
                            <span>Name</span>
                            <span>Email</span>
                            <span>Role</span>
                            <span>Status</span>
                            <span className="text-right">Actions</span>
                        </div>
                        <div className="divide-y divide-amber-100 max-h-64 overflow-auto">
                            {loading && (
                                <div className="px-4 py-3 text-sm text-amber-800">Loading users...</div>
                            )}
                            {!loading && users.length === 0 && !error && (
                                <div className="px-4 py-3 text-sm text-amber-800">No users to display.</div>
                            )}
                            {!loading && users.map(user => (
                                <div key={user.id} className="grid grid-cols-5 px-4 py-3 text-sm text-amber-900 items-center">
                                    <span>{[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}</span>
                                    <span className="truncate" title={user.email}>{user.email || '—'}</span>
                                    <span>{user.role || '—'}</span>
                                    <span>{user.status || '—'}</span>
                                    <span className="text-right">
                                        {deleteConfirm === user.id ? (
                                            <span className="inline-flex items-center gap-2">
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    disabled={actionLoading}
                                                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="text-xs text-gray-500 hover:text-gray-700"
                                                >
                                                    Cancel
                                                </button>
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirm(user.id)}
                                                className="text-amber-600 hover:text-red-600"
                                                title="Delete user"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Add New User</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={newUser.firstName}
                                        onChange={e => setNewUser({ ...newUser, firstName: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={newUser.lastName}
                                        onChange={e => setNewUser({ ...newUser, lastName: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password (optional - auto-generated if empty)</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newUser.password}
                                        onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 pr-10"
                                        placeholder="Leave empty for auto-generated"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select
                                        value={newUser.role}
                                        onChange={e => setNewUser({ ...newUser, role: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    >
                                        <option value="Staff">Staff</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={newUser.status}
                                        onChange={e => setNewUser({ ...newUser, status: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddUser}
                                disabled={actionLoading || !newUser.email}
                                className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                            >
                                {actionLoading ? 'Creating...' : 'Create User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
