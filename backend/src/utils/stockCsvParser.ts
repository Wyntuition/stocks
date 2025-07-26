import { parse } from 'csv-parse/sync';

export interface StockRow {
  accountNumber: string;
  accountName: string;
  symbol: string;
  description: string;
  quantity: number | null;
  lastPrice: number | null;
  lastPriceChange: string | null;
  currentValue: number | null;
  todaysGainLossDollar: string | null;
  todaysGainLossPercent: string | null;
  totalGainLossDollar: string | null;
  totalGainLossPercent: string | null;
  percentOfAccount: string | null;
  costBasisTotal: number | null;
  averageCostBasis: number | null;
  type: string;
  originalRow: string;
}

function parseNumber(val: string): number | null {
  if (!val || val.trim() === '') return null;
  // Remove $ and % and commas
  const cleaned = val.replace(/[$,%]/g, '').replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function parseStockCsv(csv: string): StockRow[] {
  // Remove BOM if present
  if (csv.charCodeAt(0) === 0xFEFF) {
    csv = csv.slice(1);
  }
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
    skip_records_with_error: false,
    record_delimiter: '\n', // Use string instead of regex
    on_record: (record: any, { lines }: any) => {
      // lines is the line number (1-based)
      // We'll preserve the original row by splitting the CSV into lines
      return record;
    }
  });

  // Split into lines for original row preservation
  const lines = csv.split(/\r?\n/).filter(l => l.trim() !== '');
  const headerLine = lines[0];
  const dataLines = lines.slice(1);

  return records.map((rec: any, idx: number) => {
    const row = dataLines[idx] || '';
    return {
      accountNumber: rec['Account Number'] || '',
      accountName: rec['Account Name'] || '',
      symbol: rec['Symbol'] || '',
      description: rec['Description'] || '',
      quantity: parseNumber(rec['Quantity']),
      lastPrice: parseNumber(rec['Last Price']),
      lastPriceChange: rec['Last Price Change'] || null,
      currentValue: parseNumber(rec['Current Value']),
      todaysGainLossDollar: rec["Today's Gain/Loss Dollar"] || null,
      todaysGainLossPercent: rec["Today's Gain/Loss Percent"] || null,
      totalGainLossDollar: rec['Total Gain/Loss Dollar'] || null,
      totalGainLossPercent: rec['Total Gain/Loss Percent'] || null,
      percentOfAccount: rec['Percent Of Account'] || null,
      costBasisTotal: parseNumber(rec['Cost Basis Total']),
      averageCostBasis: parseNumber(rec['Average Cost Basis']),
      type: rec['Type'] || '',
      originalRow: row
    };
  });
} 