import React, { useState, useMemo } from 'react';
import { Expense, CategoryId } from '../types';
import { CATEGORIES, CATEGORY_MAP, PAYMENT_METHOD_LABELS } from '../data/categories';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import {
  Search,
  Plus,
  ArrowUpDown,
  Download,
  Trash2,
  Edit3,
  Calendar,
  CreditCard,
  FileText,
  FilterX,
} from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  onExportCSV: () => void;
  onResetData: () => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  selectedCategory,
  onSelectCategory,
  onExportCSV,
  onResetData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // Category filter
      if (selectedCategory && exp.categoryId !== selectedCategory) {
        return false;
      }

      // Payment filter
      if (selectedPayment !== 'all' && exp.paymentMethod !== selectedPayment) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const cat = CATEGORY_MAP.get(exp.categoryId);
        const matchTitle = exp.title.toLowerCase().includes(term);
        const matchNotes = exp.notes?.toLowerCase().includes(term) ?? false;
        const matchCategory = cat?.name.toLowerCase().includes(term) ?? false;
        if (!matchTitle && !matchNotes && !matchCategory) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
      if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      if (sortBy === 'amount-asc') return a.amount - b.amount;
      return 0;
    });
  }, [expenses, selectedCategory, selectedPayment, searchTerm, sortBy]);

  const hasActiveFilters = searchTerm !== '' || selectedCategory !== null || selectedPayment !== 'all';

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedPayment('all');
    onSelectCategory(null);
  };

  return (
    <div id="expenses-table-card" className="rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] overflow-hidden">
      {/* Table Header Controls */}
      <div className="border-b border-slate-200/80 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight font-display">
              Transaction History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredExpenses.length} of {expenses.length} record{expenses.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-export-csv"
              type="button"
              onClick={onExportCSV}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs"
              title="Export filtered transactions to CSV"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              id="btn-add-expense-table"
              type="button"
              onClick={onAddExpense}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition active:scale-[0.99]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Expense</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Search bar */}
          <div className="sm:col-span-4 relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              id="input-expense-search"
              type="text"
              placeholder="Search expenses, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Category Dropdown */}
          <div className="sm:col-span-3">
            <select
              id="select-category-filter"
              value={selectedCategory || 'all'}
              onChange={(e) => onSelectCategory(e.target.value === 'all' ? null : e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Dropdown */}
          <div className="sm:col-span-3">
            <select
              id="select-payment-filter"
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">All Payment Methods</option>
              <option value="upi">UPI</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="digital_wallet">Digital Wallet</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="sm:col-span-2">
            <select
              id="select-sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-slate-500">Filtered results:</span>
            <button
              id="btn-clear-filters"
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold transition hover:underline"
            >
              <FilterX className="h-3.5 w-3.5" />
              <span>Reset all filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Transaction List Items */}
      {filteredExpenses.length === 0 ? (
        <div className="p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Search className="h-5 w-5 stroke-1" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-900 font-display">No expenses found</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'No transactions match your current search or filter criteria. Try adjusting or resetting filters.'
              : 'No expenses have been recorded for this month yet.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                Clear Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={onAddExpense}
                className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-2xs"
              >
                Record First Expense
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
          {filteredExpenses.map((expense) => {
            const category = CATEGORY_MAP.get(expense.categoryId);
            const isConfirmingDelete = confirmDeleteId === expense.id;

            return (
              <div
                key={expense.id}
                id={`expense-row-${expense.id}`}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-5 hover:bg-slate-50/80 transition duration-150"
              >
                {/* Left section: Icon + Title + Meta */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 mt-0.5 sm:mt-0 border border-slate-100"
                    style={{
                      backgroundColor: category ? `${category.color}15` : '#f1f5f9',
                      color: category ? category.color : '#64748b',
                    }}
                  >
                    <CategoryIcon categoryId={expense.categoryId} className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {expense.title}
                      </h4>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border"
                        style={{
                          backgroundColor: category ? `${category.color}10` : '#f1f5f9',
                          borderColor: category ? `${category.color}30` : '#e2e8f0',
                          color: category ? category.color : '#64748b',
                        }}
                      >
                        {category ? category.name : expense.categoryId}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 tabular-nums">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {expense.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3 text-slate-400" />
                        {PAYMENT_METHOD_LABELS[expense.paymentMethod] || expense.paymentMethod}
                      </span>
                      {expense.notes && (
                        <span className="hidden md:inline-flex items-center gap-1 text-slate-400 italic truncate max-w-xs">
                          <FileText className="h-3 w-3" />
                          {expense.notes}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right section: Amount + Actions */}
                <div className="mt-2.5 sm:mt-0 flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-12 sm:pl-0">
                  <span className="text-sm font-bold text-slate-900 font-display tabular-nums">
                    {formatCurrency(expense.amount)}
                  </span>

                  <div className="flex items-center gap-1">
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-md">
                        <span className="text-[10px] text-rose-700 font-semibold px-1">Delete?</span>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteExpense(expense.id);
                            setConfirmDeleteId(null);
                          }}
                          className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-rose-700"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-300"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onEditExpense(expense)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          title="Edit transaction"
                          aria-label={`Edit ${expense.title}`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(expense.id)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Delete transaction"
                          aria-label={`Delete ${expense.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table Footer */}
      <div className="border-t border-slate-100 bg-slate-50/50 p-3.5 px-5 flex items-center justify-between text-xs text-slate-500">
        <span>Tip: Click on any category row in the budget panel to filter this table.</span>
        <button
          id="btn-reset-sample-data"
          type="button"
          onClick={onResetData}
          className="text-slate-500 hover:text-slate-800 font-medium hover:underline cursor-pointer"
        >
          Reset to Default Data
        </button>
      </div>
    </div>
  );
};
