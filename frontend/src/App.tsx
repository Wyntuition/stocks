import React, { useState, useEffect, useContext, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext, useAuth } from './contexts/AuthContext';
import { PortfolioTable } from './components/PortfolioTable';
import { PortfolioSummary } from './components/PortfolioSummary';
import { CSVImport } from './components/CSVImport';
import { ListManager } from './components/WatchlistManager';
import { AIRecommendationDashboard } from './components/AIRecommendationDashboard';
import { CashManagement } from './components/CashManagement';
import { portfolioApi, listApi } from './services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, LogOut, List, Plus, Moon, Sun, Zap } from 'lucide-react';
import { CreatePortfolioItemRequest, UpdatePortfolioItemRequest } from './types';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow max-w-sm w-full space-y-4">
        <h2 className="text-2xl font-bold mb-2">Login</h2>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" required />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
        <div className="text-sm text-gray-500">Don't have an account? <a href="/register" className="text-blue-600">Register</a></div>
      </form>
    </div>
  );
}

function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(email, password, name);
      navigate('/');
    } catch (err) {
      setError('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow max-w-sm w-full space-y-4">
        <h2 className="text-2xl font-bold mb-2">Register</h2>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" required />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
        <div className="text-sm text-gray-500">Already have an account? <a href="/login" className="text-blue-600">Login</a></div>
      </form>
    </div>
  );
}

function Portfolio() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showListManager, setShowListManager] = useState(false);
  const [showAIDashboard, setShowAIDashboard] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [lists, setLists] = useState<any[]>([]);
  const [theme, setTheme] = useState('dark');
  const [newStock, setNewStock] = useState<CreatePortfolioItemRequest & { listId?: string }>({
    symbol: '',
    quantity: 0,
    purchasePrice: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    listId: undefined,
  });
  const csvImportRef = useRef<HTMLDivElement>(null);

  // On mount, check for listId in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlListId = params.get('listId');
    if (urlListId) {
      setSelectedListId(urlListId);
    }
  }, [location.search]);

  // Fetch lists
  useEffect(() => {
    const fetchLists = async () => {
      try {
        const data = await listApi.getAllLists();
        setLists(data);
      } catch (error) {
        console.error('Failed to fetch lists:', error);
      }
    };
    fetchLists();
  }, []);

  // Dark mode management
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Portfolio data queries with list filtering
  const { data: portfolioItems = [], refetch: refetchPortfolio, isLoading: isLoadingPortfolio } = useQuery({
    queryKey: ['portfolio', selectedListId],
    queryFn: () => portfolioApi.getAllPortfolioItems(selectedListId || undefined),
  });

  const { data: summary } = useQuery({
    queryKey: ['portfolio-summary', selectedListId],
    queryFn: () => portfolioApi.getPortfolioSummary(selectedListId || undefined),
  });

  // Add stock mutation
  const addStockMutation = useMutation({
    mutationFn: portfolioApi.createPortfolioItem,
    onSuccess: () => {
      // Invalidate queries for the target list (newStock.listId or selectedListId)
      const targetListId = newStock.listId || selectedListId;
      queryClient.invalidateQueries({ queryKey: ['portfolio', targetListId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary', targetListId] });
      setIsAddingStock(false);
      setNewStock({
        symbol: '',
        quantity: 0,
        purchasePrice: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        listId: undefined,
      });
      refetchPortfolio();
    },
  });

  // Get current list info
  const currentList = selectedListId 
    ? lists.find(w => w.id === selectedListId)
    : null;

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    // Allow quantity of 0 for list-only stocks
    if (newStock.symbol && newStock.quantity >= 0) {
      // For list-only stocks (quantity = 0), don't require purchase price/date
      if (newStock.quantity === 0 || (newStock.quantity > 0 && newStock.purchasePrice > 0)) {
        const stockData = { ...newStock };
        if (selectedListId) {
          stockData.listId = selectedListId;
        }
        addStockMutation.mutate(stockData);
      }
    }
  };

  const handleCSVExport = () => {
    if (portfolioItems.length === 0) {
      alert('No portfolio data to export');
      return;
    }

    // Create CSV content with available fields only
    const headers = [
      'Symbol',
      'Quantity', 
      'Purchase Price',
      'Purchase Date',
      'Current Price',
      'Total Value',
      'Gain/Loss',
      'Gain/Loss %'
    ];

    const csvContent = [
      headers.join(','),
      ...portfolioItems.map(item => [
        item.symbol,
        item.quantity,
        item.purchasePrice,
        item.purchaseDate instanceof Date ? item.purchaseDate.toISOString().split('T')[0] : item.purchaseDate,
        item.currentPrice || '',
        item.totalValue || '',
        item.gainLoss || '',
        item.gainLossPercent || ''
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const filename = currentList 
      ? `${currentList.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_portfolio.csv`
      : 'portfolio.csv';
    
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportSuccess = () => {
    refetchPortfolio();
    setShowCSVImport(false);
  };

  const handleListSelect = (listId: string | null) => {
    setSelectedListId(listId);
    setShowListManager(false);
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await portfolioApi.deletePortfolioItem(id);
      // Only invalidate queries for the current list
      queryClient.invalidateQueries({ queryKey: ['portfolio', selectedListId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary', selectedListId] });
      refetchPortfolio();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleEditItem = async (id: string, data: UpdatePortfolioItemRequest) => {
    try {
      await portfolioApi.updatePortfolioItem(id, data);
      // Only invalidate queries for the current list
      queryClient.invalidateQueries({ queryKey: ['portfolio', selectedListId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary', selectedListId] });
      refetchPortfolio();
    } catch (error) {
      console.error('Failed to update item:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const handleSellPosition = async (data: { portfolioId: string; quantity: number; price: number; date?: string; fees?: number; notes?: string }) => {
    try {
      await portfolioApi.sellPosition(data);
      // Invalidate and refetch portfolio data
      queryClient.invalidateQueries({ queryKey: ['portfolio', selectedListId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary', selectedListId] });
      refetchPortfolio();
    } catch (error) {
      console.error('Failed to sell position:', error);
      throw error;
    }
  };

  const { logout } = useContext(AuthContext)!;

  // Keyboard shortcuts for CSV import modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (showCSVImport && (event.key === 'Escape' || event.key === 'x' || event.key === 'X')) {
        setShowCSVImport(false);
      }
    };

    if (showCSVImport) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCSVImport]);

  if (isLoadingPortfolio) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-900">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {currentList ? currentList.name : 'Portfolio Tracker'}
            </h1>
            <p>Track your stock investments and performance</p>
            {currentList && (
              <span className="text-sm text-gray-500">
                ({currentList._count?.portfolios || 0} items)
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsAddingStock(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center"
            >
              <Plus className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">Add Stock</span>
            </button>
            <button
              onClick={() => setShowAIDashboard(true)}
              className="flex items-center space-x-2 sm:space-x-2 px-3 py-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md"
            >
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">AI Analysis</span>
            </button>
            <button
              onClick={() => setShowListManager(true)}
              className="flex items-center space-x-2 sm:space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lists</span>
            </button>
            <button
              onClick={toggleTheme}
              className="flex items-center space-x-2 sm:space-x-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 py-2 px-4 rounded-lg transition-colors"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4" />
                  <span className="hidden sm:inline">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  <span className="hidden sm:inline">Dark Mode</span>
                </>
              )}
            </button>
            <button
              onClick={logout}
              className="flex items-center space-x-2 sm:space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Portfolio Summary */}
        <PortfolioSummary summary={summary} />

        {/* Add Stock Form */}
        {isAddingStock && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Stock</h3>
            <form onSubmit={handleAddStock} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
                <input
                  type="text"
                  value={newStock.symbol}
                  onChange={(e) => setNewStock({ ...newStock, symbol: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="AAPL"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span className="text-gray-500 text-xs">(0 for watch only)</span>
                </label>
                <input
                  type="number"
                  value={newStock.quantity}
                  onChange={(e) => setNewStock({ ...newStock, quantity: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10 (or 0 to watch)"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Price {newStock.quantity === 0 && <span className="text-gray-500 text-xs">(N/A for watch)</span>}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newStock.purchasePrice}
                  onChange={(e) => setNewStock({ ...newStock, purchasePrice: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={newStock.quantity === 0 ? "N/A" : "150.00"}
                  min="0.01"
                  required={newStock.quantity > 0}
                  disabled={newStock.quantity === 0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date {newStock.quantity === 0 && <span className="text-gray-500 text-xs">(N/A for watch)</span>}
                </label>
                <input
                  type="date"
                  value={newStock.purchaseDate}
                  onChange={(e) => setNewStock({ ...newStock, purchaseDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={newStock.quantity > 0}
                  disabled={newStock.quantity === 0}
                />
              </div>
              <div className="md:col-span-4 flex space-x-3">
                <button
                  type="submit"
                  disabled={addStockMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg"
                >
                  {addStockMutation.isPending ? 'Adding...' : 'Add Stock'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingStock(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Portfolio Table */}
        <div className="mt-8" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="bg-white rounded-lg shadow">
            <PortfolioTable 
              items={portfolioItems} 
              onDeleteItem={handleDeleteItem}
              onEditItem={handleEditItem}
              onSellPosition={handleSellPosition}
            />
          </div>
        </div>

        {/* Cash Management */}
        <div className="mt-8">
          <CashManagement 
            listId={selectedListId || undefined}
            onCashFlowChange={() => {
              queryClient.invalidateQueries({ queryKey: ['portfolio-summary', selectedListId] });
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => setShowCSVImport(true)}
            className="flex items-center space-x-2 sm:space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Import CSV</span>
          </button>
          
          <button
            onClick={handleCSVExport}
            disabled={portfolioItems.length === 0}
            className="flex items-center space-x-2 sm:space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-300"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* CSV Import Modal */}
      {showCSVImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div ref={csvImportRef} className="w-full max-w-2xl">
            <CSVImport 
              onImportSuccess={handleImportSuccess}
              onCancel={() => setShowCSVImport(false)}
            />
          </div>
        </div>
      )}

      {/* List Manager Modal */}
      {showListManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <ListManager
            onListSelect={handleListSelect}
            selectedListId={selectedListId}
            onClose={() => setShowListManager(false)}
          />
        </div>
      )}

      {/* AI Recommendation Dashboard Modal */}
      {showAIDashboard && (
        <AIRecommendationDashboard
          portfolioItems={portfolioItems}
          onClose={() => setShowAIDashboard(false)}
          selectedListId={selectedListId || undefined}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/*" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}
