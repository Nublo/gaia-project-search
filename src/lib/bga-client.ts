import { chromium, Browser, BrowserContext, Page, APIRequestContext } from 'playwright';
import { BGASession, LoginResponse, GetPlayerFinishedGamesResponse, GetGameLogResponse, GetTableInfoResponse, GetRankingResponse, SearchPlayerResponse } from './bga-types';

export interface BGAClientOptions {
  headless?: boolean;
  slowMo?: number;
}

export class BGAClient {
  private session: BGASession;
  private baseUrl = 'https://boardgamearena.com';
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private request: APIRequestContext | null = null;
  private options: BGAClientOptions;

  constructor(options: BGAClientOptions = {}) {
    this.session = {
      requestToken: '',
    };
    this.options = {
      headless: options.headless ?? true,
      slowMo: options.slowMo,
    };
  }

  /**
   * Initialize the client by launching a browser, navigating to BGA, and extracting the request token
   */
  async initialize(): Promise<void> {
    console.log('[BGAClient] Initializing (launching browser)...');

    try {
      this.browser = await chromium.launch({
        headless: this.options.headless,
        slowMo: this.options.slowMo,
      });

      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:146.0) Gecko/20100101 Firefox/146.0',
        locale: 'en-GB',
      });

      this.page = await this.context.newPage();
      this.request = this.context.request;

      // Navigate to BGA homepage (establishes cookies via real Chromium)
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });

      const currentUrl = this.page.url();
      console.log(`[BGAClient] Page loaded at: ${currentUrl}`);

      // Update base URL to match the actual domain (BGA may redirect, e.g., to en.boardgamearena.com)
      const pageOrigin = new URL(currentUrl).origin;
      if (pageOrigin !== this.baseUrl) {
        console.log(`[BGAClient] Updating base URL from ${this.baseUrl} to ${pageOrigin}`);
        this.baseUrl = pageOrigin;
      }

      // Extract request token from bgaConfig JS object
      const requestToken = await this.page.evaluate(() => {
        return (window as any).bgaConfig?.requestToken as string | undefined;
      });

      if (!requestToken) {
        throw new Error('Failed to extract request token from homepage');
      }

      this.session.requestToken = requestToken;
      console.log('[BGAClient] Initialized successfully');
      console.log('[BGAClient] Request token:', requestToken);
    } catch (error) {
      console.error('[BGAClient] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    console.log(`[BGAClient] Logging in as: ${username}`);

    if (!this.session.requestToken || !this.request) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    try {
      const loginUrl = `${this.baseUrl}/account/auth/loginUserWithPassword.html`;

      const formData = new URLSearchParams({
        username,
        password,
        remember_me: 'false',
        request_token: this.session.requestToken,
      });

      const response = await this.request.fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'X-Request-Token': this.session.requestToken,
          Referer: `${this.baseUrl}/?step=2&page=login`,
          Origin: this.baseUrl,
        },
        data: formData.toString(),
      });

      if (!response.ok()) {
        throw new Error(`Login request failed: ${response.status()} ${response.statusText()}`);
      }

      const loginResponse: LoginResponse = await response.json();

      if (loginResponse.status !== 1 || !loginResponse.data.success) {
        throw new Error('Login failed: Invalid credentials or server error');
      }

      // Update session with user info
      this.session.userId = loginResponse.data.user_id;
      this.session.username = loginResponse.data.username;

      // Re-extract request token from cookies (browser context manages them)
      const cookies = await this.context!.cookies(this.baseUrl);
      const idtCookie = cookies.find(c => c.name === 'TournoiEnLigneidt');
      if (idtCookie) {
        this.session.requestToken = idtCookie.value;
      }

      console.log('[BGAClient] Login successful');
      console.log('[BGAClient] User ID:', loginResponse.data.user_id);
      console.log('[BGAClient] Username:', loginResponse.data.username);

      return loginResponse;
    } catch (error) {
      console.error('[BGAClient] Login failed:', error);
      throw error;
    }
  }

  /**
   * Execute a fetch via Playwright's context.request API (shares cookies with browser).
   * Good for simple API calls (search, ranking) where anti-bot isn't a concern.
   */
  private async apiFetch<T>(url: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<T> {
    if (!this.request) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    const headers: Record<string, string> = {
      Accept: '*/*',
      'X-Request-Token': this.session.requestToken,
      ...options.headers,
    };

    const response = await this.request.fetch(url, {
      method: options.method || 'GET',
      headers,
      data: options.body,
    });

    if (!response.ok()) {
      throw new Error(`Request failed: ${response.status()} ${response.statusText()}`);
    }

    return response.json();
  }

  /**
   * Navigate the browser directly to an API URL, injecting custom headers via route interception.
   * This is a real browser navigation request — correct TLS fingerprint, cookies, and JS context.
   * Bypasses Sentry's fetch wrapper since it's a navigation, not a programmatic fetch.
   */
  private async browserNavigate<T>(url: string, extraHeaders: Record<string, string> = {}): Promise<T> {
    if (!this.page) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    const requestToken = this.session.requestToken;

    // Intercept the specific request to add custom headers
    const urlPattern = url.split('?')[0] + '*';
    await this.page.route(urlPattern, async (route) => {
      await route.continue({
        headers: {
          ...route.request().headers(),
          'X-Request-Token': requestToken,
          ...extraHeaders,
        },
      });
    });

    try {
      const response = await this.page.goto(url, { waitUntil: 'load' });

      if (!response) {
        throw new Error('No response received from navigation');
      }

      if (!response.ok()) {
        throw new Error(`Request failed: ${response.status()} ${response.statusText()}`);
      }

      // Parse the JSON body from the navigation response
      const body = await response.body();
      return JSON.parse(body.toString());
    } finally {
      await this.page.unroute(urlPattern);
    }
  }

  /**
   * Navigate to a page in the browser and refresh the request token.
   * Uses networkidle to ensure BGA's JS has fully executed.
   */
  private async navigateTo(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    await this.page.goto(url, { waitUntil: 'networkidle' });

    // Refresh request token from the page (BGA may rotate it on each page load)
    const newToken = await this.page.evaluate(() => {
      return (window as any).bgaConfig?.requestToken as string | undefined;
    });
    if (newToken) {
      this.session.requestToken = newToken;
    }
  }

  /**
   * Get current session information
   */
  getSession(): BGASession {
    return {
      requestToken: this.session.requestToken,
      userId: this.session.userId,
      username: this.session.username,
    };
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return !!this.session.userId;
  }

  /**
   * Close the browser and clean up resources
   */
  async close(): Promise<void> {
    if (this.browser) {
      console.log('[BGAClient] Closing browser...');
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.request = null;
    }
  }

  /**
   * Fetch finished games for a specific player
   */
  async getPlayerFinishedGames(
    playerId: number,
    gameId: number,
    page: number = 1
  ): Promise<GetPlayerFinishedGamesResponse> {
    if (!this.isLoggedIn()) {
      throw new Error('Not logged in. Call login() first.');
    }

    console.log(`[BGAClient] Fetching finished games for player=${playerId}, game=${gameId}, page=${page}`);

    try {
      // Navigate to gamestats page to establish session context
      const gamestatsPageUrl = `${this.baseUrl}/gamestats?game=${gameId}`;
      await this.navigateTo(gamestatsPageUrl);

      // Build API URL
      const params = new URLSearchParams({
        player: playerId.toString(),
        opponent_id: '0',
        game_id: gameId.toString(),
        finished: '0',
        page: page.toString(),
        updateStats: '0',
        'dojo.preventCache': Date.now().toString(),
      });

      const url = `${this.baseUrl}/gamestats/gamestats/getGames.html?${params.toString()}`;

      const gamesResponse = await this.browserNavigate<GetPlayerFinishedGamesResponse>(url, {
        'X-Requested-With': 'XMLHttpRequest',
        Referer: gamestatsPageUrl,
      });

      console.log(`[BGAClient] Successfully fetched ${gamesResponse.data.tables.length} games`);

      return gamesResponse;
    } catch (error) {
      console.error('[BGAClient] Failed to fetch finished games:', error);
      throw error;
    }
  }

  /**
   * Fetch detailed game log for a specific game table
   */
  async getGameLog(tableId: string, translated: boolean = true): Promise<GetGameLogResponse> {
    if (!this.isLoggedIn()) {
      throw new Error('Not logged in. Call login() first.');
    }

    console.log(`[BGAClient] Fetching game log for table_id=${tableId}`);

    try {
      // Navigate to gamereview page to establish session for this game
      const gamereviewUrl = `${this.baseUrl}/gamereview?table=${tableId}`;
      await this.navigateTo(gamereviewUrl);

      // Build API URL
      const params = new URLSearchParams({
        table: tableId,
        translated: translated.toString(),
        'dojo.preventCache': Date.now().toString(),
      });

      const url = `${this.baseUrl}/archive/archive/logs.html?${params.toString()}`;

      const logResponse = await this.browserNavigate<GetGameLogResponse>(url, {
        'X-Requested-With': 'XMLHttpRequest',
        Referer: gamereviewUrl,
      });

      // Check if BGA returned an error
      if (logResponse.status === 0 || logResponse.status === ('0' as any)) {
        const errorMsg = (logResponse as any).error || 'Unknown error';
        throw new Error(`BGA API error: ${errorMsg}`);
      }

      console.log(`[BGAClient] Successfully fetched game log`);

      return logResponse;
    } catch (error) {
      console.error('[BGAClient] Failed to fetch game log:', error);
      throw error;
    }
  }

  /**
   * Fetch detailed table information including player ELO ratings
   */
  async getTableInfo(tableId: string): Promise<GetTableInfoResponse> {
    if (!this.isLoggedIn()) {
      throw new Error('Not logged in. Call login() first.');
    }

    console.log(`[BGAClient] Fetching table info for table_id=${tableId}`);

    try {
      const params = new URLSearchParams({
        id: tableId,
        'dojo.preventCache': Date.now().toString(),
      });

      const url = `${this.baseUrl}/table/table/tableinfos.html?${params.toString()}`;

      const tableInfoResponse = await this.browserNavigate<GetTableInfoResponse>(url, {
        'X-Requested-With': 'XMLHttpRequest',
        Referer: `${this.baseUrl}/gamereview?table=${tableId}`,
      });

      console.log(`[BGAClient] Successfully fetched table info`);

      return tableInfoResponse;
    } catch (error) {
      console.error('[BGAClient] Failed to fetch table info:', error);
      throw error;
    }
  }

  /**
   * Fetch player rankings for a specific game
   */
  async getRanking(gameId: number, start: number = 0, mode: string = 'elo'): Promise<GetRankingResponse> {
    if (!this.isLoggedIn()) {
      throw new Error('Not logged in. Call login() first.');
    }

    console.log(`[BGAClient] Fetching rankings for game_id=${gameId}, start=${start}, mode=${mode}`);

    const params = new URLSearchParams({
      game: gameId.toString(),
      start: start.toString(),
      mode: mode,
    });

    const url = `${this.baseUrl}/gamepanel/gamepanel/getRanking.html`;

    const rankingResponse = await this.apiFetch<GetRankingResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: params.toString(),
    });

    console.log(`[BGAClient] Successfully fetched ranking data`);

    return rankingResponse;
  }

  /**
   * Search for a player by name using BGA omnibar search
   */
  async searchPlayer(query: string): Promise<SearchPlayerResponse> {
    if (!this.isLoggedIn()) {
      throw new Error('Not logged in. Call login() first.');
    }

    console.log(`[BGAClient] Searching for player: ${query}`);

    const params = new URLSearchParams({
      query: query,
    });

    const url = `${this.baseUrl}/omnibar/omnibar/search.html?${params.toString()}`;

    const searchResponse = await this.apiFetch<SearchPlayerResponse>(url);

    console.log(`[BGAClient] Found ${searchResponse.data.players.length} players matching "${query}"`);

    return searchResponse;
  }
}
