# Stock Portfolio Tracker - Architecture Document

## 1. System Architecture Overview

### 1.1 High-Level Architecture
The application follows a three-tier architecture pattern:
- **Presentation Layer**: React 18 + Vite with TypeScript
- **Business Logic Layer**: Node.js/Express API server with TypeScript
- **Data Layer**: SQLite database with Prisma ORM and React Query caching

### 1.2 Architecture Principles
- **Separation of Concerns**: Clear separation between UI, business logic, and data
- **Scalability**: Modular design for easy feature additions
- **Maintainability**: Clean code principles and documentation
- **Testability**: Dependency injection and mock-friendly design

## 2. System Components

### 2.1 Frontend Components

#### 2.1.1 React Application Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard/
│   │   ├── Portfolio/
│   │   ├── StockEntry/
│   │   ├── BulkImport/
│   │   ├── Charts/
│   │   └── ui/
│   ├── hooks/
│   │   ├── usePortfolio.ts
│   │   ├── useStockData.ts
│   │   └── useFundamentals.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── stockService.ts
│   │   └── portfolioService.ts
│   ├── types/
│   │   ├── portfolio.ts
│   │   ├── stock.ts
│   │   └── api.ts
│   ├── utils/
│   │   ├── calculations.ts
│   │   ├── formatters.ts
│   │   └── validators.ts
│   └── lib/
│       ├── queryClient.ts
│       └── api.ts
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

#### 2.1.2 Key Components
- **Dashboard**: Main portfolio overview and summary
- **PortfolioTable**: Tabular view of all holdings
- **StockEntry**: Form for adding individual stocks
- **BulkImport**: CSV/text import functionality
- **StockDetails**: Individual stock performance view
- **Charts**: Performance visualization components

### 2.2 Backend Components

#### 2.2.1 API Server Structure
```
backend/
├── src/
│   ├── routes/
│   │   ├── portfolio.ts
│   │   ├── stocks.ts
│   │   └── fundamentals.ts
│   ├── services/
│   │   ├── yahooFinanceService.ts
│   │   ├── portfolioService.ts
│   │   ├── calculationService.ts
│   │   └── fundamentalService.ts
│   ├── middleware/
│   │   ├── validation.ts
│   │   ├── errorHandler.ts
│   │   └── rateLimiter.ts
│   ├── utils/
│   │   ├── cache.ts
│   │   ├── logger.ts
│   │   └── config.ts
│   └── types/
│       ├── portfolio.ts
│       ├── stock.ts
│       └── api.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── package.json
└── tsconfig.json
```

#### 2.2.2 API Endpoints
- **GET /api/portfolio**: Retrieve user portfolio
- **POST /api/portfolio/stock**: Add stock to portfolio
- **PUT /api/portfolio/stock/:id**: Update stock position
- **DELETE /api/portfolio/stock/:id**: Remove stock from portfolio
- **POST /api/portfolio/bulk**: Bulk import stocks
- **GET /api/stock/:symbol**: Get stock data
- **GET /api/stock/:symbol/history**: Get historical data

### 2.3 Data Layer

#### 2.3.1 Database Schema (Prisma)
```prisma
// prisma/schema.prisma
model Portfolio {
  id            String   @id @default(cuid())
  symbol        String
  quantity      Int
  purchasePrice Decimal  @db.Decimal(10,2)
  purchaseDate  DateTime
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([symbol])
}

model StockCache {
  symbol              String   @id
  currentPrice        Decimal? @db.Decimal(10,2)
  peRatio            Decimal? @db.Decimal(8,2)
  marketCap          BigInt?
  dividendYield      Decimal? @db.Decimal(5,2)
  earningsGrowth     Decimal? @db.Decimal(5,2)
  volume             Int?
  dayChange          Decimal? @db.Decimal(10,2)
  dayChangePercent   Decimal? @db.Decimal(5,2)
  week52High         Decimal? @db.Decimal(10,2)
  week52Low          Decimal? @db.Decimal(10,2)
  sector             String?
  sectorPeAverage    Decimal? @db.Decimal(8,2)
  roic               Decimal? @db.Decimal(5,2)
  salesGrowthRate    Decimal? @db.Decimal(5,2)
  epsGrowthRate      Decimal? @db.Decimal(5,2)
  bvpsGrowthRate     Decimal? @db.Decimal(5,2)
  fcfGrowthRate      Decimal? @db.Decimal(5,2)
  lastUpdated        DateTime @default(now())
}

model UserSettings {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```

## 3. External Integrations

### 3.1 Yahoo Finance API Integration

#### 3.1.1 API Endpoints Used
- **Quote**: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}`
- **Statistics**: `https://query1.finance.yahoo.com/v10/finance/quoteSummary/{symbol}`
- **Historical**: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=1y`

#### 3.1.2 Data Mapping
```javascript
// Yahoo Finance Response Mapping
const mapYahooData = (response) => ({
    symbol: response.symbol,
    currentPrice: response.regularMarketPrice,
    previousClose: response.regularMarketPreviousClose,
    dayChange: response.regularMarketChange,
    dayChangePercent: response.regularMarketChangePercent,
    volume: response.regularMarketVolume,
    marketCap: response.marketCap,
    peRatio: response.forwardPE || response.trailingPE,
    dividendYield: response.dividendYield,
    earningsGrowth: response.earningsGrowth,
    fiftyTwoWeekHigh: response.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: response.fiftyTwoWeekLow
});
```

### 3.2 Error Handling and Fallbacks
- **Rate Limiting**: Implement exponential backoff
- **API Failures**: Cached data fallback
- **Invalid Symbols**: User-friendly error messages
- **Network Issues**: Offline mode with cached data

## 4. Data Flow Architecture

### 4.1 Data Flow Diagram
```
User Interface → API Server → Yahoo Finance API
      ↓              ↓              ↓
   Redux Store ← Response ← Stock Data
      ↓              ↓              ↓
  Components ← Calculations ← Database Cache
```

### 4.2 Real-time Data Updates
- **WebSocket Connection**: Real-time price updates
- **Polling Mechanism**: Fallback for quote updates
- **Batch Updates**: Efficient multiple stock updates
- **Cache Invalidation**: Smart cache refresh strategy

## 5. Performance Considerations

### 5.1 Frontend Performance
- **Code Splitting**: Lazy loading of components
- **Memoization**: React.memo for expensive calculations
- **Virtual Scrolling**: Large portfolio handling
- **Debouncing**: Search and filter inputs

### 5.2 Backend Performance
- **Database Indexing**: Optimized queries
- **Connection Pooling**: Efficient database connections
- **Caching Strategy**: Redis for frequently accessed data
- **API Rate Limiting**: Respect Yahoo Finance limits

### 5.3 Caching Strategy
```javascript
// Cache Implementation
const cacheStrategy = {
    stockData: {
        ttl: 60, // 1 minute
        refreshOn: ['market_open', 'user_action']
    },
    portfolio: {
        ttl: 300, // 5 minutes
        refreshOn: ['portfolio_update']
    },
    historicalData: {
        ttl: 3600, // 1 hour
        refreshOn: ['daily']
    }
};
```

## 6. Security Architecture

### 6.1 Security Measures
- **Input Validation**: Sanitize all user inputs
- **API Key Management**: Secure storage of credentials
- **HTTPS**: Encrypted communications
- **CORS**: Proper cross-origin resource sharing
- **Rate Limiting**: Prevent abuse

### 6.2 Data Protection
- **Local Storage**: Encrypted portfolio data
- **Session Management**: Secure user sessions
- **Backup Encryption**: Encrypted backup files
- **Privacy**: No personal data transmitted

## 7. Deployment Architecture

### 7.1 Development Environment
- **Local Development**: Docker containers
- **Hot Reloading**: React and Node.js dev servers
- **Database**: SQLite for local development
- **Testing**: Jest and React Testing Library

### 7.2 Production Deployment
- **Containerization**: Docker containers
- **Reverse Proxy**: Nginx for static assets
- **Process Management**: PM2 for Node.js
- **Monitoring**: Application performance monitoring

## 8. Scalability Considerations

### 8.1 Horizontal Scaling
- **Stateless Services**: Enable load balancing
- **Database Sharding**: Future user growth
- **CDN Integration**: Static asset delivery
- **Microservices**: Future service decomposition

### 8.2 Vertical Scaling
- **Memory Optimization**: Efficient data structures
- **CPU Optimization**: Async operations
- **Database Optimization**: Query performance
- **Caching**: Reduced external API calls

## 9. Technology Stack

### 9.1 Frontend Technologies
- **React 18**: Modern UI framework with concurrent features
- **Vite**: Fast build tool with instant HMR
- **TypeScript**: Type safety for financial calculations
- **Tailwind CSS**: Utility-first CSS framework
- **React Query (TanStack Query)**: Server state management and caching
- **Recharts**: Declarative charting library for financial data
- **React Hook Form**: Form handling with validation
- **Axios**: HTTP client for API calls

### 9.2 Backend Technologies
- **Node.js 18+**: JavaScript runtime environment
- **Express.js**: Minimal web framework
- **TypeScript**: Type safety across the stack
- **Prisma**: Modern ORM with excellent TypeScript support
- **Better-sqlite3**: Fast, synchronous SQLite driver
- **node-cron**: Job scheduling for data updates
- **Winston**: Logging library

### 9.3 Database
- **SQLite**: Zero-config, file-based database
- **Prisma**: Database toolkit and ORM
- **Prisma Migrate**: Database schema migrations

### 9.4 Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Vitest**: Fast testing framework
- **Docker**: Containerization
- **GitHub Actions**: CI/CD pipeline
