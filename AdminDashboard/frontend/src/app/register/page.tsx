'use client';

import { Leaf, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    secretKey: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
          secret_key: formData.secretKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      // Success - redirect to login
      router.push('/login?registered=true');
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-secondary to-primary items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="flex justify-center mb-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
              <Leaf className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">FasalVaidya</h1>
          <p className="text-lg text-white/80">
            Create your admin account to manage the agriculture monitoring system
          </p>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="flex flex-1 items-center justify-center p-8 bg-bg-primary">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
              <Leaf className="h-10 w-10 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-neutral text-center lg:text-left">
            Create Admin Account
          </h2>
          <p className="mt-2 text-neutral-light text-center lg:text-left">
            Register as an administrator
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="rounded-lg bg-danger/20 border border-danger p-4 text-sm text-red-800">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData((d) => ({ ...d, fullName: e.target.value }))
                }
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-neutral focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Dhruval Bhinsara"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral mb-2">
                Email address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((d) => ({ ...d, email: e.target.value }))
                }
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-neutral focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="admin@fasalvaidya.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral mb-2">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((d) => ({ ...d, password: e.target.value }))
                }
                required
                minLength={8}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-neutral focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-neutral-light">
                Minimum 8 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData((d) => ({ ...d, confirmPassword: e.target.value }))
                }
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-neutral focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral mb-2">
                Admin Secret Key
              </label>
              <input
                type="password"
                value={formData.secretKey}
                onChange={(e) =>
                  setFormData((d) => ({ ...d, secretKey: e.target.value }))
                }
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-neutral focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Enter admin secret key"
              />
              <p className="mt-1 text-xs text-neutral-light">
                Contact system administrator for the secret key
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-neutral-light">
            Already have an account?{' '}
            <a
              href="/login"
              className="font-medium text-primary hover:text-primary-dark"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
