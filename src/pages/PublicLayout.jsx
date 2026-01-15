
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Building2, Shield, FileText, CheckCircle } from 'lucide-react';

export default function PublicLayout({ children }) {
    const location = useLocation();
    const year = new Date().getFullYear();

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
            <style>{`
        .public-gradient-text {
          background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .public-btn-primary {
          background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%);
          color: white;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .public-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.25);
        }
      `}</style>

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <Link to="/landing" className="flex items-center gap-3 group">
                        <img
                            src="/ACGTransLogo.png"
                            alt="ACG StaffLink Logo"
                            className="h-12 w-auto object-contain"
                            onError={(e) => {
                                // Fallback if image fails
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className="hidden w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                            ACG
                        </div>
                        <span className="font-extrabold text-2xl text-gray-900 tracking-tight group-hover:text-cyan-600 transition-colors">
                            StaffLink
                        </span>
                    </Link>

                    {/* Standard Nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        <Link to="/landing" className="text-sm font-bold text-gray-600 hover:text-cyan-600 transition-colors">Home</Link>
                        <a href="#features" className="text-sm font-bold text-gray-600 hover:text-cyan-600 transition-colors">Features</a>
                        <a href="#pricing" className="text-sm font-bold text-gray-600 hover:text-cyan-600 transition-colors">Pricing</a>
                        <Link to="/contact" className="text-sm font-bold text-gray-600 hover:text-cyan-600 transition-colors">Contact</Link>
                    </nav>

                    <div className="flex items-center gap-4">
                        <Link
                            to="/login"
                            className="hidden sm:block text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors px-4 py-2"
                        >
                            Sign In
                        </Link>
                        <Link
                            to="/contact"
                            className="public-btn-primary px-6 py-2.5 rounded-xl text-sm font-bold shadow-xl shadow-cyan-500/20"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow">
                {/* Render children passed directly or via nested routes */}
                {children || <Outlet />}
            </main>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center gap-3 mb-6">
                                <img src="/ACGTransLogo.png" alt="Logo" className="h-8 w-auto brightness-0 invert" />
                                <span className="font-bold text-xl tracking-tight">ACG StaffLink</span>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed max-w-sm mb-8">
                                The intelligent operating system for modern healthcare agencies.
                                Automating scheduling, compliance, and payroll with agentic AI precision.
                            </p>
                            <div className="flex gap-4">
                                <Link to="/contact" className="text-xs bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors">Support Center</Link>
                                <Link to="/contact" className="text-xs bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors">Book a Demo</Link>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-6 text-sm uppercase tracking-widest">Platform</h4>
                            <ul className="space-y-4 text-sm text-gray-400">
                                <li><a href="/landing#features" className="hover:text-cyan-400 transition-colors">How it Works</a></li>
                                <li><a href="/landing#pricing" className="hover:text-cyan-400 transition-colors">Pricing</a></li>
                                <li><Link to="/login" className="hover:text-cyan-400 transition-colors">Client & Staff Portal</Link></li>
                                <li><Link to="/login" className="hover:text-cyan-400 transition-colors">Sign In</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-6 text-sm uppercase tracking-widest">Legal</h4>
                            <ul className="space-y-4 text-sm text-gray-400">
                                <li><Link to="/privacy" className="hover:text-cyan-400 transition-colors">Privacy Policy</Link></li>
                                <li><Link to="/terms" className="hover:text-cyan-400 transition-colors">Terms of Service</Link></li>
                                <li><Link to="/contact" className="hover:text-cyan-400 transition-colors">Contact Sales</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-6">
                            <p className="text-xs text-gray-500">
                                © {year} Agile Care Management Ltd.
                            </p>
                            <span className="text-gray-700 text-xs">UK Registered Company</span>
                        </div>
                        <div className="flex items-center gap-6 text-gray-500">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-cyan-500" />
                                <span className="text-xs">UK GDPR Compliant</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-xs">CQC Ready</span>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
