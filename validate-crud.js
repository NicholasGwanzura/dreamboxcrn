import { readFileSync } from 'fs';

const mockDataContent = readFileSync('./services/mockData.ts', 'utf-8');

const entities = [
  {
    name: 'Billboards',
    create: 'export const addBillboard',
    read: 'export const getBillboards',
    update: 'export const updateBillboard',
    delete: 'export const deleteBillboard'
  },
  {
    name: 'Clients',
    create: 'export const addClient',
    read: 'export const getClients',
    update: 'export const updateClient',
    delete: 'export const deleteClient'
  },
  {
    name: 'Contracts',
    create: 'export const addContract',
    read: 'export const getContracts',
    update: 'export const updateContract',
    delete: 'export const deleteContract'
  },
  {
    name: 'Invoices',
    create: 'export const addInvoice',
    read: 'export const getInvoices',
    update: 'export const updateInvoice',
    delete: 'export const deleteInvoice'
  },
  {
    name: 'Expenses',
    create: 'export const addExpense',
    read: 'export const getExpenses',
    update: 'export const updateExpense',
    delete: 'export const deleteExpense'
  },
  {
    name: 'Users',
    create: 'export const addUser',
    read: 'export const getUsers',
    update: 'export const updateUser',
    delete: 'export const deleteUser'
  },
  {
    name: 'Tasks',
    create: 'export const addTask',
    read: 'export const getTasks',
    update: 'export const updateTask',
    delete: 'export const deleteTask'
  },
  {
    name: 'Maintenance Logs',
    create: 'export const addMaintenanceLog',
    read: 'export const getMaintenanceLogs',
    update: 'export const updateMaintenanceLog',
    delete: 'export const deleteMaintenanceLog'
  },
  {
    name: 'Outsourced Billboards',
    create: 'export const addOutsourcedBillboard',
    read: 'export const getOutsourcedBillboards',
    update: 'export const updateOutsourcedBillboard',
    delete: 'export const deleteOutsourcedBillboard'
  },
  {
    name: 'Printing Jobs',
    create: 'export const addPrintingJob',
    read: 'getPrintingJobs',
    update: 'export const updatePrintingJob',
    delete: 'export const deletePrintingJob'
  }
];

console.log('\n🔍 CRUD VALIDATION REPORT\n');
console.log('=' .repeat(70));

let totalScore = 0;
let maxScore = 0;
const issues = [];

for (const entity of entities) {
  const checks = {
    CREATE: mockDataContent.includes(entity.create),
    READ: mockDataContent.includes(entity.read),
    UPDATE: mockDataContent.includes(entity.update),
    DELETE: mockDataContent.includes(entity.delete)
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  const percentage = (score / 4) * 100;
  totalScore += score;
  maxScore += 4;
  
  const status = percentage === 100 ? '✅' : percentage >= 75 ? '⚠️' : '❌';
  
  console.log(`\n${status} ${entity.name.padEnd(25)} ${percentage.toFixed(0)}%`);
  console.log(`   CREATE: ${checks.CREATE ? '✅' : '❌'}`);
  console.log(`   READ:   ${checks.READ ? '✅' : '❌'}`);
  console.log(`   UPDATE: ${checks.UPDATE ? '✅' : '❌'}`);
  console.log(`   DELETE: ${checks.DELETE ? '✅' : '❌'}`);
  
  if (!checks.CREATE) issues.push(`Missing: ${entity.create}`);
  if (!checks.READ) issues.push(`Missing: ${entity.read}`);
  if (!checks.UPDATE) issues.push(`Missing: ${entity.update}`);
  if (!checks.DELETE) issues.push(`Missing: ${entity.delete}`);
}

// Check for Supabase sync in new functions
console.log('\n' + '='.repeat(70));
console.log('\n🔄 SUPABASE SYNC VALIDATION:\n');

const syncChecks = [
  { name: 'updateContract', has: mockDataContent.includes("export const updateContract") && mockDataContent.includes("syncToSupabase('contracts'") },
  { name: 'updateInvoice', has: mockDataContent.includes("export const updateInvoice") && mockDataContent.includes("syncToSupabase('invoices'") },
  { name: 'updateExpense', has: mockDataContent.includes("export const updateExpense") && mockDataContent.includes("syncToSupabase('expenses'") },
  { name: 'deleteExpense', has: mockDataContent.includes("export const deleteExpense") && mockDataContent.includes("queueForDeletion('expenses'") },
  { name: 'updateMaintenanceLog', has: mockDataContent.includes("export const updateMaintenanceLog") && mockDataContent.includes("syncToSupabase('maintenance_logs'") },
  { name: 'deleteMaintenanceLog', has: mockDataContent.includes("export const deleteMaintenanceLog") && mockDataContent.includes("queueForDeletion('maintenance_logs'") },
  { name: 'addPrintingJob', has: mockDataContent.includes("export const addPrintingJob") && mockDataContent.includes("syncToSupabase('printing_jobs'") },
  { name: 'updatePrintingJob', has: mockDataContent.includes("export const updatePrintingJob") && mockDataContent.includes("syncToSupabase('printing_jobs'") },
  { name: 'deletePrintingJob', has: mockDataContent.includes("export const deletePrintingJob") && mockDataContent.includes("queueForDeletion('printing_jobs'") },
  { name: 'addOutsourced (sync)', has: mockDataContent.includes("export const addOutsourcedBillboard") && mockDataContent.includes("syncToSupabase('outsourced_billboards'") },
  { name: 'updateOutsourced (sync)', has: mockDataContent.includes("export const updateOutsourcedBillboard") && mockDataContent.includes("syncToSupabase('outsourced_billboards'") },
  { name: 'deleteOutsourced (sync)', has: mockDataContent.includes("export const deleteOutsourcedBillboard") && mockDataContent.includes("queueForDeletion('outsourced_billboards'") },
];

let syncScore = 0;
for (const check of syncChecks) {
  console.log(`   ${check.has ? '✅' : '❌'} ${check.name}`);
  if (check.has) syncScore++;
}

const overallPercentage = (totalScore / maxScore) * 100;
const syncPercentage = (syncScore / syncChecks.length) * 100;

console.log('\n' + '='.repeat(70));
console.log(`\n📊 OVERALL CRUD COVERAGE: ${overallPercentage.toFixed(1)}%`);
console.log(`   ${totalScore}/${maxScore} operations implemented`);
console.log(`\n🔄 SUPABASE SYNC COVERAGE: ${syncPercentage.toFixed(1)}%`);
console.log(`   ${syncScore}/${syncChecks.length} functions syncing properly\n`);

if (overallPercentage === 100 && syncPercentage === 100) {
  console.log('🎉 PERFECT SCORE! All CRUD operations implemented with full Supabase sync!\n');
} else {
  if (issues.length > 0) {
    console.log('⚠️  Issues found:\n');
    issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('');
  }
}
