
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
  sector?: string;
  sectorPeAverage?: number;
  roic?: number;
  salesGrowthRate?: number;
  epsGrowthRate?: number;
  bvpsGrowthRate?: number;
  fcfGrowthRate?: number;
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
