'use client';

import { Badge } from '@/components/ui';
import { Eye, FileText, Mail, MapPin, Phone, Smartphone, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DeleteUserModal } from './DeleteUserModal';
import { UserHistoryModal } from './UserHistoryModal';

interface User {
  id: string;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  location: string | null;
  device_id: string | null;
  created_at: string;
  last_active: string | null;
  is_active: boolean;
  total_scans?: number;
  last_scan?: string | null;
}

interface UserTableProps {
  users: User[];
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getActivityStatus(lastActive: string | null): { label: string; color: string } {
  if (!lastActive) return { label: 'Inactive', color: 'gray' };
  
  const now = new Date();
  const lastActiveDate = new Date(lastActive);
  const diffInDays = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays <= 1) return { label: 'Active', color: 'success' };
  if (diffInDays <= 7) return { label: 'Recent', color: 'warning' };
  return { label: 'Inactive', color: 'gray' };
}

export function UserTable({ users }: UserTableProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [historyType, setHistoryType] = useState<'scans' | 'diagnoses' | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const handleViewScans = (user: User) => {
    setSelectedUser(user);
    setHistoryType('scans');
  };

  const handleViewDiagnoses = (user: User) => {
    setSelectedUser(user);
    setHistoryType('diagnoses');
  };

  const handleDelete = (user: User) => {
    setUserToDelete(user);
  };

  const closeHistoryModal = () => {
    setSelectedUser(null);
    setHistoryType(null);
  };

  const closeDeleteModal = () => {
    setUserToDelete(null);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                Total Scans
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                Last Active
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-light uppercase">
                Joined
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-neutral-light uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-neutral-light">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const activityStatus = getActivityStatus(user.last_active);
                return (
                  <tr key={user.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-medium">
                          {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-neutral">
                            {user.full_name || 'Unnamed User'}
                          </p>
                          {user.device_id && (
                            <p className="text-xs text-neutral-light flex items-center gap-1 mt-0.5">
                              <Smartphone className="h-3 w-3" />
                              {user.device_id.substring(0, 8)}...
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-neutral flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-neutral-light" />
                          {user.email}
                        </p>
                        {user.phone_number && (
                          <p className="text-sm text-neutral-light flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-neutral-light" />
                            {user.phone_number}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.location ? (
                        <p className="text-sm text-neutral flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-neutral-light" />
                          {user.location}
                        </p>
                      ) : (
                        <span className="text-xs text-neutral-light">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={activityStatus.color as any}>
                        {activityStatus.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-neutral">{user.total_scans}</p>
                        {user.last_scan && (
                          <p className="text-xs text-neutral-light">
                            Last: {formatDate(user.last_scan)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-neutral">{formatDate(user.last_active)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-neutral-light">
                        {formatDate(user.created_at)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewScans(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Scan History"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleViewDiagnoses(user)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="View Diagnosis History"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* History Modal */}
      {selectedUser && historyType && (
        <UserHistoryModal
          user={selectedUser}
          type={historyType}
          onClose={closeHistoryModal}
        />
      )}

      {/* Delete Modal */}
      {userToDelete && (
        <DeleteUserModal
          user={userToDelete}
          onClose={closeDeleteModal}
        />
      )}
    </>
  );
}
