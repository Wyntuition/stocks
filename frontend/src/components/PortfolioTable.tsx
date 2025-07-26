import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Filter, X, Eye, Edit, ExternalLink, Minus } from 'lucide-react';
import { PortfolioItem, UpdatePortfolioItemRequest } from '../types';
import { StockDetails } from './StockDetails';
import { EditStockModal } from './EditStockModal';
import { SellPositionModal } from './SellPositionModal';

interface PortfolioTableProps {
  items: PortfolioItem[];
  onDeleteItem: (id: string) => void;
  onEditItem: (id: string, data: UpdatePortfolioItemRequest) => Promise<void>;
  onSellPosition: (data: { portfolioId: string; quantity: number; price: number; date?: string; fees?: number; notes?: string }) => Promise<void>;
}

interface SortConfig {
  key: keyof PortfolioItem | 'totalValue' | 'gainLoss' | 'gainLossPercent' | 'sector' | 'peRatio' | 'dividendYield' | 'movingAverage50Day' | 'roic' | 'salesGrowthRate' | 'epsGrowthRate' | 'fcfGrowthRate' | 'bvpsGrowthRate' | 'sectorPeAverage' | 'dayChangePercent' | 'change6MonthPercent' | 'change3YearPercent';
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  symbol: string;
  sector: string;
  minValue: string;
  maxValue: string;
}

export const PortfolioTable: React.FC<PortfolioTableProps> = ({ items, onDeleteItem, onEditItem, onSellPosition }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'symbol', direction: 'asc' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [sellingItem, setSellingItem] = useState<PortfolioItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filters, setFilters] = useState<FilterConfig>({
    symbol: '',
    sector: '',
    minValue: '',
    maxValue: ''
  });

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (key: keyof FilterConfig, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      symbol: '',
      sector: '',
      minValue: '',
      maxValue: ''
    });
  };

  const handleEditItem = async (id: string, data: UpdatePortfolioItemRequest) => {
    setIsSaving(true);
    try {
      await onEditItem(id, data);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSellPosition = async (data: { portfolioId: string; quantity: number; price: number; date?: string; fees?: number; notes?: string }) => {
    setIsSaving(true);
    try {
      await onSellPosition(data);
      setSellingItem(null);
    } finally {
      setIsSaving(false);
    }
  };

  const getNestedValue = (obj: PortfolioItem, key: string) => {
    if (key === 'sector') {
      return obj.stockData?.sector;
    }
    if (key === 'peRatio') {
      return obj.stockData?.peRatio;
    }
    if (key === 'dividendYield') {
      return obj.stockData?.dividendYield;
    }
    if (key === 'movingAverage50Day') {
      return obj.stockData?.movingAverage50Day;
    }
    if (key === 'roic') {
      return obj.stockData?.roic;
    }
    if (key === 'salesGrowthRate') {
      return obj.stockData?.salesGrowthRate;
    }
    if (key === 'epsGrowthRate') {
      return obj.stockData?.epsGrowthRate;
    }
    if (key === 'sectorPeAverage') {
      return obj.stockData?.sectorPeAverage;
    }
    if (key.includes('.')) {
      const keys = key.split('.');
      let value: any = obj;
      for (const k of keys) {
        value = value?.[k];
      }
      return value;
    }
    return (obj as any)[key];
  };

  const filteredAndSortedItems = useMemo(() => {
    let filteredItems = items.filter(item => {
      const matchesSymbol = !filters.symbol || item.symbol.toLowerCase().includes(filters.symbol.toLowerCase());
      const matchesSector = !filters.sector || (item.stockData?.sector?.toLowerCase().includes(filters.sector.toLowerCase()) ?? false);
      const matchesMinValue = !filters.minValue || (item.totalValue ?? 0) >= parseFloat(filters.minValue);
      const matchesMaxValue = !filters.maxValue || (item.totalValue ?? 0) <= parseFloat(filters.maxValue);
      
      return matchesSymbol && matchesSector && matchesMinValue && matchesMaxValue;
    });

    return filteredItems.sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key);
      const bValue = getNestedValue(b, sortConfig.key);
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }
      
      return 0;
    });
  }, [items, sortConfig, filters]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const SortableHeader: React.FC<{ label: string; sortKey: SortConfig['key'] }> = ({ label, sortKey }) => (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {sortConfig.key === sortKey && (
          sortConfig.direction === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        )}
      </div>
    </th>
  );

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden w-full">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Portfolio Holdings</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium ${
              showFilters ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
            } hover:bg-blue-200 dark:hover:bg-blue-800`}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Symbol</label>
              <input
                type="text"
                value={filters.symbol}
                onChange={(e) => handleFilterChange('symbol', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Filter by symbol..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sector</label>
              <input
                type="text"
                value={filters.sector}
                onChange={(e) => handleFilterChange('sector', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Filter by sector..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Value</label>
              <input
                type="number"
                value={filters.minValue}
                onChange={(e) => handleFilterChange('minValue', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Min value..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Value</label>
              <input
                type="number"
                value={filters.maxValue}
                onChange={(e) => handleFilterChange('maxValue', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Max value..."
              />
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <div className="mt-3">
              <button
                onClick={clearFilters}
                className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
                <span>Clear all filters</span>
              </button>
            </div>
          )}
        </div>
      )}

      {filteredAndSortedItems.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {items.length === 0 ? 'No stocks in your portfolio yet.' : 'No stocks match your filters.'}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {items.length === 0 ? 'Add your first stock to get started!' : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div style={{ width: '100%', height: '60vh', minHeight: 300, maxHeight: '80vh', overflowX: 'auto', overflowY: 'auto', position: 'relative' }} className="bg-white dark:bg-gray-900">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" style={{ tableLayout: 'auto' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }} className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <SortableHeader label="Symbol" sortKey="symbol" />
                <SortableHeader label="Current Price" sortKey="currentPrice" />
                <SortableHeader label="Day Change" sortKey="dayChangePercent" />
                <SortableHeader label="Gain/Loss" sortKey="gainLoss" />
                <SortableHeader label="Gain/Loss %" sortKey="gainLossPercent" />
                <SortableHeader label="Quantity" sortKey="quantity" />
                <SortableHeader label="Purchase Price" sortKey="purchasePrice" />
                <SortableHeader label="Purchase Date" sortKey="purchaseDate" />
                <SortableHeader label="Total Value" sortKey="totalValue" />
                <SortableHeader label="P/E Ratio" sortKey="peRatio" />
                <SortableHeader label="Sector P/E" sortKey="sectorPeAverage" />
                <SortableHeader label="50-Day MA" sortKey="movingAverage50Day" />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">52-Week Range</th>
                <SortableHeader label="6 Month Change" sortKey="change6MonthPercent" />
                <SortableHeader label="3 Year Change" sortKey="change3YearPercent" />
                <SortableHeader label="ROIC" sortKey="roic" />
                <SortableHeader label="Sales Growth" sortKey="salesGrowthRate" />
                <SortableHeader label="EPS Growth" sortKey="epsGrowthRate" />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedItems.map((item: PortfolioItem) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium underline"
                      >
                        {item.symbol}
                      </button>
                      <button
                        onClick={() => window.open(`https://www.marketwatch.com/investing/stock/${item.symbol.toLowerCase()}`, '_blank')}
                        className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                        title={`View ${item.symbol} on MarketWatch`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {item.currentPrice ? formatCurrency(item.currentPrice) : 'N/A'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    item.stockData?.dayChangePercent && item.stockData.dayChangePercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.stockData?.dayChangePercent ? formatPercent(item.stockData.dayChangePercent) : 'N/A'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    item.quantity === 0 ? 'text-gray-500' : (item.gainLoss && item.gainLoss >= 0 ? 'text-green-600' : 'text-red-600')
                  }`}>
                    {item.quantity === 0 ? 'N/A' : (item.gainLoss ? formatCurrency(item.gainLoss) : 'N/A')}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    item.quantity === 0 ? 'text-gray-500' : (item.gainLossPercent && item.gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600')
                  }`}>
                    {item.quantity === 0 ? 'N/A' : (item.gainLossPercent ? formatPercent(item.gainLossPercent) : 'N/A')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {item.quantity === 0 ? 'N/A' : formatCurrency(item.purchasePrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {item.quantity === 0 ? 'N/A' : formatDate(item.purchaseDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {item.quantity === 0 ? 'N/A' : (item.totalValue ? formatCurrency(item.totalValue) : 'N/A')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {item.stockData?.peRatio ? item.stockData.peRatio.toFixed(2) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {item.stockData?.sectorPeAverage ? item.stockData.sectorPeAverage.toFixed(2) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {item.stockData?.movingAverage50Day ? `$${item.stockData.movingAverage50Day.toFixed(2)}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {(() => {
                      const { currentPrice, week52High, week52Low } = item.stockData || {};
                      if (!currentPrice || !week52High || !week52Low) return 'N/A';
                      
                      const range = week52High - week52Low;
                      const position = currentPrice - week52Low;
                      const percentage = (position / range) * 100;
                      
                      const getColor = (pct: number) => {
                        if (pct >= 80) return 'bg-green-500';
                        if (pct >= 60) return 'bg-yellow-500';
                        if (pct >= 40) return 'bg-orange-500';
                        return 'bg-red-500';
                      };
                      
                      return (
                        <div className="flex flex-col">
                          <div className="text-xs font-medium mb-1">
                            {percentage.toFixed(1)}%
                          </div>
                          <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${getColor(percentage)}`}
                              style={{ width: `${Math.max(5, Math.min(100, percentage))}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            ${week52Low.toFixed(0)}-${week52High.toFixed(0)}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    item.stockData?.change6MonthPercent && item.stockData.change6MonthPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.stockData?.change6MonthPercent ? formatPercent(item.stockData.change6MonthPercent) : 'N/A'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    item.stockData?.change3YearPercent && item.stockData.change3YearPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.stockData?.change3YearPercent ? formatPercent(item.stockData.change3YearPercent) : 'N/A'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    item.stockData?.roic && item.stockData.roic >= 10 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.stockData?.roic ? formatPercent(item.stockData.roic) : 'N/A'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    item.stockData?.salesGrowthRate && item.stockData.salesGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.stockData?.salesGrowthRate ? formatPercent(item.stockData.salesGrowthRate) : 'N/A'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    item.stockData?.epsGrowthRate && item.stockData.epsGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.stockData?.epsGrowthRate ? formatPercent(item.stockData.epsGrowthRate) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      {item.quantity > 0 && (
                        <button
                          onClick={() => setSellingItem(item)}
                          className="text-orange-600 hover:text-orange-900 flex items-center space-x-1"
                        >
                          <Minus className="w-4 h-4" />
                          <span>Sell</span>
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {selectedItem && (
        <StockDetails 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      )}

      {editingItem && (
        <EditStockModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleEditItem}
          isSaving={isSaving}
        />
      )}

      {sellingItem && (
        <SellPositionModal
          item={sellingItem}
          onClose={() => setSellingItem(null)}
          onSell={handleSellPosition}
          isSaving={isSaving}
        />
      )}
    </div>
  );
};
