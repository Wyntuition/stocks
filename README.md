# Stock Portfolio Tracker - MVP

This is the MVP implementation (Release 0.1.0) of the Stock Portfolio Tracker application.

## Features

- Add stocks to your portfolio with purchase details
- View comprehensive stock data including financial metrics
- Track portfolio performance with gain/loss calculations
- Modern, responsive web interface
- Real-time stock data from Yahoo Finance API

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Query
- **Backend**: Node.js, Express, TypeScript, Prisma, SQLite
- **Testing**: Playwright (E2E tests)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd financial-management-agents
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Install E2E Test Dependencies**
   ```bash
   cd ../e2e
   npm install
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   The backend will run on `http://localhost:3001`

2. **Start the Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on `http://localhost:3000`

3. **Access the Application**
   Open your browser to `http://localhost:3000`

### Running Tests

**End-to-End Tests**
```bash
cd e2e
npm run test
```

**Run Tests with UI**
```bash
cd e2e
npm run test:ui
```

## API Endpoints

- `GET /api/portfolio` - Get all portfolio items
- `GET /api/portfolio/summary` - Get portfolio summary
- `POST /api/portfolio/stock` - Add new stock
- `PUT /api/portfolio/stock/:id` - Update stock
- `DELETE /api/portfolio/stock/:id` - Delete stock
- `GET /health` - Health check

## Database

The application uses SQLite for local development. The database file is created automatically when you first run the backend.

## Features Implemented

### Core Features
- ✅ Add stocks with symbol, quantity, purchase price, and date
- ✅ View portfolio with all holdings
- ✅ Real-time stock price updates via Yahoo Finance API
- ✅ Calculate gain/loss and percentage changes
- ✅ Portfolio summary with total value and performance

### Extended Features
- ✅ Sector PE ratio comparison
- ✅ Financial metrics (ROIC, Sales Growth, EPS Growth, etc.)
- ✅ Comprehensive stock data display
- ✅ Modern, responsive UI
- ✅ Form validation and error handling

## Architecture

```
financial-management-agents/
├── backend/              # Express.js API server
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── utils/        # Utilities
│   │   └── types/        # TypeScript types
│   ├── prisma/           # Database schema
│   └── package.json
├── frontend/             # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API client
│   │   └── types/        # TypeScript types
│   └── package.json
├── e2e/                  # End-to-end tests
│   ├── tests/
│   └── package.json
└── shared/               # Shared type definitions
```

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

MIT License
