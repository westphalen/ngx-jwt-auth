import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { AuthState } from './auth.state';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authState: AuthState) { }

  /**
   * Transform the HttpRequest to add Api Host.
   *
   * @param {HttpRequest<any>} req
   * @param {HttpHandler} next
   * @returns {Observable<HttpEvent<any>>}
   */
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let token = this.authState.getToken();
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: 'Bearer ' + token,
        },
      });
    }

    return next.handle(req).do((event: HttpEvent<any>) => {
      if (event instanceof HttpResponse) {
        this.handleResponseHeader(event);
      }
    }, (err) => {
      if (err instanceof HttpErrorResponse) {
        this.handleResponseHeader(err);

        if (err.status == 401) {
          this.authState.triggerHttpUnauthorized(err, req);
        }
      }
    });
  }

  /**
   * Get Authorization header and send it to AuthState.
   *
   * @param {HttpResponse | HttpErrorResponse} event
   */
  private handleResponseHeader(event: HttpResponse<any> | HttpErrorResponse): void {
    let authorization = event.headers.get('Authorization');
    if (authorization) {
      this.authState.setToken(authorization);
    }
  }
}
