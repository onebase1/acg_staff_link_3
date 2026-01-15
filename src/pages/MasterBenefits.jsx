import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Users, TrendingUp, UserCheck, Heart, Sparkles } from 'lucide-react';

const benefits = [
    {
        category: "Agency Owners",
        icon: Target,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        items: [
            { text: "Operations on Autopilot: 80% reduction in manual scheduling.", status: "LIVE", priority: "CRITICAL", killer: true },
            { text: "Crisis Management: AI Voice Receptionist handles early morning call-offs.", status: "LIVE", priority: "CRITICAL", killer: true },
            { text: "Client Inbound AI: Clients call Kylie to book/amend shifts.", status: "TESTING", priority: "HIGH", killer: true },
            { text: "Compliance Shield: Automated DBS/Training trackers for block-booking.", status: "LIVE", priority: "HIGH" },
            { text: "Direct-to-Bank Invoicing: Instant agency invoices/staff pay-slips.", status: "LIVE", priority: "HIGH" },
            { text: "Shift Marketplace: Broadcast shifts via WhatsApp/App in seconds.", status: "BETA", priority: "HIGH" },
            { text: "White-Label Branding: Agency-specific logos and subdomains.", status: "LIVE", priority: "MEDIUM" },
        ]
    },
    {
        category: "Partners",
        icon: Users,
        color: "text-purple-600",
        bgColor: "bg-purple-50",
        items: [
            { text: "Agentic Orchestration: Modern n8n + Supabase stack (No legacy debt).", status: "LIVE", priority: "HIGH" },
            { text: "Data Moat: Proprietary metrics on staff reliability/fill patterns.", status: "LIVE", priority: "HIGH" },
            { text: "Multi-Tenant Scalability: Built for 100+ agencies out of the box.", status: "LIVE", priority: "MEDIUM" },
        ]
    },
    {
        category: "Investors",
        icon: TrendingUp,
        color: "text-green-600",
        bgColor: "bg-green-50",
        items: [
            { text: "Traction: MVP proven via production testing with live agencies.", status: "LIVE", priority: "CRITICAL" },
            { text: "High Retention Moat: Mission-critical operational backbone.", status: "LIVE", priority: "HIGH" },
            { text: "Regulatory Alignment: UK-specific (CQC/DBS/GDPR) readiness.", status: "LIVE", priority: "HIGH" },
        ]
    },
    {
        category: "Staff Members",
        icon: UserCheck,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        items: [
            { text: "Shift Freedom: Instant pickup via mobile notifications.", status: "LIVE", priority: "CRITICAL" },
            { text: "Earnings Transparency: Guaranteed visibility on pay/hours.", status: "LIVE", priority: "HIGH" },
            { text: "GPS Verification: Geofenced clock-in (No paper timesheets).", status: "LIVE", priority: "HIGH" },
            { text: "AI Staff Assistant: 24/7 FAQ support via WhatsApp.", status: "BETA", priority: "MEDIUM" },
        ]
    },
    {
        category: "Clients",
        icon: Heart,
        color: "text-red-600",
        bgColor: "bg-red-50",
        items: [
            { text: "Reliability Guarantee: 99% shift fill-rate via AI matching.", status: "LIVE", priority: "CRITICAL" },
            { text: "Staff Consistency: Automatic prioritization of \"favorite\" staff.", status: "LIVE", priority: "HIGH" },
            { text: "Real-time Logistics: Alerts when staff are on-site/on-way.", status: "LIVE", priority: "MEDIUM" },
        ]
    }
];

export default function MasterBenefits() {
    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-8 rounded-2xl text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-cyan-400" />
                        <span className="text-cyan-400 font-bold tracking-widest text-xs uppercase">Strategic Source of Truth</span>
                    </div>
                    <h1 className="text-4xl font-black mb-2">Master SaaS Benefits Repository</h1>
                    <p className="text-slate-300 max-w-2xl font-light leading-relaxed">
                        The definitive technical and commercial logic underpinning ACG StaffLink's market position.
                        Use these verified claims for pitches, landing pages, and grant applications.
                    </p>
                </div>
                <div className="relative z-10">
                    <Badge className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 text-xs uppercase tracking-tighter shadow-lg">
                        Version 1.2 • Jan 2026
                    </Badge>
                </div>

                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full -ml-24 -mb-24 blur-3xl"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {benefits.map((group) => (
                    <Card key={group.category} className="border-none shadow-md hover:shadow-lg transition-shadow bg-white rounded-xl overflow-hidden">
                        <CardHeader className={`flex flex-row items-center gap-4 space-y-0 px-6 py-5 ${group.bgColor}`}>
                            <div className={`w-12 h-12 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center ${group.color}`}>
                                <group.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-extrabold text-slate-800">{group.category}</CardTitle>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Value Proposition</p>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                {group.items.map((item, idx) => (
                                    <div key={idx} className={`group relative p-4 rounded-xl border transition-all duration-200 hover:translate-x-1 ${item.killer ? 'bg-gradient-to-br from-cyan-50 to-white border-cyan-200 shadow-sm' : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'}`}>
                                        <div className="flex items-center justify-between gap-2 mb-2 text-[10px] font-bold">
                                            <div className="flex gap-2">
                                                <span className={`px-2 py-0.5 rounded uppercase ${item.status === 'LIVE' ? 'bg-green-100 text-green-700' :
                                                        item.status === 'BETA' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-slate-200 text-slate-600'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                                {item.killer && (
                                                    <span className="px-2 py-0.5 rounded bg-cyan-600 text-white uppercase flex items-center gap-1 shadow-sm">
                                                        <Sparkles className="w-2.5 h-2.5" />
                                                        Killer Feature
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-slate-400 uppercase tracking-tighter">{item.priority} Priority</span>
                                        </div>
                                        <p className={`text-sm leading-relaxed ${item.killer ? 'font-bold text-slate-900' : 'text-slate-600 font-medium'}`}>
                                            {item.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Footer Audit Trail */}
            <div className="border-t border-slate-200 pt-8 mt-12 flex flex-col md:flex-row justify-between items-center text-slate-400 text-[10px] uppercase font-bold tracking-widest leading-loose">
                <div className="flex items-center gap-4">
                    <span>Synced with Codebase: Jan 14, 2026</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    <span>Security Level: SuperAdmin Only</span>
                </div>
                <div className="mt-4 md:mt-0 italic">
                    Proprietary Intelligence - ACG StaffLink Growth Engine
                </div>
            </div>
        </div>
    );
}
