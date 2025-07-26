# Stock Portfolio Tracker - Test Cases

## 1. Test Case Overview

### 1.1 Test Categories
- **Unit Tests**: Individual function and component testing
- **Integration Tests**: API and database integration testing
- **End-to-End Tests**: Complete user workflow testing
- **Performance Tests**: Load and stress testing
- **Security Tests**: Input validation and security testing

### 1.2 Test Coverage Requirements
- **Code Coverage**: Minimum 90% line coverage
- **Branch Coverage**: Minimum 85% branch coverage
- **Function Coverage**: 100% function coverage
- **Integration Coverage**: All API endpoints and database operations

## 2. Portfolio Management Test Cases

### 2.1 Add Stock to Portfolio

#### TC-001: Add Valid Stock Successfully
**Requirement:** REQ-001  
**Priority:** High  
**Test Type:** Integration  

**Preconditions:**
- Application is running
- Database is accessible
- Yahoo Finance API is available

**Test Steps:**
1. Navigate to "Add Stock" form
2. Enter valid stock symbol "AAPL"
3. Enter quantity "100"
4. Enter purchase price "150.00"
5. Select purchase date "2024-01-15"
6. Click "Add to Portfolio" button

**Expected Results:**
- Stock symbol is validated successfully
- Current price is fetched from Yahoo Finance
- Stock is added to portfolio table
- Success message is displayed
- Portfolio table is updated with new entry

**Test Data:**
```json
{
  "symbol": "AAPL",
  "quantity": 100,
  "purchasePrice": 150.00,
  "purchaseDate": "2024-01-15"
}
```

---

#### TC-002: Add Stock with Invalid Symbol
**Requirement:** REQ-001  
**Priority:** High  
**Test Type:** Integration  

**Preconditions:**
- Application is running
- Database is accessible

**Test Steps:**
1. Navigate to "Add Stock" form
2. Enter invalid stock symbol "INVALID"
3. Enter quantity "100"
4. Enter purchase price "150.00"
5. Select purchase date "2024-01-15"
6. Click "Add to Portfolio" button

**Expected Results:**
- Error message "Invalid stock symbol" is displayed
- Stock is not added to portfolio
- Form remains open for correction
- API error is logged

---

#### TC-003: Add Stock with Empty Fields
**Requirement:** REQ-001  
**Priority:** Medium  
**Test Type:** Unit  

**Test Steps:**
1. Navigate to "Add Stock" form
2. Leave all fields empty
3. Click "Add to Portfolio" button

**Expected Results:**
- Validation errors displayed for required fields
- Submit button remains disabled
- No API calls are made
- Form highlights missing fields

---

### 2.2 Bulk Import Stocks

#### TC-004: Bulk Import Valid CSV
**Requirement:** REQ-002  
**Priority:** High  
**Test Type:** Integration  

**Test Data:**
```csv
Symbol,Quantity,Purchase Price,Purchase Date
AAPL,100,150.00,2024-01-15
GOOGL,50,2800.00,2024-01-20
MSFT,75,300.00,2024-01-25
```

**Test Steps:**
1. Navigate to "Bulk Import" interface
2. Upload CSV file with test data
3. Review preview table
4. Click "Import Valid Items"

**Expected Results:**
- All 3 stocks are validated successfully
- Preview shows correct data
- All stocks are added to portfolio
- Success summary is displayed

---

#### TC-005: Bulk Import with Invalid Symbols
**Requirement:** REQ-002  
**Priority:** High  
**Test Type:** Integration  

**Test Data:**
```csv
Symbol,Quantity,Purchase Price,Purchase Date
AAPL,100,150.00,2024-01-15
INVALID,50,100.00,2024-01-20
GOOGL,75,2800.00,2024-01-25
```

**Test Steps:**
1. Navigate to "Bulk Import" interface
2. Upload CSV file with mixed valid/invalid data
3. Review preview table
4. Click "Import Valid Items"

**Expected Results:**
- AAPL and GOOGL are validated successfully
- INVALID symbol shows error in preview
- Only valid stocks are imported
- Summary shows 2 successful, 1 failed

---

### 2.3 Portfolio Calculations

#### TC-006: Calculate Return Since Purchase
**Requirement:** REQ-012  
**Priority:** High  
**Test Type:** Unit  

**Test Data:**
```json
{
  "symbol": "AAPL",
  "quantity": 100,
  "purchasePrice": 150.00,
  "currentPrice": 175.00
}
```

**Test Steps:**
1. Call calculateReturn function with test data
2. Verify absolute gain calculation
3. Verify percentage gain calculation

**Expected Results:**
- Absolute gain: $2,500.00
- Percentage gain: 16.67%
- Calculations are accurate to 2 decimal places

---

#### TC-007: Calculate Portfolio Total Value
**Requirement:** REQ-015  
**Priority:** High  
**Test Type:** Unit  

**Test Data:**
```json
[
  {"symbol": "AAPL", "quantity": 100, "currentPrice": 175.00},
  {"symbol": "GOOGL", "quantity": 50, "currentPrice": 2750.00},
  {"symbol": "MSFT", "quantity": 75, "currentPrice": 350.00}
]
```

**Test Steps:**
1. Call calculatePortfolioValue function
2. Verify total value calculation

**Expected Results:**
- Total portfolio value: $181,750.00
- Calculation includes all holdings

---

## 3. Yahoo Finance API Integration Test Cases

### 3.1 Stock Data Retrieval

#### TC-008: Fetch Current Stock Price
**Requirement:** REQ-006  
**Priority:** High  
**Test Type:** Integration  

**Test Steps:**
1. Call yahooFinanceService.getStockPrice("AAPL")
2. Verify response structure
3. Check data freshness

**Expected Results:**
- Valid price data returned
- Response includes required fields
- Data is current (within 15 minutes)

---

#### TC-009: Handle API Rate Limiting
**Requirement:** REQ-006  
**Priority:** Medium  
**Test Type:** Integration  

**Test Steps:**
1. Make rapid API calls exceeding rate limit
2. Monitor response and retry behavior
3. Verify exponential backoff

**Expected Results:**
- Rate limit errors are handled gracefully
- Exponential backoff is implemented
- Successful retry after backoff period

---

#### TC-010: Fetch Stock Fundamentals
**Requirement:** REQ-009, REQ-010  
**Priority:** High  
**Test Type:** Integration  

**Test Steps:**
1. Call yahooFinanceService.getStockFundamentals("AAPL")
2. Verify P/E ratio is returned
3. Verify earnings growth data

**Expected Results:**
- P/E ratio is numeric and positive
- Earnings growth is percentage format
- Data is consistent with Yahoo Finance

---

### 3.2 Error Handling

#### TC-011: Handle Network Timeout
**Requirement:** REQ-032  
**Priority:** Medium  
**Test Type:** Integration  

**Test Steps:**
1. Simulate network timeout
2. Verify error handling
3. Check fallback behavior

**Expected Results:**
- Timeout error is caught
- Cached data is used if available
- User-friendly error message displayed

---

#### TC-012: Handle Invalid API Response
**Requirement:** REQ-032  
**Priority:** Medium  
**Test Type:** Integration  

**Test Steps:**
1. Mock invalid API response
2. Verify response validation
3. Check error handling

**Expected Results:**
- Invalid response is detected
- Error is logged appropriately
- Default values are used where appropriate

---

## 4. User Interface Test Cases

### 4.1 Dashboard Display

#### TC-013: Display Portfolio Summary
**Requirement:** REQ-018  
**Priority:** High  
**Test Type:** End-to-End  

**Test Steps:**
1. Navigate to dashboard
2. Verify portfolio summary cards
3. Check data accuracy

**Expected Results:**
- Total portfolio value is displayed
- Gain/loss calculations are correct
- Performance metrics are shown

---

#### TC-014: Sort Portfolio Table
**Requirement:** REQ-021  
**Priority:** Medium  
**Test Type:** End-to-End  

**Test Steps:**
1. Navigate to portfolio table
2. Click on "Symbol" column header
3. Verify sorting behavior
4. Click again to reverse sort

**Expected Results:**
- Table sorts alphabetically by symbol
- Reverse sort works correctly
- Sort indicator is displayed

---

### 4.2 Responsive Design

#### TC-015: Mobile Layout Adaptation
**Requirement:** REQ-025  
**Priority:** Medium  
**Test Type:** End-to-End  

**Test Steps:**
1. Open application on mobile device
2. Navigate through all sections
3. Verify layout adaptation

**Expected Results:**
- Layout adapts to mobile screen
- All features remain accessible
- Text is readable without zooming

---

## 5. Performance Test Cases

### 5.1 Load Testing

#### TC-016: Large Portfolio Performance
**Requirement:** REQ-030  
**Priority:** Medium  
**Test Type:** Performance  

**Test Data:**
- Portfolio with 1000 stocks

**Test Steps:**
1. Create portfolio with 1000 stocks
2. Measure page load time
3. Verify table rendering performance

**Expected Results:**
- Page loads within 5 seconds
- Table scrolling is smooth
- Memory usage remains reasonable

---

#### TC-017: Bulk Import Performance
**Requirement:** REQ-002  
**Priority:** Medium  
**Test Type:** Performance  

**Test Data:**
- CSV file with 500 stocks

**Test Steps:**
1. Import CSV with 500 stocks
2. Measure import time
3. Monitor memory usage

**Expected Results:**
- Import completes within 30 seconds
- Progress indicator shows status
- No memory leaks detected

---

### 5.2 API Performance

#### TC-018: Concurrent API Calls
**Requirement:** REQ-028  
**Priority:** Medium  
**Test Type:** Performance  

**Test Steps:**
1. Make 50 concurrent API calls
2. Measure response times
3. Verify no failures

**Expected Results:**
- All calls complete successfully
- Average response time < 2 seconds
- No API errors due to concurrency

---

## 6. Security Test Cases

### 6.1 Input Validation

#### TC-019: SQL Injection Prevention
**Requirement:** REQ-036  
**Priority:** High  
**Test Type:** Security  

**Test Steps:**
1. Enter SQL injection payload in stock symbol field
2. Attempt to submit form
3. Verify input sanitization

**Expected Results:**
- Malicious input is detected
- Input is sanitized or rejected
- No database errors occur

---

#### TC-020: XSS Prevention
**Requirement:** REQ-036  
**Priority:** High  
**Test Type:** Security  

**Test Steps:**
1. Enter XSS payload in form fields
2. Verify output encoding
3. Check for script execution

**Expected Results:**
- XSS payload is neutralized
- Output is properly encoded
- No script execution occurs

---

### 6.2 Data Protection

#### TC-021: API Key Security
**Requirement:** REQ-035  
**Priority:** High  
**Test Type:** Security  

**Test Steps:**
1. Inspect client-side code
2. Check network requests
3. Verify API key handling

**Expected Results:**
- API keys are not exposed
- Keys are securely stored
- No keys in client-side code

---

## 7. Regression Test Cases

### 7.1 Core Functionality

#### TC-022: End-to-End Portfolio Workflow
**Requirement:** Multiple  
**Priority:** High  
**Test Type:** End-to-End  

**Test Steps:**
1. Add single stock to portfolio
2. Perform bulk import
3. View portfolio performance
4. Export portfolio data
5. Verify all operations

**Expected Results:**
- All operations complete successfully
- Data consistency maintained
- No errors in workflow

---

## 8. TDD Test Case Names

### 8.1 Unit Test Names (Jest Format)

```javascript
// Portfolio Service Tests
describe('PortfolioService', () => {
  describe('addStock', () => {
    it('should add valid stock to portfolio');
    it('should reject invalid stock symbol');
    it('should validate required fields');
    it('should calculate initial position value');
  });

  describe('calculateReturns', () => {
    it('should calculate positive returns correctly');
    it('should calculate negative returns correctly');
    it('should handle zero returns');
    it('should format percentage to 2 decimal places');
  });

  describe('getPortfolioValue', () => {
    it('should sum all stock values correctly');
    it('should handle empty portfolio');
    it('should exclude invalid stocks');
  });
});

// Yahoo Finance Service Tests
describe('YahooFinanceService', () => {
  describe('getStockPrice', () => {
    it('should fetch current stock price');
    it('should handle invalid symbols');
    it('should implement rate limiting');
    it('should cache responses');
  });

  describe('getStockFundamentals', () => {
    it('should fetch P/E ratio');
    it('should fetch earnings growth');
    it('should handle missing data');
  });
});

// Portfolio Controller Tests
describe('PortfolioController', () => {
  describe('POST /api/portfolio/stock', () => {
    it('should create new stock position');
    it('should validate input data');
    it('should return 400 for invalid data');
    it('should return 201 for successful creation');
  });

  describe('GET /api/portfolio', () => {
    it('should return all portfolio items');
    it('should return empty array for new portfolio');
    it('should include calculated returns');
  });
});

// React Component Tests
describe('PortfolioTable', () => {
  it('should render portfolio data correctly');
  it('should sort by column when header clicked');
  it('should display gain/loss with correct colors');
  it('should handle empty portfolio state');
});

describe('StockEntryForm', () => {
  it('should validate stock symbol on blur');
  it('should submit form with valid data');
  it('should display validation errors');
  it('should reset form after successful submission');
});

describe('BulkImportModal', () => {
  it('should parse CSV file correctly');
  it('should validate imported data');
  it('should show preview before import');
  it('should handle import errors gracefully');
});
```

### 8.2 Integration Test Names

```javascript
// API Integration Tests
describe('Portfolio API Integration', () => {
  it('should create portfolio with valid stock data');
  it('should fetch real-time prices from Yahoo Finance');
  it('should handle API rate limiting gracefully');
  it('should persist portfolio data correctly');
});

// Database Integration Tests
describe('Database Integration', () => {
  it('should save portfolio data to database');
  it('should retrieve portfolio with calculated returns');
  it('should handle database connection errors');
  it('should maintain data consistency');
});

// External Service Integration Tests
describe('Yahoo Finance Integration', () => {
  it('should fetch stock data successfully');
  it('should handle service unavailability');
  it('should respect rate limits');
  it('should cache frequently accessed data');
});
```

### 8.3 End-to-End Test Names

```javascript
// E2E Test Scenarios
describe('Portfolio Management E2E', () => {
  it('should complete add stock workflow');
  it('should perform bulk import successfully');
  it('should display portfolio with returns');
  it('should export portfolio data');
  it('should handle errors gracefully');
});

describe('User Interface E2E', () => {
  it('should navigate between all sections');
  it('should maintain responsive design');
  it('should display real-time updates');
  it('should handle user interactions correctly');
});
```

## 9. Test Data Management

### 9.1 Test Data Sets

```javascript
// Valid Stock Data
const validStockData = {
  symbol: 'AAPL',
  quantity: 100,
  purchasePrice: 150.00,
  purchaseDate: '2024-01-15',
  currentPrice: 175.00
};

// Invalid Stock Data
const invalidStockData = {
  symbol: 'INVALID',
  quantity: -10,
  purchasePrice: 0,
  purchaseDate: 'invalid-date'
};

// Bulk Import Data
const bulkImportData = `
Symbol,Quantity,Purchase Price,Purchase Date
AAPL,100,150.00,2024-01-15
GOOGL,50,2800.00,2024-01-20
MSFT,75,300.00,2024-01-25
`;
```

### 9.2 Mock Data

```javascript
// Mock Yahoo Finance Response
const mockYahooResponse = {
  regularMarketPrice: 175.00,
  regularMarketChange: 2.50,
  regularMarketChangePercent: 1.45,
  forwardPE: 28.5,
  earningsGrowth: 0.12,
  marketCap: 2750000000000
};

// Mock Portfolio Data
const mockPortfolio = [
  {
    id: 1,
    symbol: 'AAPL',
    quantity: 100,
    purchasePrice: 150.00,
    purchaseDate: '2024-01-15',
    currentPrice: 175.00
  },
  {
    id: 2,
    symbol: 'GOOGL',
    quantity: 50,
    purchasePrice: 2800.00,
    purchaseDate: '2024-01-20',
    currentPrice: 2750.00
  }
];
```

## 10. Test Environment Setup

### 10.1 Test Database Configuration
```javascript
// Test database setup
const testDbConfig = {
  database: ':memory:',
  dialect: 'sqlite',
  logging: false,
  storage: ':memory:'
};
```

### 10.2 Mock Services
```javascript
// Mock Yahoo Finance Service
const mockYahooService = {
  getStockPrice: jest.fn(),
  getStockFundamentals: jest.fn(),
  validateSymbol: jest.fn()
};
```

### 10.3 Test Coverage Configuration
```javascript
// Jest coverage configuration
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',
    '!src/serviceWorker.js'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 100,
      lines: 90,
      statements: 90
    }
  }
};
```
