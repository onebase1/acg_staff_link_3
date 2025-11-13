import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatsCard({ title, value, icon: Icon, trend, trendValue, color = "cyan" }) {
  const colorClasses = {
    cyan: "from-cyan-500 to-blue-600",
    green: "from-green-500 to-emerald-600",
    purple: "from-purple-500 to-indigo-600",
    orange: "from-orange-500 to-red-600",
    blue: "from-blue-500 to-cyan-600"
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
            <h3 className="text-3xl font-bold text-gray-900 mt-2">{value}</h3>
          </div>
          <div className={`p-3 bg-gradient-to-br ${colorClasses[color]} rounded-xl`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        
        {trend && (
          <div className="flex items-center gap-2">
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trendValue}
            </span>
            <span className="text-sm text-gray-500">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}