
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Building2, Shield, FileText } from 'lucide-react';

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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-sm group-hover:shadow-md transition-shadow">
                            ACG
                        </div>
                        <span className="font-bold text-lg text-gray-900 tracking-tight">StaffLink</span>
                    </Link>

                    <nav className="flex items-center gap-6">
                        <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                            Log in
                        </Link>
                        <Link
                            to="/book-demo"
                            className="public-btn-primary px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
                        >
                            Book a Demo
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow">
                {/* Render children passed directly or via nested routes */}
                {children || <Outlet />}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 rounded bg-gray-900 flex items-center justify-center text-white text-xs font-bold">A</div>
                                <span className="font-bold text-gray-900">ACG StaffLink</span>
                            </div>
                            <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
                                Empowering healthcare agencies with intelligent staffing, compliance automation, and financial precision.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-900 mb-4 text-sm">Platform</h4>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li><Link to="/login" className="hover:text-cyan-600 transition-colors">Staff Portal</Link></li>
                                <li><Link to="/login" className="hover:text-cyan-600 transition-colors">Client Portal</Link></li>
                                <li><Link to="/login" className="hover:text-cyan-600 transition-colors">Admin Login</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-900 mb-4 text-sm">Legal</h4>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li><Link to="/privacy" className="hover:text-cyan-600 transition-colors">Privacy Policy</Link></li>
                                <li><Link to="/terms" className="hover:text-cyan-600 transition-colors">Terms of Service</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-xs text-gray-400">
                            © {year} Agile Care Management. All rights reserved.
                        </p>
                        <div className="flex items-center gap-4 text-gray-400">
                            <Shield className="w-4 h-4" />
                            <span className="text-xs">SOC2 Compliant</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
