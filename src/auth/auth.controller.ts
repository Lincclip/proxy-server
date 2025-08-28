import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // OAuth 시작 엔드포인트
  @Get('google')
  async googleAuth(@Res() res: Response) {
    try {
      const authUrl = await this.authService.getGoogleAuthUrl();
      res.redirect(authUrl);
    } catch (error) {
      res.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
    }
  }

  // OAuth 콜백 처리
  @Get('google/callback')
  async googleAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      const tokens = await this.authService.handleGoogleCallback(code);
      
      // 성공 페이지 렌더링 (Chrome Extension으로 메시지 전송)
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>로그인 성공</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .success-box {
              background: rgba(255,255,255,0.1);
              padding: 30px;
              border-radius: 10px;
              backdrop-filter: blur(10px);
              box-shadow: 0 8px 32px rgba(0,0,0,0.1);
              max-width: 400px;
              width: 100%;
            }
            .checkmark {
              font-size: 60px;
              color: #4CAF50;
              margin-bottom: 20px;
            }
            h1 {
              margin: 0 0 20px 0;
              font-size: 24px;
            }
            p {
              margin: 10px 0;
              line-height: 1.5;
            }
            .loading {
              margin-top: 20px;
              font-size: 14px;
              opacity: 0.8;
            }
          </style>
        </head>
        <body>
          <div class="success-box">
            <div class="checkmark">✓</div>
            <h1>로그인 성공!</h1>
            <p>Chrome Extension으로 인증 정보가 전송되었습니다.</p>
            <p>이 창을 닫으셔도 됩니다.</p>
            <div class="loading">잠시 후 자동으로 창이 닫힙니다...</div>
          </div>
          
          <script>
            // Chrome Extension으로 메시지 전송
            const message = {
              type: 'AUTH_SUCCESS',
              access_token: '${tokens.access_token}',
              refresh_token: '${tokens.refresh_token}',
              expires_in: ${tokens.expires_in},
              user: ${JSON.stringify(tokens.user)}
            };
            
            // postMessage로 Chrome Extension에 전송
            window.postMessage(message, '*');
            
            // 3초 후 자동으로 창 닫기
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
        </html>
      `);
      
    } catch (error) {
      res.status(HttpStatus.BAD_REQUEST).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>로그인 실패</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px;
              background: #ff6b6b;
              color: white;
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .error-box {
              background: rgba(255,255,255,0.1);
              padding: 30px;
              border-radius: 10px;
              backdrop-filter: blur(10px);
              max-width: 400px;
              width: 100%;
            }
            .error-icon {
              font-size: 60px;
              color: #fff;
              margin-bottom: 20px;
            }
            button {
              background: rgba(255,255,255,0.2);
              border: none;
              color: white;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              margin-top: 20px;
            }
            button:hover {
              background: rgba(255,255,255,0.3);
            }
          </style>
        </head>
        <body>
          <div class="error-box">
            <div class="error-icon">✗</div>
            <h1>로그인 실패</h1>
            <p>오류: ${error.message}</p>
            <button onclick="window.close()">창 닫기</button>
          </div>
        </body>
        </html>
      `);
    }
  }

  // Chrome Extension 상태 확인
  @Get('status')
  async getAuthStatus(@Query('token') token: string) {
    return this.authService.validateToken(token);
  }
}
