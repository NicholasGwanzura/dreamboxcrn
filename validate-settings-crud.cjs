/**
 * Settings Module CRUD Validation Script
 * Verifies 100% CRUD coverage with Supabase sync for all Settings entities
 */

const fs = require('fs');

console.log('\n🔍 SETTINGS MODULE CRUD AUDIT\n');
console.log('=' .repeat(60));

const mockDataContent = fs.readFileSync('./services/mockData.ts', 'utf-8');

// Define Settings entities to audit
const settingsEntities = [
    {
        name: 'Company Profile',
        table: 'company_profile',
        operations: {
            create: ['createCompanyProfile'],
            read: ['getCompanyProfile'],
            update: ['updateCompanyProfile'],
            delete: ['resetCompanyProfile'] // Reset is equivalent to delete for single-record entity
        }
    },
    {
        name: 'Company Logo',
        table: 'company_profile', // Stored in same table
        operations: {
            create: ['setCompanyLogo'], // Initial set
            read: ['getCompanyLogo'],
            update: ['setCompanyLogo'],
            delete: ['resetCompanyLogo']
        }
    },
    {
        name: 'Users',
        table: 'users',
        operations: {
            create: ['addUser'],
            read: ['getUsers'],
            update: ['updateUser'],
            delete: ['deleteUser']
        }
    }
];

let totalOperations = 0;
let implementedOperations = 0;
let syncedOperations = 0;

settingsEntities.forEach(entity => {
    console.log(`\n📊 ${entity.name} (Table: ${entity.table})`);
    console.log('-'.repeat(60));
    
    ['create', 'read', 'update', 'delete'].forEach(op => {
        const functions = entity.operations[op] || [];
        functions.forEach(funcName => {
            totalOperations++;
            
            // Check if function exists
            const functionPattern = new RegExp(`export const ${funcName}\\s*=`, 'g');
            const exists = functionPattern.test(mockDataContent);
            
            if (exists) {
                implementedOperations++;
                
                // Check for Supabase sync (except for READ operations)
                if (op !== 'read') {
                    const funcContent = mockDataContent.substring(
                        mockDataContent.indexOf(`export const ${funcName}`),
                        mockDataContent.indexOf(`export const ${funcName}`) + 500
                    );
                    
                    const hasSync = funcContent.includes('syncToSupabase') || 
                                   funcContent.includes('queueForDeletion');
                    
                    if (hasSync) {
                        syncedOperations++;
                        console.log(`  ✅ ${op.toUpperCase()}: ${funcName}() - IMPLEMENTED + SUPABASE SYNC`);
                    } else {
                        console.log(`  ⚠️  ${op.toUpperCase()}: ${funcName}() - IMPLEMENTED (No Supabase sync)`);
                    }
                } else {
                    console.log(`  ✅ ${op.toUpperCase()}: ${funcName}() - IMPLEMENTED`);
                }
            } else {
                console.log(`  ❌ ${op.toUpperCase()}: ${funcName}() - MISSING`);
            }
        });
    });
});

console.log('\n' + '='.repeat(60));
console.log('\n📈 SETTINGS MODULE CRUD COVERAGE SUMMARY');
console.log('='.repeat(60));

const crudPercentage = ((implementedOperations / totalOperations) * 100).toFixed(1);
const syncPercentage = ((syncedOperations / (totalOperations - settingsEntities.reduce((acc, e) => acc + (e.operations.read?.length || 0), 0))) * 100).toFixed(1);

console.log(`\n  Total CRUD Operations:     ${totalOperations}`);
console.log(`  Implemented:               ${implementedOperations} ✅`);
console.log(`  Missing:                   ${totalOperations - implementedOperations} ❌`);
console.log(`  \n  CRUD Coverage:             ${crudPercentage}% ${crudPercentage === '100.0' ? '🎉' : '⚠️'}`);
console.log(`  Supabase Sync Coverage:    ${syncPercentage}% ${syncPercentage === '100.0' ? '🎉' : '⚠️'}`);

console.log('\n' + '='.repeat(60));

if (crudPercentage === '100.0' && syncPercentage === '100.0') {
    console.log('\n✅ SUCCESS: 100% CRUD Coverage with Full Supabase Sync!');
    console.log('   All Settings entities have complete CRUD operations.\n');
    process.exit(0);
} else {
    console.log('\n⚠️  WARNING: Incomplete CRUD implementation detected.');
    console.log('   Please implement missing operations for production readiness.\n');
    process.exit(1);
}
