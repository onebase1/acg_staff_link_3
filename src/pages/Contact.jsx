
import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';

export default function Contact() {
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            setSubmitted(true);
        }, 1500);
    };

    if (submitted) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-6">
                <div className="max-w-md w-full text-center p-12 rounded-[2.5rem] bg-gray-50 border border-gray-100">
                    <div className="w-20 h-20 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight text-center">Inquiry Received</h2>
                    <p className="text-gray-600 leading-relaxed text-center mb-8">
                        Our platform specialist will reach out within 24 hours to schedule your deep-dive demo.
                    </p>
                    <button
                        onClick={() => setSubmitted(false)}
                        className="text-cyan-600 font-bold hover:text-cyan-700 underline"
                    >
                        Send another message
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen">
            <div className="max-w-7xl mx-auto px-6 py-20 lg:py-32">
                <div className="grid lg:grid-cols-2 gap-20 items-start">
                    {/* Left: Info */}
                    <div>
                        <h1 className="text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">Scale your agency to the next level.</h1>
                        <p className="text-xl text-gray-500 mb-12 leading-relaxed">
                            Whether you're starting a new nursing bureau or optimizing a multi-regional enterprise,
                            ACG StaffLink provides the infrastructure you need to win.
                        </p>

                        <div className="space-y-8">
                            <div className="flex gap-6 items-start">
                                <div className="w-12 h-12 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600 flex-shrink-0">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-1">Direct Inquiries</h4>
                                    <p className="text-gray-500 font-mono text-sm">support [at] agilecaremanagement.co.uk</p>
                                </div>
                            </div>

                            <div className="flex gap-6 items-start">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                    <MapPin className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-1">North-East Hub</h4>
                                    <p className="text-gray-500 text-sm">Innovation Centre, Newcastle upon Tyne, UK</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-16 p-8 rounded-3xl bg-gray-900 text-white relative overflow-hidden">
                            <h4 className="text-lg font-bold mb-2">Speak to a Founder?</h4>
                            <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                Looking for strategic partnerships or investment opportunities?
                                Request a meeting with our Director directly.
                            </p>
                            <div className="inline-flex items-center gap-2 text-cyan-400 font-bold text-sm">
                                <Phone className="w-4 h-4" />
                                Founder Track Available
                            </div>
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div className="p-8 md:p-12 rounded-[2.5rem] bg-gray-50 border border-gray-100 shadow-sm relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Send className="w-20 h-20" />
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-5 py-4 rounded-xl bg-white border border-gray-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all placeholder:text-gray-300"
                                        placeholder="John Carter"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Agency Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-5 py-4 rounded-xl bg-white border border-gray-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all placeholder:text-gray-300"
                                        placeholder="Healthcare Services Ltd"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                                <input
                                    required
                                    type="email"
                                    className="w-full px-5 py-4 rounded-xl bg-white border border-gray-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all placeholder:text-gray-300"
                                    placeholder="john@agency.co.uk"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Inquiry Type</label>
                                <select className="w-full px-5 py-4 rounded-xl bg-white border border-gray-200 focus:border-cyan-500 outline-none transition-all appearance-none cursor-pointer">
                                    <option>Request Full Platform Demo</option>
                                    <option>Pricing Plans</option>
                                    <option>Partnership Proposal</option>
                                    <option>Support Inquiry</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Message</label>
                                <textarea
                                    rows="4"
                                    className="w-full px-5 py-4 rounded-xl bg-white border border-gray-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all placeholder:text-gray-300 resize-none"
                                    placeholder="Tell us about your agency's scale and goals..."
                                />
                            </div>

                            <button
                                disabled={loading}
                                className="w-full py-5 rounded-2xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-gray-900/10 disabled:opacity-50"
                            >
                                {loading ? "Processing..." : "Send Inquiry"}
                                {!loading && <Send className="w-5 h-5" />}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
