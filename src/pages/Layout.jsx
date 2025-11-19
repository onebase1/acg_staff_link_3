

import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Zap, MapPin, Calendar, Users, BarChart3, Workflow, Settings,
  UserCog, FileText, Receipt, TrendingUp, Clock, CalendarCheck, Building2, Shield,
  UsersRound, LogOut, HelpCircle, UserPlus, Menu, X, Bell, ChevronDown, ChevronRight, Upload,
  CheckSquare, Rocket, DollarSign, Trash2, Mail, Shuffle, MessageCircle, CheckCircle, BookOpen,
  Phone, GitBranch // ✅ Added GitBranch icon for Shift Journey
} from "lucide-react";
import { supabaseAuth } from "@/api/supabaseAuth";
import { Agency } from "@/api/supabaseEntities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ViewSwitcher from "@/components/admin/ViewSwitcher";

const navigationStructure = [
  {
    section: "OPERATIONS",
    icon: LayoutDashboard,
    color: "text-green-600",
    items: [
      { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard, adminOnly: true },
      { title: "Quick Actions", url: createPageUrl("QuickActions"), icon: Zap, adminOnly: true },
      { title: "Shifts", url: createPageUrl("Shifts"), icon: Calendar, adminOnly: true },
      { title: "Bulk Shift Creation", url: createPageUrl("BulkShiftCreation"), icon: Upload, adminOnly: true },
      { title: "Shift Calendar", url: createPageUrl("ShiftCalendar"), icon: CalendarCheck, adminOnly: true },
      { title: "Live Shift Map", url: createPageUrl("LiveShiftMap"), icon: MapPin, adminOnly: true },
      { title: "Bookings", url: createPageUrl("Bookings"), icon: CalendarCheck, adminOnly: true },
      { title: "Timesheets", url: createPageUrl("Timesheets"), icon: Clock, adminOnly: true },
    ]
  },
  {
    section: "WORKFORCE",
    icon: Users,
    color: "text-blue-600",
    items: [
      { title: "Staff", url: createPageUrl("Staff"), icon: UserPlus, adminOnly: true },
      { title: "Staff Availability", url: createPageUrl("StaffAvailability"), icon: Users, adminOnly: true },
      { title: "Clients", url: createPageUrl("Clients"), icon: Building2, adminOnly: true },
      { title: "Compliance Tracker", url: createPageUrl("ComplianceTracker"), icon: Shield, adminOnly: true },
    ]
  },
  {
    section: "FINANCIALS",
    icon: FileText,
    color: "text-purple-600",
    items: [
      { title: "Invoices", url: createPageUrl("Invoices"), icon: FileText, adminOnly: true },
      { title: "Generate Invoices", url: createPageUrl("GenerateInvoices"), icon: DollarSign, adminOnly: true },
      { title: "Payslips", url: createPageUrl("Payslips"), icon: Receipt, adminOnly: true },
      { title: "Generate Payslips", url: createPageUrl("GeneratePayslips"), icon: Receipt, adminOnly: true },
      { title: "Performance Analytics", url: createPageUrl("PerformanceAnalytics"), icon: TrendingUp, adminOnly: true },
      { title: "Timesheet Analytics", url: createPageUrl("TimesheetAnalytics"), icon: BarChart3, adminOnly: true },
      { title: "Operational Costs", url: createPageUrl("OperationalCosts"), icon: DollarSign, adminOnly: true },
      { title: "CFO Dashboard", url: createPageUrl("CFODashboard"), icon: Shield, adminOnly: true }, 
      { title: "Dispute Resolution", url: createPageUrl("DisputeResolution"), icon: Shield, adminOnly: true },
    ]
  },
  {
    section: "MANAGEMENT",
    icon: Settings,
    color: "text-orange-600",
    items: [
      { title: "Analytics Dashboard", url: createPageUrl("AdminDashboard"), icon: BarChart3, adminOnly: true },
      { title: "Admin Workflows", url: createPageUrl("AdminWorkflows"), icon: Workflow, adminOnly: true },
      { title: "GPS Accuracy Monitor", url: createPageUrl("GPSAccuracyMonitoring"), icon: MapPin, adminOnly: true },
      { title: "Bulk Data Import", url: createPageUrl("BulkDataImport"), icon: Upload, adminOnly: true },
      { title: "WhatsApp Bot Setup", url: createPageUrl("WhatsAppSetup"), icon: MessageCircle, adminOnly: true },
    ]
  }
];

// Settings dropdown items
const settingsItems = [
  { title: "Agency Profile", url: createPageUrl("AgencySettings") },
  { title: "GPS Consent", url: createPageUrl("StaffGPSConsent") },
  { title: "Help Center", url: createPageUrl("HelpCenter") },
];

// Staff portal items
const staffPortalItems = [
  { title: "Staff Portal", url: createPageUrl("StaffPortal"), icon: UserPlus, staffOnly: true },
  { title: "Shift Marketplace", url: createPageUrl("ShiftMarketplace"), icon: Calendar, staffOnly: true },
  { title: "My Availability", url: createPageUrl("MyAvailability"), icon: Clock, staffOnly: true },
  { title: "My Compliance", url: createPageUrl("ComplianceTracker"), icon: Shield, staffOnly: true },
];

// Client portal items
const clientPortalItems = [
  { title: "Client Portal", url: createPageUrl("ClientPortal"), icon: Building2, clientOnly: true },
];

// Super admin only items
const superAdminItems = [
  { title: "Agency Onboarding", url: createPageUrl("SuperAdminAgencyOnboarding"), icon: Building2 },
  { title: "Platform Analytics", url: createPageUrl("PerformanceAnalytics"), icon: TrendingUp }, // ✅ QUICK CONNECT: Platform-wide analytics
  { title: "Timesheet Analytics", url: createPageUrl("TimesheetAnalytics"), icon: BarChart3 }, // ✅ QUICK CONNECT: Auto-approval metrics
  { title: "CFO Dashboard", url: createPageUrl("CFODashboard"), icon: DollarSign }, // ✅ QUICK CONNECT: Financial monitoring
  { title: "Shift Journey Diagram", url: createPageUrl("ShiftJourneyDiagram"), icon: GitBranch }, // ✅ ADDED AT TOP
  { title: "Functions Audit", url: createPageUrl("FunctionsAudit"), icon: Shield },
  { title: "Admin Training Hub", url: createPageUrl("AdminTrainingHub"), icon: BookOpen },
  { title: "Notification Monitor", url: createPageUrl("NotificationMonitor"), icon: Bell },
  { title: "Test Shift Reminders", url: createPageUrl("TestShiftReminders"), icon: Clock },
  { title: "Phone Diagnostic", url: createPageUrl("PhoneDiagnostic"), icon: Phone },
  { title: "UAT Tester Guide", url: createPageUrl("UATTesterGuide"), icon: CheckSquare },
  { title: "Day One Readiness", url: createPageUrl("DayOneReadiness"), icon: Rocket },
  { title: "Phase 2/3 Tracker", url: createPageUrl("Phase2Tracker"), icon: BarChart3 },
  { title: "Validation Matrix", url: createPageUrl("ValidationMatrix"), icon: Shield },
  { title: "Data Simulation Tools", url: createPageUrl('DataSimulationTools'), icon: Shuffle },
  { title: "Clean Slate Utility", url: createPageUrl("CleanSlate"), icon: Trash2 },
  { title: "Email Notification Tester", url: createPageUrl("EmailNotificationTester"), icon: Mail },
  { title: "Testing Tracker", url: createPageUrl("TestingTracker"), icon: BarChart3 },
  { title: "Test User Credentials", url: createPageUrl("TestUserCredentials"), icon: Shield },
  { title: "Capabilities Matrix", url: createPageUrl("CapabilitiesMatrix"), icon: FileText },
  { title: "Investor Pitch Deck", url: createPageUrl("StakeholderPresentation"), icon: TrendingUp },
  { title: "Dominion Presentation", url: createPageUrl("DominionPresentation"), icon: Users },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const authPaths = ['/login', '/reset-password'];
  const isAuthRoute = authPaths.some((path) => location.pathname.toLowerCase().startsWith(path));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [agency, setAgency] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [expandedSections, setExpandedSections] = useState(['OPERATIONS']);
  
  // ✅ NEW: Authentication state
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // ✅ NEW: Notification dropdown state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef(null);
  
  // ✅ NEW: Prevent repeated auth checks with ref
  const authCheckInProgress = useRef(false);
  const authChecked = useRef(false);

  // ✅ NEW: Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ NEW: Fetch notifications based on user type
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;

      try {
        let notifs = [];

        // Admin/Manager notifications
        if (user.user_type === 'agency_admin' || user.user_type === 'manager') {
          const { AdminWorkflow } = await import('@/api/supabaseEntities');
          const workflows = await AdminWorkflow.filter({
            agency_id: user.agency_id,
            status: 'pending'
          });
          
          notifs = workflows.slice(0, 10).map(w => ({
            id: w.id,
            type: 'workflow',
            title: w.name || w.title,
            description: w.description,
            priority: w.priority || 'medium',
            timestamp: w.created_date,
            url: createPageUrl('AdminWorkflows')
          }));
        }
        
        // Staff notifications
        else if (user.user_type === 'staff_member') {
          const { Staff, Shift } = await import('@/api/supabaseEntities');
          const staffRecords = await Staff.filter({
            user_id: user.id
          });
          
          if (staffRecords.length > 0) {
            const staffId = staffRecords[0].id;
            
            // Get assigned shifts awaiting confirmation
            const shifts = await Shift.filter({
              assigned_staff_id: staffId,
              status: 'assigned'
            });
            
            notifs = shifts.slice(0, 10).map(s => ({
              id: s.id,
              type: 'shift_assignment',
              title: 'New Shift Assignment',
              description: `Shift on ${s.date} at ${s.start_time}`,
              priority: s.urgency === 'urgent' ? 'high' : 'medium',
              timestamp: s.created_date,
              url: createPageUrl('StaffPortal')
            }));
          }
        }

        setNotifications(notifs);
        setUnreadCount(notifs.length);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    if (user) {
      fetchNotifications();
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const fetchUser = async () => {
      if (isAuthRoute) {
        setIsCheckingAuth(false);
        setIsAuthenticated(false);
        authCheckInProgress.current = false;
        return;
      }

      // ✅ FIX: Prevent multiple simultaneous auth checks
      if (authCheckInProgress.current || authChecked.current) {
        console.log('⏸️ [Layout] Auth check already in progress or completed, skipping');
        return;
      }

      authCheckInProgress.current = true;

      try {
        // ✅ CRITICAL: Check authentication FIRST
        console.log('🔒 [Layout] Checking authentication...');
        const authStatus = await supabaseAuth.isAuthenticated();
        
        if (!authStatus) {
          console.log('❌ [Layout] User not authenticated - redirecting to login');
          setIsCheckingAuth(false);
          setIsAuthenticated(false);
          authCheckInProgress.current = false;
          const path = location.pathname.toLowerCase();
          if (!authPaths.some((authPath) => path.startsWith(authPath))) {
            window.location.replace(`/login?next=${encodeURIComponent(location.pathname)}`);
          }
          return;
        }

        console.log('✅ [Layout] User authenticated, loading profile...');
        const currentUser = await supabaseAuth.me();
        setUser(currentUser);
        setIsAuthenticated(true);
        
        const superAdminEmail = 'g.basera@yahoo.com';
        const isSuper = currentUser.email === superAdminEmail;
        setIsSuperAdmin(isSuper);

        if (!isSuper && currentUser.agency_id) {
          const userAgency = await Agency.get(currentUser.agency_id);
          setAgency(userAgency);
        }

        if (isSuper) {
          setNeedsOnboarding(false);
          setIsCheckingAuth(false);
          authChecked.current = true;
          authCheckInProgress.current = false;
          return;
        }

        if (!currentUser.agency_id || !currentUser.user_type) {
          setNeedsOnboarding(true);
          if (location.pathname !== createPageUrl('ProfileSetup')) {
            navigate(createPageUrl('ProfileSetup'));
          }
        }

        setIsCheckingAuth(false);
        authChecked.current = true;
        authCheckInProgress.current = false;
      } catch (error) {
        console.error("❌ [Layout] Authentication error:", error);
        setIsCheckingAuth(false);
        setIsAuthenticated(false);
        authCheckInProgress.current = false;
        authChecked.current = false; // Reset authChecked on error to allow retry if component re-mounts
        const path = location.pathname.toLowerCase();
        if (!authPaths.some((authPath) => path.startsWith(authPath))) {
          window.location.replace(`/login?next=${encodeURIComponent(location.pathname)}`);
        }
      }
    };
    fetchUser();
  }, [isAuthRoute]); // ✅ Re-run if route switches between auth and app

  const handleLogout = () => {
    localStorage.removeItem('admin_view_mode');
    // ✅ FIX: Add redirect URL to ensure user is taken to login page after logout
    const loginUrl = window.location.origin + '/login';
    supabaseAuth.logout(loginUrl);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const isActive = (url) => location.pathname === url;

  const shouldShowItem = (item) => {
    if (isSuperAdmin) return true;
    if (item.superAdminOnly) return false;
    if (item.adminOnly && user?.user_type !== 'agency_admin' && user?.user_type !== 'manager') return false;
    if (item.staffOnly && user?.user_type !== 'staff_member') return false;
    if (item.clientOnly && user?.user_type !== 'client_user') return false;
    return true;
  };

  // ✅ NEW: Get notification icon color
  const getNotificationColor = (priority) => {
    if (priority === 'critical' || priority === 'high') return 'bg-red-500';
    if (priority === 'medium') return 'bg-orange-500';
    return 'bg-blue-500';
  };

  // ✅ NEW: Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  if (isAuthRoute) {
    return <>{children}</>;
  }

  // ✅ NEW: Show loading while checking auth - don't expose page structure
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading ACG StaffLink...</p>
          <p className="text-gray-500 text-sm mt-2">Verifying authentication</p>
        </div>
      </div>
    );
  }

  // ✅ NEW: Don't render anything if not authenticated (redirect already triggered)
  if (!isAuthenticated) {
    return null;
  }

  if (needsOnboarding && location.pathname !== createPageUrl('ProfileSetup')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        .gradient-bg {
          background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%);
        }

        .glass-nav {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        .sidebar {
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          width: 260px;
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          border-right: 1px solid #e2e8f0;
          z-index: 50;
          transition: transform 0.3s ease;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
          }

          .sidebar.open {
            transform: translateX(0);
          }
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          padding: 0.65rem 1rem;
          color: #475569;
          transition: all 0.2s ease;
          text-decoration: none;
          border-radius: 0.5rem;
          margin: 0.15rem 0.5rem;
          font-size: 0.875rem;
        }

        .sidebar-link:hover {
          background-color: #e0f2fe;
          color: #0284c7;
        }

        .sidebar-link.active {
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          color: white;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);
        }

        .section-header {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          margin: 0.5rem 0.5rem 0.25rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          cursor: pointer;
          border-radius: 0.5rem;
          transition: background-color 0.2s;
        }

        .section-header:hover {
          background-color: #f1f5f9;
        }

        .main-content {
          margin-left: 260px;
          transition: margin-left 0.3s ease;
        }

        @media (max-width: 768px) {
          .main-content {
            margin-left: 0;
          }
        }
      `}</style>

      <div className={`sidebar shadow-xl ${sidebarOpen ? 'open' : ''}`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            {agency?.logo_url ? (
              <img 
                src={agency.logo_url} 
                alt={agency.name}
                className="w-12 h-12 rounded-lg object-contain"
              />
            ) : (
              <div className="w-12 h-12 gradient-bg rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {agency?.name?.[0] || 'ACG'}
                </span>
              </div>
            )}
            <div className="flex-1">
              <h2 className="font-bold text-gray-900 text-sm leading-tight">
                {agency?.name || 'Agile Care'}
              </h2>
              <p className="text-xs text-gray-500">
                {agency ? 'Agency Portal' : 'Management'}
              </p>
            </div>
          </div>
        </div>

        <nav className="py-4">
          {/* Staff Portal (for staff users) */}
          {user?.user_type === 'staff_member' && (
            <div className="mb-4">
              {staffPortalItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`sidebar-link ${isActive(item.url) ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="ml-3">{item.title}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Client Portal (for client users) */}
          {user?.user_type === 'client_user' && (
            <div className="mb-4">
              {clientPortalItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`sidebar-link ${isActive(item.url) ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="ml-3">{item.title}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Admin Navigation (structured) */}
          {(user?.user_type === 'agency_admin' || user?.user_type === 'manager' || isSuperAdmin) && (
            <>
              {navigationStructure.map((section) => (
                <div key={section.section} className="mb-2">
                  <div 
                    className="section-header"
                    onClick={() => toggleSection(section.section)}
                  >
                    <section.icon className={`w-4 h-4 ${section.color} mr-2`} />
                    <span className="flex-1">{section.section}</span>
                    <ChevronRight 
                      className={`w-4 h-4 transition-transform ${
                        expandedSections.includes(section.section) ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                  
                  {expandedSections.includes(section.section) && (
                    <div className="ml-2">
                      {section.items
                        .filter(shouldShowItem)
                        .map((item) => (
                          <Link
                            key={item.title}
                            to={item.url}
                            className={`sidebar-link ${isActive(item.url) ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <item.icon className="w-4 h-4" />
                            <span className="ml-3">{item.title}</span>
                          </Link>
                        ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Settings Dropdown */}
              <div className="section-header mt-4">
                <Settings className="w-4 h-4 text-gray-600 mr-2" />
                <span>Settings</span>
              </div>
              <div className="ml-2">
                {settingsItems.map((item) => (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={`sidebar-link ${isActive(item.url) ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Settings className="w-4 h-4" />
                    <span className="ml-3">{item.title}</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Super Admin Only */}
          {isSuperAdmin && (
            <div className="mt-6 pt-6 border-t border-gray-300">
              <div className="section-header">
                <Shield className="w-4 h-4 text-purple-600 mr-2" />
                <span>Super Admin</span>
              </div>
              <div className="ml-2">
                {superAdminItems.map((item) => (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={`sidebar-link ${isActive(item.url) ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="ml-3">{item.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>
      </div>

      <div className="main-content">
        <header className="glass-nav sticky top-0 z-40 py-4 px-6">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mr-4 text-gray-600 md:hidden hover:text-gray-900 flex-shrink-0"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold text-gray-800 truncate">{currentPageName}</h1>
                {agency && (
                  <p className="text-xs text-gray-500 truncate">{agency.name}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              {isSuperAdmin && <ViewSwitcher />}

              {/* ✅ IMPROVED: Functional notification bell */}
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative text-gray-600 hover:text-gray-900 flex-shrink-0"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    </span>
                  )}
                </button>

                {/* ✅ NEW: Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[500px] overflow-hidden">
                    <div className="p-4 border-b bg-gradient-to-r from-cyan-50 to-blue-50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          <Bell className="w-4 h-4" />
                          Notifications
                        </h3>
                        {unreadCount > 0 && (
                          <Badge className="bg-red-500 text-white">
                            {unreadCount} new
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="overflow-y-auto max-h-[400px]">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                          <p className="text-gray-600 font-medium">All caught up!</p>
                          <p className="text-sm text-gray-500 mt-1">No new notifications</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <a
                            key={notif.id}
                            href={notif.url}
                            onClick={() => setShowNotifications(false)}
                            className="block p-4 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getNotificationColor(notif.priority)}`}></div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm">
                                  {notif.title}
                                </p>
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                  {notif.description}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {formatTimestamp(notif.timestamp)}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                            </div>
                          </a>
                        ))
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="p-3 border-t bg-gray-50">
                        <a
                          href={
                            user?.user_type === 'staff_member' 
                              ? createPageUrl('StaffPortal')
                              : createPageUrl('AdminWorkflows')
                          }
                          onClick={() => setShowNotifications(false)}
                          className="text-sm text-cyan-600 hover:text-cyan-700 font-medium flex items-center justify-center gap-1"
                        >
                          View all
                          <ChevronRight className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 flex-shrink-0">
                    {user?.profile_photo_url ? (
                      <img 
                        src={user.profile_photo_url} 
                        alt={user.full_name || 'User'} 
                        className="w-8 h-8 rounded-full object-cover border-2 border-cyan-500"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {user?.full_name?.[0] || 'U'}
                        </span>
                      </div>
                    )}
                    <span className="hidden md:inline text-sm font-medium">
                      {user?.full_name || 'User'}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.full_name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      {agency && (
                        <p className="text-xs text-cyan-600 font-semibold">{agency.name}</p>
                      )}
                      <p className="text-xs text-gray-600 capitalize">{user?.user_type?.replace('_', ' ')}</p>
                      {isSuperAdmin && (
                        <p className="text-xs text-purple-600 font-bold">⭐ Super Admin</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl("ProfileSetup")} className="cursor-pointer">
                      <UserCog className="w-4 h-4 mr-2" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl("HelpCenter")} className="cursor-pointer">
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Help Center
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="p-6">
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

