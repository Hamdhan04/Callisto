import React, { useState } from 'react';
import { login, register } from '../api';
import { User, Lock, LogIn, UserPlus, AlertCircle } from 'lucide-react';

const Login = ({ onLogin }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegistering) {
                await register(username, password);
                // Auto login after register or ask to login? Let's auto login for UX
                const data = await login(username, password);
                onLogin(data);
            } else {
                const data = await login(username, password);
                onLogin(data);
            }
        } catch (err) {
            console.error("Auth error:", err);
            setError(err.response?.data?.detail || "Authentication received an error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#000B18] to-[#0d1b2a] flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-800">
                <div className="bg-blue-600/10 p-8 text-center border-b border-slate-800">
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                    <p className="text-blue-400">Sign in to continue your conversation</p>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="bg-red-900/20 text-red-400 p-3 rounded-lg mb-6 flex items-center gap-2 text-sm border border-red-900/50">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                            <div className="relative">
                                <User className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-500"
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                            <div className="relative">
                                <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-500"
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="animate-pulse">Processing...</span>
                            ) : isRegistering ? (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Create Account
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-400">
                            {isRegistering ? "Already have an account?" : "Don't have an account?"}
                            <button
                                onClick={() => {
                                    setIsRegistering(!isRegistering);
                                    setError('');
                                }}
                                className="ml-1 text-blue-400 font-semibold hover:underline focus:outline-none hover:text-blue-300"
                            >
                                {isRegistering ? "Sign In" : "Register"}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
