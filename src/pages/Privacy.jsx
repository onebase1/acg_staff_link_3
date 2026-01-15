
import React from 'react';

export default function Privacy() {
    const lastUpdated = "January 14, 2026";
    const company = "Agile Care Management";

    return (
        <div className="bg-white min-h-screen">
            <div className="max-w-4xl mx-auto px-6 py-20 font-sans">
                <div className="mb-12 border-b border-gray-100 pb-8 text-center sm:text-left">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">Privacy Policy</h1>
                    <p className="text-gray-500 uppercase text-xs font-bold tracking-widest leading-loose">Last updated: {lastUpdated}</p>
                </div>

                <div className="prose prose-blue max-w-none text-gray-600 space-y-12 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-l-4 border-cyan-500 pl-4 uppercase text-sm tracking-wider">1. Introduction</h2>
                        <p className="mb-4">
                            Welcome to <strong>{company}</strong> ("we", "us", "our"). We committed to protecting and respecting your privacy in accordance with the <strong>UK General Data Protection Regulation (UK GDPR)</strong> and the <strong>Data Protection Act 2018</strong>.
                        </p>
                        <p>
                            This policy explains how we collect, use, and protect the personal data of our customers (Agency Owners), their staff (Healthcare Professionals), and their clients (Care Providers) when using the ACG StaffLink platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-l-4 border-cyan-500 pl-4 uppercase text-sm tracking-wider">2. The Role We Play</h2>
                        <p className="mb-6">
                            Depending on the nature of the data, we act as both a Data Controller and a Data Processor:
                        </p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <li className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <strong className="text-gray-900 block mb-1">Data Controller</strong>
                                For marketing information and the basic billing data of our direct customers (the Agencies).
                            </li>
                            <li className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <strong className="text-gray-900 block mb-1">Data Processor</strong>
                                For all data uploaded to the platform by an Agency regarding their staff and care home clients.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-l-4 border-cyan-500 pl-4 uppercase text-sm tracking-wider">3. Data We Collect</h2>
                        <p className="mb-6 text-gray-700 italic">We process the following categories of data to facilitate intelligent healthcare staffing:</p>

                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl border-2 border-cyan-50 shadow-sm transition-hover hover:shadow-md">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-cyan-500" />
                                    For Staff Members:
                                </h3>
                                <ul className="list-disc pl-6 space-y-3 text-sm">
                                    <li><strong>Identity Data:</strong> Full name, date of birth, Right to Work documentation, and professional registrations (NMC/HCPC).</li>
                                    <li><strong>Compliance Data:</strong> DBS (Disclosure and Barking Service) certificates, training records, and vaccination status.</li>
                                    <li><strong>Location Data:</strong> Real-time GPS geofencing data during active shifts for timesheet verification.</li>
                                    <li><strong>Performance Data:</strong> Attendance records, "No-Show" history, and client feedback.</li>
                                </ul>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border-2 border-blue-50 shadow-sm transition-hover hover:shadow-md">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    For Agencies & Clients:
                                </h3>
                                <ul className="list-disc pl-6 space-y-3 text-sm">
                                    <li>Business contact details and operational addresses.</li>
                                    <li>Shift requirements and facility-specific instructions.</li>
                                    <li>Financial data for invoicing and payroll processing.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-l-4 border-cyan-500 pl-4 uppercase text-sm tracking-wider">4. Lawful Basis for Processing</h2>
                        <p className="mb-4">We process data under the following legal grounds:</p>
                        <div className="grid gap-3">
                            {[
                                { title: "Contractual Necessity", desc: "To provide the platform services agreed upon." },
                                { title: "Legal Obligation", desc: "To ensure compliance with UK healthcare regulations (e.g., CQC standards)." },
                                { title: "Legitimate Interests", desc: "To improve our AI algorithms for better shift matching and fraud prevention." }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
                                    <span className="font-bold text-cyan-600">{i + 1}.</span>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">{item.title}</h4>
                                        <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-l-4 border-cyan-500 pl-4 uppercase text-sm tracking-wider">5. Special Category Data</h2>
                        <p className="p-6 bg-amber-50 rounded-2xl border-l-8 border-amber-400 text-amber-900 italic">
                            Due to the nature of the healthcare sector, we process "Special Category Data" (such as health information) and criminal conviction data. We apply high levels of encryption and strict access controls to this data to ensure compliance with Article 9 of the UK GDPR.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-l-4 border-cyan-500 pl-4 uppercase text-sm tracking-wider">6. Data Retention</h2>
                        <p>
                            We retain data for as long as accounts are active. However, legal requirements for healthcare staffing audits mean some records (particularly training and DBS verification) may be held for a minimum of <strong>3 to 6 years</strong> even after a staff member has left the platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-l-4 border-cyan-500 pl-4 uppercase text-sm tracking-wider">7. Your Rights</h2>
                        <p className="mb-6">Under UK law, you have the right to:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                            {["Access", "Correction", "Deletion", "Portability"].map((right) => (
                                <div key={right} className="p-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm">
                                    {right}
                                </div>
                            ))}
                        </div>
                    </section>

                    <footer className="pt-16 border-t border-gray-100">
                        <div className="bg-gray-900 text-gray-100 p-8 rounded-3xl">
                            <h3 className="text-xl font-bold mb-4">Contact Information</h3>
                            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                For any privacy inquiries or to exercise your rights, please contact our Data Protection Officer at:
                            </p>
                            <div className="bg-gray-800 p-4 rounded-xl text-cyan-400 font-mono text-sm break-all text-center">
                                legal [at] agilecaremanagement.co.uk
                            </div>
                            <p className="text-xs text-gray-500 mt-8 leading-loose">
                                You also have the right to lodge a complaint with the <strong>Information Commissioner's Office (ICO)</strong>.
                                ICO Registration Number: [Pending Registration]
                            </p>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
}
