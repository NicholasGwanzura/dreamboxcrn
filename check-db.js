import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iiphiigaksyshionjhmt.supabase.co',
  'sb_publishable_ECtk9UIokpPYAwI5eb7lGA_s7YtRSk4'
);

const tables = [
  'billboards',
  'clients',
  'contracts',
  'invoices',
  'expenses',
  'users',
  'tasks',
  'maintenance_logs',
  'outsourced_billboards',
  'printing_jobs'
];

async function checkDatabase() {
  console.log('\n📊 SUPABASE DATABASE AUDIT\n');
  console.log('=' .repeat(50));
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table.padEnd(25)}: ERROR - ${error.message}`);
      } else {
        console.log(`✅ ${table.padEnd(25)}: ${count || 0} records`);
      }
    } catch (e) {
      console.log(`❌ ${table.padEnd(25)}: EXCEPTION - ${e.message}`);
    }
  }
  
  console.log('=' .repeat(50));
  console.log('\n');
}

checkDatabase().catch(console.error);
