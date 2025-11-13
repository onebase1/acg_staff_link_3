import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TEST_CONFIG } from '../test-config';

export class SupabaseTestClient {
  private client: SupabaseClient;
  private agencyId: string | null = null;

  constructor() {
    this.client = createClient(
      TEST_CONFIG.supabase.url,
      TEST_CONFIG.supabase.key
    );
  }

  // Direct query access for flexibility
  query(table: string) {
    return this.client.from(table);
  }

  // Get client for direct access
  getClient() {
    return this.client;
  }

  async authenticate() {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: TEST_CONFIG.dominion.email,
      password: TEST_CONFIG.dominion.password
    });

    if (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }

    return data;
  }

  async getAgencyId(agencyName: string): Promise<string> {
    if (this.agencyId) return this.agencyId;

    const { data, error } = await this.client
      .from('agencies')
      .select('id')
      .eq('name', agencyName)
      .single();

    if (error || !data) {
      throw new Error(`Agency not found: ${agencyName}`);
    }

    this.agencyId = data.id;
    return data.id;
  }

  async getAgency(agencyName: string) {
    const agencyId = await this.getAgencyId(agencyName);

    const [staffCount, clientsCount, shiftsCount] = await Promise.all([
      this.client.from('staff').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
      this.client.from('clients').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
      this.client.from('shifts').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId)
    ]);

    return {
      id: agencyId,
      name: agencyName,
      staff_count: staffCount.count || 0,
      clients_count: clientsCount.count || 0,
      shifts_count: shiftsCount.count || 0
    };
  }

  async getAgencyData(agencyName: string) {
    const agencyId = await this.getAgencyId(agencyName);
    
    const [agency, staff, clients, shifts] = await Promise.all([
      this.client.from('agencies').select('*').eq('id', agencyId).single(),
      this.client.from('staff').select('*').eq('agency_id', agencyId),
      this.client.from('clients').select('*').eq('agency_id', agencyId),
      this.client.from('shifts').select('*').eq('agency_id', agencyId)
    ]);

    return {
      agency: agency.data,
      staff: staff.data || [],
      clients: clients.data || [],
      shifts: shifts.data || []
    };
  }

  async getShiftJourneyLog(shiftId: string) {
    const { data, error } = await this.client
      .from('shifts')
      .select('shift_journey_log, status, created_date, updated_date')
      .eq('id', shiftId)
      .single();

    if (error) {
      throw new Error(`Failed to get shift journey log: ${error.message}`);
    }

    const log = data.shift_journey_log || [];
    const states = log.map((entry: any) => entry.state);

    return {
      log,
      states,
      current_status: data.status,
      created_date: data.created_date,
      updated_date: data.updated_date
    };
  }

  async getNotificationQueue(filters: any = {}) {
    let query = this.client.from('notification_queue').select('*');

    if (filters.notification_type) {
      query = query.eq('notification_type', filters.notification_type);
    }
    if (filters.recipient_id) {
      query = query.eq('recipient_id', filters.recipient_id);
    }
    if (filters.related_entity) {
      query = query.eq('related_entity_id', filters.related_entity);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Failed to get notification queue:', error.message);
      return [];
    }

    return data || [];
  }

  async getChangeLogs(filters: any = {}) {
    let query = this.client.from('change_logs').select('*');

    if (filters.entity_id) {
      query = query.eq('entity_id', filters.entity_id);
    }
    if (filters.change_type) {
      query = query.eq('change_type', filters.change_type);
    }
    if (filters.since) {
      query = query.gte('timestamp', filters.since.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Failed to get change logs:', error.message);
      return [];
    }

    return data || [];
  }

  async getDashboardStats(agencyId: string) {
    const [shifts, bookings, timesheets, invoices] = await Promise.all([
      this.client.from('shifts').select('*').eq('agency_id', agencyId),
      this.client.from('bookings').select('*').eq('agency_id', agencyId),
      this.client.from('timesheets').select('*').eq('agency_id', agencyId),
      this.client.from('invoices').select('*').eq('agency_id', agencyId)
    ]);

    const shiftsData = shifts.data || [];
    const invoicesData = invoices.data || [];

    const stats = {
      total_shifts: shiftsData.length,
      open_shifts: shiftsData.filter(s => s.status === 'open').length,
      assigned_shifts: shiftsData.filter(s => s.status === 'assigned').length,
      confirmed_shifts: shiftsData.filter(s => s.status === 'confirmed').length,
      in_progress_shifts: shiftsData.filter(s => s.status === 'in_progress').length,
      completed_shifts: shiftsData.filter(s => s.status === 'completed').length,
      cancelled_shifts: shiftsData.filter(s => s.status === 'cancelled').length,
      total_bookings: bookings.data?.length || 0,
      total_timesheets: timesheets.data?.length || 0,
      total_invoices: invoicesData.length,
      revenue: invoicesData.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    };

    return stats;
  }

  async checkDataIntegrity() {
    const issues = {
      missing_columns: [] as any[],
      orphaned_records: [] as any[],
      invalid_references: [] as any[]
    };

    // Check for shifts without valid client references
    const { data: shiftsWithoutClients } = await this.client
      .from('shifts')
      .select('id, client_id')
      .not('client_id', 'is', null);

    if (shiftsWithoutClients) {
      for (const shift of shiftsWithoutClients) {
        const { data: client } = await this.client
          .from('clients')
          .select('id')
          .eq('id', shift.client_id)
          .single();

        if (!client) {
          issues.orphaned_records.push({
            table: 'shifts',
            id: shift.id,
            issue: `References non-existent client ${shift.client_id}`
          });
        }
      }
    }

    return issues;
  }

  async getShift(shiftId: string) {
    const { data, error } = await this.client
      .from('shifts')
      .select('*')
      .eq('id', shiftId)
      .single();

    if (error) {
      throw new Error(`Failed to get shift: ${error.message}`);
    }

    return data;
  }

  async createShift(shiftData: any) {
    const agencyId = this.agencyId || await this.getAgencyId(TEST_CONFIG.dominion.agency_name);

    // Get client ID by name if string provided
    let clientId = shiftData.client_id;
    if (typeof clientId === 'string' && !clientId.includes('-')) {
      const { data: client } = await this.client
        .from('clients')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('name', clientId)
        .single();
      clientId = client?.id;
    }

    // Construct full timestamps from date + time (database uses TIMESTAMPTZ for start_time/end_time)
    const start_timestamp = `${shiftData.date}T${shiftData.start_time}:00`;
    const end_timestamp = `${shiftData.date}T${shiftData.end_time}:00`;

    const { data, error } = await this.client
      .from('shifts')
      .insert([{
        agency_id: agencyId,
        client_id: clientId,
        role_required: shiftData.role,
        date: shiftData.date,
        start_time: start_timestamp,
        end_time: end_timestamp,
        pay_rate: shiftData.pay_rate,
        charge_rate: shiftData.charge_rate,
        status: 'open',
        shift_journey_log: [{
          state: 'created',
          timestamp: new Date().toISOString(),
          method: 'automated_test'
        }]
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create shift: ${error.message}`);
    }

    return data;
  }

  async assignStaff(shiftId: string, staffNameOrId: string) {
    const agencyId = this.agencyId || await this.getAgencyId(TEST_CONFIG.dominion.agency_name);

    // Get staff ID by name if string provided
    let staffId = staffNameOrId;
    if (!staffNameOrId.includes('-')) {
      const { data: staff } = await this.client
        .from('staff')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('full_name', staffNameOrId)
        .single();
      staffId = staff?.id;
    }

    const shift = await this.getShift(shiftId);
    const log = shift.shift_journey_log || [];

    const { data, error } = await this.client
      .from('shifts')
      .update({
        assigned_staff_id: staffId,
        status: 'assigned',
        shift_journey_log: [
          ...log,
          {
            state: 'assigned',
            timestamp: new Date().toISOString(),
            method: 'automated_test',
            staff_id: staffId
          }
        ]
      })
      .eq('id', shiftId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to assign staff: ${error.message}`);
    }

    return data;
  }

  async updateShift(shiftId: string, updates: any) {
    const shift = await this.getShift(shiftId);
    const log = shift.shift_journey_log || [];

    // Add journey log entry if status changed
    if (updates.status && updates.status !== shift.status) {
      updates.shift_journey_log = [
        ...log,
        {
          state: updates.status,
          timestamp: new Date().toISOString(),
          method: 'automated_test'
        }
      ];
    }

    const { data, error } = await this.client
      .from('shifts')
      .update(updates)
      .eq('id', shiftId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update shift: ${error.message}`);
    }

    return data;
  }

  async completeShift(shiftId: string, details: any = {}) {
    const shift = await this.getShift(shiftId);
    const log = shift.shift_journey_log || [];

    const { data, error } = await this.client
      .from('shifts')
      .update({
        status: 'completed',
        financial_locked: true,
        shift_journey_log: [
          ...log,
          {
            state: 'completed',
            timestamp: new Date().toISOString(),
            method: 'automated_test',
            ...details
          }
        ]
      })
      .eq('id', shiftId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to complete shift: ${error.message}`);
    }

    return data;
  }

  async cancelShift(shiftId: string, cancellationDetails: any) {
    const shift = await this.getShift(shiftId);
    const log = shift.shift_journey_log || [];

    const { data, error } = await this.client
      .from('shifts')
      .update({
        status: 'cancelled',
        cancellation_reason: cancellationDetails.reason,
        shift_journey_log: [
          ...log,
          {
            state: 'cancelled',
            timestamp: new Date().toISOString(),
            method: 'automated_test',
            reason: cancellationDetails.reason,
            notes: cancellationDetails.notes
          }
        ]
      })
      .eq('id', shiftId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel shift: ${error.message}`);
    }

    // Create change log
    await this.client.from('change_logs').insert([{
      entity_type: 'shift',
      entity_id: shiftId,
      change_type: 'shift_cancelled',
      reason: cancellationDetails.reason,
      notes: cancellationDetails.notes,
      timestamp: new Date().toISOString()
    }]);

    return data;
  }

  async getInvoices(filters: any = {}) {
    let query = this.client.from('invoices').select('*');

    if (filters.shift_id) {
      query = query.eq('shift_id', filters.shift_id);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Failed to get invoices:', error.message);
      return [];
    }

    return data || [];
  }

  async getAdminWorkflows(filters: any = {}) {
    const agencyId = this.agencyId || await this.getAgencyId(TEST_CONFIG.dominion.agency_name);
    
    let query = this.client.from('admin_workflows').select('*').eq('agency_id', agencyId);

    if (filters.related_entity_id) {
      query = query.contains('related_entity', { entity_id: filters.related_entity_id });
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Failed to get admin workflows:', error.message);
      return [];
    }

    return data || [];
  }

  async queryWithAgencyScope(table: string) {
    const agencyId = this.agencyId || await this.getAgencyId(TEST_CONFIG.dominion.agency_name);
    
    return {
      count: async () => {
        const { count } = await this.client
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId);
        return count || 0;
      }
    };
  }

  async createConfirmedShift(shiftData: any) {
    const shift = await this.createShift(shiftData);
    if (shiftData.assigned_staff_id) {
      await this.assignStaff(shift.id, shiftData.assigned_staff_id);
      await this.updateShift(shift.id, { status: 'confirmed' });
    }
    return await this.getShift(shift.id);
  }

  async createCompletedShift(shiftData: any) {
    const shift = await this.createConfirmedShift(shiftData);
    await this.updateShift(shift.id, { status: 'in_progress' });
    await this.updateShift(shift.id, { status: shiftData.status || 'awaiting_admin_closure' });
    return await this.getShift(shift.id);
  }
}

