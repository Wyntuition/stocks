import { PortfolioItem } from '../types';

export interface CSVImportItem {
  symbol: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
}

export interface CSVImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  data: CSVImportItem[];
}

export const parseCSV = (csvContent: string): CSVImportResult => {
  const lines = csvContent.trim().split('\n');
  const result: CSVImportResult = {
    success: true,
    imported: 0,
    errors: [],
    data: []
  };

  if (lines.length < 2) {
    result.success = false;
    result.errors.push('CSV file must contain at least a header row and one data row');
    return result;
  }

  const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/\s+/g, ''));
  
  // Normalize column names to handle variations
  const normalizeColumnName = (name: string): string => {
    return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  };

  const normalizedHeader = header.map(normalizeColumnName);
  

  

  

  
  // Check for required columns with flexible matching
  // Support both direct purchasePrice and calculated from costBasisTotal + shareCount
  const requiredColumns = [
    { original: 'symbol', variations: ['symbol', 'ticker', 'stock'] },
    { original: 'quantity', variations: ['quantity', 'qty', 'shares', 'sharecount'] }
  ];

  // Check for purchase price columns (either direct or calculated)
  const purchasePriceColumns = [
    { original: 'purchaseprice', variations: ['purchaseprice', 'price', 'buyprice', 'cost'] },
    { original: 'costbasistotal', variations: ['costbasistotal', 'costbasis', 'totalcost', 'basis', 'costbasistotal'] }
  ];

  const columnIndices: { [key: string]: number } = {};
  const missingColumns: string[] = [];

  // Check required columns
  for (const col of requiredColumns) {
    let found = false;
    for (const variation of col.variations) {
      const index = normalizedHeader.indexOf(variation);
      if (index !== -1) {
        columnIndices[col.original] = index;
        found = true;
        break;
      }
    }
    if (!found) {
      missingColumns.push(col.original);
    }
  }

  // Check for purchase price columns
  let hasDirectPurchasePrice = false;
  let hasCostBasisTotal = false;
  
  for (const col of purchasePriceColumns) {
    for (const variation of col.variations) {
      const index = normalizedHeader.indexOf(variation);
      if (index !== -1) {
        columnIndices[col.original] = index;
        if (col.original === 'purchaseprice') {
          hasDirectPurchasePrice = true;
        } else if (col.original === 'costbasistotal') {
          hasCostBasisTotal = true;
        }
        break;
      }
    }
  }

  // Validate we have either direct purchase price or cost basis total
  if (!hasDirectPurchasePrice && !hasCostBasisTotal) {
    missingColumns.push('purchasePrice (or Cost Basis Total)');
  }


  
  if (missingColumns.length > 0) {
    result.success = false;
    result.errors.push(`Missing required columns: ${missingColumns.join(', ')}. Found columns: ${header.join(', ')}`);
    return result;
  }

  // Get column indices
  const symbolIndex = columnIndices.symbol;
  const quantityIndex = columnIndices.quantity;
  const dateIndex = columnIndices.purchasedate || -1; // Optional
  const purchasePriceIndex = hasDirectPurchasePrice ? columnIndices.purchaseprice : -1;
  const costBasisTotalIndex = hasCostBasisTotal ? columnIndices.costbasistotal : -1;
  
  console.log('DEBUG: Column detection results:', {
    hasDirectPurchasePrice,
    hasCostBasisTotal,
    costBasisTotalIndex,
    purchasePriceIndex,
    columnIndices
  });
  

  

  


  // Clean up numeric values that might have dollar signs and commas
  const cleanNumericValue = (value: string) => {
    if (!value) return 0;
    return parseFloat(value.replace(/[$,%]/g, '')) || 0;
  };

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim());
    
    try {
      let symbol = values[symbolIndex]?.toUpperCase();
      let quantity = cleanNumericValue(values[quantityIndex]);
      let purchasePrice: number;
      let purchaseDate = dateIndex >= 0 ? values[dateIndex] : '';

      // Validate data
      if (!symbol || symbol.length === 0) {
        result.errors.push(`Row ${i + 1}: Invalid symbol`);
        continue;
      }

      if (isNaN(quantity) || quantity < 0) {
        result.errors.push(`Row ${i + 1}: Invalid quantity for ${symbol}. Quantity must be 0 or greater.`);
        continue;
      }

      // Calculate purchase price based on available data
      // Prioritize Cost Basis Total calculation over direct purchase price
      if (hasCostBasisTotal) {
        // Calculate purchase price from cost basis total and quantity
        const costBasisTotal = cleanNumericValue(values[costBasisTotalIndex]);
        
        console.log(`DEBUG: ${symbol} - Raw Cost Basis Total: ${values[costBasisTotalIndex]}, Cleaned: ${costBasisTotal}, Quantity: ${quantity}`);
        
        if (isNaN(costBasisTotal) || costBasisTotal < 0) {
          result.errors.push(`Row ${i + 1}: Invalid cost basis total for ${symbol}. Must be 0 or greater.`);
          continue;
        }
        if (quantity === 0) {
          purchasePrice = 0;
        } else {
          if (costBasisTotal === 0) {
            result.errors.push(`Row ${i + 1}: Invalid cost basis total for ${symbol}. Must be greater than 0 when quantity > 0.`);
            continue;
          }
          purchasePrice = costBasisTotal / quantity;
          console.log(`DEBUG: ${symbol} - Final purchase price: ${purchasePrice} (${costBasisTotal} / ${quantity})`);
        }
      } else if (hasDirectPurchasePrice) {
        // Use direct purchase price as fallback
        purchasePrice = parseFloat(values[purchasePriceIndex]);
      } else {
        result.errors.push(`Row ${i + 1}: No purchase price or cost basis total found for ${symbol}`);
        continue;
      }

      // For watchlist items (quantity = 0), purchase price and date are optional
      if (quantity > 0) {
        if (isNaN(purchasePrice) || purchasePrice <= 0) {
          result.errors.push(`Row ${i + 1}: Invalid purchase price for ${symbol}. Required when quantity > 0.`);
          continue;
        }

        // Validate date format (YYYY-MM-DD) only when quantity > 0 and date is provided
        if (purchaseDate && purchaseDate.trim()) {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(purchaseDate)) {
            result.errors.push(`Row ${i + 1}: Invalid date format for ${symbol}. Use YYYY-MM-DD when quantity > 0.`);
            continue;
          }
        } else {
          // If no date provided, use today's date
          purchaseDate = new Date().toISOString().split('T')[0];
        }
      } else {
        // For watchlist items, set default values
        purchasePrice = 0;
        purchaseDate = new Date().toISOString().split('T')[0];
      }

      result.data.push({
        symbol,
        quantity,
        purchasePrice,
        purchaseDate
      });

      result.imported++;
    } catch (error: any) {
      result.errors.push(`Row ${i + 1}: Error parsing data - ${error.message}`);
    }
  }



  if (result.imported === 0) {
    result.success = false;
  }

  return result;
};

export const exportToCSV = (portfolioItems: PortfolioItem[]): string => {
  const headers = [
    'Symbol',
    'Quantity',
    'Purchase Price',
    'Cost Basis Total',
    'Purchase Date',
    'Current Price',
    'Total Value',
    'Gain/Loss',
    'Gain/Loss %',
    'Day Change %',
    'P/E Ratio',
    'Sector P/E Avg',
    '50-Day MA',
    '52-Week High',
    '52-Week Low',
    '6-Month Change %',
    '3-Year Change %',
    'ROIC %',
    'Sales Growth %',
    'EPS Growth %',
    'Profit Margins %',
    'Operating Margins %',
    'Dividend Yield %',
    'Market Cap',
    'Sector',
    'Industry'
  ];

  const rows = portfolioItems.map(item => [
    item.symbol,
    item.quantity.toString(),
    item.purchasePrice.toFixed(2),
    (item.purchasePrice * item.quantity).toFixed(2), // Cost Basis Total
    item.purchaseDate instanceof Date ? item.purchaseDate.toISOString().split('T')[0] : new Date(item.purchaseDate).toISOString().split('T')[0],
    item.currentPrice?.toFixed(2) || '',
    item.totalValue?.toFixed(2) || '',
    item.gainLoss?.toFixed(2) || '',
    item.gainLossPercent?.toFixed(2) || '',
    item.stockData?.dayChangePercent?.toFixed(2) || '',
    item.stockData?.peRatio?.toFixed(2) || '',
    item.stockData?.sectorPeAverage?.toFixed(2) || '',
    item.stockData?.movingAverage50Day?.toFixed(2) || '',
    item.stockData?.week52High?.toFixed(2) || '',
    item.stockData?.week52Low?.toFixed(2) || '',
    item.stockData?.change6MonthPercent?.toFixed(2) || '',
    item.stockData?.change3YearPercent?.toFixed(2) || '',
    item.stockData?.roic?.toFixed(2) || '',
    item.stockData?.salesGrowthRate?.toFixed(2) || '',
    item.stockData?.epsGrowthRate?.toFixed(2) || '',
    item.stockData?.profitMargins?.toFixed(2) || '',
    item.stockData?.operatingMargins?.toFixed(2) || '',
    item.stockData?.dividendYield?.toFixed(2) || '',
    item.stockData?.marketCap?.toString() || '',
    item.stockData?.sector || '',
    item.stockData?.industry || ''
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
};

export const downloadCSV = (csvContent: string, filename: string = 'portfolio.csv') => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
