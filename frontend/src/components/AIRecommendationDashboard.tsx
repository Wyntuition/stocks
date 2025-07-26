import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Target, BarChart3, PieChart, Globe, Zap } from 'lucide-react';
import { PortfolioItem } from '../types';
import { portfolioApi } from '../services/api';

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
  aiAnalysis?: string;
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

interface PastAnalysis {
  id: string;
  createdAt: string;
  result: any;
}

interface AIRecommendationDashboardProps {
  portfolioItems: PortfolioItem[];
  onClose: () => void;
  selectedListId?: string;
}

export const AIRecommendationDashboard: React.FC<AIRecommendationDashboardProps> = ({
  portfolioItems,
  onClose,
  selectedListId
}) => {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [diversificationAnalysis, setDiversificationAnalysis] = useState<DiversificationAnalysis | null>(null);
  const [rebalancingRecommendations, setRebalancingRecommendations] = useState<RebalancingRecommendation[]>([]);
  const [marketCommentary, setMarketCommentary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'diversification' | 'rebalancing' | 'signals' | 'llm'>('overview');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loadingPast, setLoadingPast] = useState(false);
  const [pastAnalyses, setPastAnalyses] = useState<PastAnalysis[]>([]);
  const [showPastAnalyses, setShowPastAnalyses] = useState(false);

  // Remove the automatic analysis on mount - let users choose what to do
  // useEffect(() => {
  //   generateAIRecommendations();
  // }, [portfolioItems, selectedListId]);

  const generateAIRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await portfolioApi.getAIAnalysis(selectedListId);
      setAnalysis(result);
      // After running a new analysis, refresh past analyses
      await fetchPastAnalyses();
      
      // Extract individual components from the analysis result
      if (result) {
        setRecommendations(result.recommendations || []);
        setDiversificationAnalysis(result.diversificationAnalysis || null);
        setRebalancingRecommendations(result.rebalancingRecommendations || []);
        setMarketCommentary(result.marketCommentary || '');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate AI recommendations. Please try again.');
      generateMockRecommendations();
    } finally {
      setLoading(false);
    }
  };

  const fetchPastAnalyses = async () => {
    try {
      setLoadingPast(true);
      console.log('Fetching past analyses for listId:', selectedListId);
      const response = await portfolioApi.getPastAnalyses(selectedListId);
      console.log('Fetched past analyses response:', response);
      setPastAnalyses(response.analyses || []);
    } catch (err) {
      setPastAnalyses([]); // Ensure state is cleared on error
      console.error('Error fetching past analyses:', err);
    } finally {
      setLoadingPast(false);
    }
  };

  // When the "Show Past Analyses" button is clicked, always fetch the latest
  useEffect(() => {
    if (showPastAnalyses) {
      fetchPastAnalyses();
    }
  }, [showPastAnalyses, selectedListId]);

  const generateMockRecommendations = () => {
    const mockRecommendations: AIRecommendation[] = [
      {
        type: 'buy',
        symbol: 'NVDA',
        title: 'Strong Buy Recommendation',
        description: 'NVIDIA shows strong technical momentum and positive earnings outlook',
        confidence: 85,
        priority: 'high',
        reasoning: [
          'Technical indicators show bullish momentum',
          'Earnings growth rate of 25%+',
          'AI market leadership position',
          'P/E ratio below sector average'
        ],
        actionItems: [
          'Consider adding 10-15% to position',
          'Set stop-loss at $450',
          'Monitor earnings date: Feb 15'
        ],
        impact: 'positive'
      },
      {
        type: 'sell',
        symbol: 'TSLA',
        title: 'Consider Reducing Position',
        description: 'Tesla showing signs of overvaluation and technical weakness',
        confidence: 72,
        priority: 'medium',
        reasoning: [
          'P/E ratio significantly above industry average',
          'Technical indicators showing bearish divergence',
          'Competition increasing in EV market',
          'Recent earnings miss'
        ],
        actionItems: [
          'Consider selling 20-30% of position',
          'Wait for better entry point',
          'Monitor support at $200'
        ],
        impact: 'negative'
      },
      {
        type: 'diversify',
        title: 'Portfolio Diversification Alert',
        description: 'Portfolio is heavily concentrated in technology sector',
        confidence: 90,
        priority: 'high',
        reasoning: [
          'Technology sector represents 65% of portfolio',
          'Limited exposure to defensive sectors',
          'Missing international diversification',
          'No exposure to commodities or real estate'
        ],
        actionItems: [
          'Consider adding healthcare stocks (JNJ, UNH)',
          'Add consumer staples (PG, KO)',
          'Consider international ETFs (VXUS, IEFA)',
          'Add REIT exposure (VNQ)'
        ],
        impact: 'neutral'
      }
    ];

    const mockDiversificationAnalysis: DiversificationAnalysis = {
      sectorAllocation: [
        { sector: 'Technology', percentage: 65, recommended: 25 },
        { sector: 'Healthcare', percentage: 8, recommended: 15 },
        { sector: 'Financial', percentage: 12, recommended: 15 },
        { sector: 'Consumer', percentage: 5, recommended: 15 },
        { sector: 'Industrial', percentage: 3, recommended: 10 },
        { sector: 'Other', percentage: 7, recommended: 20 }
      ],
      marketCapAllocation: [
        { category: 'Large Cap', percentage: 85, recommended: 60 },
        { category: 'Mid Cap', percentage: 10, recommended: 25 },
        { category: 'Small Cap', percentage: 5, recommended: 15 }
      ],
      geographicAllocation: [
        { region: 'US', percentage: 95, recommended: 70 },
        { region: 'International', percentage: 5, recommended: 30 }
      ],
      riskScore: 7.2,
      diversificationScore: 3.8
    };

    const mockRebalancingRecommendations: RebalancingRecommendation[] = [
      {
        symbol: 'AAPL',
        currentAllocation: 25,
        targetAllocation: 15,
        action: 'sell',
        quantity: 50,
        reason: 'Overweight position due to strong performance'
      },
      {
        symbol: 'MSFT',
        currentAllocation: 8,
        targetAllocation: 12,
        action: 'buy',
        quantity: 30,
        reason: 'Underweight position, strong fundamentals'
      }
    ];

    setRecommendations(mockRecommendations);
    setDiversificationAnalysis(mockDiversificationAnalysis);
    setRebalancingRecommendations(mockRebalancingRecommendations);
    setMarketCommentary('Mock market commentary: The market is currently experiencing a bullish trend, driven by strong economic data and positive corporate earnings. However, volatility remains high, and investors should remain vigilant.');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive': return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'negative': return <TrendingDown className="h-5 w-5 text-red-600" />;
      case 'neutral': return <BarChart3 className="h-5 w-5 text-blue-600" />;
      default: return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'buy': return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'sell': return <TrendingDown className="h-5 w-5 text-red-600" />;
      case 'hold': return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case 'diversify': return <PieChart className="h-5 w-5 text-purple-600" />;
      case 'rebalance': return <Target className="h-5 w-5 text-orange-600" />;
      default: return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Analyzing your portfolio...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">AI is generating personalized recommendations</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Analysis Failed</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-4">{error}</p>
              <div className="space-x-4">
                <button
                  onClick={generateAIRecommendations}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">AI Portfolio Analysis</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPastAnalyses(!showPastAnalyses)}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {showPastAnalyses ? 'Hide' : 'Show'} Past Analyses
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
              {error}
            </div>
          )}

          {showPastAnalyses && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-3">Past Analyses</h3>
              {loadingPast ? (
                <div className="text-gray-500 dark:text-gray-400">Loading past analyses...</div>
              ) : pastAnalyses.length === 0 ? (
                <div className="text-gray-500 dark:text-gray-400">No past analyses found.</div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {pastAnalyses.map((analysis) => (
                    <div key={analysis.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Analysis from {new Date(analysis.createdAt).toLocaleString()}
                        </span>
                      </div>
                      
                      {/* Summary Metrics */}
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="bg-red-50 dark:bg-red-900 p-2 rounded">
                          <div className="text-xs text-red-800 dark:text-red-200 font-medium">Risk Score</div>
                          <div className="text-lg font-bold text-red-600 dark:text-red-300">
                            {analysis.result.diversificationAnalysis?.riskScore || 'N/A'}/10
                          </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900 p-2 rounded">
                          <div className="text-xs text-blue-800 dark:text-blue-200 font-medium">Diversification</div>
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-300">
                            {analysis.result.diversificationAnalysis?.diversificationScore || 'N/A'}/10
                          </div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900 p-2 rounded">
                          <div className="text-xs text-green-800 dark:text-green-200 font-medium">Recommendations</div>
                          <div className="text-lg font-bold text-green-600 dark:text-green-300">
                            {analysis.result.recommendations?.length || 0}
                          </div>
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      {analysis.result.performanceMetrics && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Performance Metrics</div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Total Return:</span>
                              <span className="ml-1 font-medium">{analysis.result.performanceMetrics.totalReturn}%</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Annual Return:</span>
                              <span className="ml-1 font-medium">{analysis.result.performanceMetrics.annualizedReturn}%</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Risk-Adj Return:</span>
                              <span className="ml-1 font-medium">{analysis.result.performanceMetrics.riskAdjustedReturn}%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Top Recommendations */}
                      {analysis.result.recommendations && analysis.result.recommendations.length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Top Recommendations</div>
                          <div className="space-y-2">
                            {analysis.result.recommendations.slice(0, 3).map((rec: any, idx: number) => (
                              <div key={idx} className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs">
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {rec.symbol ? `${rec.symbol}: ` : ''}{rec.title}
                                </div>
                                <div className="text-gray-600 dark:text-gray-300 mt-1">
                                  {rec.description?.substring(0, 100)}...
                                </div>
                                <div className="flex items-center mt-1 space-x-2">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    rec.priority === 'high' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                                    rec.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                                    'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                  }`}>
                                    {rec.priority} priority
                                  </span>
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {rec.confidence}% confidence
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Market Commentary */}
                      {analysis.result.marketCommentary && (
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Market Commentary</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                            {analysis.result.marketCommentary.substring(0, 200)}...
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200">Overall Recommendation</h3>
                  <p className="text-blue-600 dark:text-blue-300">{analysis.overallRecommendation}</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Risk Level</h3>
                  <p className="text-yellow-600 dark:text-yellow-300">{analysis.riskLevel}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 dark:text-green-200">Diversification Score</h3>
                  <p className="text-green-600 dark:text-green-300">{analysis.diversificationScore}/10</p>
                </div>
              </div>

              {analysis.stockRecommendations && analysis.stockRecommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Stock Recommendations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {analysis.stockRecommendations.map((rec: any, index: number) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                        <div className="font-medium text-gray-800 dark:text-gray-100">{rec.symbol}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">{rec.recommendation}</div>
                        {rec.reasoning && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{rec.reasoning}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.portfolioInsights && (
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Portfolio Insights</h3>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <p className="text-gray-700 dark:text-gray-200">{analysis.portfolioInsights}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!analysis && !showPastAnalyses && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-4">Click "Run AI Analysis" to generate portfolio insights</p>
              <button
                onClick={generateAIRecommendations}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Analyzing...' : 'Run AI Analysis'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 