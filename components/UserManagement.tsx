import React, { useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { User as UserType } from '../types';

export const UserManagement: React.FC = () => {
    return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900">
            <div className="flex items-start gap-3">
                <Users size={20} className="mt-0.5 flex-shrink-0" />
                <div>
                    <h3 className="font-semibold mb-1">User Management Module</h3>
                    <p className="text-sm">This module allows admins to invite and manage team members. To use this feature:</p>
                    <ul className="text-sm mt-3 space-y-1 list-disc list-inside">
                        <li>Go to your Supabase project console</li>
                        <li>Navigate to Authentication &gt; Users</li>
                        <li>Click "Add user" to invite new team members</li>
                        <li>Set their email, password, and metadata (firstName, lastName, role, status)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
