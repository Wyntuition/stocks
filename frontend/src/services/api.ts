import axios from 'axios';
import { PortfolioItem, CreatePortfolioItemRequest, UpdatePortfolioItemRequest, PortfolioSummary } from '../types';

const API_BASE_URL = '/api';

// Axios instance with JWT support
const api = axios.create({ baseURL: API_BASE_URL });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  async register(email: string, password: string, name?: string) {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const listApi = {
  async getAllLists() {
    const response = await api.get('/lists');
    return response.data;
  },

  async createList(data: { name: string; description?: string }) {
    const response = await api.post('/lists', data);
    return response.data;
  },

  async updateList(id: string, data: { name?: string; description?: string }) {
    const response = await api.put(`/lists/${id}`, data);
    return response.data;
  },

  async deleteList(id: string) {
    await api.delete(`/lists/${id}`);
  },

  async setDefaultList(id: string) {
    const response = await api.post(`/lists/${id}/set-default`);
    return response.data;
  },
};

export const portfolioApi = {
  async getAllPortfolioItems(listId?: string): Promise<PortfolioItem[]> {
    const params = listId ? { listId } : {};
    const response = await api.get('/portfolio', { params });
    return response.data;
  },

  async getPortfolioSummary(listId?: string): Promise<PortfolioSummary> {
    const params = listId ? { listId } : {};
    const response = await api.get('/portfolio/summary', { params });
    return response.data;
  },

  async getAIAnalysis(listId?: string): Promise<any> {
    const params = listId ? { listId } : {};
    const response = await api.get('/portfolio/ai-analysis', { params });
    return response.data;
  },

  async createPortfolioItem(data: CreatePortfolioItemRequest & { listId?: string }): Promise<PortfolioItem> {
    const response = await api.post('/portfolio/stock', data);
    return response.data;
  },

  async updatePortfolioItem(id: string, data: UpdatePortfolioItemRequest): Promise<PortfolioItem> {
    const response = await api.put(`/portfolio/stock/${id}`, data);
    return response.data;
  },

  async deletePortfolioItem(id: string): Promise<void> {
    await api.delete(`/portfolio/stock/${id}`);
  },

  async bulkImport(items: (CreatePortfolioItemRequest & { listId?: string })[], listId?: string): Promise<{
    successful: PortfolioItem[];
    failed: { item: CreatePortfolioItemRequest; error: string }[];
  }> {
    const response = await api.post('/portfolio/bulk', { items, listId });
    return response.data;
  },

  async importCsv(csv: string, listId?: string): Promise<any> {
    const response = await api.post('/portfolio/import-csv', { csv, listId });
    return response.data;
  },

  async getPastAnalyses(listId?: string): Promise<any> {
    const params = listId ? { listId } : {};
    const response = await api.get('/portfolio/past-analyses', { params });
    return response.data;
  },

  // Cash Flow Management
  async addCashFlow(data: { type: 'deposit' | 'withdrawal'; amount: number; date: string; description?: string; listId?: string }): Promise<any> {
    const response = await api.post('/portfolio/cash-flow', data);
    return response.data;
  },

  async getCashFlows(listId?: string): Promise<any[]> {
    const params = listId ? { listId } : {};
    const response = await api.get('/portfolio/cash-flows', { params });
    return response.data;
  },

  async getTotalCashInvested(listId?: string): Promise<{ totalCashInvested: number }> {
    const params = listId ? { listId } : {};
    const response = await api.get('/portfolio/total-cash-invested', { params });
    return response.data;
  },

  // Position Selling
  async sellPosition(data: { portfolioId: string; quantity: number; price: number; date?: string; fees?: number; notes?: string }): Promise<any> {
    const response = await api.post('/portfolio/sell-position', data);
    return response.data;
  },

  // Transaction History
  async getTransactions(listId?: string): Promise<any[]> {
    const params = listId ? { listId } : {};
    const response = await api.get('/portfolio/transactions', { params });
    return response.data;
  },
};
