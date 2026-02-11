import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "react-router-dom";
import {
    Activity, Calendar, Clock, AlertCircle, AlertTriangle,
    CheckCircle, ChevronRight, Building2, TrendingUp, Sparkles,
    MessageCircle, Info, Users
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";

export default function DailyReportView() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const urlDate = searchParams.get("date");
    const targetDate = urlDate || format(new Date(), 'yyyy-MM-dd');

    // 1. Fetch the short link data to get agency context
    const { data: linkData, isLoading: loadingLink } = useQuery({
        queryKey: ['short-link', token],
        queryFn: async () => {
            if (!token) return null;
            console.log("🔍 [DailyReportView] Fetching link data for token:", token);
            const { data, error } = await supabase
                .from('short_links')
                .select('*')
                .eq('id', token)
                .single();

            if (error) {
                console.error("❌ [DailyReportView] Error fetching link data:", error);
                throw error;
            }
            console.log("✅ [DailyReportView] Link data found:", data);
            return data;
        },
        enabled: !!token
    });

    // 2. Fetch the actual report data
    const { data: report, isLoading: loadingReport } = useQuery({
        queryKey: ['daily-report', linkData?.agency_id],
        queryFn: async () => {
            if (!linkData?.agency_id) return null;
            console.log("🔍 [DailyReportView] Fetching report data for agency:", linkData.agency_id, "date:", targetDate);
            const { data, error } = await supabase.rpc('get_daily_agency_report', {
                p_agency_id: linkData.agency_id,
                p_report_date: targetDate
            });

            if (error) {
                console.error("❌ [DailyReportView] RPC Error:", error);
                throw error;
            }
            console.log("✅ [DailyReportView] Report data received:", !!data);
            return data;
        },
        enabled: !!linkData?.agency_id
    });

    if (!token) return <ErrorMessage message="Invalid or missing access token." />;
    if (loadingLink || loadingReport) return <ReportSkeleton />;
    if (!report) return <ErrorMessage message="Report data not found or expired." />;

    const stats = report.stats || {};
    const actionItems = report.actionItems || {};
    const criticalAlerts = actionItems.criticalAlerts || [];
    const warningAlerts = actionItems.warningAlerts || [];
    const clients = report.clients || [];

    return (
        <div className="min-h-screen bg-slate-100 pb-16 font-inter">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-[#4c1d95] to-[#7c3aed] text-white p-10 pb-24 text-center relative overflow-hidden">
                <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-white/10 rounded-full blur-[40px]" />
                <div className="relative z-10 flex flex-col items-center">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 mb-6 animate-pulse flex items-center gap-2">
                        <Badge className="bg-amber-400 text-[#4c1d95] hover:bg-amber-400 border-none px-2 py-0 text-[10px] font-black">ACTION REQUIRED</Badge>
                        <span className="text-xs font-bold tracking-wide">VERIFY ROSTER BEFORE 08:00 DISPATCH</span>
                    </div>
                    <p className="text-sm font-bold opacity-90 tracking-widest uppercase mb-2">
                        DAILY AGENCY SUMMARY
                    </p>
                    <h1 className="text-4xl font-black tracking-tight mb-2 font-outfit">
                        {format(parseISO(targetDate), 'dd MMMM yyyy')}
                    </h1>
                    <p className="text-lg opacity-80 font-medium">
                        Helix Health Staffing
                    </p>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 -mt-10 relative z-20 space-y-6">
                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-6 border-none shadow-sm bg-white/80 backdrop-blur-sm rounded-[20px]">
                        <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fill Rate</span>
                            <span className="text-3xl font-black text-slate-900 font-outfit">
                                {stats.totalShifts > 0 ? Math.round((stats.confirmedShifts / stats.totalShifts) * 100) : 0}%
                            </span>
                        </div>
                    </Card>
                    <Card className="p-6 border-none shadow-sm bg-white/80 backdrop-blur-sm rounded-[20px]">
                        <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Scheduled</span>
                            <span className="text-3xl font-black text-slate-900 font-outfit">{stats.totalShifts || 0}</span>
                        </div>
                    </Card>
                    <Card className="p-6 border-none shadow-sm bg-white/80 backdrop-blur-sm rounded-[20px]">
                        <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Confirmed</span>
                            <span className="text-3xl font-black text-emerald-600 font-outfit">{stats.confirmedShifts || 0}</span>
                        </div>
                    </Card>
                    <Card className="p-6 border-none shadow-sm bg-white/80 backdrop-blur-sm rounded-[20px]">
                        <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Action Items</span>
                            <span className={`text-3xl font-black font-outfit ${criticalAlerts.length > 0 ? 'text-amber-500' : 'text-slate-900'}`}>
                                {criticalAlerts.length + warningAlerts.length}
                            </span>
                        </div>
                    </Card>
                </div>

                {/* Critical Alerts Section */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-xl font-bold text-slate-900 font-outfit">Critical Alerts</h2>
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-none rounded-full text-[10px] px-3 font-bold uppercase">High Priority</Badge>
                    </div>
                    {criticalAlerts.length > 0 ? (
                        criticalAlerts.map((alert, i) => (
                            <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border-l-[4px] border-red-500 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 text-base">{alert.message}</h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        {alert.clientName} • Assigned: <span className="text-slate-900 font-bold">{alert.staffName || 'Unknown'}</span>
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white p-5 rounded-2xl shadow-sm border-l-[4px] border-emerald-500 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-900 text-base">All clear!</h3>
                                <p className="text-xs text-slate-500">No urgent gaps reported currently.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Rota Summary Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-xl font-bold text-slate-900 font-outfit">Rota Summary</h2>
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none rounded-full text-[10px] px-3 font-bold uppercase">
                            {clients.length} Clients Active
                        </Badge>
                    </div>

                    <div className="space-y-3">
                        {clients.map((client, i) => {
                            const shifts = client.shifts || [];
                            const confirmedCount = shifts.filter(s => s.status === 'confirmed').length;
                            const openCount = shifts.filter(s => s.status === 'open').length;
                            const total = confirmedCount + openCount;
                            const fillRate = total > 0 ? Math.round((confirmedCount / total) * 100) : 0;

                            let badgeStyle = "bg-red-100 text-red-800";
                            let progressStyle = "bg-red-500";
                            if (fillRate >= 100) {
                                badgeStyle = "bg-emerald-100 text-emerald-800";
                                progressStyle = "bg-emerald-500";
                            } else if (fillRate >= 70) {
                                badgeStyle = "bg-amber-100 text-amber-800";
                                progressStyle = "bg-yellow-500";
                            }

                            return (
                                <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="font-bold text-slate-900 text-base font-outfit">{client.name}</span>
                                        <Badge className={`${badgeStyle} hover:${badgeStyle} border-none rounded-full text-[10px] px-3 font-bold`}>
                                            {fillRate}% FILLED
                                        </Badge>
                                    </div>
                                    <div className="flex gap-16 font-medium text-sm text-slate-500 mb-3">
                                        <span><strong className="text-slate-900 text-base">{confirmedCount}</strong> Confirmed</span>
                                        <span><strong className="text-slate-900 text-base">{openCount}</strong> Open</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${progressStyle}`}
                                            style={{ width: `${fillRate}%` }}
                                        />
                                    </div>

                                    {shifts.some(s => s.staffName !== 'Unassigned') && (
                                        <div className="mt-4 pt-4 border-t border-slate-50">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned Team</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {shifts.filter(s => s.staffName !== 'Unassigned').map((s, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        <span className="text-xs font-semibold text-slate-700">{s.staffName}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={() => window.location.href = '/Dashboard'}
                    className="w-full bg-[#7c3aed] py-5 rounded-2xl text-white font-black text-lg shadow-xl shadow-purple-500/30 active:scale-[0.98] transition-all mt-6 font-outfit"
                >
                    Open Full Admin Dashboard
                </button>

                <div className="text-center pb-10 space-y-2">
                    <p className="text-slate-400 text-sm font-medium">Powered by ACG StaffLink v3.0</p>
                    <p className="text-slate-300 text-[11px] px-8 leading-relaxed">
                        Security Verified • Encrypted Access • © {new Date().getFullYear()} Helix Health Group. All data is real-time.
                    </p>
                </div>
            </div>
        </div>
    );
}

function ErrorMessage({ message }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
            <div className="space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{message}</h2>
                <p className="text-slate-500 text-sm">Please try opening the link from WhatsApp again.</p>
            </div>
        </div>
    );
}

function ReportSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            <div className="bg-slate-900 h-64 flex flex-col items-center justify-center p-6 gap-4">
                <Skeleton className="w-32 h-6 bg-slate-800" />
                <Skeleton className="w-64 h-12 bg-slate-800" />
                <Skeleton className="w-48 h-4 bg-slate-800" />
            </div>
            <div className="max-w-md mx-auto px-4 -mt-10 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-32 rounded-3xl" />
                    <Skeleton className="h-32 rounded-3xl" />
                </div>
                <Skeleton className="h-20 rounded-3xl w-full" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-40 rounded-3xl w-full" />
                <Skeleton className="h-40 rounded-3xl w-full" />
            </div>
        </div>
    );
}
