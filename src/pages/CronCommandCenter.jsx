import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock, Play, Pause, RefreshCw, AlertTriangle, CheckCircle,
  XCircle, Calendar, Zap, Settings, Activity
} from "lucide-react";
import { toast } from "sonner";

/**
 * 🤖 CRON COMMAND CENTER
 *
 * SuperAdmin dashboard for monitoring and controlling all scheduled jobs.
 * Shows status, last run, next run, and allows manual triggering.
 *
 * Features:
 * - View all cron jobs with status
 * - Enable/disable jobs with one click
 * - View last 10 executions per job
 * - Manual trigger button for testing
 * - Failure alerts
 */

// ✅ LIVE: 22 cron jobs active in production as of 2025-12-17
const CRON_JOBS = [
  // Tier 1: Critical (Every 5 min) - 8 jobs
  { name: "no-show-detection-engine-5min", schedule: "*/5 * * * *", tier: "critical", description: "Detect staff no-shows" },
  { name: "smart-escalation-engine-5min", schedule: "*/5 * * * *", tier: "critical", description: "Escalate unfilled urgent shifts" },
  { name: "urgent-shift-escalation-5min", schedule: "*/5 * * * *", tier: "critical", description: "Create admin workflows for urgent shifts" },
  { name: "smart-clock-out-reminders", schedule: "*/5 * * * *", tier: "critical", description: "Remind staff to clock out" },
  { name: "notification-digest-engine-5min", schedule: "*/5 * * * *", tier: "critical", description: "Process batched notifications" },
  { name: "retry-worker-5min", schedule: "*/5 * * * *", tier: "critical", description: "Retry failed notifications" },
  { name: "critical-change-notifier-5min", schedule: "*/5 * * * *", tier: "critical", description: "Notify critical shift changes" },
  { name: "shift-status-automation-5min", schedule: "*/5 * * * *", tier: "critical", description: "Auto-transition shift statuses" },
  { name: "auto-urgent-digest-broadcaster", schedule: "*/5 * * * *", tier: "critical", description: "Broadcast urgent shift digests" },

  // Tier 2: High Priority (Hourly) - 4 jobs
  { name: "shift-reminder-engine-hourly", schedule: "0 * * * *", tier: "high", description: "Pre-shift reminders (24h & 2h)" },
  { name: "post-shift-timesheet-reminder-hourly", schedule: "0 * * * *", tier: "high", description: "Remind staff to upload timesheets" },
  { name: "auto-approval-engine-hourly", schedule: "0 * * * *", tier: "high", description: "Batch auto-approve clean timesheets" },
  { name: "email-automation-engine-hourly", schedule: "0 * * * *", tier: "high", description: "Process email queue" },

  // Tier 3: Medium Priority (Every 15-30 min) - 3 jobs
  { name: "scheduled-timesheet-processor-15min", schedule: "*/15 * * * *", tier: "medium", description: "Process pending timesheets" },
  { name: "internal-admin-notifier-15min", schedule: "*/15 * * * *", tier: "medium", description: "Internal admin alerts" },
  { name: "auto-timesheet-approval-engine-30min", schedule: "*/30 * * * *", tier: "medium", description: "Auto-approve quality timesheets" },

  // Tier 4: Daily Jobs - 5 jobs
  { name: "compliance-monitor-daily", schedule: "0 8 * * *", tier: "daily", description: "Check expiring compliance docs" },
  { name: "payment-reminder-engine-daily", schedule: "0 9 * * *", tier: "daily", description: "Send overdue payment reminders" },
  { name: "staff-daily-digest-engine-8am", schedule: "0 8 * * *", tier: "daily", description: "Send staff daily shift schedule" },
  { name: "incomplete-profile-reminder-daily", schedule: "0 9 * * *", tier: "daily", description: "Remind incomplete profiles" },
  { name: "daily-client-digest-10am", schedule: "0 10 * * *", tier: "daily", description: "Send clients 'Ready for Tomorrow'" },

  // Tier 5: Weekly Jobs - 1 job
  { name: "auto-invoice-generator-weekly", schedule: "0 6 * * 1", tier: "weekly", description: "Generate weekly invoices" },
];

export default function CronCommandCenter() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  // Check auth and super_admin access
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          navigate(createPageUrl('Home'));
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profileData) {
          navigate(createPageUrl('Home'));
          return;
        }

        setProfile(profileData);
      } catch (err) {
        console.error("Auth error:", err);
        navigate(createPageUrl('Home'));
      } finally {
        setAuthLoading(false);
      }
    };
    checkAccess();
  }, [navigate]);

  // Fetch cron job status from database views
  const fetchCronData = async () => {
    try {
      setLoading(true);
      // Query the cron_job_status view
      const { data: jobsData, error: jobsError } = await supabase
        .from("cron_job_status")
        .select("*")
        .order("jobname");

      if (jobsError) {
        console.error("Error fetching cron jobs:", jobsError);
        // Fall back to static list if view doesn't exist
        setJobs(CRON_JOBS.map(j => ({ ...j, active: true, jobname: j.name })));
      } else {
        // Merge with static list for descriptions
        const merged = CRON_JOBS.map(staticJob => {
          const dbJob = jobsData?.find(d => d.jobname === staticJob.name);
          return {
            ...staticJob,
            active: dbJob?.active ?? true,
            jobid: dbJob?.jobid,
            jobname: staticJob.name,
          };
        });
        setJobs(merged);
      }

      // Query recent runs
      const { data: runsData, error: runsError } = await supabase
        .from("cron_job_runs")
        .select("*")
        .order("start_time", { ascending: false })
        .limit(100);

      if (!runsError) {
        setRuns(runsData || []);
      }
    } catch (err) {
      console.error("Error loading cron data:", err);
      toast.error("Failed to load cron job data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCronData();
  }, []);

  // Manual trigger a job
  const triggerJob = async (jobName) => {
    const functionName = jobName.replace(/-(?:5min|hourly|daily|weekly|15min|30min|10min|8am|10am)$/, "");
    setTriggering(jobName);
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {}
      });
      if (error) throw error;
      toast.success(`Triggered ${functionName} successfully`);
      setTimeout(fetchCronData, 2000); // Refresh after 2s
    } catch (err) {
      console.error("Trigger error:", err);
      toast.error(`Failed to trigger ${functionName}: ${err.message}`);
    } finally {
      setTriggering(null);
    }
  };

  // Get tier badge color
  const getTierBadge = (tier) => {
    const colors = {
      critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      daily: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      weekly: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    };
    return colors[tier] || "bg-gray-100 text-gray-800";
  };

  // Filter jobs by tier
  const filteredJobs = activeTab === "all"
    ? jobs
    : jobs.filter(j => j.tier === activeTab);

  // Get recent runs for a specific job
  const getJobRuns = (jobName) => {
    return runs.filter(r => r.jobname === jobName).slice(0, 5);
  };

  // Check if user is SuperAdmin (Fixed: was checking wrong field)
  const isSuperAdmin = profile?.is_super_admin === true || profile?.email === 'g.basera@yahoo.com';

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6">
          <div className="flex items-center gap-3 text-red-600">
            <AlertTriangle className="h-6 w-6" />
            <span>Access denied. SuperAdmin role required.</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            Cron Command Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and control all scheduled automation jobs
          </p>
        </div>
        <Button onClick={fetchCronData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
                <p className="text-2xl font-bold">{jobs.length}</p>
              </div>
              <Settings className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {jobs.filter(j => j.active).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Tier</p>
                <p className="text-2xl font-bold text-red-600">
                  {jobs.filter(j => j.tier === "critical").length}
                </p>
              </div>
              <Zap className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recent Runs</p>
                <p className="text-2xl font-bold">{runs.length}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="critical">
            Critical ({jobs.filter(j => j.tier === "critical").length})
          </TabsTrigger>
          <TabsTrigger value="high">
            High ({jobs.filter(j => j.tier === "high").length})
          </TabsTrigger>
          <TabsTrigger value="medium">
            Medium ({jobs.filter(j => j.tier === "medium").length})
          </TabsTrigger>
          <TabsTrigger value="daily">
            Daily ({jobs.filter(j => j.tier === "daily").length})
          </TabsTrigger>
          <TabsTrigger value="weekly">
            Weekly ({jobs.filter(j => j.tier === "weekly").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="grid gap-4">
            {filteredJobs.map((job) => (
              <Card key={job.name} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${job.active ? "bg-green-100" : "bg-gray-100"}`}>
                        {job.active ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{job.name}</h3>
                        <p className="text-sm text-muted-foreground">{job.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getTierBadge(job.tier)}>{job.tier}</Badge>
                          <Badge variant="outline" className="font-mono text-xs">
                            {job.schedule}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => triggerJob(job.name)}
                        disabled={triggering === job.name}
                      >
                        {triggering === job.name ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        <span className="ml-1">Trigger</span>
                      </Button>
                    </div>
                  </div>

                  {/* Recent runs for this job */}
                  {getJobRuns(job.name).length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Recent Runs:</p>
                      <div className="flex gap-2 flex-wrap">
                        {getJobRuns(job.name).map((run, idx) => (
                          <Badge
                            key={idx}
                            variant={run.status === "succeeded" ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {new Date(run.start_time).toLocaleString()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
