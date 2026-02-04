// BGA API Types

export interface BGAConfig {
  webrtcEnabled: boolean;
  facebookAppId: string;
  googleAppId: string;
  requestToken: string;
  locale: string;
  [key: string]: any;
}

export interface LoginResponse {
  status: number;
  data: {
    success: boolean;
    username: string;
    user_id: string;
    avatar: string;
    is_premium: string;
    partner_event?: {
      title: string;
      news_url: string;
      img_url: string;
    };
  };
}

export interface BGASession {
  requestToken: string;
  cookies: Map<string, string>;
  userId?: string;
  username?: string;
}
