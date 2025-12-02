/**
 * Client RBAC Service
 * Provides role-based access control for client portal users
 * 
 * Roles:
 * - OPERATIONS_MANAGER: Full access (create shifts, rate staff, view all)
 * - FINANCE_MANAGER: Billing access only (invoices, payments)
 * - FACILITY_COORDINATOR: Assigned shifts only (view + rate)
 * - VIEW_ONLY_CONTACT: Read-only access
 */

// Permission matrix for client roles
const ROLE_PERMISSIONS = {
    OPERATIONS_MANAGER: {
        shifts: {
            view: true,
            create: true,
            edit: true,
            cancel: true,
        },
        ratings: {
            view: true,
            create: true,
        },
        invoices: {
            view: true,
            pay: false, // Only FINANCE_MANAGER can pay
        },
        timesheets: {
            view: true,
            approve: true,
            reject: true,
        },
        dashboard: {
            view: true,
            analytics: true,
        },
        notifications: {
            view: true,
            manage_preferences: true,
        },
    },

    FINANCE_MANAGER: {
        shifts: {
            view: true, // Can view for context
            create: false,
            edit: false,
            cancel: false,
        },
        ratings: {
            view: false,
            create: false,
        },
        invoices: {
            view: true,
            pay: true,
            export: true,
        },
        timesheets: {
            view: true,
            approve: false, // Can view but not approve
            reject: false,
        },
        dashboard: {
            view: true,
            analytics: true, // Financial analytics only
        },
        notifications: {
            view: true,
            manage_preferences: true,
        },
    },

    FACILITY_COORDINATOR: {
        shifts: {
            view: 'assigned_only', // Only shifts assigned to their facility
            create: false,
            edit: false,
            cancel: false,
        },
        ratings: {
            view: 'assigned_only',
            create: 'assigned_only', // Can rate their shifts only
        },
        invoices: {
            view: false,
            pay: false,
        },
        timesheets: {
            view: 'assigned_only',
            approve: false,
            reject: false,
        },
        dashboard: {
            view: true,
            analytics: false, // Limited analytics
        },
        notifications: {
            view: true,
            manage_preferences: true,
        },
    },

    VIEW_ONLY_CONTACT: {
        shifts: {
            view: true,
            create: false,
            edit: false,
            cancel: false,
        },
        ratings: {
            view: true,
            create: false,
        },
        invoices: {
            view: true,
            pay: false,
        },
        timesheets: {
            view: true,
            approve: false,
            reject: false,
        },
        dashboard: {
            view: true,
            analytics: false,
        },
        notifications: {
            view: true,
            manage_preferences: true,
        },
    },
};

/**
 * Check if a user has a specific permission
 * @param {string} role - User's client role
 * @param {string} resource - Resource name (e.g., 'shifts', 'invoices')
 * @param {string} action - Action name (e.g., 'create', 'view')
 * @returns {boolean|string} - true/false or 'assigned_only'
 */
export function hasPermission(role, resource, action) {
    if (!role || !ROLE_PERMISSIONS[role]) {
        return false;
    }

    const permission = ROLE_PERMISSIONS[role][resource]?.[action];
    return permission !== undefined ? permission : false;
}

/**
 * Get all permissions for a role
 * @param {string} role - User's client role
 * @returns {object} - Permission object
 */
export function getRolePermissions(role) {
    return ROLE_PERMISSIONS[role] || {};
}

/**
 * Check if role can perform action on resource
 * @param {string} role - User's client role
 * @param {string} resource - Resource name
 * @param {string} action - Action name
 * @throws {Error} - If permission denied
 */
export function requirePermission(role, resource, action) {
    const hasAccess = hasPermission(role, resource, action);

    if (!hasAccess || hasAccess === 'assigned_only') {
        throw new Error(
            `Permission denied: ${role} cannot ${action} ${resource}. ` +
            `Required permission: ${resource}.${action}`
        );
    }
}

/**
 * Get user's client contact role from database
 * @param {object} supabase - Supabase client
 * @param {string} userId - Auth user ID
 * @returns {Promise<string|null>} - Role name or null
 */
export async function getUserClientRole(supabase, userId) {
    try {
        const { data, error } = await supabase
            .from('client_contacts')
            .select('role, is_active')
            .eq('profile_id', userId)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            console.warn('No client contact found for user:', userId);
            return null;
        }

        return data.role;
    } catch (error) {
        console.error('Error fetching user role:', error);
        return null;
    }
}

/**
 * Get full client contact record for user
 * @param {object} supabase - Supabase client
 * @param {string} userId - Auth user ID
 * @returns {Promise<object|null>} - Contact record or null
 */
export async function getUserClientContact(supabase, userId) {
    try {
        const { data, error } = await supabase
            .from('client_contacts')
            .select('*, clients(id, name, type)')
            .eq('profile_id', userId)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error fetching client contact:', error);
        return null;
    }
}

/**
 * Role hierarchy for inheritance
 * Higher roles can perform actions of lower roles
 */
const ROLE_HIERARCHY = {
    OPERATIONS_MANAGER: 4,
    FINANCE_MANAGER: 3,
    FACILITY_COORDINATOR: 2,
    VIEW_ONLY_CONTACT: 1,
};

/**
 * Check if user's role is at least the required role
 * @param {string} userRole - User's current role
 * @param {string} requiredRole - Minimum required role
 * @returns {boolean} - true if user role >= required role
 */
export function hasMinimumRole(userRole, requiredRole) {
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
    return userLevel >= requiredLevel;
}

export default {
    hasPermission,
    getRolePermissions,
    requirePermission,
    getUserClientRole,
    getUserClientContact,
    hasMinimumRole,
    ROLE_PERMISSIONS,
    ROLE_HIERARCHY,
};
