'use client';

import { Card } from '@/components/ui';
import { AlertTriangle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface User {
  id: string;
  full_name: string | null;
  email: string;
  total_scans?: number;
}

interface DeleteUserModalProps {
  user: User;
  onClose: () => void;
}

export function DeleteUserModal({ user, onClose }: DeleteUserModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/users/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      // Success - refresh the page
      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-neutral">Delete User</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-neutral">
            Are you sure you want to delete this user? This action cannot be undone.
          </p>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p className="text-sm">
              <span className="text-neutral-light">Name: </span>
              <span className="font-medium text-neutral">
                {user.full_name || 'Unnamed User'}
              </span>
            </p>
            <p className="text-sm">
              <span className="text-neutral-light">Contact: </span>
              <span className="font-medium text-neutral">{user.email}</span>
            </p>
            {user.total_scans !== undefined && user.total_scans > 0 && (
              <p className="text-sm">
                <span className="text-neutral-light">Total Scans: </span>
                <span className="font-medium text-red-600">{user.total_scans}</span>
              </p>
            )}
          </div>

          {user.total_scans !== undefined && user.total_scans > 0 && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-sm text-red-800">
                ⚠️ This user has <strong>{user.total_scans} scan(s)</strong>. All associated
                scans, diagnoses, and recommendations will also be deleted (soft delete).
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-neutral rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {deleting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Deleting...
              </>
            ) : (
              'Delete User'
            )}
          </button>
        </div>
      </Card>
    </div>
  );
}
