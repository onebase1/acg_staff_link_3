
import React from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight, CheckCircle, Shield, Zap,
    Bot, Clock, Phone, LineChart,
    Smartphone, MessageSquare, Globe, Sparkles
} from 'lucide-react';

export default function Landing() {
    return (
        <div className="bg-white min-h-screen font-sans selection:bg-cyan-100 selection:text-cyan-900">

            {/* Hero Section */}
            <section className="relative pt-24 pb-32 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-50/50 via-white to-transparent -z-10" />

                <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-100 text-cyan-700 text-xs font-bold mb-8 animate-fade-in">
                        <Zap className="w-3" />
                        <span>New: AI-Powered Shift Matching</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-8 leading-[1.1]">
                        The Operating System for <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-700">Modern Healthcare Agencies</span>
                    </h1>

                    <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
                        Scale your healthcare recruitment agency without the administrative debt. ACG StaffLink is the AI-powered
                        platform that automates scheduling, streamlines CQC-ready compliance, and accelerates
                        payments with agentic precision.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Link
                            to="/contact"
                            className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-bold shadow-2xl shadow-cyan-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group"
                        >
                            Get Started
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    {/* Social Proof Placeholder */}
                    <div className="mt-20 pt-10 border-t border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">Trusted by scaling North-East Agencies</p>
                        <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale">
                            <span className="text-2xl font-black text-gray-400">DOMINION</span>
                            <span className="text-2xl font-black text-gray-400">NURSEHUB</span>
                            <span className="text-2xl font-black text-gray-400">STAFFLINK</span>
                            <span className="text-2xl font-black text-gray-400">CAREGRID</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Bento Grid */}
            <section id="features" className="py-24 bg-gray-50">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">Engineered for Million-Dollar Scales</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto italic">Everything you need to run a high-volume healthcare recruitment agency without the administrative debt.</p>
                    </div>

                    <div className="grid md:grid-cols-12 gap-6">
                        {/* Big Card: AI Receptionist */}
                        <div className="md:col-span-8 p-8 rounded-[2.5rem] bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                            <div className="relative z-10">
                                <Bot className="w-12 h-12 text-cyan-600 mb-6 group-hover:scale-110 transition-transform" />
                                <h3 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Meet Kylie: Your AI Voice Receptionist</h3>
                                <p className="text-gray-600 max-w-md leading-relaxed mb-8">
                                    Kylie handles staff call-offs and client bookings 24/7. Her inbound voice agent updates your live rota instantly, ensuring no shift goes unfilled.
                                </p>
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-50 text-cyan-700 text-sm font-bold">
                                    <Phone className="w-4 h-4" />
                                    Live in Production
                                </div>
                            </div>
                            <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-100 rounded-full blur-3xl opacity-20 -z-0 translate-y-12 translate-x-12" />
                        </div>

                        {/* Small Card: Compliance */}
                        <div className="md:col-span-4 p-8 rounded-[2.5rem] bg-gray-900 text-white shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden">
                            <Shield className="w-10 h-10 text-cyan-400 mb-6" />
                            <h3 className="text-2xl font-bold mb-4">Compliance Guard</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Automated DBS and training triggers. We block non-compliant bookings before they happen, keeping you CQC-audit ready.
                            </p>
                            <div className="mt-12 overflow-hidden">
                                <div className="h-1 bg-gray-800 rounded-full w-full">
                                    <div className="h-1 bg-cyan-500 rounded-full w-[100%] animate-pulse" />
                                </div>
                                <span className="text-[10px] text-cyan-400 font-mono mt-2 block">VERIFIED: 100% AUDIT READY</span>
                            </div>
                        </div>

                        {/* Marketplace */}
                        <div className="md:col-span-4 p-8 rounded-[2.5rem] bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all">
                            <Globe className="w-10 h-10 text-blue-600 mb-6" />
                            <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Shift Marketplace</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Broadcast vacancies to vetted staff in seconds. One-tap booking via our native mobile dashboard.
                            </p>
                        </div>

                        {/* Financing */}
                        <div className="md:col-span-4 p-8 rounded-[2.5rem] bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all">
                            <LineChart className="w-10 h-10 text-indigo-600 mb-6" />
                            <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Direct Invoicing</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Generate agency invoices and staff pay-slips instantly. Direct-to-bank exports slash accounting hours by 90%.
                            </p>
                        </div>

                        {/* Mobile App */}
                        <div className="md:col-span-4 p-8 rounded-[2.5rem] bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all">
                            <Smartphone className="w-10 h-10 text-cyan-500 mb-6" />
                            <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Staff Experience</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Geofenced clock-ins, instant timesheet uploads, and shift reminders via WhatsApp.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Value Track Section */}
            <section id="pricing" className="py-24 border-t border-gray-100">
                <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
                    <h2 className="text-4xl font-bold text-gray-900 mb-16">Why ACG StaffLink?</h2>

                    <div className="grid md:grid-cols-2 gap-x-16 gap-y-12 text-left">
                        {[
                            {
                                title: "Mission Critical ROI",
                                desc: "Agencies using StaffLink report an 80% reduction in coordination overhead within 30 days."
                            },
                            {
                                title: "Regulatory Peace of Mind",
                                desc: "Built for UK healthcare. Our compliance engine aligns with CQC inspection frameworks."
                            },
                            {
                                title: "Modern Tech Stack",
                                desc: "No legacy debt. Built on Supabase and n8n for maximum speed and infinite scalability."
                            },
                            {
                                title: "White-Labeled Power",
                                desc: "Your branding, your staff, your business—supercharged by our hidden engine."
                            }
                        ].map((track, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-2 tracking-tight">{track.title}</h4>
                                    <p className="text-gray-500 text-sm leading-relaxed">{track.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="py-24 bg-gray-900 text-white overflow-hidden relative">
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to exit the scheduling chaos?</h2>
                    <p className="text-gray-400 text-lg mb-12">Join the next generation of healthcare recruitment agencies scaling with ACG StaffLink.</p>
                    <Link
                        to="/contact"
                        className="inline-flex items-center gap-3 px-10 py-5 bg-cyan-500 text-white font-bold rounded-2xl hover:bg-cyan-400 transition-all shadow-xl shadow-cyan-500/20"
                    >
                        Request Early Access
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2" />
            </section>
        </div>
    );
}
