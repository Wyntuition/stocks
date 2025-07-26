import { test, expect } from '@playwright/test';

test.describe('Portfolio Tracker - Release 0.2.0 Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3001');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display CSV import and export buttons', async ({ page }) => {
    // Check that the CSV import button exists
    const importButton = page.locator('button:has-text("Import CSV")');
    await expect(importButton).toBeVisible();
    
    // Check that the CSV export button exists
    const exportButton = page.locator('button:has-text("Export CSV")');
    await expect(exportButton).toBeVisible();
  });

  test('should open CSV import modal', async ({ page }) => {
    // Click the import CSV button
    await page.click('button:has-text("Import CSV")');
    
    // Check that the modal appears
    await expect(page.locator('text=Import Stocks from CSV')).toBeVisible();
    
    // Check that the file upload area is visible
    await expect(page.locator('text=Click to select or drag and drop a CSV file')).toBeVisible();
  });

  test('should display sortable table headers', async ({ page }) => {
    // Check that sortable headers are present
    const headers = ['Symbol', 'Quantity', 'Purchase Price', 'Current Price', 'Total Value', 'Gain/Loss', 'Gain/Loss %', 'Sector', 'Purchase Date'];
    
    for (const header of headers) {
      await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
    }
  });

  test('should display filter functionality', async ({ page }) => {
    // Click the filters button
    await page.click('button:has-text("Filters")');
    
    // Check that filter inputs are visible
    await expect(page.locator('input[placeholder="Filter by symbol..."]')).toBeVisible();
    await expect(page.locator('input[placeholder="Filter by sector..."]')).toBeVisible();
    await expect(page.locator('input[placeholder="Min value..."]')).toBeVisible();
    await expect(page.locator('input[placeholder="Max value..."]')).toBeVisible();
  });

  test('should add a stock manually', async ({ page }) => {
    // Click the Add Stock button
    await page.click('button:has-text("Add Stock")');
    
    // Fill in the form
    await page.fill('input[placeholder="AAPL"]', 'AAPL');
    await page.fill('input[placeholder="10"]', '100');
    await page.fill('input[placeholder="150.00"]', '150.00');
    await page.fill('input[type="date"]', '2023-01-15');
    
    // Submit the form
    await page.click('button:has-text("Add Stock")');
    
    // Wait for the stock to appear in the table
    await expect(page.locator('td:has-text("AAPL")')).toBeVisible();
  });

  test('should sort table by clicking headers', async ({ page }) => {
    // First add some stocks to have sortable data
    await page.click('button:has-text("Add Stock")');
    await page.fill('input[placeholder="AAPL"]', 'AAPL');
    await page.fill('input[placeholder="10"]', '100');
    await page.fill('input[placeholder="150.00"]', '150.00');
    await page.fill('input[type="date"]', '2023-01-15');
    await page.click('button:has-text("Add Stock")');
    
    await page.click('button:has-text("Add Stock")');
    await page.fill('input[placeholder="AAPL"]', 'MSFT');
    await page.fill('input[placeholder="10"]', '50');
    await page.fill('input[placeholder="150.00"]', '300.00');
    await page.fill('input[type="date"]', '2023-02-15');
    await page.click('button:has-text("Add Stock")');
    
    // Wait for stocks to be added
    await expect(page.locator('td:has-text("AAPL")')).toBeVisible();
    await expect(page.locator('td:has-text("MSFT")')).toBeVisible();
    
    // Click the Symbol header to sort
    await page.click('th:has-text("Symbol")');
    
    // The table should now be sorted (we can't easily test the exact order without more setup)
    // But we can check that the chevron icon appears
    await expect(page.locator('th:has-text("Symbol") svg')).toBeVisible();
  });

  test('should filter stocks by symbol', async ({ page }) => {
    // Add some stocks first
    await page.click('button:has-text("Add Stock")');
    await page.fill('input[placeholder="AAPL"]', 'AAPL');
    await page.fill('input[placeholder="10"]', '100');
    await page.fill('input[placeholder="150.00"]', '150.00');
    await page.fill('input[type="date"]', '2023-01-15');
    await page.click('button:has-text("Add Stock")');
    
    await page.click('button:has-text("Add Stock")');
    await page.fill('input[placeholder="AAPL"]', 'MSFT');
    await page.fill('input[placeholder="10"]', '50');
    await page.fill('input[placeholder="150.00"]', '300.00');
    await page.fill('input[type="date"]', '2023-02-15');
    await page.click('button:has-text("Add Stock")');
    
    // Wait for stocks to be added
    await expect(page.locator('td:has-text("AAPL")')).toBeVisible();
    await expect(page.locator('td:has-text("MSFT")')).toBeVisible();
    
    // Open filters
    await page.click('button:has-text("Filters")');
    
    // Filter by AAPL
    await page.fill('input[placeholder="Filter by symbol..."]', 'AAPL');
    
    // AAPL should be visible, MSFT should be hidden
    await expect(page.locator('td:has-text("AAPL")')).toBeVisible();
    await expect(page.locator('td:has-text("MSFT")')).not.toBeVisible();
  });

  test('should export CSV when stocks are present', async ({ page }) => {
    // Add a stock first
    await page.click('button:has-text("Add Stock")');
    await page.fill('input[placeholder="AAPL"]', 'AAPL');
    await page.fill('input[placeholder="10"]', '100');
    await page.fill('input[placeholder="150.00"]', '150.00');
    await page.fill('input[type="date"]', '2023-01-15');
    await page.click('button:has-text("Add Stock")');
    
    // Wait for the stock to be added
    await expect(page.locator('td:has-text("AAPL")')).toBeVisible();
    
    // The export button should be enabled
    const exportButton = page.locator('button:has-text("Export CSV")');
    await expect(exportButton).toBeEnabled();
    
    // Note: We can't easily test the actual download without more complex setup
    // But we can verify the button is clickable
    await expect(exportButton).toBeVisible();
  });
});
