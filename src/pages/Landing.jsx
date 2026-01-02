
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Shield, Zap } from 'lucide-react';

export default function Landing() {
    return (
        <div className="bg-white">
            {/* Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 to-blue-50 -z-10" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 text-xs font-semibold mb-6">
                        <Zap className="w-3 h-3" />
                        <span>New: AI-Powered Shift Matching</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6">
                        The Operating System for <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">Modern Healthcare Agencies</span>
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
                        Automate scheduling, streamline compliance, and accelerate payments.
                        ACG StaffLink connects your workforce with precision.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/login"
                            className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40 hover:-translate-y-1 transition-all flex items-center gap-2"
                        >
                            Get Started
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <button className="px-8 py-4 rounded-xl bg-white text-gray-700 font-semibold border border-gray-200 hover:bg-gray-50 transition-colors">
                            View Documentation
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-12">
                        {[
                            {
                                icon: Zap,
                                title: "Instant Matching",
                                desc: "Our AI matches the right staff to the right shift in seconds, considering skills, location, and history."
                            },
                            {
                                icon: Shield,
                                title: "Compliance First",
                                desc: "Never miss a document expiry. Automated checks ensure 100% compliant workforce deployment."
                            },
                            {
                                icon: CheckCircle,
                                title: "Real-time Operations",
                                desc: "Live GPS tracking, instant timesheet verification, and automated invoicing."
                            }
                        ].map((feature, idx) => (
                            <div key={idx} className="p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all border border-gray-100">
                                <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center mb-4">
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
