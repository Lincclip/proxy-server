import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

@Injectable()
export class ProxyService {
  constructor(private readonly httpService: HttpService) {}

  async proxyImage(imageUrl: string): Promise<any> {
    try {
      const response: AxiosResponse<Buffer> = await lastValueFrom(
        this.httpService.get(imageUrl, {
          responseType: 'arraybuffer', // 이미지 데이터를 바이너리로 받음
        })
      );

      return {
        data: response.data,
        headers: response.headers,
      };
    } catch (error) {
      if (error.response) {
        throw new HttpException(
          `Failed to fetch image: ${error.message}`,
          error.response.status,
        );
      }
      throw new HttpException('Failed to fetch image.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}