import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Se já é uma resposta formatada (com data, meta, links), retorna como está
        if (data && typeof data === 'object' && 'data' in data) {
          return data;
        }
        // Caso contrário, retorna os dados diretamente
        return data;
      }),
    );
  }
}
