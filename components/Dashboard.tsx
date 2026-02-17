
import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, ComposedChart, Line, Legend
} from 'recharts';
import { DollarSign, FileText, Activity, Users, TrendingUp, TrendingDown, Bell, AlertTriangle, Calendar, CheckCircle, ArrowUpRight, Zap, Sparkles, Loader2 } from 'lucide-react';
import { getContracts, getInvoices, getBillboards, getClients, getExpiringContracts, getOverdueInvoices, getUpcomingBillings, getFinancialTrends, subscribe, pullAllDataFromSupabase, isSupabaseSynced, getCurrentUserName } from '../services/mockData';
import { BillboardType } from '../types';
import { isSupabaseConfigured } from '../services/authService';

interface AIInsight {
  title: string;
  description: string;
  icon: 'trending' | 'warning' | 'tip';
}

export const Dashboard: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const currentUser = getCurrentUserName();

  // Generate AI insights using Groq
  const generateAIInsights = async (metrics: any) => {
    setLoadingAI(true);
    try {
      const GROQ_API_KEY = (window as any).process?.env?.GROQ_API_KEY || process.env.GROQ_API_KEY;
      if (!GROQ_API_KEY) {
        setLoadingAI(false);
        return;
      }

      const prompt = `You are a billboard advertising business analyst. Based on these metrics, provide 3 concise business insights in JSON format:
- Total Revenue: ${metrics.totalRevenue.toLocaleString()}
- Collection Rate: ${metrics.collectionRate}%
- Digital Occupancy Rate: ${metrics.digitalOccupancyRate}% (LED)
- Static Occupancy Rate: ${metrics.staticOccupancyRate}% (Billboards)
- Active Contracts: ${metrics.activeContracts}
- Overdue Invoices: ${metrics.overdueCount}
- Expiring Soon: ${metrics.expiringCount}

Respond with ONLY valid JSON array with 3 objects, each having: {"title": "...", "description": "...", "icon": "trending|warning|tip"}
Example: [{"title":"Strong","description":"msg","icon":"trending"}]`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 300,
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          try {
            const insights = JSON.parse(text);
            setAiInsights(Array.isArray(insights) ? insights.slice(0, 3) : []);
          } catch (e) {
            console.error('Failed to parse AI insights:', e);
          }
        }
      }
    } catch (error) {
      console.error('AI Insights error:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  // Helper to get monthly revenue breakdown
  const getMonthlyRevenueBreakdown = () => {
    const monthlyData: any = {};
    invoices.forEach(inv => {
      if (inv.type === 'Invoice') {
        const date = new Date(inv.date || inv.createdAt);
        const monthKey = date.toLocaleString('default', { month: 'short' });
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + inv.total;
      }
    });
    return Object.entries(monthlyData)
      .slice(-6)
      .map(([month, revenue]) => ({ month, revenue: revenue as number }));
  };

  // Helper to get top clients by revenue
  const getTopClientsByRevenue = () => {
    const clientRevenue: any = {};
    invoices.forEach(inv => {
      if (inv.type === 'Invoice') {
        const clientName = getClientName(inv.clientId);
        clientRevenue[clientName] = (clientRevenue[clientName] || 0) + inv.total;
      }
    });
    return Object.entries(clientRevenue)
      .map(([name, revenue]) => ({ name, revenue: revenue as number }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  // Helper to get client name
  const getClientName = (id: string) => clients.find(c => c.id === id)?.companyName || 'Unknown';

  // Get occupancy trend for both Digital and Static
  const getOccupancyTrend = () => {
    const days: any = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = date.toLocaleString('default', { month: 'short', day: 'numeric' });
      // Simulate trend (in real app, fetch historical data)
      days[dayKey] = {
        digital: digitalOccupancyRate - (Math.random() * 10),
        static: staticOccupancyRate - (Math.random() * 8)
      };
    }
    return Object.entries(days).map(([day, rates]: [string, any]) => ({ 
      day, 
      digital: Math.round(Math.max(0, rates.digital)),
      static: Math.round(Math.max(0, rates.static))
    }));
  };

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

  // Separate occupancy rates for Digital (LED) and Static inventory
  const digitalOccupancyRate = totalLedSlots > 0 ? Math.round((rentedLedSlots / totalLedSlots) * 100) : 0;
  const staticOccupancyRate = totalStaticSides > 0 ? Math.round((rentedStaticSides / totalStaticSides) * 100) : 0;
  const totalUnits = totalLedSlots + totalStaticSides;
  const rentedUnits = rentedLedSlots + rentedStaticSides;
  const occupancyRate = totalUnits > 0 ? Math.round((rentedUnits / totalUnits) * 100) : 0;
  const collectionRate = totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0;

  // Generate dashboard data
  const monthlyRevenue = getMonthlyRevenueBreakdown();
  const topClients = getTopClientsByRevenue();
  const occupancyTrend = getOccupancyTrend();

  // Generate AI insights on mount and data changes
  useEffect(() => {
    generateAIInsights({
      totalRevenue,
      collectionRate,
      digitalOccupancyRate,
      staticOccupancyRate,
      activeContracts,
      overdueCount: overdueInvoices.length,
      expiringCount: expiringContracts.length
    });
  }, [refreshKey]);

  const alertCount = expiringContracts.length + overdueInvoices.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back{currentUser ? `, ${currentUser.split(' ')[0]}` : ''}
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{rentedLedSlots}/{totalLedSlots}</span>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Digital (LED)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{digitalOccupancyRate}%</p>
          <p className="text-xs text-slate-400 mt-1">{totalLedSlots - rentedLedSlots} slots available</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{rentedStaticSides}/{totalStaticSides}</span>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Static (Billboard)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{staticOccupancyRate}%</p>
          <p className="text-xs text-slate-400 mt-1">{totalStaticSides - rentedStaticSides} sides available</p>
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

      {/* Revenue Analytics & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Revenue Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-900">Monthly Revenue</h3>
              <p className="text-xs text-slate-500 mt-0.5">Last 6 months</p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} formatter={(value: any) => `$${value.toLocaleString()}`} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Clients by Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-900">Top Clients</h3>
              <p className="text-xs text-slate-500 mt-0.5">By total revenue</p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topClients} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} width={100} />
                <Tooltip contentStyle={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} formatter={(value: any) => `$${value.toLocaleString()}`} />
                <Bar dataKey="revenue" fill="#10b981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy Trend - Dual View */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-900">Occupancy Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">Digital vs Static (Last 7 days)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500"></span> Digital</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Static</span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={occupancyTrend}>
                <defs>
                  <linearGradient id="digitalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="staticGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} formatter={(value: any) => `${value}%`} />
                <Area type="monotone" dataKey="digital" stroke="#6366f1" strokeWidth={2} fill="url(#digitalGradient)" name="Digital" />
                <Area type="monotone" dataKey="static" stroke="#f59e0b" strokeWidth={2} fill="url(#staticGradient)" name="Static" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 p-6 rounded-2xl border border-violet-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">AI Insights</h3>
                <p className="text-xs text-violet-600">Powered by Groq</p>
              </div>
            </div>
            {loadingAI && <Loader2 size={16} className="text-violet-500 animate-spin" />}
          </div>
          <div className="space-y-3">
            {loadingAI && aiInsights.length === 0 ? (
              <div className="text-center py-8">
                <Loader2 size={24} className="text-violet-500 animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-600">Analyzing your data...</p>
              </div>
            ) : aiInsights.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-600">No insights available</p>
                <p className="text-xs text-slate-400 mt-1">Configure GROQ_API_KEY to enable AI</p>
              </div>
            ) : (
              aiInsights.map((insight, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border border-violet-100">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      insight.icon === 'trending' ? 'bg-emerald-100 text-emerald-600' :
                      insight.icon === 'warning' ? 'bg-amber-100 text-amber-600' :
                      'bg-indigo-100 text-indigo-600'
                    }`}>
                      {insight.icon === 'trending' ? <TrendingUp size={16} /> :
                       insight.icon === 'warning' ? <AlertTriangle size={16} /> :
                       <Zap size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{insight.title}</p>
                      <p className="text-xs text-slate-600 mt-1">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))
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

        {/* Fleet Status - Dual Donut Charts */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60">
          <h3 className="font-semibold text-slate-900 mb-4">Fleet Status</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Digital (LED) */}
            <div className="text-center">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Digital (LED)</p>
              <div className="h-32 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[{ name: 'Occupied', value: rentedLedSlots }, { name: 'Available', value: totalLedSlots - rentedLedSlots }]}
                      cx="50%" cy="50%"
                      innerRadius={35} outerRadius={50}
                      startAngle={90} endAngle={-270}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#6366f1" />
                      <Cell fill="#e2e8f0" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-slate-900">{digitalOccupancyRate}%</span>
                </div>
              </div>
              <div className="flex justify-center gap-3 mt-1 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> {rentedLedSlots}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-200"></span> {totalLedSlots - rentedLedSlots}</span>
              </div>
            </div>
            {/* Static */}
            <div className="text-center">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Static</p>
              <div className="h-32 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[{ name: 'Occupied', value: rentedStaticSides }, { name: 'Available', value: totalStaticSides - rentedStaticSides }]}
                      cx="50%" cy="50%"
                      innerRadius={35} outerRadius={50}
                      startAngle={90} endAngle={-270}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#f59e0b" />
                      <Cell fill="#e2e8f0" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-slate-900">{staticOccupancyRate}%</span>
                </div>
              </div>
              <div className="flex justify-center gap-3 mt-1 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> {rentedStaticSides}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-200"></span> {totalStaticSides - rentedStaticSides}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl text-white">
          <h3 className="font-semibold mb-4">Inventory Breakdown</h3>
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
              <span className="text-sm text-slate-400">Static Sides (Total)</span>
              <span className="font-semibold">{totalStaticSides}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">LED Slots (Total)</span>
              <span className="font-semibold">{totalLedSlots}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-700">
              <span className="text-sm text-slate-400">Static Occupancy</span>
              <span className="font-semibold text-amber-400">{staticOccupancyRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Digital Occupancy</span>
              <span className="font-semibold text-indigo-400">{digitalOccupancyRate}%</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-700">
              <span className="text-sm text-slate-400">Collection Rate</span>
              <span className="font-semibold text-emerald-400">{collectionRate}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};