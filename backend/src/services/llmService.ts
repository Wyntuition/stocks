import OpenAI from 'openai';
import { logger } from '../utils/logger';

interface LLMRecommendation {
  type: 'buy' | 'sell' | 'hold' | 'diversify' | 'rebalance';
  symbol?: string;
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  reasoning: string[];
  actionItems: string[];
  impact: 'positive' | 'negative' | 'neutral';
  aiAnalysis: string;
}

interface PortfolioContext {
  totalValue: number;
  sectorAllocation: { [sector: string]: number };
  marketCapAllocation: { [category: string]: number };
  riskScore: number;
  diversificationScore: number;
  marketConditions: string;
}

class LLMService {
  private openai: OpenAI | null = null;
  private isEnabled: boolean = false;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.isEnabled = true;
      logger.info('LLM service initialized with OpenAI');
    } else {
      logger.warn('OpenAI API key not found. LLM features will be disabled.');
      this.isEnabled = false;
    }
  }

  async generateStockRecommendation(
    symbol: string,
    stockData: any,
    portfolioContext: PortfolioContext
  ): Promise<LLMRecommendation | null> {
    if (!this.isEnabled || !this.openai) {
      logger.warn('LLM service not available, skipping LLM analysis');
      return null;
    }

    try {
      const prompt = this.buildStockAnalysisPrompt(symbol, stockData, portfolioContext);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert financial analyst specializing in stock portfolio analysis. 
            Provide clear, actionable investment recommendations based on fundamental and technical analysis.
            Always include specific reasoning and actionable steps. Be conservative and risk-aware in your recommendations.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const analysis = response.choices[0]?.message?.content;
      if (!analysis) {
        throw new Error('No response from LLM');
      }

      return this.parseLLMRecommendation(symbol, analysis, stockData);
    } catch (error) {
      logger.error('Error generating LLM recommendation:', error);
      return null;
    }
  }

  async generatePortfolioAnalysis(
    portfolioItems: any[],
    portfolioContext: PortfolioContext
  ): Promise<LLMRecommendation[]> {
    if (!this.isEnabled || !this.openai) {
      logger.warn('LLM service not available, skipping portfolio analysis');
      return [];
    }

    try {
      const prompt = this.buildPortfolioAnalysisPrompt(portfolioItems, portfolioContext);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert portfolio manager and financial advisor. 
            Analyze portfolios for diversification, risk management, and optimization opportunities.
            Provide specific, actionable recommendations with clear reasoning.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const analysis = response.choices[0]?.message?.content;
      if (!analysis) {
        throw new Error('No response from LLM');
      }

      return this.parsePortfolioRecommendations(analysis, portfolioContext);
    } catch (error) {
      logger.error('Error generating portfolio analysis:', error);
      return [];
    }
  }

  async generateMarketCommentary(
    portfolioContext: PortfolioContext,
    marketData: any
  ): Promise<string> {
    if (!this.isEnabled || !this.openai) {
      return 'LLM market commentary not available.';
    }

    try {
      const prompt = this.buildMarketCommentaryPrompt(portfolioContext, marketData);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a market analyst providing concise, insightful commentary on market conditions and their impact on investment portfolios.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 500
      });

      return response.choices[0]?.message?.content || 'Unable to generate market commentary.';
    } catch (error) {
      logger.error('Error generating market commentary:', error);
      return 'Error generating market commentary.';
    }
  }

  private buildStockAnalysisPrompt(symbol: string, stockData: any, portfolioContext: PortfolioContext): string {
    return `
Analyze ${symbol} for investment recommendation based on the following data:

STOCK DATA:
- Current Price: $${stockData.currentPrice || 'N/A'}
- P/E Ratio: ${stockData.peRatio || 'N/A'}
- Earnings Growth: ${stockData.earningsGrowth || 'N/A'}%
- ROIC: ${stockData.roic || 'N/A'}%
- 50-day Moving Average: $${stockData.movingAverage50Day || 'N/A'}
- 52-week High: $${stockData.fiftyTwoWeekHigh || 'N/A'}
- 52-week Low: $${stockData.fiftyTwoWeekLow || 'N/A'}
- Market Cap: $${stockData.marketCap || 'N/A'}
- Sector: ${stockData.sector || 'N/A'}
- Dividend Yield: ${stockData.dividendYield || 'N/A'}%

PORTFOLIO CONTEXT:
- Total Portfolio Value: $${portfolioContext.totalValue.toLocaleString()}
- Current Sector Allocation: ${JSON.stringify(portfolioContext.sectorAllocation)}
- Risk Score: ${portfolioContext.riskScore}/10
- Diversification Score: ${portfolioContext.diversificationScore}/10
- Market Conditions: ${portfolioContext.marketConditions}

Provide a structured recommendation in the following JSON format:
{
  "type": "buy|sell|hold|diversify",
  "title": "Brief recommendation title",
  "description": "Detailed description",
  "confidence": 85,
  "priority": "high|medium|low",
  "reasoning": ["Reason 1", "Reason 2", "Reason 3"],
  "actionItems": ["Action 1", "Action 2", "Action 3"],
  "impact": "positive|negative|neutral",
  "aiAnalysis": "Detailed AI analysis and reasoning"
}

Focus on:
1. Fundamental analysis (P/E, growth, ROIC)
2. Technical analysis (price vs moving averages)
3. Portfolio fit (diversification, sector exposure)
4. Risk assessment
5. Specific actionable steps
`;
  }

  private buildPortfolioAnalysisPrompt(portfolioItems: any[], portfolioContext: PortfolioContext): string {
    const portfolioSummary = portfolioItems.map(item => 
      `${item.symbol}: ${item.quantity} shares @ $${item.purchasePrice} (Current: $${item.currentPrice})`
    ).join('\n');

    return `
Analyze this portfolio for optimization opportunities:

PORTFOLIO HOLDINGS:
${portfolioSummary}

PORTFOLIO CONTEXT:
- Total Value: $${portfolioContext.totalValue.toLocaleString()}
- Sector Allocation: ${JSON.stringify(portfolioContext.sectorAllocation)}
- Market Cap Allocation: ${JSON.stringify(portfolioContext.marketCapAllocation)}
- Risk Score: ${portfolioContext.riskScore}/10
- Diversification Score: ${portfolioContext.diversificationScore}/10
- Market Conditions: ${portfolioContext.marketConditions}

Provide 2-3 portfolio-level recommendations in JSON array format:
[
  {
    "type": "diversify|rebalance|risk_management",
    "title": "Recommendation title",
    "description": "Detailed description",
    "confidence": 85,
    "priority": "high|medium|low",
    "reasoning": ["Reason 1", "Reason 2"],
    "actionItems": ["Action 1", "Action 2"],
    "impact": "positive|negative|neutral",
    "aiAnalysis": "Detailed AI analysis"
  }
]

Focus on:
1. Diversification gaps
2. Risk management opportunities
3. Sector rotation opportunities
4. Portfolio optimization
5. Market timing considerations
`;
  }

  private buildMarketCommentaryPrompt(portfolioContext: PortfolioContext, marketData: any): string {
    return `
Provide a brief market commentary based on:

PORTFOLIO CONTEXT:
- Total Value: $${portfolioContext.totalValue.toLocaleString()}
- Risk Score: ${portfolioContext.riskScore}/10
- Diversification Score: ${portfolioContext.diversificationScore}/10
- Market Conditions: ${portfolioContext.marketConditions}

Provide 2-3 sentences of market commentary focusing on:
1. Current market environment
2. Impact on portfolio positioning
3. Key risks or opportunities to watch
`;
  }

  private parseLLMRecommendation(symbol: string, analysis: string, stockData: any): LLMRecommendation {
    try {
      // Try to extract JSON from the response
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: parsed.type || 'hold',
          symbol,
          title: parsed.title || 'AI Analysis',
          description: parsed.description || 'AI-generated recommendation',
          confidence: parsed.confidence || 50,
          priority: parsed.priority || 'medium',
          reasoning: parsed.reasoning || ['AI analysis completed'],
          actionItems: parsed.actionItems || ['Review recommendation'],
          impact: parsed.impact || 'neutral',
          aiAnalysis: parsed.aiAnalysis || analysis
        };
      }
    } catch (error) {
      logger.warn('Failed to parse LLM JSON response, using fallback parsing');
    }

    // Fallback parsing
    return {
      type: 'hold',
      symbol,
      title: 'AI Analysis',
      description: 'AI-generated portfolio analysis',
      confidence: 70,
      priority: 'medium',
      reasoning: ['AI analysis completed'],
      actionItems: ['Review full analysis'],
      impact: 'neutral',
      aiAnalysis: analysis
    };
  }

  private parsePortfolioRecommendations(analysis: string, portfolioContext: PortfolioContext): LLMRecommendation[] {
    try {
      // Try to extract JSON array from the response
      const jsonMatch = analysis.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((rec: any) => ({
          type: rec.type || 'diversify',
          title: rec.title || 'Portfolio Recommendation',
          description: rec.description || 'AI-generated portfolio recommendation',
          confidence: rec.confidence || 50,
          priority: rec.priority || 'medium',
          reasoning: rec.reasoning || ['Portfolio analysis completed'],
          actionItems: rec.actionItems || ['Review recommendation'],
          impact: rec.impact || 'neutral',
          aiAnalysis: rec.aiAnalysis || analysis
        }));
      }
    } catch (error) {
      logger.warn('Failed to parse LLM portfolio JSON response, using fallback parsing');
    }

    // Fallback parsing
    return [{
      type: 'diversify',
      title: 'Portfolio Analysis',
      description: 'AI-generated portfolio analysis',
      confidence: 70,
      priority: 'medium',
      reasoning: ['Portfolio analysis completed'],
      actionItems: ['Review full analysis'],
      impact: 'neutral',
      aiAnalysis: analysis
    }];
  }

  isLLMEnabled(): boolean {
    return this.isEnabled;
  }
}

export default LLMService; 