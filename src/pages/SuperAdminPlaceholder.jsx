import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hammer, ArrowLeft, Construction } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SuperAdminPlaceholder() {
    const navigate = useNavigate();
    const pageName = window.location.pathname.split('/').pop();

    return (
        <div className="flex items-center justify-center min-h-[70vh] p-6">
            <Card className="max-w-2xl w-full border-none shadow-2xl bg-white overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 animate-pulse"></div>
                <CardContent className="p-12 text-center space-y-8">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-yellow-100 rounded-full blur-2xl opacity-50 animate-pulse"></div>
                        <div className="relative w-24 h-24 bg-yellow-50 rounded-3xl flex items-center justify-center mx-auto border-2 border-yellow-100 shadow-inner rotate-3">
                            <Hammer className="w-12 h-12 text-yellow-600 animate-bounce" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg -rotate-12">
                            <Construction className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight"> Feature in Development </h1>
                        <p className="text-lg text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                            The <span className="text-orange-600 font-bold px-2 py-1 bg-orange-50 rounded-lg">/{pageName}</span> module is currently under construction as part of our Super Admin ecosystem.
                        </p>
                    </div>

                    <div className="pt-6">
                        <Button
                            onClick={() => navigate(createPageUrl('Dashboard'))}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-6 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto text-lg font-bold"
                        >
                            <ArrowLeft className="w-6 h-6" />
                            Return to Dashboard
                        </Button>
                    </div>

                    <div className="pt-12 flex items-center justify-center gap-8 border-t border-slate-50 opacity-40 grayscale">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ACG StaffLink v1.8</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Super Admin Access Verified</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
