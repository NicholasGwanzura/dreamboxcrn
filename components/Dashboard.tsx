
import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, ComposedChart, Line
} from 'recharts';
import { DollarSign, FileText, Activity, Users, TrendingUp, TrendingDown, Bell, AlertTriangle, Calendar, CheckCircle, ArrowUpRight, Zap } from 'lucide-react';
import { getContracts, getInvoices, getBillboards, getClients, getExpiringContracts, getOverdueInvoices, getUpcomingBillings, getFinancialTrends, subscribe, pullAllDataFromSupabase, isSupabaseSynced } from '../services/mockData';
import { BillboardType } from '../types';
import { getCurrentUser, isSupabaseConfigured } from '../services/authService';

export const Dashboard: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const currentUser = getCurrentUser();

  useEffect(() => {
      const ensureData = async () => {
          if (isSupabaseConfigured() && !isSupabaseSynced()) {
              await pullAllDataFromSupabase();
          }
          setIsLoading(false);
      };
      ensureData();
  }, []);

  useEffect(() => {
      const unsubscribe = subscribe(() => setRefreshKey(prev => prev + 1));
      return () => { unsubscribe(); };
  }, []);

  const contracts = getContracts();
  const invoices = getInvoices();
  const billboards = getBillboards();
  const clients = getClients();
  const expiringContracts = getExpiringContracts();
  const overdueInvoices = getOverdueInvoices();
  const upcomingBillings = getUpcomingBillings().slice(0, 5);
  const financialTrends = getFinancialTrends();

  const totalRevenue = invoices.filter(i => i.type === 'Invoice').reduce((acc, curr) => acc + curr.total, 0);
  const paidRevenue = invoices.filter(i => i.type === 'Invoice' && i.status === 'Paid').reduce((acc, curr) => acc + curr.total, 0);
  const activeContracts = contracts.filter(c => c.status === 'Active').length;
  
  const ledBillboards = billboards.filter(b => b.type === BillboardType.LED);
  const totalLedSlots = ledBillboards.reduce((acc, b) => acc + (b.totalSlots || 0), 0);
  const rentedLedSlots = ledBillboards.reduce((acc, b) => acc + (b.rentedSlots || 0), 0);
  
  const staticBillboards = billboards.filter(b => b.type === BillboardType.Static);
  const totalStaticSides = staticBillboards.length * 2;
  const rentedStaticSides = staticBillboards.reduce((acc, b) => {
    let count = 0;
    if (b.sideAStatus === 'Rented') count++;
    if (b.sideBStatus === 'Rented') count++;
    return acc + count;
  }, 0);

  const totalUnits = totalLedSlots + totalStaticSides;
  const rentedUnits = rentedLedSlots + rentedStaticSides;
  const occupancyRate = totalUnits > 0 ? Math.round((rentedUnits / totalUnits) * 100) : 0;

  const getClientName = (id: string) => clients.find(c => c.id === id)?.companyName || 'Unknown';

  const alertCount = expiringContracts.length + overdueInvoices.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back{currentUser?.firstName ? `, ${currentUser.firstName}` : ''}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Here's what's happening with your billboard network</p>
        </div>
        {alertCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
            <Bell size={16} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">{alertCount} action{alertCount > 1 ? 's' : ''} needed</span>
          </div>
        )}
      </div>

      {/* KPI Cards - Compact Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">
              <TrendingUp size={12}/> 12%
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Revenue</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">${totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">${paidRevenue.toLocaleString()} collected</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{contracts.length} total</span>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Contracts</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{activeContracts}</p>
          <p className="text-xs text-slate-400 mt-1">{expiringContracts.length} expiring soon</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-violet-600" />
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{rentedUnits}/{totalUnits}</span>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Occupancy</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{occupancyRate}%</p>
          <p className="text-xs text-slate-400 mt-1">{totalUnits - rentedUnits} slots available</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">
              <TrendingUp size={12}/> New
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Clients</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{clients.length}</p>
          <p className="text-xs text-slate-400 mt-1">{clients.filter(c => c.status === 'Active').length} active</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Financial Chart - Spans 2 cols */}
        <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/60">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-900">Financial Overview</h3>
              <p className="text-xs text-slate-500 mt-0.5">Revenue & margin trends</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-800"></span> Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Margin</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={financialTrends}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e293b" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#1e293b" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip contentStyle={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="revenue" fill="url(#revenueGrad)" radius={[4, 4, 0, 0]} barSize={32} />
                <Line type="monotone" dataKey="margin" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Alerts</h3>
            <span className="text-xs text-slate-400">{alertCount} pending</span>
          </div>
          
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {alertCount === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={20} className="text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-slate-600">All clear!</p>
                <p className="text-xs text-slate-400">No pending alerts</p>
              </div>
            ) : (
              <>
                {overdueInvoices.slice(0, 3).map(inv => (
                  <div key={inv.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
                      <AlertTriangle size={14} className="text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{getClientName(inv.clientId)}</p>
                      <p className="text-xs text-red-600">Overdue: ${inv.total.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {expiringContracts.slice(0, 3).map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
                      <Calendar size={14} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{getClientName(c.clientId)}</p>
                      <p className="text-xs text-amber-600">Expires: {c.endDate}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upcoming Collections */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Upcoming Collections</h3>
            <Zap size={16} className="text-indigo-500" />
          </div>
          <div className="space-y-3">
            {upcomingBillings.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No upcoming billings</p>
            ) : (
              upcomingBillings.map((bill, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{bill.clientName}</p>
                    <p className="text-xs text-slate-400">{bill.date}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">${bill.amount.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Occupancy Donut */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60">
          <h3 className="font-semibold text-slate-900 mb-4">Fleet Status</h3>
          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ name: 'Occupied', value: rentedUnits }, { name: 'Available', value: totalUnits - rentedUnits }]}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={80}
                  startAngle={90} endAngle={-270}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                >
                  <Cell fill="#6366f1" />
                  <Cell fill="#e2e8f0" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-900">{occupancyRate}%</span>
              <span className="text-xs text-slate-400">Occupied</span>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-2 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Rented ({rentedUnits})</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-200"></span> Available ({totalUnits - rentedUnits})</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl text-white">
          <h3 className="font-semibold mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Static Billboards</span>
              <span className="font-semibold">{staticBillboards.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">LED Billboards</span>
              <span className="font-semibold">{ledBillboards.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Total Slots/Sides</span>
              <span className="font-semibold">{totalUnits}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Pending Invoices</span>
              <span className="font-semibold text-amber-400">{invoices.filter(i => i.status === 'Pending').length}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-700">
              <span className="text-sm text-slate-400">Collection Rate</span>
              <span className="font-semibold text-emerald-400">{totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};