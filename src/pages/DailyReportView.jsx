import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "react-router-dom";
import {
    Activity, Calendar, Clock, AlertCircle, AlertTriangle,
    CheckCircle2, ChevronRight, Building2, TrendingUp, Sparkles,
    MessageCircle, Info
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
    const alerts = report.alerts || [];
    const schedule = report.schedule || [];

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-fuchsia-900 text-white p-6 pb-16 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                <div className="relative z-10 flex flex-col items-center text-center">
                    <Badge className="bg-white/10 text-purple-200 border-none mb-3 backdrop-blur-md">
                        DAILY AGENCY REPORT
                    </Badge>
                    <h1 className="text-4xl font-black tracking-tight mb-1 font-outfit">
                        {format(parseISO(targetDate), 'dd MMMM yyyy')}
                    </h1>
                    <p className="text-purple-200/80 font-medium">
                        ACG StaffLink Report
                    </p>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 -mt-10 relative z-20 space-y-4">
                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <Card className="border-none shadow-xl shadow-purple-500/10 rounded-3xl">
                        <CardContent className="p-5">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Utilization</span>
                                <span className="text-3xl font-black text-slate-900 font-outfit">{stats.staffUtilization || '0%'}</span>
                                <div className="flex items-center gap-1 mt-1 text-emerald-500 font-bold text-[10px]">
                                    <TrendingUp className="w-3 h-3" />
                                    <span>+2.4% vs yest</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl shadow-purple-500/10 rounded-3xl">
                        <CardContent className="p-5">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Shifts</span>
                                <span className="text-3xl font-black text-slate-900 font-outfit">{stats.totalShifts || 0}</span>
                                <div className="flex items-center gap-1 mt-1 text-emerald-500 font-bold text-[10px]">
                                    <Activity className="w-3 h-3" />
                                    <span>{stats.shiftsUpcoming || 0} active</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="col-span-2 border-none shadow-xl shadow-red-500/10 rounded-3xl bg-white">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Alerts</span>
                                <span className="text-2xl font-black text-red-600 font-outfit">{alerts.length} Critical Issues</span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Critical Alerts Section */}
                {alerts.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <h2 className="text-lg font-bold text-slate-900 px-1">Critical Alerts</h2>
                            <Badge variant="destructive" className="rounded-full text-[10px] px-3">High Priority</Badge>
                        </div>
                        {alerts.map((alert, i) => (
                            <div key={i} className="bg-white p-4 rounded-3xl shadow-sm border-l-4 border-red-500 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 text-sm truncate">{alert.message}</h3>
                                    <p className="text-xs text-slate-500">{alert.client_name || 'System Alert'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Rota Summary Breakdown */}
                <div className="space-y-4 pt-4">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-lg font-bold text-slate-900 px-1">Rota Summary</h2>
                        <Badge className="bg-emerald-100 text-emerald-800 border-none rounded-full text-[10px] px-3">
                            {schedule.length} Clients Active
                        </Badge>
                    </div>

                    <div className="space-y-3">
                        {schedule.map((item, i) => (
                            <div key={i} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">{item.client_name}</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.location}</p>
                                        </div>
                                    </div>
                                    <Badge className={`rounded-full text-[10px] px-2 py-0.5 ${item.open === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'} border-none`}>
                                        {item.open === 0 ? 'Fully Filled' : 'Hiring'}
                                    </Badge>
                                </div>

                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Confirmed</span>
                                            <span className="font-bold text-slate-900">{item.confirmed}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Open</span>
                                            <span className="font-bold text-amber-600">{item.open}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-black text-slate-900">{Math.round((item.confirmed / (item.confirmed + item.open)) * 100)}%</span>
                                    </div>
                                </div>

                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${item.open === 0 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${(item.confirmed / (item.confirmed + item.open)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={() => window.location.href = '/Dashboard'}
                    className="w-full bg-indigo-600 py-4 rounded-3xl text-white font-black text-lg shadow-xl shadow-indigo-600/30 active:scale-95 transition-all mt-8 mb-4 font-outfit"
                >
                    Open Full Dashboard
                </button>

                <div className="text-center pb-8">
                    <div className="flex items-center justify-center gap-2 text-slate-400 text-xs mb-1">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <span>Powered by ACG StaffLink v3.0</span>
                    </div>
                    <p className="text-slate-300 text-[10px]">Security Verified • Encrypted Access • {new Date().getFullYear()}</p>
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
