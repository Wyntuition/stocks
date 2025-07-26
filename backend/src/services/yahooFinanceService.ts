import axios from 'axios';
import { StockData } from '../types';
import { logger } from '../utils/logger';

interface YahooFinanceResponse {
  quoteSummary: {
    result: Array<{
      price: {
        regularMarketPrice: { raw: number };
        regularMarketPreviousClose: { raw: number };
        regularMarketVolume: { raw: number };
        marketCap: { raw: number };
      };
      summaryDetail: {
        fiftyTwoWeekHigh: { raw: number };
        fiftyTwoWeekLow: { raw: number };
        dividendYield: { raw: number };
        trailingPE: { raw: number };
        forwardPE: { raw: number };
        averageVolume: { raw: number };
        payoutRatio: { raw: number };
      };
      keyStatistics: {
        forwardPE: { raw: number };
        earningsGrowth: { raw: number };
        returnOnEquity: { raw: number };
        revenueGrowth: { raw: number };
        bookValue: { raw: number };
        freeCashflow: { raw: number };
        returnOnAssets: { raw: number };
        profitMargins: { raw: number };
        priceToBook: { raw: number };
      };
      financialData: {
        returnOnEquity: { raw: number };
        returnOnAssets: { raw: number };
        totalRevenue: { raw: number };
        revenueGrowth: { raw: number };
        earningsGrowth: { raw: number };
        freeCashflow: { raw: number };
        totalCash: { raw: number };
        totalDebt: { raw: number };
        ebitda: { raw: number };
        grossMargins: { raw: number };
        operatingMargins: { raw: number };
        profitMargins: { raw: number };
        currentRatio: { raw: number };
        quickRatio: { raw: number };
        debtToEquity: { raw: number };
      };
      assetProfile: {
        sector: string;
        industry: string;
      };
      defaultKeyStatistics: {
        trailingEps: { raw: number };
        forwardEps: { raw: number };
        pegRatio: { raw: number };
        bookValue: { raw: number };
        priceToBook: { raw: number };
        sharesOutstanding: { raw: number };
      };
      earningsTrend: {
        trend: Array<{
          period: string;
          growth: { raw: number };
        }>;
      };
    }>;
  };
}

class YahooFinanceService {
  private stockCache = new Map<string, { data: StockData; timestamp: number }>();
  private sectorPeCache = new Map<string, { average: number; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly SECTOR_PE_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  async getStockData(symbol: string): Promise<StockData> {
    const cached = this.stockCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      logger.info(`Fetching stock data for ${symbol}`);
      
      // First, try to get basic price data from the chart API (more reliable)
      const chartResponse = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
        {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
        }
      );

      const chartData = chartResponse.data.chart?.result?.[0];
      if (!chartData) {
        throw new Error(`No chart data found for symbol: ${symbol}`);
      }

      const meta = chartData.meta;
      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.previousClose || meta.chartPreviousClose;
      
      // Try to get additional data from quoteSummary (may fail but we'll have basic data)
      let additionalData: any = {};
      try {
        const response = await axios.get<YahooFinanceResponse>(
          `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`,
          {
            params: {
              modules: 'price,summaryDetail,keyStatistics,assetProfile,financialData,defaultKeyStatistics,earningsTrend',
            },
            timeout: 5000, // Shorter timeout for supplementary data
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
          }
        );
        
        const result = response.data.quoteSummary?.result?.[0];
        if (result) {
          additionalData = result;
          logger.info(`Successfully fetched additional data for ${symbol}`);
        }
      } catch (error) {
        logger.warn(`Could not fetch additional data for ${symbol}, using basic chart data only`, {
          error: error instanceof Error ? error.message : String(error),
          status: (error as any)?.response?.status,
          statusText: (error as any)?.response?.statusText,
        });
      }

      // Extract data from both sources
      const { price, summaryDetail, keyStatistics, assetProfile, financialData, defaultKeyStatistics, earningsTrend } = additionalData;
      
      // Use chart data for basic pricing (more reliable)
      const dayChange = currentPrice - previousClose;
      const dayChangePercent = previousClose > 0 ? (dayChange / previousClose) * 100 : 0;
      
      // Get sector information from additional data or use reasonable defaults
      const sector = assetProfile?.sector || this.estimateSectorFromSymbol(symbol);
      const longName = meta.longName || meta.shortName;

      // Get earnings growth from multiple sources or estimate
      const earningsGrowth = financialData?.earningsGrowth?.raw || 
                           keyStatistics?.earningsGrowth?.raw ||
                           (earningsTrend?.trend?.find((t: any) => t.period === '+1y')?.growth?.raw) ||
                           this.estimateEarningsGrowth(symbol);

      // Get revenue/sales growth or estimate
      const salesGrowthRate = financialData?.revenueGrowth?.raw || 
                             keyStatistics?.revenueGrowth?.raw ||
                             this.estimateSalesGrowth(symbol);

      // Get free cash flow or estimate based on market cap
      const freeCashflow = financialData?.freeCashflow?.raw || 
                          keyStatistics?.freeCashflow?.raw ||
                          (meta.marketCap ? meta.marketCap * 0.08 : undefined); // Estimate 8% of market cap

      // Calculate ROIC using available data or estimate
      const roic = financialData?.returnOnEquity?.raw || 
                  keyStatistics?.returnOnEquity?.raw ||
                  this.estimateROIC(symbol);

      // Get book value and calculate BVPS growth
      const bookValue = defaultKeyStatistics?.bookValue?.raw || keyStatistics?.bookValue?.raw;
      const priceToBook = defaultKeyStatistics?.priceToBook?.raw || keyStatistics?.priceToBook?.raw;

      // Estimate P/E ratio from sector averages if not available
      const peRatio = keyStatistics?.forwardPE?.raw || 
                     summaryDetail?.trailingPE?.raw || 
                     summaryDetail?.forwardPE?.raw ||
                     this.estimatePERatio(symbol, sector);

      // Estimate dividend yield for dividend-paying stocks  
      const rawDividendYield = summaryDetail?.dividendYield?.raw;
      const estimatedDividendYield = this.estimateDividendYield(symbol);
      
      // Yahoo's dividendYield is already in decimal form (e.g., 0.007 for 0.7%), so multiply by 100
      // Our estimates are also in percentage form (e.g., 0.72 for 0.72%), so they're already ready
      const dividendYield = rawDividendYield ? rawDividendYield * 100 : estimatedDividendYield;

      // Calculate performance metrics
      const movingAverage50Day = await this.get50DayMovingAverage(symbol);
      const sixMonthChange = currentPrice ? await this.get6MonthChange(symbol, currentPrice) : undefined;
      const oneYearChange = currentPrice ? await this.get1YearChange(symbol, currentPrice) : undefined;
      const threeYearChange = currentPrice ? await this.get3YearChange(symbol, currentPrice) : undefined;

      const stockData: StockData = {
        symbol,
        currentPrice: currentPrice || 0,
        previousClose: previousClose || 0,
        dayChange: dayChange,
        dayChangePercent: dayChangePercent,
        change6Month: sixMonthChange?.change,
        change6MonthPercent: sixMonthChange?.changePercent,
        change1Year: oneYearChange?.change,
        change1YearPercent: oneYearChange?.changePercent,
        change3Year: threeYearChange?.change,
        change3YearPercent: threeYearChange?.changePercent,
        volume: meta.regularMarketVolume || price?.regularMarketVolume?.raw,
        avgVolume: summaryDetail?.averageVolume?.raw,
        marketCap: meta.marketCap || price?.marketCap?.raw,
        peRatio: peRatio,
        dividendYield: dividendYield,
        earningsGrowth: earningsGrowth ? earningsGrowth * 100 : undefined,
        week52High: meta.fiftyTwoWeekHigh || summaryDetail?.fiftyTwoWeekHigh?.raw || 0,
        week52Low: meta.fiftyTwoWeekLow || summaryDetail?.fiftyTwoWeekLow?.raw || 0,
        movingAverage50Day: movingAverage50Day,
        sector: sector || undefined,
        industry: assetProfile?.industry || undefined,
        sectorPeAverage: await this.getSectorPeAverage(sector),
        roic: roic ? roic * 100 : undefined,
        salesGrowthRate: salesGrowthRate ? salesGrowthRate * 100 : undefined,
        epsGrowthRate: earningsGrowth ? earningsGrowth * 100 : undefined,
        
        // Additional financial metrics
        totalRevenue: financialData?.totalRevenue?.raw,
        totalDebt: financialData?.totalDebt?.raw,
        totalCash: financialData?.totalCash?.raw,
        freeCashflow: freeCashflow,
        ebitda: financialData?.ebitda?.raw,
        returnOnAssets: (financialData?.returnOnAssets?.raw || keyStatistics?.returnOnAssets?.raw) ? 
                       (financialData?.returnOnAssets?.raw || keyStatistics?.returnOnAssets?.raw) * 100 : undefined,
        returnOnEquity: roic,
        profitMargins: (financialData?.profitMargins?.raw || keyStatistics?.profitMargins?.raw) ? 
                      (financialData?.profitMargins?.raw || keyStatistics?.profitMargins?.raw) * 100 : undefined,
        operatingMargins: financialData?.operatingMargins?.raw ? financialData.operatingMargins.raw * 100 : undefined,
        currentRatio: financialData?.currentRatio?.raw,
        quickRatio: financialData?.quickRatio?.raw,
        debtToEquity: financialData?.debtToEquity?.raw,
        priceToBook: priceToBook,
        pegRatio: defaultKeyStatistics?.pegRatio?.raw,
        bookValue: bookValue,
        trailingEps: defaultKeyStatistics?.trailingEps?.raw,
        forwardEps: defaultKeyStatistics?.forwardEps?.raw,
        payoutRatio: summaryDetail?.payoutRatio?.raw ? summaryDetail.payoutRatio.raw * 100 : undefined,
      };

      this.stockCache.set(symbol, { data: stockData, timestamp: Date.now() });
      logger.info(`Successfully fetched stock data for ${symbol}`);
      return stockData;
    } catch (error: any) {
      logger.error(`Error fetching stock data for ${symbol}:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
      });
      
      // For development/demo purposes, return mock data instead of throwing
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        logger.warn(`Returning mock data for ${symbol} due to API failure`);
        return this.getMockStockData(symbol);
      }
      
      throw new Error(`Failed to fetch stock data for ${symbol}: ${error.message}`);
    }
  }

  private getMockStockData(symbol: string): StockData {
    // Return mock data for development/demo purposes
    const mockPrices: { [key: string]: number } = {
      AAPL: 175.00,
      GOOGL: 2800.00,
      MSFT: 350.00,
      TSLA: 250.00,
      AMZN: 3100.00,
    };
    
    const basePrice = mockPrices[symbol] || 100.00;
    const currentPrice = basePrice + (Math.random() - 0.5) * 10; // Random variation
    const previousClose = basePrice;
    
    return {
      symbol,
      currentPrice,
      previousClose,
      dayChange: currentPrice - previousClose,
      dayChangePercent: ((currentPrice - previousClose) / previousClose * 100),
      change6Month: (Math.random() - 0.5) * currentPrice * 0.3, // Mock 6-month change
      change6MonthPercent: (Math.random() - 0.5) * 30, // Mock 6-month percent change
      change3Year: (Math.random() - 0.2) * currentPrice * 0.8, // Mock 3-year change (slightly positive bias)
      change3YearPercent: (Math.random() - 0.2) * 80, // Mock 3-year percent change
      volume: 1000000 + Math.floor(Math.random() * 5000000),
      avgVolume: 1500000,
      marketCap: currentPrice * 1000000000, // Mock market cap
      peRatio: 20 + Math.random() * 15,
      dividendYield: Math.random() * 3,
      earningsGrowth: Math.random() * 20,
      week52High: currentPrice * 1.2,
      week52Low: currentPrice * 0.8,
      movingAverage50Day: currentPrice * (0.95 + Math.random() * 0.1), // Mock 50-day MA near current price
      sector: 'Technology',
      industry: 'Software',
      sectorPeAverage: 25,
      roic: 15 + Math.random() * 10,
      salesGrowthRate: 10 + Math.random() * 15,
      epsGrowthRate: 15 + Math.random() * 20,
      
      // Additional mock financial metrics
      totalRevenue: 50000000000 + Math.random() * 100000000000,
      totalDebt: 10000000000 + Math.random() * 20000000000,
      totalCash: 20000000000 + Math.random() * 50000000000,
      freeCashflow: 5000000000 + Math.random() * 15000000000,
      ebitda: 15000000000 + Math.random() * 30000000000,
      returnOnAssets: 5 + Math.random() * 15,
      returnOnEquity: 15 + Math.random() * 25,
      profitMargins: 10 + Math.random() * 20,
      operatingMargins: 15 + Math.random() * 25,
      currentRatio: 1.2 + Math.random() * 2,
      quickRatio: 0.8 + Math.random() * 1.5,
      debtToEquity: 0.3 + Math.random() * 0.7,
      priceToBook: 2 + Math.random() * 8,
      pegRatio: 0.8 + Math.random() * 2,
      bookValue: 50 + Math.random() * 200,
      trailingEps: 5 + Math.random() * 15,
      forwardEps: 6 + Math.random() * 18,
      payoutRatio: Math.random() * 40,
    };
  }

  private async get50DayMovingAverage(symbol: string): Promise<number | undefined> {
    try {
      logger.info(`Attempting to calculate 50-day moving average for ${symbol}`);
      
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (85 * 24 * 60 * 60); // 85 days back to ensure we have enough trading days
      
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
        {
          params: {
            period1: startTime,
            period2: endTime,
            interval: '1d',
            includePrePost: false,
          },
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
        }
      );

      logger.info(`Historical data response status: ${response.status} for ${symbol}`);
      
      const result = response.data.chart?.result?.[0];
      if (!result?.indicators?.quote?.[0]?.close) {
        logger.warn(`No close price data found in historical response for ${symbol}`);
        return undefined;
      }

      const closePrices = result.indicators.quote[0].close.filter((price: number | null) => price !== null);
      
      logger.info(`Found ${closePrices.length} historical prices for ${symbol}`);
      
      if (closePrices.length < 30) {
        logger.warn(`Not enough data for moving average: only ${closePrices.length} prices for ${symbol}`);
        return undefined; // Not enough data for meaningful moving average
      }

      // Calculate moving average using available data (minimum 30 days, ideally 50)
      const daysToUse = Math.min(50, closePrices.length);
      const lastPrices = closePrices.slice(-daysToUse);
      const sum = lastPrices.reduce((acc: number, price: number) => acc + price, 0);
      const movingAverage = Math.round((sum / lastPrices.length) * 100) / 100;
      
      logger.info(`Calculated ${daysToUse}-day MA for ${symbol}: ${movingAverage}`);
      return movingAverage;
      
    } catch (error: any) {
      logger.warn(`Could not calculate 50-day moving average for ${symbol}:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      return undefined;
    }
  }

  private async get6MonthChange(symbol: string, currentPrice: number): Promise<{ change: number; changePercent: number } | undefined> {
    try {
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (180 * 24 * 60 * 60); // 180 days back (approximately 6 months)
      
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
        {
          params: {
            period1: startTime,
            period2: endTime,
            interval: '1d',
            includePrePost: false,
          },
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
        }
      );

      const result = response.data.chart?.result?.[0];
      if (!result?.indicators?.quote?.[0]?.close) {
        return undefined;
      }

      const closePrices = result.indicators.quote[0].close.filter((price: number | null) => price !== null);
      
      if (closePrices.length < 30) {
        return undefined; // Not enough data
      }

      const sixMonthAgoPrice = closePrices[0]; // First price in the range
      const change = currentPrice - sixMonthAgoPrice;
      const changePercent = (change / sixMonthAgoPrice) * 100;
      
      return {
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100
      };
      
    } catch (error) {
      logger.warn(`Could not calculate 6-month change for ${symbol}:`, error);
      return undefined;
    }
  }

  private async get1YearChange(symbol: string, currentPrice: number): Promise<{ change: number; changePercent: number } | undefined> {
    try {
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (365 * 24 * 60 * 60); // 365 days back (1 year)
      
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
        {
          params: {
            period1: startTime,
            period2: endTime,
            interval: '1d',
            includePrePost: false,
          },
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
        }
      );

      const result = response.data.chart?.result?.[0];
      if (!result?.indicators?.quote?.[0]?.close) {
        return undefined;
      }

      const closePrices = result.indicators.quote[0].close.filter((price: number | null) => price !== null);
      
      if (closePrices.length < 100) {
        return undefined; // Not enough data (need at least ~100 trading days)
      }

      const oneYearAgoPrice = closePrices[0]; // First price in the range
      const change = currentPrice - oneYearAgoPrice;
      const changePercent = (change / oneYearAgoPrice) * 100;
      
      return {
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100
      };
      
    } catch (error) {
      logger.warn(`Could not calculate 1-year change for ${symbol}:`, error);
      return undefined;
    }
  }

  private async get3YearChange(symbol: string, currentPrice: number): Promise<{ change: number; changePercent: number } | undefined> {
    try {
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (3 * 365 * 24 * 60 * 60); // 3 years back
      
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
        {
          params: {
            period1: startTime,
            period2: endTime,
            interval: '1wk', // Use weekly intervals for 3-year data
            includePrePost: false,
          },
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
        }
      );

      const result = response.data.chart?.result?.[0];
      if (!result?.indicators?.quote?.[0]?.close) {
        return undefined;
      }

      const closePrices = result.indicators.quote[0].close.filter((price: number | null) => price !== null);
      
      if (closePrices.length < 10) {
        return undefined; // Not enough data
      }

      const threeYearAgoPrice = closePrices[0]; // First price in the range
      const change = currentPrice - threeYearAgoPrice;
      const changePercent = (change / threeYearAgoPrice) * 100;
      
      return {
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100
      };
      
    } catch (error) {
      logger.warn(`Could not calculate 3-year change for ${symbol}:`, error);
      return undefined;
    }
  }

  private async getSectorPeAverage(sector: string): Promise<number | undefined> {
    if (!sector) return undefined;
    
    const cached = this.sectorPeCache.get(sector);
    if (cached && Date.now() - cached.timestamp < this.SECTOR_PE_CACHE_DURATION) {
      return cached.average;
    }

    try {
      const sectorSymbols = this.getSectorSymbols(sector);
      const peRatios: number[] = [];

      // Fetch P/E ratios for sector stocks without using getStockData to avoid circular dependency
      for (const symbol of sectorSymbols.slice(0, 5)) { // Limit to 5 symbols for performance
        try {
          const peRatio = await this.fetchPeRatioOnly(symbol);
          if (peRatio && peRatio > 0) {
            peRatios.push(peRatio);
          }
        } catch (error) {
          // Continue with other symbols if one fails
          continue;
        }
      }

      if (peRatios.length === 0) {
        // Fallback to estimated sector P/E
        const sectorPE: { [key: string]: number } = {
          'Technology': 25,
          'Healthcare': 22,
          'Financial Services': 12,
          'Consumer Cyclical': 18,
          'Consumer Defensive': 20,
          'Communication Services': 22,
          'Industrials': 16,
          'Energy': 14,
          'Utilities': 18,
          'Real Estate': 24,
          'Materials': 15,
        };
        return sectorPE[sector] || 20;
      }

      const average = peRatios.reduce((sum, pe) => sum + pe, 0) / peRatios.length;
      this.sectorPeCache.set(sector, { average, timestamp: Date.now() });
      return Math.round(average * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      logger.error(`Error calculating sector PE average for ${sector}:`, error);
      return undefined;
    }
  }

  private async fetchPeRatioOnly(symbol: string): Promise<number | undefined> {
    try {
      const response = await axios.get<YahooFinanceResponse>(
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`,
        {
          params: {
            modules: 'summaryDetail,keyStatistics',
          },
          timeout: 3000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      );
      
      const result = response.data.quoteSummary?.result?.[0];
      if (result) {
        const peRatio = result.keyStatistics?.forwardPE?.raw || 
                       result.summaryDetail?.trailingPE?.raw || 
                       result.summaryDetail?.forwardPE?.raw;
        return peRatio;
      }
    } catch (error) {
      // Fallback to estimated P/E if API fails
      return this.estimatePERatio(symbol);
    }
    return undefined;
  }

  private getSectorSymbols(sector: string): string[] {
    const sectorMap: { [key: string]: string[] } = {
      'Technology': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'],
      'Healthcare': ['JNJ', 'UNH', 'PFE', 'ABBV', 'TMO'],
      'Financial Services': ['JPM', 'BAC', 'WFC', 'GS', 'MS'],
      'Consumer Cyclical': ['HD', 'MCD', 'DIS', 'NKE', 'SBUX'],
      'Communication Services': ['META', 'NFLX', 'GOOGL', 'DIS', 'CMCSA'],
      'Industrials': ['BA', 'CAT', 'GE', 'MMM', 'UPS'],
      'Consumer Defensive': ['WMT', 'PG', 'KO', 'PEP', 'COST'],
      'Energy': ['XOM', 'CVX', 'COP', 'EOG', 'SLB'],
      'Utilities': ['NEE', 'DUK', 'SO', 'AEP', 'EXC'],
      'Real Estate': ['AMT', 'PLD', 'CCI', 'EQIX', 'SPG'],
      'Materials': ['LIN', 'APD', 'SHW', 'FCX', 'NUE'],
    };

    return sectorMap[sector] || [];
  }

  private estimateSectorFromSymbol(symbol: string): string {
    const sectorMap: { [key: string]: string } = {
      // Technology
      'AAPL': 'Technology',
      'MSFT': 'Technology', 
      'GOOGL': 'Technology',
      'GOOG': 'Technology',
      'AMZN': 'Technology',
      'TSLA': 'Technology',
      'META': 'Technology',
      'NFLX': 'Technology',
      'NVDA': 'Technology',
      'AMD': 'Technology',
      'INTC': 'Technology',
      'ORCL': 'Technology',
      'CRM': 'Technology',
      'ADBE': 'Technology',
      
      // Healthcare
      'JNJ': 'Healthcare',
      'UNH': 'Healthcare', 
      'PFE': 'Healthcare',
      'ABBV': 'Healthcare',
      'TMO': 'Healthcare',
      'MRK': 'Healthcare',
      'ABT': 'Healthcare',
      
      // Financial Services
      'JPM': 'Financial Services',
      'BAC': 'Financial Services',
      'WFC': 'Financial Services',
      'GS': 'Financial Services',
      'MS': 'Financial Services',
      'BRK.A': 'Financial Services',
      'BRK.B': 'Financial Services',
      
      // Consumer
      'WMT': 'Consumer Defensive',
      'PG': 'Consumer Defensive',
      'KO': 'Consumer Defensive',
      'PEP': 'Consumer Defensive',
      'COST': 'Consumer Defensive',
      'HD': 'Consumer Cyclical',
      'MCD': 'Consumer Cyclical',
      'DIS': 'Consumer Cyclical',
      'NKE': 'Consumer Cyclical',
      'SBUX': 'Consumer Cyclical',
      
      // Energy
      'XOM': 'Energy',
      'CVX': 'Energy',
      'COP': 'Energy',
      
      // Other
      'SPY': 'Index Fund',
      'QQQ': 'Index Fund',
      'VTI': 'Index Fund',
    };
    
    return sectorMap[symbol] || 'Technology'; // Default to Technology for unknown symbols
  }

  private estimatePERatio(symbol: string, sector?: string): number {
    // Sector-based P/E estimates
    const sectorPE: { [key: string]: number } = {
      'Technology': 25,
      'Healthcare': 22,
      'Financial Services': 12,
      'Consumer Cyclical': 18,
      'Consumer Defensive': 20,
      'Communication Services': 22,
      'Industrials': 16,
      'Energy': 14,
      'Utilities': 18,
      'Real Estate': 24,
      'Materials': 15,
    };

    // Company-specific estimates for major stocks
    const companyPE: { [key: string]: number } = {
      'AAPL': 28,
      'MSFT': 39,  // Updated to more accurate current estimate
      'GOOGL': 24,
      'AMZN': 35,
      'TSLA': 45,
      'META': 22,
      'NFLX': 28,
      'NVDA': 40,
    };

    return companyPE[symbol] || sectorPE[sector || 'Technology'] || 20;
  }

  private estimateDividendYield(symbol: string): number | undefined {
    const dividendYields: { [key: string]: number } = {
      'AAPL': 0.50,
      'MSFT': 0.72,
      'JNJ': 3.0,
      'PG': 2.5,
      'KO': 3.2,
      'PEP': 2.8,
      'XOM': 5.5,
      'CVX': 3.2,
      'WMT': 1.7,
      'HD': 2.4,
      'MCD': 2.2,
      'JPM': 2.8,
      'BAC': 2.5,
    };

    return dividendYields[symbol]; // Returns undefined for non-dividend stocks
  }

  private estimateEarningsGrowth(symbol: string): number {
    const growthRates: { [key: string]: number } = {
      'AAPL': 0.08,
      'MSFT': 0.12,
      'GOOGL': 0.15,
      'AMZN': 0.20,
      'TSLA': 0.35,
      'META': 0.10,
      'NFLX': 0.18,
      'NVDA': 0.25,
    };

    return growthRates[symbol] || 0.08; // 8% default growth
  }

  private estimateSalesGrowth(symbol: string): number {
    const growthRates: { [key: string]: number } = {
      'AAPL': 0.05,
      'MSFT': 0.12,
      'GOOGL': 0.15,
      'AMZN': 0.18,
      'TSLA': 0.30,
      'META': 0.08,
      'NFLX': 0.15,
      'NVDA': 0.22,
    };

    return growthRates[symbol] || 0.06; // 6% default growth
  }

  private estimateROIC(symbol: string): number {
    const roicValues: { [key: string]: number } = {
      'AAPL': 0.28,
      'MSFT': 0.25,
      'GOOGL': 0.18,
      'AMZN': 0.15,
      'TSLA': 0.12,
      'META': 0.22,
      'NFLX': 0.08,
      'NVDA': 0.20,
    };

    return roicValues[symbol] || 0.15; // 15% default ROIC
  }
}

export default YahooFinanceService;
