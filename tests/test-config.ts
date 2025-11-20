import { config } from 'dotenv';

// Load environment variables from .env file
config();

export const TEST_CONFIG = {
  dominion: {
    email: 'info@agilecaremanagement.co.uk',
    password: 'Dominion#2025',
    agency_name: 'Dominion Healthcare Services Ltd'
  },
  staff: {
    email: process.env.TEST_STAFF_EMAIL || 'g.basera5+chadaira@gmail.com',
    password: process.env.TEST_STAFF_PASSWORD || 'Broadband@123'
  },
  supabase: {
    url: process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co',
    key: process.env.VITE_SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || ''
  },
  app: {
    baseUrl: process.env.BASE_URL || 'http://localhost:5173'
  },
  timeouts: {
    short: 5000,
    medium: 15000,
    long: 30000
  }
};

// Validate configuration
if (!TEST_CONFIG.supabase.url || TEST_CONFIG.supabase.url === 'https://your-project.supabase.co') {
  throw new Error('VITE_SUPABASE_URL is not set in .env file');
}

if (!TEST_CONFIG.supabase.key) {
  throw new Error('VITE_SUPABASE_ANON_KEY is not set in .env file');
}

export const SEEDED_DATA = {
  clients: [
    'Divine Care Center',
    'Heavenly Home',
    'Grace Manor',
    'Blessed Living',
    'Peaceful Care',
    'Serenity House'
  ],
  staff: [
    'Linda Williams',
    'James Taylor', 
    'Patricia Johnson',
    'Robert Brown',
    'Jennifer Davis',
    'Michael Wilson',
    'Elizabeth Moore',
    'David Anderson',
    'Susan Thomas',
    'Christopher Jackson'
  ]
};

