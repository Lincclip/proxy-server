import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AuthService {
  private readonly googleClientId: string;
  private readonly googleClientSecret: string;
  private readonly redirectUri: string;
  private readonly supabaseUrl: string;
  private readonly supabaseAnonKey: string;

  constructor(private configService: ConfigService) {
    this.googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '707010851630-te3g8f2t9uacdn3rb0krro77c2rt5u06.apps.googleusercontent.com';
    this.googleClientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET') || 'dummy-secret';
    this.redirectUri = this.configService.get<string>('OAUTH_REDIRECT_URI') || 'http://localhost:8000/auth/google/callback';
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL') || 'https://rfzfhlotsnxeyxnwhtpj.supabase.co';
    this.supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY') || 'dummy-key';
  }

  // Google OAuth URL 생성
  async getGoogleAuthUrl(): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.googleClientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'email profile',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // Google OAuth 콜백 처리
  async handleGoogleCallback(code: string) {
    try {
      // 1. Authorization code를 access token으로 교환
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: this.googleClientId,
        client_secret: this.googleClientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri
      });

      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      // 2. Google에서 사용자 정보 가져오기
      const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      const userInfo = userResponse.data;

      // 3. Supabase에 사용자 등록/로그인
      const supabaseUser = await this.createOrLoginSupabaseUser(userInfo, access_token);

      return {
        access_token: supabaseUser.access_token,
        refresh_token: supabaseUser.refresh_token,
        expires_in: expires_in,
        user: {
          id: supabaseUser.user?.id || userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture
        }
      };

    } catch (error) {
      console.error('Google OAuth error:', error.response?.data || error.message);
      throw new UnauthorizedException('Google OAuth 처리 실패: ' + (error.response?.data?.error_description || error.message));
    }
  }

  // Supabase에 사용자 등록/로그인
  private async createOrLoginSupabaseUser(googleUser: any, googleAccessToken: string) {
    try {
      // Supabase에 Google 사용자 정보로 로그인 시도
      const response = await axios.post(
        `${this.supabaseUrl}/auth/v1/signup`,
        {
          email: googleUser.email,
          password: `google_oauth_${googleUser.id}_${Date.now()}`, // 고유한 비밀번호 생성
          data: {
            full_name: googleUser.name,
            avatar_url: googleUser.picture,
            provider: 'google',
            google_id: googleUser.id
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.supabaseAnonKey
          }
        }
      );

      if (response.status === 200) {
        return response.data;
      } else if (response.status === 422) {
        // 사용자가 이미 존재하는 경우, 로그인 시도
        const loginResponse = await axios.post(
          `${this.supabaseUrl}/auth/v1/token?grant_type=password`,
          {
            email: googleUser.email,
            password: `google_oauth_${googleUser.id}_${Date.now()}`
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'apikey': this.supabaseAnonKey
            }
          }
        );

        return loginResponse.data;
      }

      throw new Error('Supabase 사용자 생성/로그인 실패');

    } catch (error) {
      console.error('Supabase error:', error.response?.data || error.message);
      
      // 사용자가 이미 존재하는 경우 다른 방법으로 처리
      if (error.response?.status === 422) {
        // 기존 사용자 정보 반환 (임시 토큰 생성)
        return {
          access_token: `temp_${googleUser.id}_${Date.now()}`,
          refresh_token: `refresh_${googleUser.id}_${Date.now()}`,
          user: {
            id: googleUser.id,
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture
          }
        };
      }
      
      throw new UnauthorizedException('Supabase 연동 실패: ' + (error.response?.data?.error_description || error.message));
    }
  }

  // 토큰 검증
  async validateToken(token: string) {
    try {
      const response = await axios.get(`${this.supabaseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': this.supabaseAnonKey
        }
      });

      return { valid: true, user: response.data };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}
