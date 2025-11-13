import Layout from "./Layout.jsx";

import Home from "./Home";

import Dashboard from "./Dashboard";

import Staff from "./Staff";

import Clients from "./Clients";

import Shifts from "./Shifts";

import Bookings from "./Bookings";

import Timesheets from "./Timesheets";

import Invoices from "./Invoices";

import Payslips from "./Payslips";

import Groups from "./Groups";

import ProfileSetup from "./ProfileSetup";

import HelpCenter from "./HelpCenter";

import StaffPortal from "./StaffPortal";

import ClientPortal from "./ClientPortal";

import ShiftMarketplace from "./ShiftMarketplace";

import AdminDashboard from "./AdminDashboard";

import ComplianceTracker from "./ComplianceTracker";

import PerformanceAnalytics from "./PerformanceAnalytics";

import Phase2Planning from "./Phase2Planning";

import InvoiceDetail from "./InvoiceDetail";

import StaffProfile from "./StaffProfile";

import TestNotifications from "./TestNotifications";

import TestingTracker from "./TestingTracker";

import WhatsAppAgentDemo from "./WhatsAppAgentDemo";

import StakeholderPresentation from "./StakeholderPresentation";

import AdminWorkflows from "./AdminWorkflows";

import AgencySettings from "./AgencySettings";

import BulkShiftCreation from "./BulkShiftCreation";

import Phase2Implementation from "./Phase2Implementation";

import ShiftCalendar from "./ShiftCalendar";

import StaffAvailability from "./StaffAvailability";

import QuickActions from "./QuickActions";

import LiveShiftMap from "./LiveShiftMap";

import StaffGPSConsent from "./StaffGPSConsent";

import BulkDataImport from "./BulkDataImport";

import TimesheetDetail from "./TimesheetDetail";

import CapabilitiesMatrix from "./CapabilitiesMatrix";

import TestUserCredentials from "./TestUserCredentials";

import DayOneReadiness from "./DayOneReadiness";

import UATTesterGuide from "./UATTesterGuide";

import StaffProfileSimulation from "./StaffProfileSimulation";

import DisputeResolution from "./DisputeResolution";

import OperationalCosts from "./OperationalCosts";

import PostShiftV2 from "./PostShiftV2";

import NaturalLanguageTests from "./NaturalLanguageTests";

import WhatsAppTimesheetGuide from "./WhatsAppTimesheetGuide";

import Phase2Tracker from "./Phase2Tracker";

import ValidationMatrix from "./ValidationMatrix";

import CleanSlate from "./CleanSlate";

import EmailNotificationTester from "./EmailNotificationTester";

import DailyShiftVerification from "./DailyShiftVerification";

import CFODashboard from "./CFODashboard";

import NaturalLanguageShiftCreator from "./NaturalLanguageShiftCreator";

import GenerateInvoices from "./GenerateInvoices";

import DataSimulationTools from "./DataSimulationTools";

import WhatsAppSetup from "./WhatsAppSetup";

import MyAvailability from "./MyAvailability";

import DominionPresentation from "./DominionPresentation";

import AdminTrainingHub from "./AdminTrainingHub";

import QuickStartGuide from "./QuickStartGuide";

import TroubleshootingGuide from "./TroubleshootingGuide";

import OnboardClient from "./OnboardClient";

import PhoneDiagnostic from "./PhoneDiagnostic";

import NotificationMonitor from "./NotificationMonitor";

import TestShiftReminders from "./TestShiftReminders";

import GeneratePayslips from "./GeneratePayslips";

import TimesheetAnalytics from "./TimesheetAnalytics";

import FunctionsAudit from "./FunctionsAudit";

import ShiftJourneyDiagram from "./ShiftJourneyDiagram";

import SuperAdminAgencyOnboarding from "./SuperAdminAgencyOnboarding";

import Login from "./Login";
import ResetPassword from "./ResetPassword";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Home: Home,
    
    Dashboard: Dashboard,
    
    Staff: Staff,
    
    Clients: Clients,
    
    Shifts: Shifts,
    
    Bookings: Bookings,
    
    Timesheets: Timesheets,
    
    Invoices: Invoices,
    
    Payslips: Payslips,
    
    Groups: Groups,
    
    ProfileSetup: ProfileSetup,
    
    HelpCenter: HelpCenter,
    
    StaffPortal: StaffPortal,
    
    ClientPortal: ClientPortal,
    
    ShiftMarketplace: ShiftMarketplace,
    
    AdminDashboard: AdminDashboard,
    
    ComplianceTracker: ComplianceTracker,
    
    PerformanceAnalytics: PerformanceAnalytics,
    
    Phase2Planning: Phase2Planning,
    
    InvoiceDetail: InvoiceDetail,
    
    StaffProfile: StaffProfile,
    
    TestNotifications: TestNotifications,
    
    TestingTracker: TestingTracker,
    
    WhatsAppAgentDemo: WhatsAppAgentDemo,
    
    StakeholderPresentation: StakeholderPresentation,
    
    AdminWorkflows: AdminWorkflows,
    
    AgencySettings: AgencySettings,
    
    BulkShiftCreation: BulkShiftCreation,
    
    Phase2Implementation: Phase2Implementation,
    
    ShiftCalendar: ShiftCalendar,
    
    StaffAvailability: StaffAvailability,
    
    QuickActions: QuickActions,
    
    LiveShiftMap: LiveShiftMap,
    
    StaffGPSConsent: StaffGPSConsent,
    
    BulkDataImport: BulkDataImport,
    
    TimesheetDetail: TimesheetDetail,
    
    CapabilitiesMatrix: CapabilitiesMatrix,
    
    TestUserCredentials: TestUserCredentials,
    
    DayOneReadiness: DayOneReadiness,
    
    UATTesterGuide: UATTesterGuide,
    
    StaffProfileSimulation: StaffProfileSimulation,
    
    DisputeResolution: DisputeResolution,
    
    OperationalCosts: OperationalCosts,
    
    PostShiftV2: PostShiftV2,
    
    NaturalLanguageTests: NaturalLanguageTests,
    
    WhatsAppTimesheetGuide: WhatsAppTimesheetGuide,
    
    Phase2Tracker: Phase2Tracker,
    
    ValidationMatrix: ValidationMatrix,
    
    CleanSlate: CleanSlate,
    
    EmailNotificationTester: EmailNotificationTester,
    
    DailyShiftVerification: DailyShiftVerification,
    
    CFODashboard: CFODashboard,
    
    NaturalLanguageShiftCreator: NaturalLanguageShiftCreator,
    
    GenerateInvoices: GenerateInvoices,
    
    DataSimulationTools: DataSimulationTools,
    
    WhatsAppSetup: WhatsAppSetup,
    
    MyAvailability: MyAvailability,
    
    DominionPresentation: DominionPresentation,
    
    AdminTrainingHub: AdminTrainingHub,
    
    QuickStartGuide: QuickStartGuide,
    
    TroubleshootingGuide: TroubleshootingGuide,
    
    OnboardClient: OnboardClient,
    
    PhoneDiagnostic: PhoneDiagnostic,
    
    NotificationMonitor: NotificationMonitor,
    
    TestShiftReminders: TestShiftReminders,
    
    GeneratePayslips: GeneratePayslips,
    
    TimesheetAnalytics: TimesheetAnalytics,
    
    FunctionsAudit: FunctionsAudit,
    
    ShiftJourneyDiagram: ShiftJourneyDiagram,
    
    SuperAdminAgencyOnboarding: SuperAdminAgencyOnboarding,
    
    ResetPassword: ResetPassword,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Home />} />
                
                <Route path="/login" element={<Login />} />
                <Route path="/Login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Staff" element={<Staff />} />
                
                <Route path="/Clients" element={<Clients />} />
                
                <Route path="/Shifts" element={<Shifts />} />
                
                <Route path="/Bookings" element={<Bookings />} />
                
                <Route path="/Timesheets" element={<Timesheets />} />
                
                <Route path="/Invoices" element={<Invoices />} />
                
                <Route path="/Payslips" element={<Payslips />} />
                
                <Route path="/Groups" element={<Groups />} />
                
                <Route path="/ProfileSetup" element={<ProfileSetup />} />
                
                <Route path="/HelpCenter" element={<HelpCenter />} />
                
                <Route path="/StaffPortal" element={<StaffPortal />} />
                
                <Route path="/ClientPortal" element={<ClientPortal />} />
                
                <Route path="/ShiftMarketplace" element={<ShiftMarketplace />} />
                
                <Route path="/AdminDashboard" element={<AdminDashboard />} />
                
                <Route path="/ComplianceTracker" element={<ComplianceTracker />} />
                
                <Route path="/PerformanceAnalytics" element={<PerformanceAnalytics />} />
                
                <Route path="/Phase2Planning" element={<Phase2Planning />} />
                
                <Route path="/InvoiceDetail" element={<InvoiceDetail />} />
                
                <Route path="/StaffProfile" element={<StaffProfile />} />
                
                <Route path="/TestNotifications" element={<TestNotifications />} />
                
                <Route path="/TestingTracker" element={<TestingTracker />} />
                
                <Route path="/WhatsAppAgentDemo" element={<WhatsAppAgentDemo />} />
                
                <Route path="/StakeholderPresentation" element={<StakeholderPresentation />} />
                
                <Route path="/AdminWorkflows" element={<AdminWorkflows />} />
                
                <Route path="/AgencySettings" element={<AgencySettings />} />
                
                <Route path="/BulkShiftCreation" element={<BulkShiftCreation />} />
                
                <Route path="/Phase2Implementation" element={<Phase2Implementation />} />
                
                <Route path="/ShiftCalendar" element={<ShiftCalendar />} />
                
                <Route path="/StaffAvailability" element={<StaffAvailability />} />
                
                <Route path="/QuickActions" element={<QuickActions />} />
                
                <Route path="/LiveShiftMap" element={<LiveShiftMap />} />
                
                <Route path="/StaffGPSConsent" element={<StaffGPSConsent />} />
                
                <Route path="/BulkDataImport" element={<BulkDataImport />} />
                
                <Route path="/TimesheetDetail" element={<TimesheetDetail />} />
                
                <Route path="/CapabilitiesMatrix" element={<CapabilitiesMatrix />} />
                
                <Route path="/TestUserCredentials" element={<TestUserCredentials />} />
                
                <Route path="/DayOneReadiness" element={<DayOneReadiness />} />
                
                <Route path="/UATTesterGuide" element={<UATTesterGuide />} />
                
                <Route path="/StaffProfileSimulation" element={<StaffProfileSimulation />} />
                
                <Route path="/DisputeResolution" element={<DisputeResolution />} />
                
                <Route path="/OperationalCosts" element={<OperationalCosts />} />
                
                <Route path="/PostShiftV2" element={<PostShiftV2 />} />
                
                <Route path="/NaturalLanguageTests" element={<NaturalLanguageTests />} />
                
                <Route path="/WhatsAppTimesheetGuide" element={<WhatsAppTimesheetGuide />} />
                
                <Route path="/Phase2Tracker" element={<Phase2Tracker />} />
                
                <Route path="/ValidationMatrix" element={<ValidationMatrix />} />
                
                <Route path="/CleanSlate" element={<CleanSlate />} />
                
                <Route path="/EmailNotificationTester" element={<EmailNotificationTester />} />
                
                <Route path="/DailyShiftVerification" element={<DailyShiftVerification />} />
                
                <Route path="/CFODashboard" element={<CFODashboard />} />
                
                <Route path="/NaturalLanguageShiftCreator" element={<NaturalLanguageShiftCreator />} />
                
                <Route path="/GenerateInvoices" element={<GenerateInvoices />} />
                
                <Route path="/DataSimulationTools" element={<DataSimulationTools />} />
                
                <Route path="/WhatsAppSetup" element={<WhatsAppSetup />} />
                
                <Route path="/MyAvailability" element={<MyAvailability />} />
                
                <Route path="/DominionPresentation" element={<DominionPresentation />} />
                
                <Route path="/AdminTrainingHub" element={<AdminTrainingHub />} />
                
                <Route path="/QuickStartGuide" element={<QuickStartGuide />} />
                
                <Route path="/TroubleshootingGuide" element={<TroubleshootingGuide />} />
                
                <Route path="/OnboardClient" element={<OnboardClient />} />
                
                <Route path="/PhoneDiagnostic" element={<PhoneDiagnostic />} />
                
                <Route path="/NotificationMonitor" element={<NotificationMonitor />} />
                
                <Route path="/TestShiftReminders" element={<TestShiftReminders />} />
                
                <Route path="/GeneratePayslips" element={<GeneratePayslips />} />
                
                <Route path="/TimesheetAnalytics" element={<TimesheetAnalytics />} />
                
                <Route path="/FunctionsAudit" element={<FunctionsAudit />} />
                
                <Route path="/ShiftJourneyDiagram" element={<ShiftJourneyDiagram />} />
                
                <Route path="/SuperAdminAgencyOnboarding" element={<SuperAdminAgencyOnboarding />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}