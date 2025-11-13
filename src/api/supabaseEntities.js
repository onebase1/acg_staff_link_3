import { supabase } from './supabaseClient';

// Helper function to parse sort order (e.g., '-date' -> { column: 'date', ascending: false })
function parseSortOrder(sort) {
  if (!sort) return null;
  const ascending = !sort.startsWith('-');
  const column = sort.startsWith('-') ? sort.substring(1) : sort;
  return { column, ascending };
}

// Helper function to build Supabase query from filter object
function buildFilterQuery(query, filters) {
  if (!filters || typeof filters !== 'object') return query;

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;

    // Handle operators like { $gte: start, $lte: end }
    // Check if value is an object with operators (but not Date, Array, or null)
    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && value.constructor === Object) {
      // Check if it has operator keys (starts with $)
      const hasOperators = Object.keys(value).some(k => k.startsWith('$'));
      
      if (hasOperators) {
        if (value.$gte !== undefined) {
          query = query.gte(key, value.$gte);
        }
        if (value.$lte !== undefined) {
          query = query.lte(key, value.$lte);
        }
        if (value.$gt !== undefined) {
          query = query.gt(key, value.$gt);
        }
        if (value.$lt !== undefined) {
          query = query.lt(key, value.$lt);
        }
        if (value.$eq !== undefined) {
          query = query.eq(key, value.$eq);
        }
        if (value.$ne !== undefined) {
          query = query.neq(key, value.$ne);
        }
        if (value.$in !== undefined && Array.isArray(value.$in)) {
          query = query.in(key, value.$in);
        }
      } else {
        // It's a plain object (like JSONB), use equality
        query = query.eq(key, value);
      }
    } else {
      // Simple equality filter
      query = query.eq(key, value);
    }
  }
  return query;
}

// Generic entity class
class SupabaseEntity {
  constructor(tableName, { beforeSend = null, afterReceive = null } = {}) {
    this.tableName = tableName;
    this.beforeSend = beforeSend;
    this.afterReceive = afterReceive;
  }

  transformOutbound(data) {
    if (typeof this.beforeSend === 'function' && data) {
      return this.beforeSend({ ...data });
    }
    return data;
  }

  transformInbound(record) {
    if (typeof this.afterReceive === 'function' && record) {
      return this.afterReceive({ ...record });
    }
    return record;
  }

  async list(sort = null, limit = null) {
    try {
      // Debug: Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      console.log(`[${this.tableName}] Query - Session exists:`, !!session, 'User ID:', session?.user?.id);
      
      let query = supabase.from(this.tableName).select('*');

      // Apply sorting
      if (sort) {
        const sortOrder = parseSortOrder(sort);
        if (sortOrder) {
          query = query.order(sortOrder.column, { ascending: sortOrder.ascending });
        }
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      
      // Debug: Log query results
      console.log(`[${this.tableName}] Query result:`, {
        count: data?.length || 0,
        error: error?.message,
        errorDetails: error
      });
      
      if (error) throw error;
      const records = data || [];
      return records.map((item) => this.transformInbound(item));
    } catch (error) {
      console.error(`Error listing ${this.tableName}:`, error);
      throw error;
    }
  }

  async filter(filters = {}, sort = null, limit = null) {
    try {
      let query = supabase.from(this.tableName).select('*');

      // Apply filters
      query = buildFilterQuery(query, filters);

      // Apply sorting
      if (sort) {
        const sortOrder = parseSortOrder(sort);
        if (sortOrder) {
          query = query.order(sortOrder.column, { ascending: sortOrder.ascending });
        }
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      const records = data || [];
      return records.map((item) => this.transformInbound(item));
    } catch (error) {
      console.error(`Error filtering ${this.tableName}:`, error);
      throw error;
    }
  }

  async get(id) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return this.transformInbound(data);
    } catch (error) {
      console.error(`Error getting ${this.tableName}:`, error);
      throw error;
    }
  }

  async create(data) {
    try {
      const { data: result, error } = await supabase
        .from(this.tableName)
        .insert(this.transformOutbound(data))
        .select()
        .single();

      if (error) throw error;
      return this.transformInbound(result);
    } catch (error) {
      console.error(`Error creating ${this.tableName}:`, error);
      throw error;
    }
  }

  async bulkCreate(items) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(items.map((item) => this.transformOutbound(item)))
        .select();

      if (error) throw error;
      const records = data || [];
      return records.map((item) => this.transformInbound(item));
    } catch (error) {
      console.error(`Error bulk creating ${this.tableName}:`, error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      const { data: result, error } = await supabase
        .from(this.tableName)
        .update(this.transformOutbound(data))
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return this.transformInbound(result);
    } catch (error) {
      console.error(`Error updating ${this.tableName}:`, error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error(`Error deleting ${this.tableName}:`, error);
      throw error;
    }
  }
}

// Export entity instances
export const Agency = new SupabaseEntity('agencies');
export const Staff = new SupabaseEntity('staff');
export const Client = new SupabaseEntity('clients', {
  beforeSend: (payload) => {
    const data = { ...payload };
    if (data.billing_email) {
      data.contact_person = {
        ...(data.contact_person || {}),
        billing_email: data.billing_email,
      };
    }
    delete data.billing_email;
    return data;
  },
  afterReceive: (record) => {
    const contact = record?.contact_person || {};
    return {
      ...record,
      billing_email:
        record.billing_email ||
        contact.billing_email ||
        contact.email ||
        null,
    };
  },
});
export const Shift = new SupabaseEntity('shifts');
export const Booking = new SupabaseEntity('bookings');
export const Timesheet = new SupabaseEntity('timesheets');
export const Invoice = new SupabaseEntity('invoices');
export const Payslip = new SupabaseEntity('payslips');
export const Compliance = new SupabaseEntity('compliance');
export const Group = new SupabaseEntity('groups');
export const AdminWorkflow = new SupabaseEntity('admin_workflows');
export const ChangeLog = new SupabaseEntity('change_logs');
export const OperationalCost = new SupabaseEntity('operational_costs');
export const InvoiceAmendment = new SupabaseEntity('invoice_amendments');
export const NotificationQueue = new SupabaseEntity('notification_queue');
export const AgencyAdminInvitation = new SupabaseEntity('agency_admin_invitations');

