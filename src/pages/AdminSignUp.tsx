// pages/AdminSignUp.tsx
import React, { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { auth } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const AdminSignUp = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [signingUp, setSigningUp] = useState(false);
    const [hasAdmin, setHasAdmin] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        termsAccepted: false
    });
    const [error, setError] = useState<string | null>(null);

    // Check if admin already exists
    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const { data, error } = await supabase
                    .rpc('has_admins');

                if (error) throw error;
                setHasAdmin(data || false);
                
                // If admin exists, redirect to login
                if (data) {
                    navigate('/login', { 
                        state: { 
                            message: 'An admin already exists. Please log in.' 
                        } 
                    });
                }
            } catch (error) {
                console.error('Error checking admin:', error);
            } finally {
                setLoading(false);
            }
        };

        checkAdmin();
    }, [navigate]);

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const { fullName, email, password, confirmPassword, termsAccepted } = formData;

        // Validation
        if (!fullName.trim()) {
            setError('Please enter your full name');
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!termsAccepted) {
            setError('Please accept the terms and conditions');
            return;
        }

        setSigningUp(true);

        try {
            // Create first admin using RPC
            const { error: rpcError } = await supabase
                .rpc('create_first_admin', {
                    p_email: email,
                    p_password: password,
                    p_full_name: fullName
                });

            if (rpcError) {
                if (rpcError.message.includes('Admin already exists')) {
                    setError('An admin already exists. Please log in.');
                    navigate('/login');
                    return;
                }
                throw rpcError;
            }

            // Auto-login after creation
            try {
                const signInResult = await auth.signIn(email, password);
                if (!signInResult) {
                    throw new Error('Sign in failed');
                }
            } catch {
                // If auto-login fails, redirect to login
                navigate('/login', { 
                    state: { 
                        message: '✅ Admin account created! Please log in.' 
                    } 
                });
                return;
            }

            // Success - redirect to dashboard
            navigate('/dashboard', { 
                state: { 
                    message: '🎉 Welcome! Your admin account has been created.' 
                } 
            });
        } catch (error: any) {
            console.error('Error creating admin:', error);
            setError(error.message || 'Failed to create admin account. Please try again.');
        } finally {
            setSigningUp(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Checking system status...</p>
                </div>
            </div>
        );
    }

    if (hasAdmin) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <div className="text-yellow-500 text-6xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Admin Already Exists</h1>
                    <p className="text-gray-600 mb-6">An admin account has already been set up.</p>
                    <button 
                        onClick={() => navigate('/login')}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
                <div className="text-center">
                    <div className="flex justify-center">
                        <div className="h-16 w-16 bg-indigo-600 rounded-full flex items-center justify-center">
                            <span className="text-2xl text-white font-bold">T</span>
                        </div>
                    </div>
                    <h2 className="mt-4 text-3xl font-bold text-gray-900">
                        Create Admin Account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Set up your TeamTracker admin account
                    </p>
                    <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        🚀 First-time setup
                    </div>
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 p-4 border border-red-200">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="fullName"
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                placeholder="Enter your full name"
                                required
                                disabled={signingUp}
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                placeholder="Enter your email address"
                                required
                                disabled={signingUp}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                This will be your admin login email
                            </p>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                placeholder="Create a password (min 8 characters)"
                                required
                                minLength={8}
                                disabled={signingUp}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Must be at least 8 characters
                            </p>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                Confirm Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                placeholder="Confirm your password"
                                required
                                minLength={8}
                                disabled={signingUp}
                            />
                        </div>

                        <div className="flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                    id="terms"
                                    type="checkbox"
                                    checked={formData.termsAccepted}
                                    onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    disabled={signingUp}
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="terms" className="text-gray-700">
                                    I accept the{' '}
                                    <a href="/terms" className="text-indigo-600 hover:text-indigo-500">
                                        Terms and Conditions
                                    </a>
                                    {' '}and{' '}
                                    <a href="/privacy" className="text-indigo-600 hover:text-indigo-500">
                                        Privacy Policy
                                    </a>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={signingUp}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {signingUp ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Creating Admin Account...
                                </>
                            ) : (
                                'Create Admin Account'
                            )}
                        </button>
                    </div>

                    <div className="text-center">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                                Sign in
                            </Link>
                        </p>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
                            <span>🔒 Secure</span>
                            <span>•</span>
                            <span>🔑 Admin Access Only</span>
                            <span>•</span>
                            <span>⚡ First-time Setup</span>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
