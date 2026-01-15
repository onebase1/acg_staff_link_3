
import React from 'react';

export default function Terms() {
    const lastUpdated = "January 14, 2026";
    const company = "Agile Care Management";

    return (
        <div className="bg-white min-h-screen font-sans leading-relaxed">
            <div className="max-w-4xl mx-auto px-6 py-20">
                <div className="mb-12 border-b border-gray-100 pb-8 text-center sm:text-left">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">Terms of Service</h1>
                    <p className="text-gray-500 uppercase text-xs font-bold tracking-widest leading-loose text-center sm:text-left">Last updated: {lastUpdated}</p>
                </div>

                <div className="prose prose-blue max-w-none text-gray-600 space-y-12 text-sm md:text-base">
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-l-4 border-cyan-500 pl-4 uppercase text-xs tracking-widest leading-loose">1. Agreement to Terms</h2>
                        <p>
                            By accessing or using the ACG StaffLink platform, provided by <strong>{company}</strong>, you agree to be bound by these Terms of Service and our Data Processing Agreement. If you are entering into these terms on behalf of an agency, you represent that you have the authority to bind that entity.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-l-4 border-cyan-500 pl-4 uppercase text-xs tracking-widest leading-loose">2. Description of Service</h2>
                        <p>
                            ACG StaffLink is an "Agentic Workforce Orchestration" platform designed for healthcare staffing agencies. We provide tools for shift booking, compliance management, AI-driven voice reception, and financial processing. We are a software provider, not a staffing agency.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-l-4 border-cyan-500 pl-4 uppercase text-xs tracking-widest leading-loose">3. User Obligations</h2>
                        <p className="mb-6">You agree to:</p>
                        <div className="grid gap-3">
                            {[
                                "Maintain the security of your account credentials.",
                                "Ensure all data uploaded (Staff profiles, DBS checks) is accurate and legally obtained.",
                                "Compensate all staff members in accordance with UK employment law."
                            ].map((o, i) => (
                                <div key={i} className="flex gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                    <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                                    <p className="text-sm text-gray-700 leading-normal">{o}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-l-4 border-cyan-500 pl-4 uppercase text-xs tracking-widest leading-loose">4. Fees and Payments</h2>
                        <p>
                            Subscription fees and transaction commissions are billed as per your specific Service Level Agreement (SLA). All fees are non-refundable unless specified otherwise. We reserve the right to suspend access if payments are overdue by more than 14 days.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-l-4 border-cyan-500 pl-4 uppercase text-xs tracking-widest leading-loose">5. Intellectual Property</h2>
                        <p>
                            The technology, algorithms, and interface of ACG StaffLink are the exclusive property of {company}. You are granted a non-exclusive, non-transferable license to use the platform for your internal business operations.
                        </p>
                    </section>

                    <section className="bg-gray-900 p-8 rounded-3xl text-gray-200">
                        <h2 className="text-2xl font-bold text-white mb-6 uppercase text-xs tracking-widest">6. Limitation of Liability</h2>
                        <p className="mb-6 text-gray-300">
                            To the maximum extent permitted by UK law, {company} shall not be liable for:
                        </p>
                        <ul className="space-y-4 mb-8">
                            {[
                                "Any failure of a staff member to arrive at a shift.",
                                "Any loss of revenue due to technical downtime.",
                                "Indirect or consequential damages arising from the AI matching engine."
                            ].map((l, i) => (
                                <li key={i} className="flex gap-3 items-start">
                                    <div className="w-5 h-5 rounded bg-red-500/20 text-red-400 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">✕</div>
                                    <span className="text-sm leading-relaxed">{l}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 text-center">
                            <p className="text-sm font-semibold text-white">
                                Cap on Liability: 6 months of service fees.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-l-4 border-cyan-500 pl-4 uppercase text-xs tracking-widest leading-loose">7. Data Residency</h2>
                        <p>
                            Consistent with UK GDPR requirements, all primary database operations and file storage occur within <strong>UK-based data centers</strong> (AWS/Supabase London regions).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-l-4 border-cyan-500 pl-4 uppercase text-xs tracking-widest leading-loose">8. Termination</h2>
                        <p>
                            Either party may terminate the agreement with 30 days' written notice. Upon termination, we will provide a final export of your core business data in CSV format, after which all data will be scheduled for deletion as per our retention policy.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-l-4 border-cyan-500 pl-4 uppercase text-xs tracking-widest leading-loose text-center sm:text-left leading-loose">9. Governing Law</h2>
                        <p>
                            These terms are governed by and construed in accordance with the laws of <strong>England and Wales</strong>. Any disputes shall be subject to the exclusive jurisdiction of the English courts.
                        </p>
                    </section>

                    <footer className="pt-16 border-t border-gray-100 italic text-center text-gray-400 text-xs">
                        <p>
                            ACG StaffLink is a solution by Agile Care Management.<br />
                            Legal inquiries: legal [at] agilecaremanagement.co.uk
                        </p>
                    </footer>
                </div>
            </div>
        </div>
    );
}
