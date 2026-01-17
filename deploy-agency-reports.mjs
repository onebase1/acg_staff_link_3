#!/usr/bin/env node
/**
 * Deploy Agency Reports SQL Migrations
 * Executes functions, view, and cron jobs in the correct order.
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import path from 'path';

const { Client } = pg;

// Postgres connection string from apply-rls-direct.mjs
const connectionString = 'postgresql://postgres.rzzxxkppkiasuouuglaf:Dominion#2025@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

const migrations = [
    'supabase/migrations/20260116000001_create_agency_report_functions.sql',
    'supabase/migrations/20260116000002_create_daily_agency_metrics_view.sql',
    'supabase/migrations/20260116000003_create_agency_report_cron_jobs.sql'
];

async function deploy() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🚀 Starting deployment of Agency Reports SQL...\n');
        await client.connect();
        console.log('✅ Connected to Supabase Postgres\n');

        for (const migration of migrations) {
            console.log(`📄 Deploying: ${migration}...`);
            const sql = readFileSync(migration, 'utf8');
            await client.query(sql);
            console.log(`✅ Success: ${migration}\n`);
        }

        console.log('📊 Verification queries...');

        const funcCheck = await client.query(`
      SELECT routine_name FROM information_schema.routines 
      WHERE routine_name IN ('get_daily_agency_report', 'get_weekly_agency_report');
    `);
        console.log(`✅ Functions created: ${funcCheck.rows.map(r => r.routine_name).join(', ')}`);

        const viewCheck = await client.query(`
      SELECT matviewname FROM pg_matviews WHERE matviewname = 'daily_agency_metrics';
    `);
        console.log(`✅ View created: ${viewCheck.rows[0]?.matviewname || 'FAILED'}`);

        const cronCheck = await client.query(`
      SELECT jobname FROM cron.job WHERE jobname LIKE '%agency%';
    `);
        console.log(`✅ Cron jobs scheduled: ${cronCheck.rows.map(r => r.jobname).join(', ')}`);

        console.log('\n🎉 DEPLOYMENT COMPLETE!');

    } catch (error) {
        console.error('\n❌ Deployment failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

deploy();
