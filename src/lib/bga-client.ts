import { BGAConfig, LoginResponse, BGASession } from './bga-types';

export class BGAClient {
  private session: BGASession;
  private baseUrl = 'https://en.boardgamearena.com';

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

      // Store cookies from initial response
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

      // Store new cookies from login response
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
}
