import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import { PortfolioItem } from '../types';
import { FinancialMetrics } from './FinancialMetrics';

interface StockDetailsProps {
  item: PortfolioItem;
  onClose: () => void;
}

export const StockDetails: React.FC<StockDetailsProps> = ({ item, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'analysis'>('overview');

  // Add ESC key handler to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: DollarSign },
    { id: 'metrics', label: 'Financial Metrics', icon: BarChart3 },
    { id: 'analysis', label: 'Analysis', icon: TrendingUp },
  ];

  const isGainPositive = item.gainLoss && item.gainLoss >= 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-[95vw] w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-gray-900">{item.symbol}</h2>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-semibold text-gray-700">
                {item.currentPrice ? formatCurrency(item.currentPrice) : 'N/A'}
              </span>
              {item.stockData?.dayChange && (
                <span className={`flex items-center text-sm font-medium ${
                  item.stockData.dayChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {item.stockData.dayChange >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                  {formatCurrency(item.stockData.dayChange)} ({formatPercent(item.stockData.dayChangePercent || 0)})
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Portfolio Position */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Position</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm text-gray-500">Quantity</p>
                    <p className="text-lg font-semibold">{item.quantity}</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm text-gray-500">Purchase Price</p>
                    <p className="text-lg font-semibold">{formatCurrency(item.purchasePrice)}</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm text-gray-500">Total Value</p>
                    <p className="text-lg font-semibold">{item.totalValue ? formatCurrency(item.totalValue) : 'N/A'}</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm text-gray-500">Purchase Date</p>
                    <p className="text-lg font-semibold">{formatDate(item.purchaseDate)}</p>
                  </div>
                </div>
              </div>

              {/* Performance */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`bg-white p-4 rounded border ${isGainPositive ? 'border-green-200' : 'border-red-200'}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">Total Gain/Loss</p>
                      {isGainPositive ? <TrendingUp className="w-5 h-5 text-green-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
                    </div>
                    <p className={`text-2xl font-bold ${isGainPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {item.gainLoss ? formatCurrency(item.gainLoss) : 'N/A'}
                    </p>
                  </div>
                  <div className={`bg-white p-4 rounded border ${isGainPositive ? 'border-green-200' : 'border-red-200'}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">Total Return %</p>
                      {isGainPositive ? <TrendingUp className="w-5 h-5 text-green-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
                    </div>
                    <p className={`text-2xl font-bold ${isGainPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {item.gainLossPercent ? formatPercent(item.gainLossPercent) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Financial Highlights */}
              {item.stockData && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Financial Highlights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-500">P/E Ratio</p>
                      <p className="text-lg font-semibold">{item.stockData.peRatio ? item.stockData.peRatio.toFixed(2) : 'N/A'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-500">Dividend Yield</p>
                      <p className="text-lg font-semibold">{item.stockData.dividendYield ? formatPercent(item.stockData.dividendYield) : 'N/A'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-500">ROIC</p>
                      <p className={`text-lg font-semibold ${item.stockData.roic && item.stockData.roic >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.stockData.roic ? formatPercent(item.stockData.roic) : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-500">Earnings Growth</p>
                      <p className={`text-lg font-semibold ${item.stockData.earningsGrowth && item.stockData.earningsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.stockData.earningsGrowth ? formatPercent(item.stockData.earningsGrowth) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'metrics' && item.stockData && (
            <FinancialMetrics stockData={item.stockData} />
          )}

          {activeTab === 'analysis' && item.stockData && (
            <div className="space-y-6">
              {/* Investment Analysis */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Investment Analysis</h3>
                
                {/* Valuation Analysis */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-3">Valuation Analysis</h4>
                  <div className="space-y-3">
                    {item.stockData.peRatio && item.stockData.sectorPeAverage && (
                      <div className="flex items-center justify-between p-3 bg-white rounded border">
                        <span className="text-sm font-medium">P/E vs Sector Average</span>
                        <span className={`text-sm font-semibold ${
                          item.stockData.peRatio < item.stockData.sectorPeAverage ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.stockData.peRatio < item.stockData.sectorPeAverage ? 'Undervalued' : 'Overvalued'}
                        </span>
                      </div>
                    )}
                    {item.stockData.pegRatio && (
                      <div className="flex items-center justify-between p-3 bg-white rounded border">
                        <span className="text-sm font-medium">PEG Ratio Assessment</span>
                        <span className={`text-sm font-semibold ${
                          item.stockData.pegRatio < 1 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.stockData.pegRatio < 1 ? 'Attractive' : 'Expensive'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Health */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-3">Financial Health</h4>
                  <div className="space-y-3">
                    {item.stockData.roic && (
                      <div className="flex items-center justify-between p-3 bg-white rounded border">
                        <span className="text-sm font-medium">ROIC Quality</span>
                        <span className={`text-sm font-semibold ${
                          item.stockData.roic >= 10 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.stockData.roic >= 10 ? 'Excellent' : 'Poor'}
                        </span>
                      </div>
                    )}
                    {item.stockData.currentRatio && (
                      <div className="flex items-center justify-between p-3 bg-white rounded border">
                        <span className="text-sm font-medium">Liquidity</span>
                        <span className={`text-sm font-semibold ${
                          item.stockData.currentRatio >= 1.5 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.stockData.currentRatio >= 1.5 ? 'Strong' : 'Weak'}
                        </span>
                      </div>
                    )}
                    {item.stockData.debtToEquity && (
                      <div className="flex items-center justify-between p-3 bg-white rounded border">
                        <span className="text-sm font-medium">Debt Level</span>
                        <span className={`text-sm font-semibold ${
                          item.stockData.debtToEquity <= 0.5 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.stockData.debtToEquity <= 0.5 ? 'Conservative' : 'High'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Growth Analysis */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-3">Growth Analysis</h4>
                  <div className="space-y-3">
                    {item.stockData.earningsGrowth && (
                      <div className="flex items-center justify-between p-3 bg-white rounded border">
                        <span className="text-sm font-medium">Earnings Growth</span>
                        <span className={`text-sm font-semibold ${
                          item.stockData.earningsGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.stockData.earningsGrowth >= 0 ? 'Positive' : 'Negative'}
                        </span>
                      </div>
                    )}
                    {item.stockData.salesGrowthRate && (
                      <div className="flex items-center justify-between p-3 bg-white rounded border">
                        <span className="text-sm font-medium">Sales Growth</span>
                        <span className={`text-sm font-semibold ${
                          item.stockData.salesGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.stockData.salesGrowthRate >= 0 ? 'Positive' : 'Negative'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};