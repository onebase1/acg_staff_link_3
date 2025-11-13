import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { supabaseAuth } from "@/api/supabaseAuth";

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const redirectUser = async () => {
      try {
        console.log('🔍 [Home] Checking authentication...');
        
        // ✅ FIX: More robust auth check with fallback for incognito mode
        let isAuthenticated = false;
        try {
          isAuthenticated = await supabaseAuth.isAuthenticated();
        } catch (authCheckError) {
          console.error('❌ [Home] Auth check failed:', authCheckError);
          isAuthenticated = false;
        }
        
        if (!isAuthenticated) {
          console.log('❌ [Home] User not authenticated - redirecting to login');
          setLoading(false);
          setAuthChecked(true);
          window.location.replace('/login');
          return;
        }

        console.log('✅ [Home] User authenticated, fetching profile...');
        const currentUser = await supabaseAuth.me();
        
        console.log('✅ [Home] User loaded:', {
          email: currentUser.email, 
          user_type: currentUser.user_type,
          role: currentUser.role,
          agency_id: currentUser.agency_id
        });
        
        // ✅ NEW: Super admin detection
        const isSuperAdmin = currentUser.email === 'g.basera@yahoo.com' || currentUser.role === 'admin';
        
        // Check if user is pending approval
        if (currentUser.user_type === 'pending') {
          console.log('🔄 [Home] Pending user - redirecting to ProfileSetup');
          navigate(createPageUrl('ProfileSetup'));
          setLoading(false);
          setAuthChecked(true);
          return;
        }
        
        // ✅ ENHANCED: Redirect based on user type with super admin priority
        if (isSuperAdmin) {
          console.log('⭐ [Home] Super Admin detected - redirecting to QuickActions');
          navigate(createPageUrl('QuickActions'));
        } else if (currentUser.user_type === 'staff_member') {
          console.log('👤 [Home] Staff member - redirecting to StaffPortal');
          navigate(createPageUrl('StaffPortal'));
        } else if (currentUser.user_type === 'client_user') {
          console.log('🏢 [Home] Client user - redirecting to ClientPortal');
          navigate(createPageUrl('ClientPortal'));
        } else if (currentUser.user_type === 'agency_admin' || currentUser.user_type === 'manager') {
          console.log('👨‍💼 [Home] Agency admin/manager - redirecting to Dashboard');
          navigate(createPageUrl('Dashboard'));
        } else {
          console.log('❓ [Home] Unknown user type - redirecting to Dashboard');
          navigate(createPageUrl('Dashboard'));
        }
        
        setLoading(false);
        setAuthChecked(true);
        
      } catch (error) {
        console.error("❌ [Home] Fatal error:", error);
        setLoading(false);
        setAuthChecked(true);
        window.location.replace('/login');
      }
    };
    
    if (!authChecked) {
      redirectUser();
    }
  }, [navigate, authChecked]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading ACG StaffLink...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  return null;
}