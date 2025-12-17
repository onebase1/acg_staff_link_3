import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Download, Users, Building2, UserCog, Copy, CheckCircle,
  Shield, Info, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";

export default function TestUserCredentials() {
  const [showPasswords, setShowPasswords] = useState(false);

  const testUsers = {
    staff: [
      {
        full_name: "Ebuka Okonkwo",
        email: "g.basera+ebuka@gmail.com",
        password: "Broadbacnd@123",
        user_type: "staff_member",
        role: "care_worker",
        phone: "+447700900001",
        address: "12 Park Lane, Middlesbrough, TS1 2AB",
        hourly_rate: 14.75,
        date_joined: "2024-01-15",
        bank_details: "Sort: 20-00-00, Acc: 12345601"
      },
      {
        full_name: "Chidi Okonkwo",
        email: "g.basera+chidi@gmail.com",
        password: "Broadbacnd@123",
        user_type: "staff_member",
        role: "care_worker",
        phone: "+447700900002",
        address: "45 Albert Road, Middlesbrough, TS1 3HG",
        hourly_rate: 14.75,
        date_joined: "2024-02-01",
        bank_details: "Sort: 20-00-00, Acc: 12345602"
      },
      {
        full_name: "Amara Nwosu",
        email: "g.basera+amara@gmail.com",
        password: "Broadbacnd@123",
        user_type: "staff_member",
        role: "care_worker",
        phone: "+447700900003",
        address: "78 Linthorpe Road, Middlesbrough, TS1 5DH",
        hourly_rate: 14.75,
        date_joined: "2024-03-10",
        bank_details: "Sort: 20-00-00, Acc: 12345603"
      },
      {
        full_name: "Funke Adeyemi",
        email: "g.basera+funke@gmail.com",
        password: "Broadbacnd@123",
        user_type: "staff_member",
        role: "nurse",
        phone: "+447700900004",
        address: "23 Corporation Road, Middlesbrough, TS1 2RH",
        hourly_rate: 18.50,
        date_joined: "2024-01-20",
        nmc_pin: "98A1234E",
        bank_details: "Sort: 20-00-00, Acc: 12345604"
      },
      {
        full_name: "Ngozi Okeke",
        email: "g.basera+ngozi@gmail.com",
        password: "Broadbacnd@123",
        user_type: "staff_member",
        role: "nurse",
        phone: "+447700900005",
        address: "56 Borough Road, Middlesbrough, TS1 3BA",
        hourly_rate: 18.50,
        date_joined: "2024-02-15",
        nmc_pin: "98B5678F",
        bank_details: "Sort: 20-00-00, Acc: 12345605"
      },
      {
        full_name: "Oluchi Ezeh",
        email: "g.basera+oluchi@gmail.com",
        password: "Broadbacnd@123",
        user_type: "staff_member",
        role: "hca",
        phone: "+447700900006",
        address: "89 Grange Road, Middlesbrough, TS1 5JY",
        hourly_rate: 13.25,
        date_joined: "2024-04-01",
        bank_details: "Sort: 20-00-00, Acc: 12345606"
      },
      {
        full_name: "Kemi Ojo",
        email: "g.basera+kemi@gmail.com",
        password: "Broadbacnd@123",
        user_type: "staff_member",
        role: "senior_care_worker",
        phone: "+447700900007",
        address: "34 Newport Road, Middlesbrough, TS1 5JE",
        hourly_rate: 16.00,
        date_joined: "2023-11-05",
        bank_details: "Sort: 20-00-00, Acc: 12345607"
      },
      {
        full_name: "Aisha Bello",
        email: "g.basera+aisha@gmail.com",
        password: "Broadbacnd@123",
        user_type: "staff_member",
        role: "care_worker",
        phone: "+447700900008",
        address: "67 Union Street, Middlesbrough, TS1 1LE",
        hourly_rate: 14.75,
        date_joined: "2024-05-12",
        bank_details: "Sort: 20-00-00, Acc: 12345608"
      },
      {
        full_name: "Chinwe Eze",
        email: "g.basera+chinwe@gmail.com",
        password: "Broadbacnd@123",
        user_type: "staff_member",
        role: "specialist_nurse",
        phone: "+447700900009",
        address: "91 Marton Road, Middlesbrough, TS4 2EY",
        hourly_rate: 22.00,
        date_joined: "2023-09-01",
        nmc_pin: "98C9012G",
        bank_details: "Sort: 20-00-00, Acc: 12345609"
      },
      {
        full_name: "Ola Taiwo",
        email: "g.basera+ola@gmail.com",
        password: "Broadbacnd@123",
        user_type: "staff_member",
        role: "care_worker",
        phone: "+447700900010",
        address: "15 Southfield Road, Middlesbrough, TS1 3BZ",
        hourly_rate: 14.75,
        date_joined: "2024-06-20",
        bank_details: "Sort: 20-00-00, Acc: 12345610"
      }
    ],
    care_home_managers: [
      {
        full_name: "Sarah Thompson",
        email: "g.basera+sarah@gmail.com",
        password: "Broadbacnd@123",
        user_type: "client_user",
        care_home: "Castle Bank Residential Home",
        phone: "+447700900101",
        position: "Care Home Manager",
        care_home_address: "Castle Bank, Stockton Road, Middlesbrough, TS19 0PN"
      },
      {
        full_name: "Michael Davies",
        email: "g.basera+michael@gmail.com",
        password: "Broadbacnd@123",
        user_type: "client_user",
        care_home: "Divine Care Centre",
        phone: "+447700900102",
        position: "Operations Manager",
        care_home_address: "Durham Road, Stockton-on-Tees, TS19 0BW"
      },
      {
        full_name: "Emma Richardson",
        email: "g.basera+emma@gmail.com",
        password: "Broadbacnd@123",
        user_type: "client_user",
        care_home: "Newholme Care Home",
        phone: "+447700900103",
        position: "Nursing Manager",
        care_home_address: "Newholme, Durham Road, Stockton, TS19 8XF"
      }
    ],
    agency_admins: [
      {
        full_name: "Grace Basera",
        email: "g.basera+admin@gmail.com",
        password: "Broadbacnd@123",
        user_type: "agency_admin",
        agency: "Dominion Care Group",
        phone: "+447700900201",
        position: "Managing Director",
        address: "Dominion House, Town Centre, Middlesbrough, TS1 1JH",
        permissions: "Full access - all features"
      },
      {
        full_name: "David Johnson",
        email: "g.basera+david@gmail.com",
        password: "Broadbacnd@123",
        user_type: "manager",
        agency: "Dominion Care Group",
        phone: "+447700900202",
        position: "Operations Manager",
        address: "Dominion House, Town Centre, Middlesbrough, TS1 1JH",
        permissions: "All except: Agency settings, financial exports"
      }
    ]
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const downloadTestUsersCSV = () => {
    const headers = ['Full Name', 'Email', 'Password', 'User Type', 'Role/Position', 'Phone', 'Address', 'Hourly Rate', 'Date Joined', 'Bank Details', 'NMC PIN', 'Care Home/Agency', 'Permissions'];
    
    const rows = [
      ...testUsers.staff.map(u => [
        u.full_name,
        u.email,
        u.password,
        u.user_type,
        u.role,
        u.phone,
        u.address,
        u.hourly_rate || '',
        u.date_joined || '',
        u.bank_details || '',
        u.nmc_pin || '',
        'Dominion Care Group',
        'Staff Portal'
      ]),
      ...testUsers.care_home_managers.map(u => [
        u.full_name,
        u.email,
        u.password,
        u.user_type,
        u.position,
        u.phone,
        u.care_home_address,
        '',
        '',
        '',
        '',
        u.care_home,
        'Client Portal'
      ]),
      ...testUsers.agency_admins.map(u => [
        u.full_name,
        u.email,
        u.password,
        u.user_type,
        u.position,
        u.phone,
        u.address,
        '',
        '',
        '',
        '',
        u.agency,
        u.permissions
      ])
    ];

    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'acg_stafflink_test_users.csv';
    a.click();
    
    toast.success('CSV downloaded - Ready for UAT testing');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-8 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="w-10 h-10" />
          <h1 className="text-3xl font-bold">UAT Test User Credentials</h1>
        </div>
        <p className="text-indigo-100 text-lg mb-3">
          Pre-configured test accounts for comprehensive user acceptance testing
        </p>
        <div className="flex gap-3 flex-wrap">
          <Badge className="bg-white/20 text-white border-white/30">
            {testUsers.staff.length} Staff Accounts
          </Badge>
          <Badge className="bg-white/20 text-white border-white/30">
            {testUsers.care_home_managers.length} Care Home Managers
          </Badge>
          <Badge className="bg-white/20 text-white border-white/30">
            {testUsers.agency_admins.length} Agency Admins
          </Badge>
        </div>
      </div>

      {/* Download Button */}
      <div className="flex justify-center">
        <Button 
          onClick={downloadTestUsersCSV} 
          className="bg-indigo-600 hover:bg-indigo-700 text-lg py-6 px-8"
        >
          <Download className="w-5 h-5 mr-2" />
          Download Test Users CSV
        </Button>
      </div>

      {/* Password Visibility Toggle */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPasswords(!showPasswords)}
        >
          {showPasswords ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
          {showPasswords ? 'Hide' : 'Show'} Passwords
        </Button>
      </div>

      {/* Important Notes */}
      <Alert className="border-amber-300 bg-amber-50">
        <Info className="h-5 w-5 text-amber-600" />
        <AlertDescription>
          <div className="text-amber-900">
            <p className="font-semibold mb-2">📋 Important Notes:</p>
            <ul className="space-y-1 text-sm">
              <li>• All emails use format: <code>g.basera+{'{name}'}@gmail.com</code> (routes to your inbox with +labels)</li>
              <li>• Universal password: <code>{showPasswords ? 'Broadbacnd@123' : '••••••••••••'}</code> (change after UAT)</li>
              <li>• Addresses are Middlesbrough-based (update as needed for GPS testing)</li>
              <li>• Bank details are placeholders - replace with real Sort Code/Account for production</li>
              <li>• These users are NOT in database yet - import via Bulk Data Import page when ready</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Staff Members */}
      <Card>
        <CardHeader className="bg-blue-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Agency Staff ({testUsers.staff.length} accounts)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Password</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Rate</th>
                  <th className="text-left p-2">Phone</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {testUsers.staff.map((user, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{user.full_name}</td>
                    <td className="p-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{user.email}</code>
                    </td>
                    <td className="p-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {showPasswords ? user.password : '••••••••••••'}
                      </code>
                    </td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-xs">{user.role}</Badge>
                    </td>
                    <td className="p-2">£{user.hourly_rate}/hr</td>
                    <td className="p-2 text-xs text-gray-600">{user.phone}</td>
                    <td className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(user.email)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Care Home Managers */}
      <Card>
        <CardHeader className="bg-green-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-green-600" />
            Care Home Managers ({testUsers.care_home_managers.length} accounts)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Password</th>
                  <th className="text-left p-2">Care Home</th>
                  <th className="text-left p-2">Position</th>
                  <th className="text-left p-2">Phone</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {testUsers.care_home_managers.map((user, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{user.full_name}</td>
                    <td className="p-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{user.email}</code>
                    </td>
                    <td className="p-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {showPasswords ? user.password : '••••••••••••'}
                      </code>
                    </td>
                    <td className="p-2 font-medium text-green-700">{user.care_home}</td>
                    <td className="p-2 text-gray-600">{user.position}</td>
                    <td className="p-2 text-xs text-gray-600">{user.phone}</td>
                    <td className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(user.email)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Agency Admins */}
      <Card>
        <CardHeader className="bg-purple-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-purple-600" />
            Agency Admins ({testUsers.agency_admins.length} accounts)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Password</th>
                  <th className="text-left p-2">Agency</th>
                  <th className="text-left p-2">Position</th>
                  <th className="text-left p-2">Permissions</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {testUsers.agency_admins.map((user, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{user.full_name}</td>
                    <td className="p-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{user.email}</code>
                    </td>
                    <td className="p-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {showPasswords ? user.password : '••••••••••••'}
                      </code>
                    </td>
                    <td className="p-2 font-medium text-purple-700">{user.agency}</td>
                    <td className="p-2 text-gray-600">{user.position}</td>
                    <td className="p-2 text-xs text-gray-600">{user.permissions}</td>
                    <td className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(user.email)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CSV Format Preview */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>CSV Import Format (for Bulk Data Import)</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Staff Import CSV Columns:</h4>
              <code className="text-xs bg-gray-900 text-green-400 p-4 rounded block overflow-x-auto">
                first_name,last_name,email,phone,role,hourly_rate,address_line1,address_city,address_postcode,date_joined,bank_sort_code,bank_account_number,nmc_pin
              </code>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Client Import CSV Columns:</h4>
              <code className="text-xs bg-gray-900 text-green-400 p-4 rounded block overflow-x-auto">
                name,type,contact_name,contact_email,contact_phone,address_line1,address_city,address_postcode,payment_terms,default_charge_rate
              </code>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Shift Import CSV Columns:</h4>
              <code className="text-xs bg-gray-900 text-green-400 p-4 rounded block overflow-x-auto">
                date,start_time,end_time,client_name,role_required,assigned_staff_name,status,pay_rate,charge_rate,notes
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}