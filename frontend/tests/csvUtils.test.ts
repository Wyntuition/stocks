import { describe, it, expect } from 'vitest';
import { parseCSV } from '../src/utils/csvUtils';

describe('CSV Utils', () => {
  it('should parse valid CSV data with purchasePrice', () => {
    const csvData = `symbol,quantity,purchasePrice,purchaseDate
AAPL,100,150.00,2023-01-15
GOOGL,50,2500.00,2023-02-20`;

    const result = parseCSV(csvData);
    
    expect(result.errors).toHaveLength(0);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({
      symbol: 'AAPL',
      quantity: 100,
      purchasePrice: 150.00,
      purchaseDate: '2023-01-15'
    });
  });

  it('should parse valid CSV data with Cost Basis Total', () => {
    const csvData = `symbol,quantity,Cost Basis Total,purchaseDate
AAPL,100,15000.00,2023-01-15
GOOGL,50,125000.00,2023-02-20`;

    const result = parseCSV(csvData);
    
    expect(result.errors).toHaveLength(0);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({
      symbol: 'AAPL',
      quantity: 100,
      purchasePrice: 150.00, // 15000.00 / 100
      purchaseDate: '2023-01-15'
    });
    expect(result.data[1]).toEqual({
      symbol: 'GOOGL',
      quantity: 50,
      purchasePrice: 2500.00, // 125000.00 / 50
      purchaseDate: '2023-02-20'
    });
  });

  it('should handle Cost Basis Total with different column name variations', () => {
    const csvData = `symbol,quantity,costbasis,purchaseDate
AAPL,100,15000.00,2023-01-15`;

    const result = parseCSV(csvData);
    
    expect(result.errors).toHaveLength(0);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].purchasePrice).toBe(150.00);
  });

  it('should handle watchlist items (quantity = 0) with Cost Basis Total', () => {
    const csvData = `symbol,quantity,Cost Basis Total,purchaseDate
AAPL,0,0.00,2023-01-15`;

    const result = parseCSV(csvData);
    
    expect(result.errors).toHaveLength(0);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual({
      symbol: 'AAPL',
      quantity: 0,
      purchasePrice: 0,
      purchaseDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) // Today's date in YYYY-MM-DD format
    });
  });

  it('should detect invalid CSV data', () => {
    const csvData = `symbol,quantity,purchasePrice,purchaseDate
AAPL,invalid,150.00,2023-01-15`;

    const result = parseCSV(csvData);
    
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.data).toHaveLength(0);
  });

  it('should handle missing required fields', () => {
    const csvData = `symbol,quantity
AAPL,100`;

    const result = parseCSV(csvData);
    
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.data).toHaveLength(0);
  });

  it('should handle missing both purchasePrice and Cost Basis Total', () => {
    const csvData = `symbol,quantity,purchaseDate
AAPL,100,2023-01-15`;

    const result = parseCSV(csvData);
    
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('purchasePrice (or Cost Basis Total)');
    expect(result.data).toHaveLength(0);
  });

  it('should handle invalid Cost Basis Total', () => {
    const csvData = `symbol,quantity,Cost Basis Total,purchaseDate
AAPL,100,invalid,2023-01-15`;

    const result = parseCSV(csvData);
    
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Invalid cost basis total');
    expect(result.data).toHaveLength(0);
  });

  it('should parse sample CSV with Cost Basis Total format', () => {
    const csvData = `symbol,quantity,Cost Basis Total,purchaseDate
AAPL,100,15000.00,2023-01-15
GOOGL,50,125000.00,2023-02-20
MSFT,75,22500.00,2023-03-10`;

    const result = parseCSV(csvData);
    
    expect(result.errors).toHaveLength(0);
    expect(result.data).toHaveLength(3);
    
    // Verify purchase prices are calculated correctly
    expect(result.data[0].purchasePrice).toBe(150.00); // 15000.00 / 100
    expect(result.data[1].purchasePrice).toBe(2500.00); // 125000.00 / 50
    expect(result.data[2].purchasePrice).toBe(300.00); // 22500.00 / 75
  });

  it('should prioritize Cost Basis Total over direct purchase price', () => {
    const csvData = `symbol,quantity,purchasePrice,Cost Basis Total,purchaseDate
AAPL,100,999.99,15000.00,2023-01-15`;

    const result = parseCSV(csvData);
    
    expect(result.errors).toHaveLength(0);
    expect(result.data).toHaveLength(1);
    
    // Should use Cost Basis Total calculation, not direct purchase price
    expect(result.data[0].purchasePrice).toBe(150.00); // 15000.00 / 100, not 999.99
  });

  it('should handle CSV with "cost basis total" and "Quantity" columns', () => {
    const csvData = `symbol,Quantity,cost basis total,purchaseDate
AAPL,100,15000.00,2023-01-15
GOOGL,50,125000.00,2023-02-20`;

    const result = parseCSV(csvData);
    
    expect(result.errors).toHaveLength(0);
    expect(result.data).toHaveLength(2);
    
    // Should calculate purchase price from cost basis total / quantity
    expect(result.data[0].purchasePrice).toBe(150.00); // 15000.00 / 100
    expect(result.data[1].purchasePrice).toBe(2500.00); // 125000.00 / 50
  });

  it('should handle Fidelity CSV format with Cost Basis Total', () => {
    const csvData = `Account Number,Account Name,Symbol,Description,Quantity,Last Price,Last Price Change,Current Value,Today's Gain/Loss Dollar,Today's Gain/Loss Percent,Total Gain/Loss Dollar,Total Gain/Loss Percent,Percent Of Account,Cost Basis Total,Average Cost Basis,Type
118896233,ROTH IRA,FETH,FIDELITY ETHEREUM FUND,750,$36.364,-$1.076,$27273.00,-$807.00,-2.88%,+$6186.50,+29.33%,7.34%,$21086.50,$28.12,Cash
118896233,ROTH IRA,TSLA,TESLA INC COM,75,$318.55,+$13.25,$23891.25,+$993.75,+4.33%,+$9508.76,+66.11%,6.43%,$14382.49,$191.77,Cash`;

    const result = parseCSV(csvData);
    
    expect(result.errors).toHaveLength(0);
    expect(result.data).toHaveLength(2);
    
    // Should calculate purchase price from cost basis total / quantity
    // FETH: $21086.50 / 750 = $28.12 per share
    // TSLA: $14382.49 / 75 = $191.77 per share
    expect(result.data[0].purchasePrice).toBeCloseTo(28.12, 2); // FETH
    expect(result.data[1].purchasePrice).toBeCloseTo(191.77, 2); // TSLA
  });


});
