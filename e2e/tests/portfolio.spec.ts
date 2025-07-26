import { test, expect } from '@playwright/test';

test.describe('Portfolio Tracker E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start the backend server and frontend before running tests
    await page.goto('http://localhost:3000');
  });

  test('should display portfolio tracker page', async ({ page }) => {
    // Check if the main heading is present
    await expect(page.getByRole('heading', { name: 'Portfolio Tracker' })).toBeVisible();
    
    // Check if the description is present
    await expect(page.getByText('Track your stock investments and performance')).toBeVisible();
    
    // Check if the Add Stock button is present
    await expect(page.getByRole('button', { name: 'Add Stock' })).toBeVisible();
  });

  test('should show empty state when no stocks are added', async ({ page }) => {
    // Check if empty state message is displayed
    await expect(page.getByText('No stocks in your portfolio yet.')).toBeVisible();
    await expect(page.getByText('Add your first stock to get started!')).toBeVisible();
  });

  test('should be able to add a new stock', async ({ page }) => {
    // Click the Add Stock button
    await page.getByRole('button', { name: 'Add Stock' }).click();
    
    // Fill out the form
    await page.getByPlaceholder('AAPL').fill('AAPL');
    await page.getByPlaceholder('10').fill('10');
    await page.getByPlaceholder('150.00').fill('150.00');
    
    // Submit the form
    await page.getByRole('button', { name: 'Add Stock' }).click();
    
    // Wait for the stock to be added and check if it appears in the table
    await expect(page.getByText('AAPL')).toBeVisible();
    await expect(page.getByText('10')).toBeVisible();
    await expect(page.getByText('$150.00')).toBeVisible();
  });

  test('should display portfolio summary when stocks are added', async ({ page }) => {
    // Add a stock first
    await page.getByRole('button', { name: 'Add Stock' }).click();
    await page.getByPlaceholder('AAPL').fill('AAPL');
    await page.getByPlaceholder('10').fill('10');
    await page.getByPlaceholder('150.00').fill('150.00');
    await page.getByRole('button', { name: 'Add Stock' }).click();
    
    // Wait for the stock to be added
    await expect(page.getByText('AAPL')).toBeVisible();
    
    // Check if portfolio summary cards are displayed
    await expect(page.getByText('Total Value')).toBeVisible();
    await expect(page.getByText('Total Gain/Loss')).toBeVisible();
    await expect(page.getByText('Gain/Loss %')).toBeVisible();
    await expect(page.getByText('Total Stocks')).toBeVisible();
  });

  test('should be able to delete a stock', async ({ page }) => {
    // Add a stock first
    await page.getByRole('button', { name: 'Add Stock' }).click();
    await page.getByPlaceholder('AAPL').fill('AAPL');
    await page.getByPlaceholder('10').fill('10');
    await page.getByPlaceholder('150.00').fill('150.00');
    await page.getByRole('button', { name: 'Add Stock' }).click();
    
    // Wait for the stock to be added
    await expect(page.getByText('AAPL')).toBeVisible();
    
    // Click the delete button
    await page.getByRole('button', { name: 'Delete' }).click();
    
    // Check if the stock is removed
    await expect(page.getByText('No stocks in your portfolio yet.')).toBeVisible();
  });

  test('should validate form inputs', async ({ page }) => {
    // Click the Add Stock button
    await page.getByRole('button', { name: 'Add Stock' }).click();
    
    // Try to submit without filling required fields
    await page.getByRole('button', { name: 'Add Stock' }).click();
    
    // Check if the form is still visible (validation should prevent submission)
    await expect(page.getByText('Add New Stock')).toBeVisible();
    
    // Check if required field validation works
    await expect(page.getByPlaceholder('AAPL')).toHaveAttribute('required');
    await expect(page.getByPlaceholder('10')).toHaveAttribute('required');
    await expect(page.getByPlaceholder('150.00')).toHaveAttribute('required');
  });

  test('should be able to cancel adding a stock', async ({ page }) => {
    // Click the Add Stock button
    await page.getByRole('button', { name: 'Add Stock' }).click();
    
    // Check if the form is visible
    await expect(page.getByText('Add New Stock')).toBeVisible();
    
    // Click the Cancel button
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Check if the form is hidden
    await expect(page.getByText('Add New Stock')).not.toBeVisible();
  });
});
