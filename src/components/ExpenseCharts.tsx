import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Expense, MonthBudgetConfig } from '../types';
import { CATEGORY_MAP } from '../data/categories';
import { formatCurrency, formatMonthKeyToName } from '../utils/formatters';
import { Calendar, PieChart as PieIcon, TrendingUp, BarChart3 } from 'lucide-react';

interface ExpenseChartsProps {
  currentMonthExpenses: Expense[];
  allExpenses: Expense[];
  monthKey: string;
  budgetConfig: MonthBudgetConfig;
}

export const ExpenseCharts: React.FC<ExpenseChartsProps> = ({
  currentMonthExpenses,
  allExpenses,
  monthKey,
  budgetConfig,
}) => {
  const [activeChartTab, setActiveChartTab] = useState<'velocity' | 'category' | 'history' | 'weekday'>('velocity');

  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  // 1. Prepare Daily Spending Velocity (Day 1 to Days in Month)
  const dailySpendMap: Record<number, number> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    dailySpendMap[d] = 0;
  }

  currentMonthExpenses.forEach((exp) => {
    const d = parseInt(exp.date.split('-')[2], 10);
    if (d >= 1 && d <= daysInMonth) {
      dailySpendMap[d] = (dailySpendMap[d] || 0) + exp.amount;
    }
  });

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const maxDayToPlot = isCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;

  let cumulativeActual = 0;
  const totalBudget: number = (Object.values(budgetConfig.categoryBudgets) as number[]).reduce((a: number, b: number) => a + b, 0);
  const dailyBudgetRate = totalBudget / daysInMonth;

  const velocityData = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dailySpend = dailySpendMap[d] || 0;
    if (d <= maxDayToPlot) {
      cumulativeActual += dailySpend;
    }

    velocityData.push({
      day: `Day ${d}`,
      dayNum: d,
      dailySpend: d <= maxDayToPlot ? dailySpend : null,
      actualSpend: d <= maxDayToPlot ? Math.round(cumulativeActual) : null,
      budgetTrajectory: Math.round(dailyBudgetRate * d),
    });
  }

  // 2. Prepare Category Donut Data
  const categorySpendMap: Record<string, number> = {};
  currentMonthExpenses.forEach((exp) => {
    categorySpendMap[exp.categoryId] = (categorySpendMap[exp.categoryId] || 0) + exp.amount;
  });

  const totalMonthSpend = Object.values(categorySpendMap).reduce((a, b) => a + b, 0);

  const categoryData = Object.entries(categorySpendMap)
    .map(([catId, amount]) => {
      const category = CATEGORY_MAP.get(catId as any);
      return {
        id: catId,
        name: category ? category.name : catId,
        amount: Math.round(amount * 100) / 100,
        color: category ? category.color : '#64748b',
        percentage: totalMonthSpend > 0 ? Math.round((amount / totalMonthSpend) * 100) : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // 3. Prepare Multi-Month History Comparison (Last 6 Months)
  const monthlyTotalsMap: Record<string, number> = {};
  allExpenses.forEach((exp) => {
    const mKey = exp.date.substring(0, 7);
    monthlyTotalsMap[mKey] = (monthlyTotalsMap[mKey] || 0) + exp.amount;
  });

  // Collect sorted list of months up to selected
  const allKnownMonthKeys = Array.from(
    new Set([...Object.keys(monthlyTotalsMap), monthKey])
  ).sort();

  const historyData = allKnownMonthKeys.slice(-6).map((mKey) => {
    const [y, m] = mKey.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    return {
      monthKey: mKey,
      monthName: label,
      spend: Math.round(monthlyTotalsMap[mKey] || 0),
      budget: totalBudget,
      isCurrent: mKey === monthKey,
    };
  });

  // 4. Prepare Day of Week Spending Pattern
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];

  currentMonthExpenses.forEach((exp) => {
    const [y, m, d] = exp.date.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    weekdayTotals[dayOfWeek] += exp.amount;
    weekdayCounts[dayOfWeek]++;
  });

  const weekdayData = weekdays.map((day, idx) => ({
    day,
    total: Math.round(weekdayTotals[idx]),
    count: weekdayCounts[idx],
    average: weekdayCounts[idx] > 0 ? Math.round(weekdayTotals[idx] / weekdayCounts[idx]) : 0,
  }));

  // Custom tooltips
  const VelocityTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-xs text-xs">
          <p className="font-semibold text-slate-800 mb-1.5">{label}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.value === null || entry.value === undefined) return null;
            return (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-0.5">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name}:
                </span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(entry.value)}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const CategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-xs text-xs">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-semibold text-slate-900">{data.name}</span>
          </div>
          <p className="text-slate-600 text-xs">
            Amount: <span className="font-bold text-slate-900">{formatCurrency(data.amount)}</span>
          </p>
          <p className="text-slate-500 text-xs">Share of total: {data.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="expense-charts-card" className="rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] overflow-hidden">
      {/* Chart Navigation Tabs */}
      <div className="border-b border-slate-200/80 px-5 py-3.5 sm:flex sm:items-center sm:justify-between bg-slate-50/50">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight font-display">
            Spending Analytics & Pattern Insights
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Data visualization for {formatMonthKeyToName(monthKey)}
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex flex-wrap gap-1 bg-slate-100/90 p-1 rounded-lg border border-slate-200/60">
          <button
            id="tab-chart-velocity"
            type="button"
            onClick={() => setActiveChartTab('velocity')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              activeChartTab === 'velocity'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
            <span>Pace vs Budget</span>
          </button>

          <button
            id="tab-chart-category"
            type="button"
            onClick={() => setActiveChartTab('category')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              activeChartTab === 'category'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieIcon className="h-3.5 w-3.5 text-emerald-600" />
            <span>Category Share</span>
          </button>

          <button
            id="tab-chart-history"
            type="button"
            onClick={() => setActiveChartTab('history')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              activeChartTab === 'history'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
            <span>Monthly Trends</span>
          </button>

          <button
            id="tab-chart-weekday"
            type="button"
            onClick={() => setActiveChartTab('weekday')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              activeChartTab === 'weekday'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-amber-600" />
            <span>Day Patterns</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div className="p-5 sm:p-6">
        {/* Tab 1: Daily Velocity & Budget Pacing */}
        {activeChartTab === 'velocity' && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <div>
                <span className="font-semibold text-slate-900">Cumulative Spend Pace:</span>{' '}
                Compare actual spending trajectory against linear budget target.
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />
                  <span>Cumulative Actual</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400 border border-dashed border-slate-600" />
                  <span>Planned Trajectory</span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocityData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="dayNum"
                    tickLine={false}
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(val) => `Day ${val}`}
                  />
                  <YAxis
                    tickLine={false}
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip content={<VelocityTooltip />} />
                  <ReferenceLine
                    y={totalBudget}
                    label={{
                      value: `Budget Ceiling: ₹${totalBudget}`,
                      position: 'top',
                      fill: '#e11d48',
                      fontSize: 11,
                    }}
                    stroke="#e11d48"
                    strokeDasharray="4 4"
                  />
                  <Area type="monotone" dataKey="budgetTrajectory" name="Target Trajectory" stroke="#94a3b8" strokeDasharray="4 4" fill="none" strokeWidth={2} />
                  <Area type="monotone" dataKey="actualSpend" name="Actual Spend" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#spendGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2.5 text-[11px] text-slate-500 text-center">Day-by-day accumulation helps spot rapid budget depletion before month-end.</div>
          </div>
        )}

        {/* Tab 2: Category Distribution Donut */}
        {activeChartTab === 'category' && (
          <div>
            {categoryData.length === 0 ? (
              <div className="flex h-72 flex-col items-center justify-center text-slate-400">
                <PieIcon className="h-10 w-10 stroke-1 text-slate-300 mb-2" />
                <p className="text-sm font-medium">No expenses logged for this month</p>
                <p className="text-xs text-slate-400 mt-1">Add a transaction to visualize category shares</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="h-72 lg:col-span-7">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="amount">
                        {categoryData.map((entry) => (
                          <Cell key={`cell-${entry.id}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill="#0f172a" fontSize="24" fontWeight={700}>
                        {formatCurrency(totalMonthSpend)}
                      </text>
                      <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" fill="#64748b" fontSize="11" fontWeight={500}>
                        Total Expense
                      </text>
                      <Tooltip content={<CategoryTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="lg:col-span-5 max-h-72 overflow-y-auto pr-2 space-y-1.5 custom-scrollbar">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Ranked by Spending</div>
                  {categoryData.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-200">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-slate-800 truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-slate-900 font-display tabular-nums">{formatCurrency(item.amount)}</span>
                        <span className="text-[11px] font-medium text-slate-400 w-9 text-right tabular-nums">{item.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Multi-Month Historical Trends */}
        {activeChartTab === 'history' && (
          <div>
            <div className="mb-4 flex items-center justify-between text-xs text-slate-600">
              <div><span className="font-semibold text-slate-900">6-Month Trend Overview:</span> Monthly expenditure patterns with current month marked.</div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-xs bg-slate-900" /><span>Selected Month</span></div>
                <div className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-xs bg-slate-300" /><span>Past Months</span></div>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historyData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="monthName" tickLine={false} stroke="#94a3b8" fontSize={11} />
                  <YAxis tickLine={false} stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip formatter={(val: any) => [formatCurrency(val), 'Spending']} labelFormatter={(label) => `Month: ${label}`} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.98)', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)', fontSize: '12px' }} />
                  <ReferenceLine y={totalBudget} stroke="#e11d48" strokeDasharray="3 3" label={{ value: `Budget: ₹${totalBudget}`, position: 'top', fill: '#e11d48', fontSize: 11 }} />
                  <Bar dataKey="spend" radius={[4, 4, 0, 0]}>{historyData.map((entry, index) => (<Cell key={`bar-${index}`} fill={entry.isCurrent ? '#0f172a' : '#cbd5e1'} />))}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 4: Day of Week Spending Pattern */}
        {activeChartTab === 'weekday' && (
          <div>
            <div className="mb-4 text-xs text-slate-600"><span className="font-semibold text-slate-900">Weekly Cadence Breakdown:</span> Identify which days of the week experience the highest average spending volume.</div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tickLine={false} stroke="#94a3b8" fontSize={11} />
                  <YAxis tickLine={false} stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip formatter={(val: any, name: any) => [formatCurrency(val), name === 'total' ? 'Total Spent' : 'Average']} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.98)', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="total" name="Total Spent" fill="#0f172a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="average" name="Daily Average" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
