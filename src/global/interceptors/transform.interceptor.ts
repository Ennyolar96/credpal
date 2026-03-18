import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Res<T> {
  success: boolean;
  timestamp: string;
  server_res: string;
  statusCode: number;
  error: string;
  path: string;
  message: Array<string> | string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Res<T>> {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) { }
  intercept(context: ExecutionContext, next: CallHandler): Observable<Res<T>> {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        timestamp: new Date().toISOString(),
        server_res: 'Success, everything looks good',
        statusCode: response.statusCode,
        error: '',
        path: httpAdapter.getRequestUrl(ctx.getRequest()),
        message: typeof data === 'string' ? [data] : ['Data Fetched'],
        data: typeof data !== 'string' ? data : [],
      })),
    );
  }
}
