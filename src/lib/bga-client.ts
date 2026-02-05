import { BGAConfig, LoginResponse, BGASession, GetPlayerFinishedGamesResponse, GetGameLogResponse, GetTableInfoResponse, GetRankingResponse, SearchPlayerResponse } from './bga-types';

export class BGAClient {
  private session: BGASession;
  private baseUrl = 'https://boardgamearena.com';

  constructor() {
    this.session = {
      requestToken: '',
      cookies: new Map(),
    };
  }

  /**
   * Initialize the client by fetching the homepage and extracting the request token
   */
  async initialize(): Promise<void> {
    console.log('[BGAClient] Initializing...');

    try {
      const response = await fetch(this.baseUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:146.0) Gecko/20100101 Firefox/146.0',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.5',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch homepage: ${response.status} ${response.statusText}`);
      }

      // Store initial cookies from homepage
      this.storeCookiesFromResponse(response);

      // Parse HTML to extract bgaConfig.requestToken
      const html = await response.text();
      const requestToken = this.extractRequestToken(html);

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

    if (!this.session.requestToken) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    try {
      // Prepare form data
      const formData = new URLSearchParams({
        username,
        password,
        remember_me: 'false',
        request_token: this.session.requestToken,
      });

      const response = await fetch(`${this.baseUrl}/account/auth/loginUserWithPassword.html`, {
        method: 'POST',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:146.0) Gecko/20100101 Firefox/146.0',
          Accept: '*/*',
          'Accept-Language': 'en-GB,en;q=0.5',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'X-Request-Token': this.session.requestToken,
          Referer: `${this.baseUrl}/?step=2&page=login`,
          Origin: this.baseUrl,
          Cookie: this.getCookieHeader(),
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        throw new Error(`Login request failed: ${response.status} ${response.statusText}`);
      }

      // Store session cookies from login response
      this.storeCookiesFromResponse(response);

      const loginResponse: LoginResponse = await response.json();

      if (loginResponse.status !== 1 || !loginResponse.data.success) {
        throw new Error('Login failed: Invalid credentials or server error');
      }

      // Update session with user info
      this.session.userId = loginResponse.data.user_id;
      this.session.username = loginResponse.data.username;

      // Update request token from cookies if available
      const newRequestToken = this.session.cookies.get('TournoiEnLigneidt');
      if (newRequestToken) {
        this.session.requestToken = newRequestToken;
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
   * Extract request token from HTML response
   */
  private extractRequestToken(html: string): string | null {
    // Look for: var bgaConfig = { ... requestToken: 'TOKEN' ... }
    const match = html.match(/var\s+bgaConfig\s*=\s*{[^}]*requestToken:\s*'([^']+)'/);
    return match ? match[1] : null;
  }

  /**
   * Store cookies from response headers
   */
  private storeCookiesFromResponse(response: Response): void {
    const setCookieHeaders = response.headers.getSetCookie();

    setCookieHeaders.forEach((cookieString) => {
      const [nameValue] = cookieString.split(';');
      const [name, value] = nameValue.split('=');

      if (name && value && value !== 'deleted') {
        this.session.cookies.set(name.trim(), value.trim());
      }
    });
  }

  /**
   * Get Cookie header string from stored cookies
   */
  private getCookieHeader(): string {
    const cookies: string[] = [];
    this.session.cookies.forEach((value, name) => {
      cookies.push(`${name}=${value}`);
    });
    return cookies.join('; ');
  }

  /**
   * Get current session information
   */
  getSession(): BGASession {
    return {
      requestToken: this.session.requestToken,
      cookies: new Map(this.session.cookies),
      userId: this.session.userId,
      username: this.session.username,
    };
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return !!this.session.userId && this.session.cookies.has('TournoiEnLigneidt');
  }


  /**
   * Fetch finished games for a specific player
   *
   * @param playerId - BGA player ID to fetch games for
   * @param gameId - BGA game ID (e.g., 1495 for Gaia Project)
   * @param page - Page number for pagination (1-based, returns 10 games per page)
   * @returns Response containing list of finished game tables
   *
   * @example
   * const games = await client.getPlayerFinishedGames(96457033, 1495, 1);
   * console.log(`Fetched ${games.data.tables.length} games`);
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
      // Step 1: Visit the gamestats page first to establish session context
      console.log(`[BGAClient] Visiting gamestats page to establish session...`);
      const gamestatsPageUrl = `${this.baseUrl}/gamestats?game=${gameId}`;

      const pageResponse = await fetch(gamestatsPageUrl, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:146.0) Gecko/20100101 Firefox/146.0',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.5',
          Cookie: this.getCookieHeader(),
        },
      });

      if (!pageResponse.ok) {
        throw new Error(`Failed to access gamestats page: ${pageResponse.status}`);
      }

      // Store any new cookies from the page visit
      this.storeCookiesFromResponse(pageResponse);

      // Step 2: Now make the API request for games list
      console.log(`[BGAClient] Making API request for finished games...`);

      // Build query parameters matching BGA's expected format
      const params = new URLSearchParams({
        player: playerId.toString(),
        opponent_id: '0', // 0 = all opponents
        game_id: gameId.toString(),
        finished: '0', // 0 = finished games (confusing but correct)
        page: page.toString(),
        updateStats: '0', // 0 = don't include stats (faster)
        'dojo.preventCache': Date.now().toString(),
      });

      const url = `${this.baseUrl}/gamestats/gamestats/getGames.html?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:146.0) Gecko/20100101 Firefox/146.0',
          Accept: '*/*',
          'Accept-Language': 'en-GB,en;q=0.5',
          'X-Request-Token': this.session.requestToken,
          Referer: gamestatsPageUrl,
          Cookie: this.getCookieHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch games: ${response.status} ${response.statusText}`);
      }

      const gamesResponse: GetPlayerFinishedGamesResponse = await response.json();

      console.log(`[BGAClient] Successfully fetched ${gamesResponse.data.tables.length} games`);

      return gamesResponse;
    } catch (error) {
      console.error('[BGAClient] Failed to fetch finished games:', error);
      throw error;
    }
  }

  /**
   * Fetch detailed game log for a specific game table
   *
   * @param tableId - BGA table ID (from GameTableInfo.table_id)
   * @param translated - Whether to get translated logs (default: true)
   * @returns Response containing detailed game log entries
   *
   * @example
   * const log = await client.getGameLog('798145204');
   * console.log(`Fetched ${log.data.logs.length} log entries`);
   */
  async getGameLog(tableId: string, translated: boolean = true): Promise<GetGameLogResponse> {
    if (!this.isLoggedIn()) {
      throw new Error('Not logged in. Call login() first.');
    }

    console.log(`[BGAClient] Fetching game log for table_id=${tableId}`);

    try {
      // First, visit the gamereview page to establish session for this game
      const gamereviewUrl = `${this.baseUrl}/gamereview?table=${tableId}`;

      const pageResponse = await fetch(gamereviewUrl, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:146.0) Gecko/20100101 Firefox/146.0',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.5',
          Cookie: this.getCookieHeader(),
        },
      });

      if (!pageResponse.ok) {
        console.log(`[BGAClient] Warning: Failed to visit gamereview page: ${pageResponse.status}`);
      }

      // Store any new cookies from the page visit
      this.storeCookiesFromResponse(pageResponse);

      // Small delay to let session establish
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Build query parameters
      const params = new URLSearchParams({
        table: tableId,
        translated: translated.toString(),
        'dojo.preventCache': Date.now().toString(),
      });

      const url = `${this.baseUrl}/archive/archive/logs.html?${params.toString()}`;

      const cookieHeader = this.getCookieHeader();
      console.log(`[BGAClient] DEBUG: Cookies being sent for game ${tableId}:`);
      console.log(`  ${cookieHeader.substring(0, 200)}...`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:146.0) Gecko/20100101 Firefox/146.0',
          Accept: '*/*',
          'Accept-Language': 'en-GB,en;q=0.5',
          'X-Request-Token': this.session.requestToken,
          'X-Requested-With': 'XMLHttpRequest',
          Referer: `${this.baseUrl}/gamereview?table=${tableId}`,
          Cookie: this.getCookieHeader(),
        },
      });

      if (!response.ok) {
        console.log(response);
        throw new Error(`Failed to fetch game log: ${response.status} ${response.statusText}`);
      }

      // Store cookies to keep session alive
      this.storeCookiesFromResponse(response);

      const logResponse: GetGameLogResponse = await response.json();

      // Check if BGA returned an error (status: "0" or status: 0)
      if (logResponse.status === 0 || logResponse.status === '0' as any) {
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
   *
   * @param tableId - BGA table ID (from GameTableInfo.table_id)
   * @returns Response containing detailed table information with all players' ELO ratings
   *
   * @example
   * const tableInfo = await client.getTableInfo('801274027');
   * console.log('Player ELOs:', tableInfo.data.player);
   */
  async getTableInfo(tableId: string): Promise<GetTableInfoResponse> {
    if (!this.isLoggedIn()) {
      throw new Error('Not logged in. Call login() first.');
    }

    console.log(`[BGAClient] Fetching table info for table_id=${tableId}`);

    try {
      // Build query parameters
      const params = new URLSearchParams({
        id: tableId,
        'dojo.preventCache': Date.now().toString(),
      });

      const url = `${this.baseUrl}/table/table/tableinfos.html?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:146.0) Gecko/20100101 Firefox/146.0',
          Accept: '*/*',
          'Accept-Language': 'en-GB,en;q=0.5',
          'X-Request-Token': this.session.requestToken,
          'X-Requested-With': 'XMLHttpRequest',
          Referer: `${this.baseUrl}/gamereview?table=${tableId}`,
          Cookie: this.getCookieHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch table info: ${response.status} ${response.statusText}`);
      }

      // Store cookies to keep session alive
      this.storeCookiesFromResponse(response);

      const tableInfoResponse = await response.json();

      console.log(`[BGAClient] Successfully fetched table info`);

      return tableInfoResponse;
    } catch (error) {
      console.error('[BGAClient] Failed to fetch table info:', error);
      throw error;
    }
  }

  /**
   * Fetch player rankings for a specific game
   *
   * @param gameId - BGA game ID (e.g., 1495 for Gaia Project)
   * @param start - Starting position in rankings (0-based, default: 0)
   * @param mode - Ranking mode ('elo' for ELO rankings, default: 'elo')
   * @returns Response containing ranked players list
   *
   * @example
   * const rankings = await client.getRanking(1495, 0, 'elo');
   * console.log('Top 10 players:', rankings.data.players.slice(0, 10));
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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:146.0) Gecko/20100101 Firefox/146.0',
        Accept: '*/*',
        'Accept-Language': 'en-GB,en;q=0.5',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Request-Token': this.session.requestToken,
        Cookie: this.getCookieHeader(),
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ranking: ${response.status} ${response.statusText}`);
    }

    // Store cookies to keep session alive
    this.storeCookiesFromResponse(response);

    const rankingResponse = await response.json();
    console.log(`[BGAClient] Successfully fetched ranking data`);

    return rankingResponse;
  }

  /**
   * Search for a player by name using BGA omnibar search
   *
   * @param query - Player name to search for
   * @returns Response containing matching players
   *
   * @example
   * const searchResults = await client.searchPlayer('AlabeSons');
   * if (searchResults.data.players.length > 0) {
   *   console.log('Found player:', searchResults.data.players[0]);
   * }
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

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:146.0) Gecko/20100101 Firefox/146.0',
        Accept: '*/*',
        'Accept-Language': 'en-GB,en;q=0.5',
        'X-Request-Token': this.session.requestToken,
        Cookie: this.getCookieHeader(),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to search player: ${response.status} ${response.statusText}`);
    }

    // Store cookies to keep session alive
    this.storeCookiesFromResponse(response);

    const searchResponse = await response.json();
    console.log(`[BGAClient] Found ${searchResponse.data.players.length} players matching "${query}"`);

    return searchResponse;
  }
}
