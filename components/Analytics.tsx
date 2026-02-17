import React, { useState } from 'react';
import { getInvoices, getExpenses, printingJobs, outsourcedBillboards, getFinancialTrends, getBillboards } from '../services/mockData';
import { 
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend, ComposedChart, Line
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Activity, Layers, Zap, Download } from 'lucide-react';
import { BillboardType } from '../types';

type TimeRange = '3m' | '6m' | '12m';

export const Analytics: React.FC = () => {
    const [timeRange, setTimeRange] = useState<TimeRange>('6m');
    
    const billboards = getBillboards();
    const invoices = getInvoices();
    
    // Digital (LED) and Static inventory calculations
    const ledBillboards = billboards.filter(b => b.type === BillboardType.LED);
    const staticBillboards = billboards.filter(b => b.type === BillboardType.Static);
    
    const totalLedSlots = ledBillboards.reduce((acc, b) => acc + (b.totalSlots || 0), 0);
    const rentedLedSlots = ledBillboards.reduce((acc, b) => acc + (b.rentedSlots || 0), 0);
    const totalStaticSides = staticBillboards.length * 2;
    const rentedStaticSides = staticBillboards.reduce((acc, b) => {
        let count = 0;
        if (b.sideAStatus === 'Rented') count++;
        if (b.sideBStatus === 'Rented') count++;
        return acc + count;
    }, 0);
    
    const digitalOccupancyRate = totalLedSlots > 0 ? Math.round((rentedLedSlots / totalLedSlots) * 100) : 0;
    const staticOccupancyRate = totalStaticSides > 0 ? Math.round((rentedStaticSides / totalStaticSides) * 100) : 0;
    
    // Calculate revenue breakdown by inventory type
    // Map contracts to their billboard types to determine revenue source
    const contracts = invoices.filter(i => i.type === 'Invoice' && i.status === 'Paid');
    
    // 1. Calculate Revenue
    const totalRevenue = invoices
        .filter(i => i.type === 'Invoice')
        .reduce((acc, curr) => acc + curr.total, 0);
    
    const paidRevenue = invoices.filter(i => i.type === 'Invoice' && i.status === 'Paid').reduce((acc, curr) => acc + curr.total, 0);
    const pendingRevenue = invoices.filter(i => i.type === 'Invoice' && i.status === 'Pending').reduce((acc, curr) => acc + curr.total, 0);
    
    // 2. Calculate Expenses
    const operationalExpenses = getExpenses().reduce((acc, curr) => acc + curr.amount, 0);
    const printingExpenses = printingJobs.reduce((acc, curr) => acc + curr.totalCost, 0);
    const outsourcedPayouts = outsourcedBillboards.reduce((acc, curr) => acc + (curr.monthlyPayout * 12), 0);
    
    const totalExpenses = operationalExpenses + printingExpenses + outsourcedPayouts;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Digital vs Static Revenue estimation (based on inventory ratio)
    const totalInventory = totalLedSlots + totalStaticSides;
    const digitalRatio = totalLedSlots / totalInventory;
    const staticRatio = totalStaticSides / totalInventory;
    const estimatedDigitalRevenue = totalRevenue * digitalRatio;
    const estimatedStaticRevenue = totalRevenue * staticRatio;

    const expenseBreakdown = [
        { name: 'Operational', value: operationalExpenses },
        { name: 'Printing', value: printingExpenses },
        { name: 'Outsourced', value: outsourcedPayouts },
    ].filter(e => e.value > 0);

    // Inventory breakdown data
    const inventoryBreakdown = [
        { name: 'Digital (LED)', total: totalLedSlots, rented: rentedLedSlots, occupancy: digitalOccupancyRate, color: '#6366f1' },
        { name: 'Static', total: totalStaticSides, rented: rentedStaticSides, occupancy: staticOccupancyRate, color: '#f59e0b' },
    ];

    // Monthly revenue trend
    const monthlyData = getFinancialTrends().map(m => ({
        month: m.name,
        revenue: m.revenue,
        profit: m.margin,
        expenses: m.revenue - m.margin
    })).filter(d => !d.month.includes('Proj'));

    const COLORS = ['#ef4444', '#f59e0b', '#3b82f6'];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 mb-2">Analytics Dashboard</h2>
                    <p className="text-slate-500 font-medium">Financial performance & inventory analysis</p>
                </div>
                <div className="flex items-center gap-2">
                    {(['3m', '6m', '12m'] as TimeRange[]).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
                                timeRange === range 
                                ? 'bg-slate-900 text-white shadow-lg' 
                                : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            {/* Inventory Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Digital (LED) Card */}
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-2xl shadow-lg text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Zap size={24} className="text-white" />
                        </div>
                        <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">Digital</span>
                    </div>
                    <p className="text-indigo-100 text-sm font-medium mb-1">LED Billboard Inventory</p>
                    <h3 className="text-3xl font-bold text-white mb-4">{digitalOccupancyRate}% <span className="text-lg font-normal text-indigo-200">Occupied</span></h3>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                        <div>
                            <p className="text-xs text-indigo-200">Total Slots</p>
                            <p className="text-xl font-bold">{totalLedSlots}</p>
                        </div>
                        <div>
                            <p className="text-xs text-indigo-200">Available</p>
                            <p className="text-xl font-bold">{totalLedSlots - rentedLedSlots}</p>
                        </div>
                    </div>
                </div>

                {/* Static Card */}
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 rounded-2xl shadow-lg text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Layers size={24} className="text-white" />
                        </div>
                        <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">Static</span>
                    </div>
                    <p className="text-amber-100 text-sm font-medium mb-1">Static Billboard Inventory</p>
                    <h3 className="text-3xl font-bold text-white mb-4">{staticOccupancyRate}% <span className="text-lg font-normal text-amber-200">Occupied</span></h3>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                        <div>
                            <p className="text-xs text-amber-200">Total Sides</p>
                            <p className="text-xl font-bold">{totalStaticSides}</p>
                        </div>
                        <div>
                            <p className="text-xs text-amber-200">Available</p>
                            <p className="text-xl font-bold">{totalStaticSides - rentedStaticSides}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Scorecards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-emerald-600" />
                        </div>
                    </div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Revenue</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">${totalRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-amber-600" />
                        </div>
                    </div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending Revenue</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">${pendingRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                            <TrendingDown className="w-5 h-5 text-rose-600" />
                        </div>
                    </div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Expenses</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">${totalExpenses.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-white hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                        </div>
                    </div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Net Profit</p>
                    <p className="text-2xl font-bold text-white mt-1">${netProfit.toLocaleString()}</p>
                    <p className={`text-xs mt-1 ${profitMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>{profitMargin.toFixed(1)}% margin</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue & Profit Trend */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Revenue & Profit Trend</h3>
                            <p className="text-xs text-slate-500">Last 6 months performance</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-800"></span> Revenue</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Profit</span>
                        </div>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={monthlyData}>
                                <defs>
                                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#1e293b" stopOpacity={0.1}/>
                                        <stop offset="100%" stopColor="#1e293b" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(v) => `$${v/1000}k`} />
                                <Tooltip contentStyle={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} formatter={(value: any) => `$${value.toLocaleString()}`} />
                                <Bar dataKey="revenue" fill="url(#revenueGrad)" radius={[4, 4, 0, 0]} barSize={32} />
                                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Inventory Occupancy */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Inventory Occupancy</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={inventoryBreakdown} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} width={80} />
                                <Tooltip contentStyle={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} formatter={(value: any) => `${value}%`} />
                                <Bar dataKey="occupancy" radius={[0, 8, 8, 0]} barSize={24}>
                                    {inventoryBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                        {inventoryBreakdown.map((item) => (
                            <div key={item.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-slate-600">{item.name}</span>
                                </div>
                                <span className="font-bold text-slate-900">{item.total} total</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense Distribution */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Expense Distribution</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            {expenseBreakdown.length > 0 ? (
                                <PieChart>
                                    <Pie 
                                        data={expenseBreakdown} 
                                        dataKey="value" 
                                        cx="50%" cy="50%" 
                                        innerRadius={50} 
                                        outerRadius={80} 
                                        paddingAngle={5}
                                    >
                                        {expenseBreakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} formatter={(value: any) => `$${value.toLocaleString()}`} />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                </PieChart>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">No expenses recorded yet.</div>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revenue by Type */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Revenue by Inventory Type</h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                                    <span className="text-sm font-medium text-slate-700">Digital (LED)</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900">${Math.round(estimatedDigitalRevenue).toLocaleString()}</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${digitalRatio * 100}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                    <span className="text-sm font-medium text-slate-700">Static</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900">${Math.round(estimatedStaticRevenue).toLocaleString()}</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${staticRatio * 100}%` }}></div>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-500">Collection Rate</span>
                                <span className="text-lg font-bold text-emerald-600">{totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Reporting Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Monthly Performance Report</h3>
                        <p className="text-xs text-slate-500 mt-1">Detailed financial breakdown</p>
                    </div>
                    <button className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors uppercase tracking-wider">
                        <Download size={14} /> Export CSV
                    </button>
                </div>
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-bold text-xs uppercase text-slate-400 tracking-wider">Month</th>
                            <th className="px-6 py-4 font-bold text-xs uppercase text-slate-400 tracking-wider text-right">Revenue</th>
                            <th className="px-6 py-4 font-bold text-xs uppercase text-slate-400 tracking-wider text-right">Expenses</th>
                            <th className="px-6 py-4 font-bold text-xs uppercase text-slate-400 tracking-wider text-right">Net Profit</th>
                            <th className="px-6 py-4 font-bold text-xs uppercase text-slate-400 tracking-wider text-right">Margin</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {monthlyData.length > 0 ? monthlyData.map((data, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-800">{data.month}</td>
                                <td className="px-6 py-4 text-right font-medium">${data.revenue.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right font-medium">${data.expenses.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right font-bold text-green-600">${data.profit.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right">{data.revenue > 0 ? ((data.profit/data.revenue)*100).toFixed(1) : 0}%</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No data available for report.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
