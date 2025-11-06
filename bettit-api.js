/**
 * Bettit API Client
 * Handles all communication with the Bettit backend API
 */

class BettitAPI {
    constructor(baseURL = 'http://localhost:5002') {
        this.baseURL = baseURL;
        this.token = this.loadToken();
    }

    // ========== TOKEN MANAGEMENT ==========

    loadToken() {
        return localStorage.getItem('bettit_token');
    }

    saveToken(token) {
        this.token = token;
        localStorage.setItem('bettit_token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('bettit_token');
    }

    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    // ========== HTTP HELPERS ==========

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getAuthHeaders(),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return { success: true, data };
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            return { success: false, error: error.message };
        }
    }

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // ========== AUTHENTICATION ==========

    async register(username, email, password, displayName = null) {
        const result = await this.post('/api/auth/register', {
            username,
            email,
            password,
            display_name: displayName
        });

        if (result.success && result.data.user) {
            this.saveToken(result.data.user.token);
        }

        return result;
    }

    async login(email, password) {
        const result = await this.post('/api/auth/login', {
            email,
            password
        });

        if (result.success && result.data.user) {
            this.saveToken(result.data.user.token);
        }

        return result;
    }

    async validateToken() {
        if (!this.token) {
            return { success: false, error: 'No token' };
        }

        const result = await this.post('/api/auth/validate', {
            token: this.token
        });

        if (!result.success) {
            this.clearToken();
        }

        return result;
    }

    async getMe() {
        return this.get('/api/auth/me');
    }

    logout() {
        this.clearToken();
    }

    isAuthenticated() {
        return !!this.token;
    }

    // ========== MARKETS ==========

    async getMarkets(filters = {}) {
        const params = new URLSearchParams({
            status: filters.status || 'open',
            limit: filters.limit || 50,
            offset: filters.offset || 0
        });

        if (filters.community) {
            params.append('community', filters.community);
        }

        return this.get(`/api/markets?${params}`);
    }

    async getMarket(marketId) {
        return this.get(`/api/markets/${marketId}`);
    }

    async createMarket(marketData) {
        return this.post('/api/markets', {
            question: marketData.question,
            description: marketData.description || '',
            resolution_criteria: marketData.resolutionCriteria,
            resolution_hours: marketData.resolutionHours || 24,
            community: marketData.community || 'general',
            source_url: marketData.sourceUrl,
            source_title: marketData.sourceTitle,
            image_url: marketData.imageUrl
        });
    }

    async createRedditMarket(redditPost, marketType) {
        return this.post('/api/markets/reddit', {
            reddit_post: redditPost,
            market_type: marketType
        });
    }

    // ========== BETTING ==========

    async simulateBet(marketId, outcome, amount) {
        return this.post('/api/bets/simulate', {
            market_id: marketId,
            outcome,
            amount
        });
    }

    async placeBet(marketId, outcome, amount) {
        return this.post('/api/bets/place', {
            market_id: marketId,
            outcome,
            amount
        });
    }

    async getMyBets(limit = 50) {
        return this.get(`/api/bets/my-bets?limit=${limit}`);
    }

    async getMarketBets(marketId) {
        return this.get(`/api/bets/market/${marketId}`);
    }

    // ========== SOCIAL ==========

    async getLeaderboard(limit = 100, community = null) {
        const params = new URLSearchParams({ limit });
        if (community) params.append('community', community);
        return this.get(`/api/leaderboard?${params}`);
    }

    async getUserProfile(userId) {
        return this.get(`/api/users/${userId}`);
    }

    // ========== TRANSACTIONS ==========

    async getMyTransactions(limit = 50) {
        return this.get(`/api/transactions/my-history?limit=${limit}`);
    }

    // ========== ADMIN ==========

    async resolveMarket(marketId, outcome) {
        return this.post(`/api/admin/markets/${marketId}/resolve`, {
            outcome
        });
    }

    // ========== HEALTH ==========

    async health() {
        return this.get('/api/health');
    }
}

// Create global instance
const bettitAPI = new BettitAPI();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BettitAPI, bettitAPI };
}
