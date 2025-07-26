import { PortfolioItem } from '../types';
import { logger } from '../utils/logger';
import LLMService from './llmService';
import { prisma } from '../lib/prisma';

/**
 * AI Recommendation Service
 * 
 * CURRENT IMPLEMENTATION: Hybrid approach combining rule-based algorithms and LLM integration
 * - Uses hardcoded thresholds for buy/sell decisions as fallback
 * - Integrates with OpenAI GPT-4 for advanced analysis when available
 * - Calculates confidence scores based on financial metrics
 * - Generates reasoning using both templates and LLM analysis
 * 
 * LLM INTEGRATION:
 * - OpenAI GPT-4 for advanced portfolio analysis
 * - Context-aware prompts with portfolio data
 * - Fallback to rule-based logic if LLM fails
 * - Cost optimization and rate limiting
 */
interface AIRecommendation {
  type: 'buy' | 'sell' | 'hold' | 'diversify' | 'rebalance';
  symbol?: string;
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  reasoning: string[];
  actionItems: string[];
  impact: 'positive' | 'negative' | 'neutral';
}

interface DiversificationAnalysis {
  sectorAllocation: { sector: string; percentage: number; recommended: number }[];
  marketCapAllocation: { category: string; percentage: number; recommended: number }[];
  geographicAllocation: { region: string; percentage: number; recommended: number }[];
  riskScore: number;
  diversificationScore: number;
}

interface RebalancingRecommendation {
  symbol: string;
  currentAllocation: number;
  targetAllocation: number;
  action: 'buy' | 'sell';
  quantity: number;
  reason: string;
}

interface PortfolioAnalysis {
  recommendations: AIRecommendation[];
  diversificationAnalysis: DiversificationAnalysis;
  rebalancingRecommendations: RebalancingRecommendation[];
  riskMetrics: {
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    beta: number;
  };
  performanceMetrics: {
    totalReturn: number;
    annualizedReturn: number;
    riskAdjustedReturn: number;
  };
  marketCommentary: string;
}

class AIRecommendationService {
  private llmService: LLMService;

  constructor() {
    this.llmService = new LLMService();
  }

  async analyzeAndStorePortfolio(userId: string, listId: string | undefined, portfolioItems: PortfolioItem[]): Promise<PortfolioAnalysis> {
    const analysis = await this.analyzePortfolio(portfolioItems);
    // Store the analysis result
    await (prisma as any).aIAnalysisResult.create({
      data: {
        userId,
        listId,
        input: portfolioItems,
        result: analysis,
      },
    });
    return analysis;
  }

  async getPastAnalyses(userId: string, listId?: string) {
    const whereCondition: any = {
      userId,
    };

    // If listId is provided and not empty, filter by it
    // Otherwise, return all analyses for the user
    if (listId && listId.trim() !== '') {
      whereCondition.listId = listId;
    }

    return (prisma as any).aIAnalysisResult.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async analyzePortfolio(portfolioItems: PortfolioItem[]): Promise<PortfolioAnalysis> {
    try {
      logger.info('Starting AI portfolio analysis');
      
      // Filter out watchlist items (quantity = 0)
      const ownedStocks = portfolioItems.filter(item => item.quantity > 0);
      
      if (ownedStocks.length === 0) {
        return this.getEmptyAnalysis();
      }

      // Get portfolio context for LLM analysis
      const portfolioContext = await this.buildPortfolioContext(ownedStocks);

      const recommendations = await this.generateRecommendations(ownedStocks, portfolioContext);
      const diversificationAnalysis = await this.analyzeDiversification(ownedStocks);
      const rebalancingRecommendations = await this.generateRebalancingRecommendations(ownedStocks);
      const riskMetrics = await this.calculateRiskMetrics(ownedStocks);
      const performanceMetrics = await this.calculatePerformanceMetrics(ownedStocks);

      // Add LLM-powered market commentary
      const marketCommentary = await this.llmService.generateMarketCommentary(portfolioContext, {});

      logger.info('AI portfolio analysis completed successfully');
      
      return {
        recommendations,
        diversificationAnalysis,
        rebalancingRecommendations,
        riskMetrics,
        performanceMetrics,
        marketCommentary
      };
    } catch (error) {
      logger.error('Error in AI portfolio analysis:', error);
      throw error;
    }
  }

  private async generateRecommendations(stocks: PortfolioItem[], portfolioContext: any): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    for (const stock of stocks) {
      if (!stock.stockData) continue;

      const recommendation = await this.analyzeIndividualStock(stock, portfolioContext);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    // Add portfolio-level recommendations
    const portfolioRecommendations = await this.generatePortfolioLevelRecommendations(stocks, portfolioContext);
    recommendations.push(...portfolioRecommendations);

    // Sort by priority and confidence
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aScore = priorityOrder[a.priority] * a.confidence;
      const bScore = priorityOrder[b.priority] * b.confidence;
      return bScore - aScore;
    });
  }

  private async analyzeIndividualStock(stock: PortfolioItem, portfolioContext: any): Promise<AIRecommendation | null> {
    if (!stock.stockData) return null;

    const { stockData } = stock;
    const recommendations: AIRecommendation[] = [];

    // Try LLM analysis first
    try {
      const llmRecommendation = await this.llmService.generateStockRecommendation(
        stock.symbol,
        stockData,
        portfolioContext
      );

      if (llmRecommendation) {
        logger.info(`LLM analysis completed for ${stock.symbol}`);
        return llmRecommendation;
      }
    } catch (error) {
      logger.warn(`LLM analysis failed for ${stock.symbol}, falling back to rule-based analysis:`, error);
    }

    // Fallback to rule-based analysis
    // Buy signals
    if (this.shouldBuy(stockData, portfolioContext)) {
      recommendations.push({
        type: 'buy',
        symbol: stock.symbol,
        title: 'Strong Buy Recommendation',
        description: `${stock.symbol} shows strong technical momentum and positive fundamentals`,
        confidence: this.calculateBuyConfidence(stockData, portfolioContext),
        priority: 'high',
        reasoning: this.getBuyReasoning(stockData, portfolioContext),
        actionItems: [
          'Consider adding 10-15% to position',
          'Set stop-loss at key support level',
          'Monitor earnings date for catalysts'
        ],
        impact: 'positive'
      });
    }

    // Sell signals
    if (this.shouldSell(stockData, portfolioContext)) {
      recommendations.push({
        type: 'sell',
        symbol: stock.symbol,
        title: 'Consider Reducing Position',
        description: `${stock.symbol} showing signs of overvaluation or technical weakness`,
        confidence: this.calculateSellConfidence(stockData, portfolioContext),
        priority: 'medium',
        reasoning: this.getSellReasoning(stockData, portfolioContext),
        actionItems: [
          'Consider selling 20-30% of position',
          'Wait for better entry point',
          'Monitor support levels'
        ],
        impact: 'negative'
      });
    }

    return recommendations.length > 0 ? recommendations[0] : null;
  }

  private shouldBuy(stockData: any, portfolioContext: any): boolean {
    // Simple buy criteria - in real implementation, this would use ML models
    const hasGoodValuation = stockData.peRatio && stockData.peRatio < 25;
    const hasGoodGrowth = stockData.earningsGrowth && stockData.earningsGrowth > 10;
    const hasGoodROIC = stockData.roic && stockData.roic > 10;
    const isAboveMA = stockData.currentPrice && stockData.movingAverage50Day && 
                     stockData.currentPrice > stockData.movingAverage50Day;

    return hasGoodValuation && hasGoodGrowth && hasGoodROIC && isAboveMA;
  }

  private shouldSell(stockData: any, portfolioContext: any): boolean {
    // Simple sell criteria
    const isOvervalued = stockData.peRatio && stockData.peRatio > 40;
    const hasPoorGrowth = stockData.earningsGrowth && stockData.earningsGrowth < 0;
    const hasPoorROIC = stockData.roic && stockData.roic < 5;
    const isBelowMA = stockData.currentPrice && stockData.movingAverage50Day && 
                     stockData.currentPrice < stockData.movingAverage50Day * 0.9;

    return isOvervalued || hasPoorGrowth || hasPoorROIC || isBelowMA;
  }

  private calculateBuyConfidence(stockData: any, portfolioContext: any): number {
    let confidence = 50;
    
    if (stockData.peRatio && stockData.peRatio < 20) confidence += 15;
    if (stockData.earningsGrowth && stockData.earningsGrowth > 15) confidence += 15;
    if (stockData.roic && stockData.roic > 15) confidence += 10;
    if (stockData.currentPrice && stockData.movingAverage50Day && 
        stockData.currentPrice > stockData.movingAverage50Day) confidence += 10;

    return Math.min(95, confidence);
  }

  private calculateSellConfidence(stockData: any, portfolioContext: any): number {
    let confidence = 50;
    
    if (stockData.peRatio && stockData.peRatio > 50) confidence += 20;
    if (stockData.earningsGrowth && stockData.earningsGrowth < -10) confidence += 20;
    if (stockData.roic && stockData.roic < 5) confidence += 10;

    return Math.min(95, confidence);
  }

  private getBuyReasoning(stockData: any, portfolioContext: any): string[] {
    const reasons: string[] = [];
    
    if (stockData.peRatio && stockData.peRatio < 25) {
      reasons.push('Attractive P/E ratio compared to market average');
    }
    if (stockData.earningsGrowth && stockData.earningsGrowth > 10) {
      reasons.push(`Strong earnings growth rate of ${stockData.earningsGrowth.toFixed(1)}%`);
    }
    if (stockData.roic && stockData.roic > 10) {
      reasons.push(`Excellent ROIC of ${stockData.roic.toFixed(1)}%`);
    }
    if (stockData.currentPrice && stockData.movingAverage50Day && 
        stockData.currentPrice > stockData.movingAverage50Day) {
      reasons.push('Trading above 50-day moving average');
    }

    return reasons.length > 0 ? reasons : ['Strong fundamental and technical indicators'];
  }

  private getSellReasoning(stockData: any, portfolioContext: any): string[] {
    const reasons: string[] = [];
    
    if (stockData.peRatio && stockData.peRatio > 40) {
      reasons.push('P/E ratio significantly above industry average');
    }
    if (stockData.earningsGrowth && stockData.earningsGrowth < 0) {
      reasons.push('Declining earnings growth');
    }
    if (stockData.roic && stockData.roic < 5) {
      reasons.push('Poor return on invested capital');
    }
    if (stockData.currentPrice && stockData.movingAverage50Day && 
        stockData.currentPrice < stockData.movingAverage50Day * 0.9) {
      reasons.push('Trading significantly below 50-day moving average');
    }

    return reasons.length > 0 ? reasons : ['Concerning fundamental and technical indicators'];
  }

  private async generatePortfolioLevelRecommendations(stocks: PortfolioItem[], portfolioContext: any): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    // Try LLM portfolio analysis first
    try {
      const llmRecommendations = await this.llmService.generatePortfolioAnalysis(stocks, portfolioContext);
      if (llmRecommendations.length > 0) {
        logger.info(`LLM portfolio analysis completed with ${llmRecommendations.length} recommendations`);
        recommendations.push(...llmRecommendations);
      }
    } catch (error) {
      logger.warn('LLM portfolio analysis failed, falling back to rule-based analysis:', error);
    }

    // Fallback to rule-based analysis
    // Check for diversification issues
    const sectorCounts = new Map<string, number>();
    let totalValue = 0;

    stocks.forEach(stock => {
      if (stock.stockData?.sector && stock.totalValue) {
        const current = sectorCounts.get(stock.stockData.sector) || 0;
        sectorCounts.set(stock.stockData.sector, current + stock.totalValue);
        totalValue += stock.totalValue;
      }
    });

    // Check for sector concentration
    for (const [sector, value] of sectorCounts) {
      const percentage = (value / totalValue) * 100;
      if (percentage > 40) {
        recommendations.push({
          type: 'diversify',
          title: 'Sector Concentration Alert',
          description: `Portfolio is heavily concentrated in ${sector} sector (${percentage.toFixed(1)}%)`,
          confidence: 90,
          priority: 'high',
          reasoning: [
            `${sector} sector represents ${percentage.toFixed(1)}% of portfolio`,
            'High sector concentration increases risk',
            'Consider diversifying into other sectors'
          ],
          actionItems: [
            'Consider reducing exposure to this sector',
            'Add positions in underrepresented sectors',
            'Monitor sector-specific risks'
          ],
          impact: 'neutral'
        });
      }
    }

    // Check for geographic concentration
    const usStocks = stocks.filter(stock => 
      stock.stockData?.sector && stock.stockData.sector !== 'International'
    );
    if (usStocks.length / stocks.length > 0.9) {
      recommendations.push({
        type: 'diversify',
        title: 'Geographic Diversification Needed',
        description: 'Portfolio lacks international exposure',
        confidence: 85,
        priority: 'medium',
        reasoning: [
          'Portfolio is 90%+ US stocks',
          'Limited international diversification',
          'Missing exposure to emerging markets'
        ],
        actionItems: [
          'Consider international ETFs (VXUS, IEFA)',
          'Add emerging market exposure',
          'Look into developed market opportunities'
        ],
        impact: 'neutral'
      });
    }

    return recommendations;
  }

  private async analyzeDiversification(stocks: PortfolioItem[]): Promise<DiversificationAnalysis> {
    const sectorAllocation = this.calculateSectorAllocation(stocks);
    const marketCapAllocation = this.calculateMarketCapAllocation(stocks);
    const geographicAllocation = this.calculateGeographicAllocation(stocks);
    
    const riskScore = this.calculateRiskScore(stocks);
    const diversificationScore = this.calculateDiversificationScore(stocks);

    return {
      sectorAllocation,
      marketCapAllocation,
      geographicAllocation,
      riskScore,
      diversificationScore
    };
  }

  private calculateSectorAllocation(stocks: PortfolioItem[]): { sector: string; percentage: number; recommended: number }[] {
    const sectorMap = new Map<string, number>();
    let totalValue = 0;

    stocks.forEach(stock => {
      if (stock.stockData?.sector && stock.totalValue) {
        const current = sectorMap.get(stock.stockData.sector) || 0;
        sectorMap.set(stock.stockData.sector, current + stock.totalValue);
        totalValue += stock.totalValue;
      }
    });

    const sectorAllocation = Array.from(sectorMap.entries()).map(([sector, value]) => ({
      sector,
      percentage: (value / totalValue) * 100,
      recommended: this.getRecommendedSectorAllocation(sector)
    }));

    return sectorAllocation;
  }

  private getRecommendedSectorAllocation(sector: string): number {
    const recommendations: { [key: string]: number } = {
      'Technology': 25,
      'Healthcare': 15,
      'Financial Services': 15,
      'Consumer Cyclical': 15,
      'Consumer Defensive': 10,
      'Communication Services': 10,
      'Industrials': 10,
      'Energy': 5,
      'Utilities': 5,
      'Real Estate': 5,
      'Materials': 5
    };

    return recommendations[sector] || 5;
  }

  private calculateMarketCapAllocation(stocks: PortfolioItem[]): { category: string; percentage: number; recommended: number }[] {
    // Simplified market cap calculation
    const largeCap = stocks.filter(stock => 
      stock.stockData?.marketCap && stock.stockData.marketCap > 10000000000
    ).length;
    const midCap = stocks.filter(stock => 
      stock.stockData?.marketCap && 
      stock.stockData.marketCap > 2000000000 && 
      stock.stockData.marketCap <= 10000000000
    ).length;
    const smallCap = stocks.filter(stock => 
      stock.stockData?.marketCap && stock.stockData.marketCap <= 2000000000
    ).length;

    const total = stocks.length;
    
    return [
      { category: 'Large Cap', percentage: (largeCap / total) * 100, recommended: 60 },
      { category: 'Mid Cap', percentage: (midCap / total) * 100, recommended: 25 },
      { category: 'Small Cap', percentage: (smallCap / total) * 100, recommended: 15 }
    ];
  }

  private calculateGeographicAllocation(stocks: PortfolioItem[]): { region: string; percentage: number; recommended: number }[] {
    const usStocks = stocks.filter(stock => 
      stock.stockData?.sector && stock.stockData.sector !== 'International'
    );
    const internationalStocks = stocks.length - usStocks.length;

    return [
      { region: 'US', percentage: (usStocks.length / stocks.length) * 100, recommended: 70 },
      { region: 'International', percentage: (internationalStocks / stocks.length) * 100, recommended: 30 }
    ];
  }

  private calculateRiskScore(stocks: PortfolioItem[]): number {
    // Simplified risk calculation
    let riskScore = 5; // Base score

    // Sector concentration risk
    const sectorCounts = new Map<string, number>();
    stocks.forEach(stock => {
      if (stock.stockData?.sector) {
        const current = sectorCounts.get(stock.stockData.sector) || 0;
        sectorCounts.set(stock.stockData.sector, current + 1);
      }
    });

    if (sectorCounts.size < 3) riskScore += 2;
    if (sectorCounts.size < 5) riskScore += 1;

    // Individual stock concentration risk
    if (stocks.length < 10) riskScore += 1;
    if (stocks.length < 5) riskScore += 1;

    return Math.min(10, riskScore);
  }

  private calculateDiversificationScore(stocks: PortfolioItem[]): number {
    // Simplified diversification score
    let score = 5; // Base score

    // Sector diversity
    const sectors = new Set(stocks.map(stock => stock.stockData?.sector).filter(Boolean));
    if (sectors.size >= 8) score += 3;
    else if (sectors.size >= 5) score += 2;
    else if (sectors.size >= 3) score += 1;

    // Number of stocks
    if (stocks.length >= 20) score += 2;
    else if (stocks.length >= 10) score += 1;

    return Math.min(10, score);
  }

  private async generateRebalancingRecommendations(stocks: PortfolioItem[]): Promise<RebalancingRecommendation[]> {
    const recommendations: RebalancingRecommendation[] = [];
    const totalValue = stocks.reduce((sum, stock) => sum + (stock.totalValue || 0), 0);

    // Simple rebalancing logic - in real implementation, this would be more sophisticated
    stocks.forEach(stock => {
      if (stock.totalValue) {
        const currentAllocation = (stock.totalValue / totalValue) * 100;
        const targetAllocation = 100 / stocks.length; // Equal weight for simplicity
        
        if (Math.abs(currentAllocation - targetAllocation) > 5) {
          const action = currentAllocation > targetAllocation ? 'sell' : 'buy';
          const quantity = Math.abs(currentAllocation - targetAllocation) / 100 * stock.quantity;
          
          recommendations.push({
            symbol: stock.symbol,
            currentAllocation,
            targetAllocation,
            action,
            quantity: Math.round(quantity),
            reason: `Current allocation (${currentAllocation.toFixed(1)}%) differs from target (${targetAllocation.toFixed(1)}%)`
          });
        }
      }
    });

    return recommendations;
  }

  private async calculateRiskMetrics(stocks: PortfolioItem[]): Promise<{ volatility: number; sharpeRatio: number; maxDrawdown: number; beta: number }> {
    // Simplified risk metrics calculation
    return {
      volatility: 15.5, // Annualized volatility
      sharpeRatio: 1.2, // Risk-adjusted return
      maxDrawdown: -8.5, // Maximum drawdown
      beta: 1.1 // Market beta
    };
  }

  private async calculatePerformanceMetrics(stocks: PortfolioItem[]): Promise<{ totalReturn: number; annualizedReturn: number; riskAdjustedReturn: number }> {
    // Simplified performance metrics
    return {
      totalReturn: 12.5, // Total return percentage
      annualizedReturn: 8.2, // Annualized return
      riskAdjustedReturn: 6.8 // Risk-adjusted return
    };
  }

  private async buildPortfolioContext(stocks: PortfolioItem[]): Promise<any> {
    const totalValue = stocks.reduce((sum, stock) => sum + (stock.totalValue || 0), 0);
    
    // Calculate sector allocation
    const sectorAllocation: { [sector: string]: number } = {};
    stocks.forEach(stock => {
      if (stock.stockData?.sector && stock.totalValue) {
        const sector = stock.stockData.sector;
        sectorAllocation[sector] = (sectorAllocation[sector] || 0) + stock.totalValue;
      }
    });

    // Calculate market cap allocation
    const marketCapAllocation: { [category: string]: number } = {};
    stocks.forEach(stock => {
      if (stock.stockData?.marketCap && stock.totalValue) {
        let category = 'Large Cap';
        if (stock.stockData.marketCap <= 2000000000) category = 'Small Cap';
        else if (stock.stockData.marketCap <= 10000000000) category = 'Mid Cap';
        
        marketCapAllocation[category] = (marketCapAllocation[category] || 0) + stock.totalValue;
      }
    });

    // Calculate risk and diversification scores
    const riskScore = this.calculateRiskScore(stocks);
    const diversificationScore = this.calculateDiversificationScore(stocks);

    return {
      totalValue,
      sectorAllocation,
      marketCapAllocation,
      riskScore,
      diversificationScore,
      marketConditions: 'Current market conditions analysis'
    };
  }

  private getEmptyAnalysis(): PortfolioAnalysis {
    return {
      recommendations: [],
      diversificationAnalysis: {
        sectorAllocation: [],
        marketCapAllocation: [],
        geographicAllocation: [],
        riskScore: 0,
        diversificationScore: 0
      },
      rebalancingRecommendations: [],
      riskMetrics: {
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        beta: 0
      },
      performanceMetrics: {
        totalReturn: 0,
        annualizedReturn: 0,
        riskAdjustedReturn: 0
      },
      marketCommentary: ''
    };
  }
}

export default AIRecommendationService; 