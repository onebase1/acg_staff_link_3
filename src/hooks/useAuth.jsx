// Re-export useAuth from AuthContext for convenience
export { useAuth } from '@/contexts/AuthContext';

// Also export auth methods for direct use
export { supabaseAuth as auth } from '@/api/supabaseAuth';


