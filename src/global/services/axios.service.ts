import { getParameter, postParameter } from '@app/common';
import { HttpService } from '@nestjs/axios';
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { AxiosError, AxiosResponse } from 'axios';
import { catchError, firstValueFrom, map, retry, timeout, timer } from 'rxjs';

@Injectable()
export class AxiosService {
  private readonly logger = new Logger(AxiosService.name);
  constructor(private readonly httpService: HttpService) {}

  onApplicationBootstrap() {
    this.httpService.axiosRef.defaults.timeout = 30_000;
  }

  public get = async <T extends object | object[]>(input: getParameter) => {
    const { uri, params, headers } = input;
    const response = await firstValueFrom(
      this.httpService.get<T>(uri, { params, headers }).pipe(
        retry({
          count: 3,
          delay: (error, retryCount) => {
            this.logger.warn(
              `Retrying request... attempt #${retryCount} after error: ${error.message}`,
            );
            return new Promise((res) => setTimeout(res, retryCount * 2000));
          },
        }),
        catchError((error: AxiosError) => {
          if (error?.response) {
            this.logger.error(error.response.data);
          }
          throw error;
        }),
      ),
    );

    return response;
  };

  async post<T = unknown>(input: postParameter): Promise<T> {
    const { uri, body, headers } = input;
    return firstValueFrom(
      this.httpService.post<T>(uri, body, { headers }).pipe(
        retry({
          count: 3,
          delay: (err: AxiosError, retryCount) => {
            const canRetry = !err.response || err.response.status >= 500;
            if (!canRetry) throw err;

            this.logger.warn(
              `POST ${uri} – retry ${retryCount}/3 after ${err.message}`,
            );
            return timer(retryCount * 2000); // linear backoff
          },
        }),
        timeout(35_000),
        map((res: AxiosResponse<T>) => res.data),
        catchError((err: AxiosError) => {
          const code = err.response?.status || 0;
          const payload = err.response?.data;
          this.logger.error(
            `POST ${uri} failed after retries – ${code} ${JSON.stringify(payload)}`,
          );
          throw new ForbiddenException(`${err.message}`);
        }),
      ),
    );
  }
}
