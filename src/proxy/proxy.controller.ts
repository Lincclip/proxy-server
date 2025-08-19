import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ProxyService } from './proxy.service';

@Controller('proxy')
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get('image')
  async getImage(@Query('url') url: string, @Res() res: Response) {
    if (!url) {
      return res.status(400).send('URL query parameter is required.');
    }
    
    try {
      const result = await this.proxyService.proxyImage(url);
      
      // 원본 이미지의 Content-Type을 그대로 전달
      res.set('Content-Type', result.headers['content-type']);
      res.send(result.data);
    } catch (error) {
      res.status(error.getStatus() || 500).send(error.message);
    }
  }
}