import React from 'react';
import { StockData } from '../types';

interface FinancialMetricsProps {
  stockData: StockData;
}

export const FinancialMetrics: React.FC<FinancialMetricsProps> = ({ stockData }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatLargeCurrency = (value: number) => {
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(1)}T`;
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    } else {
      return formatCurrency(value);
    }
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatRatio = (value: number) => {
    return value.toFixed(2);
  };

  const MetricCard: React.FC<{ 
    title: string; 
    value: string | number | undefined; 
    type?: 'currency' | 'percent' | 'ratio' | 'large-currency' | 'text';
    isGood?: boolean;
  }> = ({ title, value, type = 'text', isGood }) => {
    if (value === undefined || value === null) {
      return (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-500 mb-1">{title}</h4>
          <p className="text-lg font-semibold text-gray-400">N/A</p>
        </div>
      );
    }

    let formattedValue: string;
    if (type === 'currency') {
      formattedValue = formatCurrency(value as number);
    } else if (type === 'large-currency') {
      formattedValue = formatLargeCurrency(value as number);
    } else if (type === 'percent') {
      formattedValue = formatPercent(value as number);
    } else if (type === 'ratio') {
      formattedValue = formatRatio(value as number);
    } else {
      formattedValue = value.toString();
    }

    const textColor = isGood !== undefined 
      ? (isGood ? 'text-green-600' : 'text-red-600')
      : 'text-gray-900';

    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-500 mb-1">{title}</h4>
        <p className={`text-lg font-semibold ${textColor}`}>{formattedValue}</p>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Financial Metrics - {stockData.symbol}
      </h3>
      
      {/* Market Data */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-700 mb-3">Market Data</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <MetricCard title="Market Cap" value={stockData.marketCap} type="large-currency" />
          <MetricCard title="P/E Ratio" value={stockData.peRatio} type="ratio" />
          <MetricCard title="PEG Ratio" value={stockData.pegRatio} type="ratio" />
          <MetricCard title="Price-to-Book" value={stockData.priceToBook} type="ratio" />
          <MetricCard title="52-Week High" value={stockData.week52High} type="currency" />
          <MetricCard title="52-Week Low" value={stockData.week52Low} type="currency" />
          <MetricCard title="Volume" value={stockData.volume} />
          <MetricCard title="Avg Volume" value={stockData.avgVolume} />
        </div>
      </div>

      {/* Dividend & Returns */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-700 mb-3">Dividend & Returns</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <MetricCard title="Dividend Yield" value={stockData.dividendYield} type="percent" />
          <MetricCard title="Payout Ratio" value={stockData.payoutRatio} type="percent" />
          <MetricCard title="Return on Assets" value={stockData.returnOnAssets} type="percent" isGood={stockData.returnOnAssets ? stockData.returnOnAssets >= 5 : undefined} />
          <MetricCard title="Return on Equity" value={stockData.returnOnEquity} type="percent" isGood={stockData.returnOnEquity ? stockData.returnOnEquity >= 15 : undefined} />
        </div>
      </div>

      {/* Growth Metrics */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-700 mb-3">Growth Metrics</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <MetricCard title="Earnings Growth" value={stockData.earningsGrowth} type="percent" isGood={stockData.earningsGrowth ? stockData.earningsGrowth >= 0 : undefined} />
          <MetricCard title="Sales Growth" value={stockData.salesGrowthRate} type="percent" isGood={stockData.salesGrowthRate ? stockData.salesGrowthRate >= 0 : undefined} />
          <MetricCard title="EPS Growth" value={stockData.epsGrowthRate} type="percent" isGood={stockData.epsGrowthRate ? stockData.epsGrowthRate >= 0 : undefined} />
          <MetricCard title="ROIC" value={stockData.roic} type="percent" isGood={stockData.roic ? stockData.roic >= 10 : undefined} />
        </div>
      </div>

      {/* Profitability */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-700 mb-3">Profitability</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <MetricCard title="Profit Margins" value={stockData.profitMargins} type="percent" isGood={stockData.profitMargins ? stockData.profitMargins >= 10 : undefined} />
          <MetricCard title="Operating Margins" value={stockData.operatingMargins} type="percent" isGood={stockData.operatingMargins ? stockData.operatingMargins >= 15 : undefined} />
          <MetricCard title="Trailing EPS" value={stockData.trailingEps} type="currency" />
          <MetricCard title="Forward EPS" value={stockData.forwardEps} type="currency" />
        </div>
      </div>

      {/* Financial Health */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-700 mb-3">Financial Health</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <MetricCard title="Current Ratio" value={stockData.currentRatio} type="ratio" isGood={stockData.currentRatio ? stockData.currentRatio >= 1.5 : undefined} />
          <MetricCard title="Quick Ratio" value={stockData.quickRatio} type="ratio" isGood={stockData.quickRatio ? stockData.quickRatio >= 1.0 : undefined} />
          <MetricCard title="Debt-to-Equity" value={stockData.debtToEquity} type="ratio" isGood={stockData.debtToEquity ? stockData.debtToEquity <= 0.5 : undefined} />
          <MetricCard title="Book Value" value={stockData.bookValue} type="currency" />
        </div>
      </div>

      {/* Financial Data */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-700 mb-3">Financial Data</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <MetricCard title="Total Revenue" value={stockData.totalRevenue} type="large-currency" />
          <MetricCard title="EBITDA" value={stockData.ebitda} type="large-currency" />
          <MetricCard title="Free Cash Flow" value={stockData.freeCashflow} type="large-currency" />
          <MetricCard title="Total Cash" value={stockData.totalCash} type="large-currency" />
          <MetricCard title="Total Debt" value={stockData.totalDebt} type="large-currency" />
        </div>
      </div>

      {/* Sector Comparison */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-700 mb-3">Sector Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <MetricCard title="Sector" value={stockData.sector} />
          <MetricCard title="Industry" value={stockData.industry} />
          <MetricCard title="Sector P/E Average" value={stockData.sectorPeAverage} type="ratio" />
          <MetricCard 
            title="P/E vs Sector" 
            value={stockData.peRatio && stockData.sectorPeAverage ? 
              (stockData.peRatio < stockData.sectorPeAverage ? 'Below Average' : 'Above Average') : 
              'N/A'
            } 
            isGood={stockData.peRatio && stockData.sectorPeAverage ? 
              stockData.peRatio < stockData.sectorPeAverage : 
              undefined
            }
          />
        </div>
      </div>
    </div>
  );
};