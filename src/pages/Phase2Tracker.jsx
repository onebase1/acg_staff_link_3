
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, Circle, Clock, Trash2, Plus, 
  Rocket, Zap, TrendingUp, Users, FileText, Settings
} from 'lucide-react';
import { toast } from 'sonner';

export default function Phase2Tracker() {
  const [tasks, setTasks] = useState([
    // Phase 2 - Post-UAT
    {
      id: 1,
      phase: 2,
      category: 'Automation',
      title: 'AI Inbound Call Handling (Retell AI)',
      description: 'Integrate Retell AI for automated call handling with staff. Webhook integration with n8n for context and actions.',
      priority: 'high',
      status: 'pending',
      complexity: 'medium',
      estimatedHours: 8
    },
    {
      id: 2,
      phase: 2,
      category: 'Staff Management',
      title: 'Staff-Initiated Cancellation Flow',
      description: 'Allow staff to cancel shifts via app/SMS. Triggers AdminWorkflow and reopens shift.',
      priority: 'high',
      status: 'pending',
      complexity: 'low',
      estimatedHours: 4
    },
    {
      id: 3,
      phase: 2,
      category: 'Staff Management',
      title: 'Staff Availability Self-Management',
      description: 'Staff Portal feature for staff to update their own availability preferences.',
      priority: 'medium',
      status: 'pending',
      complexity: 'low',
      estimatedHours: 6
    },
    {
      id: 4,
      phase: 2,
      category: 'Timesheets',
      title: 'WhatsApp Timesheet Improvements',
      description: 'Fix phone number matching issue. Enhance OCR for multi-day timesheets.',
      priority: 'medium',
      status: 'pending',
      complexity: 'medium',
      estimatedHours: 6
    },
    {
      id: 5,
      phase: 2,
      category: 'Timesheets',
      title: 'Multi-Day Timesheet Parser',
      description: 'Detect and parse multiple date rows from single uploaded timesheet. Create multiple Timesheet records.',
      priority: 'medium',
      status: 'pending',
      complexity: 'medium',
      estimatedHours: 8
    },
    {
      id: 6,
      phase: 2,
      category: 'Data Management',
      title: 'Export to CSV/PDF',
      description: 'Add export functionality to Shifts, Timesheets, Invoices pages.',
      priority: 'low',
      status: 'pending',
      complexity: 'low',
      estimatedHours: 4
    },
    {
      id: 7,
      phase: 2,
      category: 'Search & Filters',
      title: 'Advanced Date Range Filters',
      description: 'Custom date range pickers for all major pages (Shifts, Timesheets, etc.)',
      priority: 'low',
      status: 'pending',
      complexity: 'low',
      estimatedHours: 3
    },
    {
      id: 8,
      phase: 2,
      category: 'Search & Filters',
      title: 'Full-Text Search Across Shifts',
      description: 'Enhanced search with fuzzy matching and filters.',
      priority: 'low',
      status: 'pending',
      complexity: 'low',
      estimatedHours: 4
    },
    {
      id: 9,
      phase: 2,
      category: 'Groups',
      title: 'Broadcast to Groups Feature',
      description: 'Target shift notifications to specific staff groups (Night Team, Senior Nurses, etc.)',
      priority: 'medium',
      status: 'pending',
      complexity: 'medium',
      estimatedHours: 6
    },

    // Phase 3 - Future Enhancements
    {
      id: 10,
      phase: 3,
      category: 'Analytics',
      title: 'Room Capacity Tracking',
      description: 'Track 2+ staff per room. Prevent overbooking at client level.',
      priority: 'low',
      status: 'pending',
      complexity: 'high',
      estimatedHours: 12
    },
    {
      id: 11,
      phase: 3,
      category: 'Analytics',
      title: 'Advanced Predictive Analytics',
      description: 'ML-based shift demand forecasting, staff performance predictions.',
      priority: 'low',
      status: 'pending',
      complexity: 'high',
      estimatedHours: 20
    },
    {
      id: 12,
      phase: 3,
      category: 'Mobile',
      title: 'Native Mobile App',
      description: 'React Native mobile app for iOS/Android with offline support.',
      priority: 'low',
      status: 'pending',
      complexity: 'high',
      estimatedHours: 40
    },
    {
      id: 13,
      phase: 3,
      category: 'Integrations',
      title: 'Accounting Software Integration',
      description: 'Direct integration with Xero, QuickBooks for automated invoicing.',
      priority: 'low',
      status: 'pending',
      complexity: 'high',
      estimatedHours: 16
    }
  ]);

  const phase3Features = [
    {
      id: 'advanced-reporting',
      name: 'Advanced Reporting & Analytics',
      category: 'analytics',
      description: 'Custom report builder, data exports, trend analysis',
      priority: 'medium',
      estimatedDays: 10,
      dependencies: ['Performance data collection'],
      status: 'planned'
    },
    {
      id: 'client-portal',
      name: 'Client Self-Service Portal',
      category: 'client',
      description: 'Clients can request shifts, view invoices, approve timesheets online',
      priority: 'high',
      estimatedDays: 15,
      dependencies: ['Authentication system', 'Invoice generation'],
      status: 'planned'
    },
    {
      id: 'mobile-app',
      name: 'Native Mobile Apps (iOS/Android)',
      category: 'mobile',
      description: 'Native apps for staff (better GPS, push notifications, offline mode)',
      priority: 'medium',
      estimatedDays: 45,
      dependencies: ['Stable web platform'],
      status: 'planned'
    },
    {
      id: 'payroll-integration',
      name: 'Payroll System Integration',
      category: 'finance',
      description: 'Auto-export to Sage, Xero, QuickBooks',
      priority: 'high',
      estimatedDays: 12,
      dependencies: ['Payslip generation'],
      status: 'planned'
    },
    {
      id: 'advanced-scheduling',
      name: 'AI-Powered Smart Scheduling',
      category: 'scheduling',
      description: 'Auto-create rosters, optimize shift patterns, predict staffing needs',
      priority: 'medium',
      estimatedDays: 20,
      dependencies: ['Historical data', 'ML model training'],
      status: 'planned'
    },
    {
      id: 'multi-agency',
      name: 'Multi-Agency Collaboration',
      category: 'collaboration',
      description: 'Share staff pool across partner agencies, shift swapping marketplace',
      priority: 'low',
      estimatedDays: 25,
      dependencies: ['Security audit', 'Legal review'],
      status: 'planned'
    },
    {
      id: 'video-call',
      name: 'Built-In Video Interviews',
      category: 'recruitment',
      description: 'Video calls for staff interviews, virtual onboarding',
      priority: 'low',
      estimatedDays: 8,
      dependencies: ['WebRTC integration'],
      status: 'planned'
    },
    {
      id: 'document-ai',
      name: 'Document AI (OCR)',
      category: 'automation',
      description: 'Auto-extract dates from scanned DBS checks, certificates',
      priority: 'medium',
      estimatedDays: 7,
      dependencies: ['OCR service integration'],
      status: 'planned'
    },
    {
      id: 'shift-bidding',
      name: 'Shift Bidding System',
      category: 'scheduling',
      description: 'Staff bid on premium shifts, highest qualified wins',
      priority: 'low',
      estimatedDays: 10,
      dependencies: ['Marketplace foundation'],
      status: 'planned'
    },
    {
      id: 'performance-reviews',
      name: 'Performance Review System',
      category: 'hr',
      description: 'Automated quarterly reviews, goal tracking, 360° feedback',
      priority: 'low',
      estimatedDays: 12,
      dependencies: ['Historical performance data'],
      status: 'planned'
    },
    {
      id: 'white-label',
      name: 'White-Label Platform',
      category: 'enterprise',
      description: 'Agencies can rebrand platform with their logo/colors',
      priority: 'low',
      estimatedDays: 15,
      dependencies: ['Multi-tenancy security'],
      status: 'planned'
    },
    {
      id: 'cqc-integration',
      name: 'CQC API Integration',
      category: 'compliance',
      description: 'Auto-sync with CQC, export audit trails, compliance reports',
      priority: 'medium',
      estimatedDays: 10,
      dependencies: ['CQC API access'],
      status: 'planned'
    },
    {
      id: 'invoice-amendments',
      name: 'Invoice Amendment Workflow',
      category: 'finance',
      description: 'Amend sent invoices with audit trail, credit notes, approval chains',
      priority: 'high',
      estimatedDays: 8,
      dependencies: ['Invoice locking system'],
      status: 'planned',
      notes: 'Critical for handling rate disputes and post-invoice corrections'
    },
    {
      id: 'shift-journey-pdf',
      name: 'Shift Journey PDF Generator',
      category: 'dispute-resolution',
      description: 'Generate professional PDF proof-of-completion with GPS maps, signatures, email trail for dispute resolution',
      priority: 'high',
      estimatedDays: 5,
      dependencies: ['shift_journey_log data structure'],
      status: 'planned',
      notes: '✅ NEW: One-click PDF export showing complete shift lifecycle (GPS, emails, signatures) for client disputes'
    },
    {
      id: 'shift-timeline-visualizer',
      name: 'Shift Journey Timeline UI',
      category: 'dispute-resolution',
      description: 'Visual timeline showing shift lifecycle with confidence scores, GPS validation, and state changes',
      priority: 'medium',
      estimatedDays: 3,
      dependencies: ['shift_journey_log data structure'],
      status: 'planned',
      notes: '✅ NEW: Beautiful timeline visualization of shift states for admin review'
    },
    {
      id: 'low-confidence-dashboard',
      name: 'Low-Confidence Shift Dashboard',
      category: 'dispute-resolution',
      description: 'Admin page showing shifts with confidence < 70% (missing GPS, no signatures, etc.) for proactive review',
      priority: 'medium',
      estimatedDays: 4,
      dependencies: ['Confidence scoring algorithm'],
      status: 'planned',
      notes: '✅ NEW: Catch suspicious shifts BEFORE they become disputes'
    }
  ];

  const phases = [
    {
      phase: 'Phase 3',
      title: 'Monetization & Scale',
      description: 'Self-service subscription model + advanced features',
      color: 'purple',
      items: [
        {
          feature: 'Self-Service Agency Onboarding',
          status: 'planned',
          priority: 'critical',
          description: 'Public signup page → Choose plan → Payment → Auto-provision',
          notes: 'Foundation already built: Agency entity has subscription_tier, ProfileSetup handles registration, email automation exists. Just add Stripe + pricing page.'
        },
        {
          feature: 'Subscription Tiers (Starter/Pro/Enterprise)',
          status: 'planned',
          priority: 'critical',
          description: 'Starter £99/mo, Professional £299/mo, Enterprise £999/mo',
          notes: 'Data structure ready. Agency entity already has subscription_tier field. Just need to map features to tiers and enforce via backend.'
        },
        {
          feature: 'Feature Flags per Tier',
          status: 'planned',
          priority: 'high',
          description: 'Starter: Basic features. Pro: + Automation. Enterprise: + Analytics + White-label',
          notes: 'All features currently enabled by default (via Agency entity). Easy to add tier-based restrictions in backend functions.'
        },
        {
          feature: 'Stripe Payment Integration',
          status: 'planned',
          priority: 'critical',
          description: 'Stripe Checkout → Webhooks → Auto-update subscription status',
          notes: 'Standard Stripe integration. Use Stripe Customer Portal for upgrades/downgrades. Webhook handler to update Agency.status.'
        },
        {
          feature: 'In-App Upgrade Flow',
          status: 'planned',
          priority: 'high',
          description: 'Agency Settings → "Upgrade Plan" button → Feature comparison → Stripe Checkout',
          notes: 'Add to existing AgencySettings page. Show feature comparison table with "Upgrade to unlock" badges.'
        },
        {
          feature: 'Usage-Based Billing (Optional)',
          status: 'planned',
          priority: 'medium',
          description: 'Track SMS/WhatsApp/email usage → Bill overage above plan limits',
          notes: 'NotificationQueue already tracks all notifications. Easy to add usage counters and overage charges.'
        },
        {
          feature: 'Multi-Agency Dashboard (Super Admin)',
          status: 'planned',
          priority: 'medium',
          description: 'Super admin can view all agencies, manage subscriptions, view platform metrics',
          notes: 'RBAC already supports super admin. Just need UI to list agencies + platform-wide analytics.'
        },
        {
          feature: 'White-Label Option (Enterprise)',
          status: 'planned',
          priority: 'low',
          description: 'Custom domain, remove ACG branding, custom email templates',
          notes: 'Email templates already support agency branding. Just need: custom domain routing, hide ACG logo for Enterprise tier.'
        },
        {
          feature: 'API Access for Integrations',
          status: 'planned',
          priority: 'medium',
          description: 'REST API for agencies to integrate with their own systems (Xero, QuickBooks, etc.)',
          notes: 'Base44 SDK already exists. Just need to generate API keys per agency and document endpoints.'
        },
        {
          feature: 'Marketplace for Add-Ons',
          status: 'planned',
          priority: 'low',
          description: 'Pay-per-feature add-ons (e.g., Advanced Analytics £50/mo, Extra SMS credits £25/mo)',
          notes: 'Stripe supports product catalog + subscriptions. Easy to implement after core tiers are live.'
        }
      ]
    },
    
    {
      phase: 'Phase 3 (Refinements)',
      title: 'WhatsApp Authentication Improvements',
      description: 'Move from PIN fallback to proper phone number linking',
      color: 'cyan',
      items: [
        {
          feature: 'Automatic Phone Number Sync',
          status: 'planned',
          priority: 'medium',
          description: 'When staff accepts invite, automatically update their phone to match WhatsApp number format',
          notes: 'CURRENT: Phase 1 uses PIN fallback because phone matching is inconsistent. FUTURE: Use Twilio API to normalize all numbers to E.164 format on signup.'
        },
        {
          feature: 'Phone Verification via SMS',
          status: 'planned',
          priority: 'medium',
          description: 'Send verification code to staff phone during onboarding → Link WhatsApp automatically',
          notes: 'Standard OTP flow. Send SMS → Staff enters code → System links WhatsApp number to staff record → No PIN needed.'
        },
        {
          feature: 'WhatsApp Business Account',
          status: 'planned',
          priority: 'low',
          description: 'Upgrade from Twilio Sandbox to official WhatsApp Business API',
          notes: 'Requires: Facebook Business Manager approval, WhatsApp number registration, verified business profile. Benefits: Better deliverability, no sandbox restrictions.'
        },
        {
          feature: 'Remove PIN System',
          status: 'planned',
          priority: 'low',
          description: 'Once phone matching is reliable, deprecate PIN authentication',
          notes: 'PIN is a Phase 1 workaround. Once Twilio sandbox → WhatsApp Business API + proper phone sync, PINs become unnecessary.'
        }
      ]
    }
  ];

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    phase: 2,
    category: 'Other',
    priority: 'medium',
    status: 'pending',
    complexity: 'medium',
    estimatedHours: 4
  });

  const categories = ['Automation', 'Staff Management', 'Timesheets', 'Data Management', 'Search & Filters', 'Groups', 'Analytics', 'Mobile', 'Integrations', 'Other'];
  const priorities = ['low', 'medium', 'high', 'critical'];
  const statuses = ['pending', 'in_progress', 'completed', 'parked'];
  const complexities = ['low', 'medium', 'high'];

  const getStatusBadge = (status) => {
    const variants = {
      pending: { className: 'bg-gray-100 text-gray-800', icon: Circle },
      in_progress: { className: 'bg-blue-100 text-blue-800', icon: Clock },
      completed: { className: 'bg-green-100 text-green-800', icon: CheckCircle },
      parked: { className: 'bg-orange-100 text-orange-800', icon: Clock }
    };
    return variants[status] || variants.pending;
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      low: { className: 'bg-green-100 text-green-800' },
      medium: { className: 'bg-yellow-100 text-yellow-800' },
      high: { className: 'bg-orange-100 text-orange-800' },
      critical: { className: 'bg-red-100 text-red-800' }
    };
    return variants[priority] || variants.medium;
  };

  const handleToggleStatus = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, status: task.status === 'completed' ? 'pending' : 'completed' }
        : task
    ));
    toast.success('Task status updated');
  };

  const handleDeleteTask = (taskId) => {
    if (confirm('Are you sure you want to delete this task?')) {
      setTasks(tasks.filter(task => task.id !== taskId));
      toast.success('Task deleted');
    }
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    const task = {
      ...newTask,
      id: Date.now()
    };

    setTasks([...tasks, task]);
    setNewTask({
      title: '',
      description: '',
      phase: 2,
      category: 'Other',
      priority: 'medium',
      status: 'pending',
      complexity: 'medium',
      estimatedHours: 4
    });
    setShowAddTask(false);
    toast.success('Task added successfully');
  };

  const phase2Tasks = tasks.filter(t => t.phase === 2);
  const phase3Tasks = tasks.filter(t => t.phase === 3);

  const getStats = (phaseTasks) => ({
    total: phaseTasks.length,
    completed: phaseTasks.filter(t => t.status === 'completed').length,
    inProgress: phaseTasks.filter(t => t.status === 'in_progress').length,
    pending: phaseTasks.filter(t => t.status === 'pending').length,
    totalHours: phaseTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
    completedHours: phaseTasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.estimatedHours || 0), 0)
  });

  const phase2Stats = getStats(phase2Tasks);
  const phase3Stats = getStats(phase3Tasks);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Phase 2/3 Tracker</h2>
          <p className="text-gray-600 mt-1">Post-UAT enhancements and future features</p>
        </div>
        <Button onClick={() => setShowAddTask(!showAddTask)} className="bg-gradient-to-r from-purple-600 to-pink-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Add Task Form */}
      {showAddTask && (
        <Card className="border-2 border-purple-200">
          <CardHeader className="bg-purple-50">
            <CardTitle>Add New Task</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">Title *</label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., Staff Availability Self-Management"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Description</label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                placeholder="Brief description of the feature..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Phase</label>
                <select
                  value={newTask.phase}
                  onChange={(e) => setNewTask({...newTask, phase: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value={2}>Phase 2 (Post-UAT)</option>
                  <option value={3}>Phase 3 (Future)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Category</label>
                <select
                  value={newTask.category}
                  onChange={(e) => setNewTask({...newTask, category: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {priorities.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Complexity</label>
                <select
                  value={newTask.complexity}
                  onChange={(e) => setNewTask({...newTask, complexity: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {complexities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Estimated Hours</label>
              <input
                type="number"
                value={newTask.estimatedHours}
                onChange={(e) => setNewTask({...newTask, estimatedHours: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border rounded-md"
                min="1"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddTask(false)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600" onClick={handleAddTask}>
                Add Task
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 2 */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Rocket className="w-6 h-6 text-orange-600" />
          <h3 className="text-2xl font-bold text-gray-900">Phase 2: Post-UAT</h3>
          <Badge className="bg-orange-100 text-orange-800">
            {phase2Stats.completed}/{phase2Stats.total} Complete
          </Badge>
        </div>

        {/* Phase 2 Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-600 uppercase">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{phase2Stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-600 uppercase">Completed</p>
              <p className="text-2xl font-bold text-green-600">{phase2Stats.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-600 uppercase">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{phase2Stats.inProgress}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-600 uppercase">Est. Hours</p>
              <p className="text-2xl font-bold text-purple-600">{phase2Stats.totalHours}h</p>
            </CardContent>
          </Card>
        </div>

        {/* Phase 2 Tasks */}
        <div className="space-y-3">
          {phase2Tasks.map(task => {
            const statusBadge = getStatusBadge(task.status);
            const priorityBadge = getPriorityBadge(task.priority);
            const StatusIcon = statusBadge.icon;

            return (
              <Card key={task.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <button
                        onClick={() => handleToggleStatus(task.id)}
                        className="mt-1"
                      >
                        <StatusIcon className={`w-6 h-6 ${task.status === 'completed' ? 'text-green-600' : 'text-gray-400'}`} />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className={`font-semibold text-gray-900 ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                            {task.title}
                          </h4>
                          <Badge {...priorityBadge}>{task.priority}</Badge>
                          <Badge className={statusBadge.className}>{task.status}</Badge>
                          <Badge variant="outline">{task.category}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Complexity: {task.complexity}</span>
                          <span>Est: {task.estimatedHours}h</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Phase 3 */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-6 h-6 text-purple-600" />
          <h3 className="text-2xl font-bold text-gray-900">Phase 3: Future Enhancements</h3>
          <Badge className="bg-purple-100 text-purple-800">
            {phase3Stats.completed}/{phase3Stats.total} Complete
          </Badge>
        </div>

        {/* Phase 3 Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-600 uppercase">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{phase3Stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-600 uppercase">Completed</p>
              <p className="text-2xl font-bold text-green-600">{phase3Stats.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-600 uppercase">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{phase3Stats.inProgress}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-600 uppercase">Est. Hours</p>
              <p className="text-2xl font-bold text-purple-600">{phase3Stats.totalHours}h</p>
            </CardContent>
          </Card>
        </div>

        {/* Phase 3 Tasks */}
        <div className="space-y-3">
          {phase3Tasks.map(task => {
            const statusBadge = getStatusBadge(task.status);
            const priorityBadge = getPriorityBadge(task.priority);
            const StatusIcon = statusBadge.icon;

            return (
              <Card key={task.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <button
                        onClick={() => handleToggleStatus(task.id)}
                        className="mt-1"
                      >
                        <StatusIcon className={`w-6 h-6 ${task.status === 'completed' ? 'text-green-600' : 'text-gray-400'}`} />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className={`font-semibold text-gray-900 ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                            {task.title}
                          </h4>
                          <Badge {...priorityBadge}>{task.priority}</Badge>
                          <Badge className={statusBadge.className}>{task.status}</Badge>
                          <Badge variant="outline">{task.category}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Complexity: {task.complexity}</span>
                          <span>Est: {task.estimatedHours}h</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
