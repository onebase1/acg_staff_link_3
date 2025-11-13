import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Calendar, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function RecentActivity({ activities }) {
  const getIcon = (type) => {
    switch (type) {
      case 'booking': return Calendar;
      case 'timesheet': return Clock;
      case 'staff': return User;
      case 'approval': return CheckCircle;
      default: return Clock;
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case 'booking': return 'bg-blue-100 text-blue-600';
      case 'timesheet': return 'bg-green-100 text-green-600';
      case 'staff': return 'bg-purple-100 text-purple-600';
      case 'approval': return 'bg-cyan-100 text-cyan-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="border-b">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {activities.map((activity, index) => {
            const Icon = getIcon(activity.type);
            return (
              <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getIconColor(activity.type)}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-500 mt-1">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(activity.timestamp), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  {activity.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {activity.badge}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}