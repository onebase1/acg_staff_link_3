import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  DollarSign, TrendingUp, TrendingDown, PieChart, 
  Calendar, FileText, Plus, Download
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";

export default function OperationalCosts() {
  const [periodFilter, setPeriodFilter] = useState('current');
  const queryClient = useQueryClient();

  const { data: costs = [] } = useQuery({
    queryKey: ['operational-costs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_costs')
        .select('*')
        .order('billing_period', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching operational costs:', error);
        return [];
      }
      return data || [];
    },
    enabled: true,
    refetchOnMount: 'always'
  });

  const currentMonth = costs.filter(c => {
    const costDate = new Date(c.billing_period);
    const now = new Date();
    return costDate.getMonth() === now.getMonth() && 
           costDate.getFullYear() === now.getFullYear();
  });

  const lastMonth = costs.filter(c => {
    const costDate = new Date(c.billing_period);
    const lastMonthDate = subMonths(new Date(), 1);
    return costDate.getMonth() === lastMonthDate.getMonth() && 
           costDate.getFullYear() === lastMonthDate.getFullYear();
  });

  const totalCurrentMonth = currentMonth.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalLastMonth = lastMonth.reduce((sum, c) => sum + (c.amount || 0), 0);
  const monthlyChange = totalLastMonth > 0 ? ((totalCurrentMonth - totalLastMonth) / totalLastMonth * 100) : 0;

  const costsByCategory = currentMonth.reduce((acc, cost) => {
    acc[cost.service_category] = (acc[cost.service_category] || 0) + cost.amount;
    return acc;
  }, {});

  const displayedCosts = periodFilter === 'current' ? currentMonth :
                         periodFilter === 'last' ? lastMonth :
                         costs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Operational Costs</h2>
          <p className="text-gray-600 mt-1">Track platform & service expenses</p>
        </div>
        <Button className="bg-gradient-to-r from-cyan-500 to-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Cost
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <DollarSign className="w-8 h-8 text-blue-600" />
              {monthlyChange > 0 ? (
                <TrendingUp className="w-5 h-5 text-red-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-green-600" />
              )}
            </div>
            <p className="text-sm text-blue-900 font-semibold uppercase mb-1">This Month</p>
            <p className="text-3xl font-bold text-blue-900">£{totalCurrentMonth.toFixed(2)}</p>
            <p className={`text-xs mt-2 ${monthlyChange > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {monthlyChange > 0 ? '+' : ''}{monthlyChange.toFixed(1)}% vs last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-6">
            <Calendar className="w-8 h-8 text-purple-600 mb-3" />
            <p className="text-sm text-purple-900 font-semibold uppercase mb-1">Last Month</p>
            <p className="text-3xl font-bold text-purple-900">£{totalLastMonth.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <PieChart className="w-8 h-8 text-green-600 mb-3" />
            <p className="text-sm text-green-900 font-semibold uppercase mb-1">Categories</p>
            <p className="text-3xl font-bold text-green-900">{Object.keys(costsByCategory).length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
          <CardContent className="p-6">
            <FileText className="w-8 h-8 text-orange-600 mb-3" />
            <p className="text-sm text-orange-900 font-semibold uppercase mb-1">Pending</p>
            <p className="text-3xl font-bold text-orange-900">
              {costs.filter(c => c.status === 'pending').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Cost Breakdown by Category</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Object.entries(costsByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount]) => {
                const percentage = (amount / totalCurrentMonth * 100).toFixed(1);
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize text-gray-900">
                        {category.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">{percentage}%</span>
                        <span className="text-sm font-bold text-gray-900">£{amount.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Button
              variant={periodFilter === 'current' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodFilter('current')}
            >
              Current Month
            </Button>
            <Button
              variant={periodFilter === 'last' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodFilter('last')}
            >
              Last Month
            </Button>
            <Button
              variant={periodFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodFilter('all')}
            >
              All Time
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cost List */}
      <div className="space-y-4">
        {displayedCosts.map(cost => (
          <Card key={cost.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-900">{cost.service_name}</h3>
                    <Badge variant="outline" className="capitalize">
                      {cost.service_category.replace('_', ' ')}
                    </Badge>
                    <Badge className={
                      cost.status === 'paid' ? 'bg-green-100 text-green-800' :
                      cost.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {cost.status}
                    </Badge>
                    {cost.roi_impact && (
                      <Badge className={
                        cost.roi_impact === 'critical' ? 'bg-red-600 text-white' :
                        cost.roi_impact === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {cost.roi_impact.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Billing Period:</span>{' '}
                      {format(new Date(cost.billing_period), 'MMM yyyy')}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span>{' '}
                      <span className="capitalize">{cost.cost_type.replace('_', ' ')}</span>
                    </div>
                    {cost.paid_date && (
                      <div>
                        <span className="font-medium">Paid:</span>{' '}
                        {format(new Date(cost.paid_date), 'dd/MM/yyyy')}
                      </div>
                    )}
                  </div>

                  {cost.usage_metrics && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Usage Metrics:</p>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        {cost.usage_metrics.sms_sent && (
                          <div>SMS: {cost.usage_metrics.sms_sent}</div>
                        )}
                        {cost.usage_metrics.emails_sent && (
                          <div>Emails: {cost.usage_metrics.emails_sent}</div>
                        )}
                        {cost.usage_metrics.whatsapp_messages && (
                          <div>WhatsApp: {cost.usage_metrics.whatsapp_messages}</div>
                        )}
                        {cost.usage_metrics.ai_tokens_used && (
                          <div>AI Tokens: {cost.usage_metrics.ai_tokens_used.toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {cost.notes && (
                    <p className="text-sm text-gray-600 mt-2">{cost.notes}</p>
                  )}
                </div>

                <div className="text-right ml-6">
                  <p className="text-3xl font-bold text-gray-900">£{cost.amount.toFixed(2)}</p>
                  {cost.projected_cost && (
                    <p className="text-xs text-gray-500 mt-1">
                      Next: £{cost.projected_cost.toFixed(2)}
                    </p>
                  )}
                  {cost.cost_per_shift && (
                    <p className="text-xs text-blue-600 mt-1">
                      £{cost.cost_per_shift.toFixed(2)}/shift
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {displayedCosts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Costs Recorded</h3>
            <p className="text-gray-600">Start tracking your operational expenses</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}