import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
import { Eye, Users, Building2, UserCheck, RefreshCw } from "lucide-react";

export default function ViewSwitcher() {
  const [currentView, setCurrentView] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [staff, setStaff] = useState([]);
  const [clients, setClients] = useState([]);

  // ✅ FIX: Safe localStorage access for incognito mode
  const safeGetLocalStorage = (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('⚠️ [ViewSwitcher] localStorage unavailable (incognito mode?):', error);
      return null;
    }
  };

  const safeSetLocalStorage = (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('⚠️ [ViewSwitcher] localStorage unavailable (incognito mode?):', error);
      return false;
    }
  };

  const safeRemoveLocalStorage = (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('⚠️ [ViewSwitcher] localStorage unavailable (incognito mode?):', error);
      return false;
    }
  };

  useEffect(() => {
    loadData();
    loadCurrentView();
  }, []);

  const loadData = async () => {
    try {
      const [agencyRes, staffRes, clientRes] = await Promise.all([
        supabase.from('agencies').select('*'),
        supabase.from('staff').select('*'),
        supabase.from('clients').select('*')
      ]);

      if (agencyRes.error) throw agencyRes.error;
      if (staffRes.error) throw staffRes.error;
      if (clientRes.error) throw clientRes.error;

      setAgencies(agencyRes.data || []);
      setStaff(staffRes.data || []);
      setClients(clientRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const loadCurrentView = () => {
    const savedView = safeGetLocalStorage('admin_view_mode');
    if (savedView) {
      try {
        setCurrentView(JSON.parse(savedView));
      } catch (error) {
        console.error('Error parsing saved view:', error);
      }
    }
  };

  const switchView = async (viewType, entityId = null, entityName = null) => {
    const viewConfig = {
      type: viewType,
      entityId,
      entityName,
      timestamp: new Date().toISOString()
    };

    safeSetLocalStorage('admin_view_mode', JSON.stringify(viewConfig));
    setCurrentView(viewConfig);

    // Force page reload to apply view
    window.location.reload();
  };

  const clearView = () => {
    safeRemoveLocalStorage('admin_view_mode');
    setCurrentView(null);
    window.location.reload();
  };

  const getViewLabel = () => {
    if (!currentView) return "Super Admin View";
    
    switch (currentView.type) {
      case 'agency_admin':
        return `Agency Admin: ${currentView.entityName}`;
      case 'staff':
        return `Staff: ${currentView.entityName}`;
      case 'client':
        return `Client: ${currentView.entityName}`;
      default:
        return "Super Admin View";
    }
  };

  return (
    <div className="flex items-center gap-2">
      {currentView && (
        <Badge className="bg-purple-600 text-white">
          <Eye className="w-3 h-3 mr-1" />
          Viewing as: {currentView.type.replace('_', ' ')}
        </Badge>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="w-4 h-4" />
            {getViewLabel()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Switch View Perspective</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {currentView && (
            <>
              <DropdownMenuItem onClick={clearView} className="text-purple-600">
                <RefreshCw className="w-4 h-4 mr-2" />
                Return to Super Admin View
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuLabel className="text-xs text-gray-500">View as Agency Admin</DropdownMenuLabel>
          {agencies.slice(0, 5).map((agency) => (
            <DropdownMenuItem 
              key={agency.id} 
              onClick={() => switchView('agency_admin', agency.id, agency.name)}
            >
              <Building2 className="w-4 h-4 mr-2" />
              {agency.name}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-gray-500">View as Staff Member</DropdownMenuLabel>
          {staff.slice(0, 5).map((staffMember) => (
            <DropdownMenuItem 
              key={staffMember.id} 
              onClick={() => switchView('staff', staffMember.id, `${staffMember.first_name} ${staffMember.last_name}`)}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              {staffMember.first_name} {staffMember.last_name} ({staffMember.role})
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-gray-500">View as Client</DropdownMenuLabel>
          {clients.slice(0, 5).map((client) => (
            <DropdownMenuItem 
              key={client.id} 
              onClick={() => switchView('client', client.id, client.name)}
            >
              <Users className="w-4 h-4 mr-2" />
              {client.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}