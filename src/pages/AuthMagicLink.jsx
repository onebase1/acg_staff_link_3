import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Shield, Loader2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

const AuthMagicLink = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('Verifying your secure link...');
    const navigate = useNavigate();
    const token = searchParams.get('token');

    useEffect(() => {
        const verifyMagicLink = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Invalid link: Missing authentication token.');
                return;
            }

            try {
                // Call the auth-magic-link edge function
                const { data, error } = await supabase.functions.invoke('auth-magic-link', {
                    body: { token }
                });

                if (error || !data?.success) {
                    throw new Error(error?.message || data?.error || 'Authentication failed');
                }

                // If successful, we get a Supabase Magic Link URL to properly set the session
                if (data.redirect_url) {
                    setMessage('Authentication successful! Logging you in...');
                    // Redirect to the actual magic link which sets cookies and then redirects to /ClientPortal
                    window.location.href = data.redirect_url;
                } else {
                    // Fallback (shouldn't happen if backend is correct)
                    navigate('/ClientPortal');
                }

            } catch (err) {
                console.error('Magic link verification error:', err);
                setStatus('error');
                setMessage(err.message || 'We could not verify your magic link. It may have expired or already been used.');
            }
        };

        verifyMagicLink();
    }, [token, navigate]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
                <div className="mb-6 flex justify-center">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
                        <Shield className="w-8 h-8 text-indigo-600" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                    Secure Login
                </h1>

                <div className="space-y-4">
                    {status === 'verifying' && (
                        <div className="flex flex-col items-center">
                            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
                            <p className="text-slate-600 font-medium">{message}</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center">
                            <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
                            <p className="text-emerald-700 font-semibold">{message}</p>
                            <div className="mt-6 animate-pulse flex items-center text-emerald-600 font-medium">
                                Taking you to dashboard <ArrowRight className="ml-2 w-4 h-4" />
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center">
                            <XCircle className="w-12 h-12 text-rose-500 mb-3" />
                            <p className="text-rose-700 font-semibold mb-4">{message}</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                            >
                                Back to Login
                            </button>
                            <p className="mt-4 text-xs text-slate-400">
                                If you need assistance, please contact your agency administrator.
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-10 pt-6 border-t border-slate-50">
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">
                        Powered by StaffLink AI
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthMagicLink;
