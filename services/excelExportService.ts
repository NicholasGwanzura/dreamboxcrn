/**
 * Excel Export Service
 * Creates Excel workbooks from backup data with multiple sheets
 */

import * as XLSX from 'xlsx';

interface BackupData {
  billboards?: any[];
  clients?: any[];
  contracts?: any[];
  invoices?: any[];
  expenses?: any[];
  users?: any[];
  tasks?: any[];
  maintenance_logs?: any[];
  outsourced?: any[];
  printing?: any[];
  audit_logs?: any[];
  company_profile?: any;
}

/**
 * Create Excel backup with multiple sheets
 */
export const createExcelBackup = async (data: BackupData): Promise<Blob> => {
  const workbook = XLSX.utils.book_new();
  
  // Billboards Sheet
  if (data.billboards && data.billboards.length > 0) {
    const billboardsData = data.billboards.map(b => ({
      'ID': b.id,
      'Name': b.name,
      'Location': b.location,
      'Town': b.town,
      'Type': b.type,
      'Width (m)': b.width,
      'Height (m)': b.height,
      'Side A Status': b.sideAStatus || 'N/A',
      'Side B Status': b.sideBStatus || 'N/A',
      'Side A Rate': b.sideARate || 0,
      'Side B Rate': b.sideBRate || 0,
      'LED Rate/Slot': b.ratePerSlot || 0,
      'Total Slots': b.totalSlots || 0,
      'Rented Slots': b.rentedSlots || 0,
      'Daily Traffic': b.dailyTraffic || 0,
      'Last Maintenance': b.lastMaintenanceDate || 'Never',
      'Notes': b.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(billboardsData);
    XLSX.utils.book_append_sheet(workbook, ws, 'Billboards');
  }
  
  // Clients Sheet
  if (data.clients && data.clients.length > 0) {
    const clientsData = data.clients.map(c => ({
      'ID': c.id,
      'Company Name': c.companyName,
      'Contact Person': c.contactPerson,
      'Email': c.email,
      'Phone': c.phone,
      'Status': c.status,
      'Billing Day': c.billingDay || 1,
      'Notes': c.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(clientsData);
    XLSX.utils.book_append_sheet(workbook, ws, 'Clients');
  }
  
  // Contracts Sheet
  if (data.contracts && data.contracts.length > 0) {
    const contractsData = data.contracts.map(c => ({
      'ID': c.id,
      'Billboard ID': c.billboardId,
      'Client ID': c.clientId,
      'Start Date': c.startDate,
      'End Date': c.endDate,
      'Monthly Rate': c.monthlyRate,
      'Side': c.side || 'N/A',
      'Status': c.status,
      'Details': c.details || ''
    }));
    const ws = XLSX.utils.json_to_sheet(contractsData);
    XLSX.utils.book_append_sheet(workbook, ws, 'Contracts');
  }
  
  // Invoices Sheet
  if (data.invoices && data.invoices.length > 0) {
    const invoicesData = data.invoices.map(i => ({
      'ID': i.id,
      'Type': i.type,
      'Client ID': i.clientId,
      'Client Name': i.clientName,
      'Issue Date': i.issueDate,
      'Due Date': i.dueDate,
      'Subtotal': i.subtotal,
      'VAT': i.vat,
      'Total': i.total,
      'Status': i.status,
      'Currency': i.currency || 'USD'
    }));
    const ws = XLSX.utils.json_to_sheet(invoicesData);
    XLSX.utils.book_append_sheet(workbook, ws, 'Invoices');
  }
  
  // Expenses Sheet
  if (data.expenses && data.expenses.length > 0) {
    const expensesData = data.expenses.map(e => ({
      'ID': e.id,
      'Date': e.date,
      'Category': e.category,
      'Description': e.description,
      'Amount': e.amount,
      'Vendor': e.vendor || '',
      'Payment Method': e.paymentMethod || '',
      'Receipt': e.receipt ? 'Yes' : 'No'
    }));
    const ws = XLSX.utils.json_to_sheet(expensesData);
    XLSX.utils.book_append_sheet(workbook, ws, 'Expenses');
  }
  
  // Tasks Sheet
  if (data.tasks && data.tasks.length > 0) {
    const tasksData = data.tasks.map(t => ({
      'ID': t.id,
      'Title': t.title,
      'Description': t.description,
      'Priority': t.priority,
      'Status': t.status,
      'Assigned To': t.assignedTo || '',
      'Due Date': t.dueDate || '',
      'Created': t.createdAt || ''
    }));
    const ws = XLSX.utils.json_to_sheet(tasksData);
    XLSX.utils.book_append_sheet(workbook, ws, 'Tasks');
  }
  
  // Maintenance Logs Sheet
  if (data.maintenance_logs && data.maintenance_logs.length > 0) {
    const maintenanceData = data.maintenance_logs.map(m => ({
      'ID': m.id,
      'Billboard ID': m.billboardId,
      'Date': m.date,
      'Type': m.type,
      'Description': m.description,
      'Cost': m.cost,
      'Performed By': m.performedBy
    }));
    const ws = XLSX.utils.json_to_sheet(maintenanceData);
    XLSX.utils.book_append_sheet(workbook, ws, 'Maintenance');
  }
  
  // Users Sheet (sanitized - no passwords)
  if (data.users && data.users.length > 0) {
    const usersData = data.users.map(u => ({
      'ID': u.id,
      'Email': u.email,
      'First Name': u.firstName,
      'Last Name': u.lastName,
      'Username': u.username,
      'Role': u.role,
      'Status': u.status
    }));
    const ws = XLSX.utils.json_to_sheet(usersData);
    XLSX.utils.book_append_sheet(workbook, ws, 'Users');
  }
  
  // Audit Logs Sheet
  if (data.audit_logs && data.audit_logs.length > 0) {
    const logsData = data.audit_logs.slice(0, 500).map(l => ({ // Limit to last 500
      'ID': l.id,
      'Timestamp': l.timestamp,
      'Action': l.action,
      'Details': l.details,
      'User': l.user
    }));
    const ws = XLSX.utils.json_to_sheet(logsData);
    XLSX.utils.book_append_sheet(workbook, ws, 'Audit Log');
  }
  
  // Company Profile Sheet
  if (data.company_profile) {
    const profileData = [{
      'Field': 'Company Name',
      'Value': data.company_profile.name || ''
    }, {
      'Field': 'Email',
      'Value': data.company_profile.email || ''
    }, {
      'Field': 'Phone',
      'Value': data.company_profile.phone || ''
    }, {
      'Field': 'Address',
      'Value': data.company_profile.address || ''
    }, {
      'Field': 'City',
      'Value': data.company_profile.city || ''
    }, {
      'Field': 'Country',
      'Value': data.company_profile.country || ''
    }, {
      'Field': 'VAT Number',
      'Value': data.company_profile.vatNumber || ''
    }, {
      'Field': 'Registration Number',
      'Value': data.company_profile.regNumber || ''
    }, {
      'Field': 'Website',
      'Value': data.company_profile.website || ''
    }];
    const ws = XLSX.utils.json_to_sheet(profileData);
    XLSX.utils.book_append_sheet(workbook, ws, 'Company Profile');
  }
  
  // Summary Sheet
  const summaryData = [{
    'Category': 'Billboards',
    'Count': data.billboards?.length || 0
  }, {
    'Category': 'Clients',
    'Count': data.clients?.length || 0
  }, {
    'Category': 'Contracts',
    'Count': data.contracts?.length || 0
  }, {
    'Category': 'Invoices',
    'Count': data.invoices?.length || 0
  }, {
    'Category': 'Expenses',
    'Count': data.expenses?.length || 0
  }, {
    'Category': 'Tasks',
    'Count': data.tasks?.length || 0
  }, {
    'Category': 'Maintenance Logs',
    'Count': data.maintenance_logs?.length || 0
  }, {
    'Category': 'Users',
    'Count': data.users?.length || 0
  }, {
    'Category': 'Audit Logs',
    'Count': data.audit_logs?.length || 0
  }];
  
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summaryWs, 'Summary');
  
  // Generate binary
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
};

/**
 * Download Excel backup directly
 * @param providedData - Optional pre-fetched data, if not provided will fetch from localStorage
 */
export const downloadExcelBackup = async (providedData?: BackupData): Promise<boolean> => {
  try {
    // Use provided data or gather from localStorage
    const data: BackupData = providedData || {
      billboards: JSON.parse(localStorage.getItem('db_billboards') || '[]'),
      clients: JSON.parse(localStorage.getItem('db_clients') || '[]'),
      contracts: JSON.parse(localStorage.getItem('db_contracts') || '[]'),
      invoices: JSON.parse(localStorage.getItem('db_invoices') || '[]'),
      expenses: JSON.parse(localStorage.getItem('db_expenses') || '[]'),
      users: JSON.parse(localStorage.getItem('db_users') || '[]'),
      tasks: JSON.parse(localStorage.getItem('db_tasks') || '[]'),
      maintenance_logs: JSON.parse(localStorage.getItem('db_maintenance_logs') || '[]'),
      outsourced: JSON.parse(localStorage.getItem('db_outsourced') || '[]'),
      printing: JSON.parse(localStorage.getItem('db_printing') || '[]'),
      audit_logs: JSON.parse(localStorage.getItem('db_logs') || '[]'),
      company_profile: JSON.parse(localStorage.getItem('db_company_profile') || '{}')
    };
    
    const blob = await createExcelBackup(data);
    
    // Download
    const dateStr = new Date().toISOString().split('T')[0];
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dreambox-backup-${dateStr}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Excel export failed:', error);
    return false;
  }
};

/**
 * Export specific data to Excel (for individual modules)
 */
export const exportToExcel = async (
  data: any[],
  filename: string,
  sheetName: string = 'Data'
): Promise<boolean> => {
  try {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Excel export failed:', error);
    return false;
  }
};
