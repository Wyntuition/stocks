import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3 } from 'lucide-react';
import { PortfolioSummary as PortfolioSummaryType } from '../types';

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType | undefined;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ summary }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Single Row - All Three Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-none">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="flex items-center mb-3">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Portfolio Value</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Value</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(summary.totalValue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Gain/Loss</p>
              <p className={`text-sm font-bold ${
                summary.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(summary.totalGainLoss)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="flex items-center mb-3">
            {summary.totalGainLoss >= 0 ? (
              <TrendingUp className="h-8 w-8 text-green-600" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-600" />
            )}
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Returns</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Return %</p>
              <p className={`text-sm font-bold ${
                summary.totalGainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercent(summary.totalGainLossPercent)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Annualized Return</p>
              <p className={`text-sm font-bold ${
                summary.annualizedReturn >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercent(summary.annualizedReturn)}
              </p>
            </div>
          </div>
        </div>

        {/* Time-based Returns Card */}
        {summary.timeBasedReturns && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <div className="flex items-center mb-3">
              <BarChart3 className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Time-based Returns</p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1 text-xs">
              <div className="text-center">
                <div className="text-gray-500 dark:text-gray-400">6M</div>
                <div className={`font-medium ${
                  summary.timeBasedReturns.sixMonth 
                    ? summary.timeBasedReturns.sixMonth >= 0 ? 'text-green-600' : 'text-red-600'
                    : 'text-gray-400'
                }`}>
                  {summary.timeBasedReturns.sixMonth 
                    ? formatPercent(summary.timeBasedReturns.sixMonth)
                    : 'N/A'
                  }
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-500 dark:text-gray-400">1Y</div>
                <div className={`font-medium ${
                  summary.timeBasedReturns.oneYear 
                    ? summary.timeBasedReturns.oneYear >= 0 ? 'text-green-600' : 'text-red-600'
                    : 'text-gray-400'
                }`}>
                  {summary.timeBasedReturns.oneYear 
                    ? formatPercent(summary.timeBasedReturns.oneYear)
                    : 'N/A'
                  }
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-500 dark:text-gray-400">3Y</div>
                <div className={`font-medium ${
                  summary.timeBasedReturns.threeYear 
                    ? summary.timeBasedReturns.threeYear >= 0 ? 'text-green-600' : 'text-red-600'
                    : 'text-gray-400'
                }`}>
                  {summary.timeBasedReturns.threeYear 
                    ? formatPercent(summary.timeBasedReturns.threeYear)
                    : 'N/A'
                  }
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-500 dark:text-gray-400">5Y</div>
                <div className="text-gray-400">N/A</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500 dark:text-gray-400">10Y</div>
                <div className="text-gray-400">N/A</div>
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}; 