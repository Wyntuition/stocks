import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Minus, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { portfolioApi } from '../services/api';

interface CashFlow {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  date: string;
  description?: string;
  createdAt: string;
}

interface CashManagementProps {
  listId?: string;
  onCashFlowChange?: () => void;
}

export const CashManagement: React.FC<CashManagementProps> = ({ listId, onCashFlowChange }) => {
  const [cashFlows, setCashFlows] = useState<CashFlow[]>([]);
  const [totalCashInvested, setTotalCashInvested] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchCashFlows();
    fetchTotalCashInvested();
  }, [listId]);

  const fetchCashFlows = async () => {
    try {
      setIsLoading(true);
      const flows = await portfolioApi.getCashFlows(listId);
      setCashFlows(flows);
    } catch (error) {
      console.error('Error fetching cash flows:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTotalCashInvested = async () => {
    try {
      const response = await portfolioApi.getTotalCashInvested(listId);
      setTotalCashInvested(response.totalCashInvested);
    } catch (error) {
      console.error('Error fetching total cash invested:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || Number(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setIsSaving(true);
      await portfolioApi.addCashFlow({
        type,
        amount: Number(amount),
        date,
        description: description || undefined,
        listId,
      });

      // Reset form
      setAmount('');
      setDescription('');
      setShowForm(false);

      // Refresh data
      await fetchCashFlows();
      await fetchTotalCashInvested();
      
      // Notify parent component
      if (onCashFlowChange) {
        onCashFlowChange();
      }
    } catch (error) {
      console.error('Error adding cash flow:', error);
      alert('Failed to add cash flow');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <DollarSign className="h-6 w-6 text-green-600 mr-2" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Cash Management</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Cash Flow</span>
        </button>
      </div>

      {/* Total Cash Invested */}
      <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Total Cash Invested</h3>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              {formatCurrency(totalCashInvested)}
            </p>
          </div>
          <TrendingUp className="h-8 w-8 text-green-600" />
        </div>
      </div>

      {/* Add Cash Flow Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'deposit' | 'withdrawal')}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional description..."
            />
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium py-2 px-4 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg"
            >
              {isSaving ? 'Adding...' : `Add ${type === 'deposit' ? 'Deposit' : 'Withdrawal'}`}
            </button>
          </div>
        </form>
      )}

      {/* Cash Flow History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Cash Flows</h3>
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : cashFlows.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No cash flows recorded yet.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Add your first deposit or withdrawal to get started.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {cashFlows.map((flow) => (
              <div
                key={flow.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    flow.type === 'deposit' 
                      ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' 
                      : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                  }`}>
                    {flow.type === 'deposit' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                        {flow.type}
                      </span>
                      <span className={`font-bold ${
                        flow.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {flow.type === 'deposit' ? '+' : '-'}{formatCurrency(flow.amount)}
                      </span>
                    </div>
                    {flow.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{flow.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(flow.date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 