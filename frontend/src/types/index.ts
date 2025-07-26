export interface StockData {
  symbol: string;
  currentPrice?: number;
  previousClose?: number;
  dayChange?: number;
  dayChangePercent?: number;
  change6Month?: number;
  change6MonthPercent?: number;
  change1Year?: number;
  change1YearPercent?: number;
  change3Year?: number;
  change3YearPercent?: number;
  volume?: number;
  avgVolume?: number;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  earningsGrowth?: number;
  week52High?: number;
  week52Low?: number;
  movingAverage50Day?: number;
  sector?: string;
  industry?: string;
  sectorPeAverage?: number;
  roic?: number;
  salesGrowthRate?: number;
  epsGrowthRate?: number;
  // Additional financial metrics
  totalRevenue?: number;
  totalDebt?: number;
  totalCash?: number;
  freeCashflow?: number;
  ebitda?: number;
  returnOnAssets?: number;
  returnOnEquity?: number;
  profitMargins?: number;
  operatingMargins?: number;
  currentRatio?: number;
  quickRatio?: number;
  debtToEquity?: number;
  priceToBook?: number;
  pegRatio?: number;
  bookValue?: number;
  trailingEps?: number;
  forwardEps?: number;
  payoutRatio?: number;
}

export interface PortfolioItem {
  id: string;
  symbol: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: Date;
  currentPrice?: number;
  totalValue?: number;
  gainLoss?: number;
  gainLossPercent?: number;
  stockData?: StockData;
}

export interface CreatePortfolioItemRequest {
  symbol: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
}

export interface UpdatePortfolioItemRequest {
  quantity?: number;
  purchasePrice?: number;
  purchaseDate?: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  annualizedReturn: number;
  totalCashInvested: number;
  itemCount: number;
  timeBasedReturns?: {
    sixMonth?: number;
    oneYear?: number;
    threeYear?: number;
    fiveYear?: number;
    tenYear?: number;
  };
}
