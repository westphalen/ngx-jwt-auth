import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

@Injectable()
export class AuthState {
  /**
   * Subscribe to the auth token.
   *
   * @type {Observable<string>}
   */
  public token$: Observable<string>;

  /**
   * Subscribe to unauthorized exceptions.
   *
   * @type {Observable<void>}
   */
  public unauthorized$: Observable<void>;

  /**
   * Holds the current token.
   *
   * @type {BehaviorSubject<string>}
   */
  private token: BehaviorSubject<string> = new BehaviorSubject<string>(null);

  /**
   * Subject for unauthorized errors.
   *
   * @type {Subject<void>}
   */
  private unauthorized: Subject<void> = new Subject<void>();

  /**
   * AuthState constructor.
   */
  constructor() {
    this.token$ = this.token.asObservable();
    this.unauthorized$ = this.unauthorized.asObservable();
  }

  /**
   * Get the current token.
   *
   * @returns {string}
   */
  public getToken(): string {
    return this.token.getValue();
  }

  /**
   * Set the current token.
   *
   * @param {string} token
   */
  public setToken(token: string): void {
    let parts = token.split(' ');
    if (parts.length > 0) {
      token = parts.pop();
      this.token.next(token);
    }
  }

  /**
   * Handle unauthorized http exception.
   *
   * @param {HttpErrorResponse} error
   * @param {HttpRequest} request
   */
  public triggerHttpUnauthorized(error: HttpErrorResponse, request?: HttpRequest<any>): void {
    console.log('AuthState.triggerHttpUnauthorized.', error, request);
    this.unauthorized.next();
  }

  /**
   * Manually trigger unauthorized exception.
   *
   * @param {string} error
   */
  public triggerUnauthorized(error: string): void {
    console.log('AuthState.triggerUnauthorized: "' + error + '".');
    this.unauthorized.next();
  }
}
