import { Injectable, Optional } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/fromPromise';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subject } from 'rxjs/Subject';
import { AuthUserService } from './user-service/user.service';
import { AuthState } from './auth.state';
import { AuthCredentials } from './auth.credentials';
import { AuthBackend } from './auth.backend';

@Injectable()
export class AuthService<T, R = AuthCredentials> {

  /**
   * Subscribe to the current user.
   *
   * @type {Observable<User>}
   */
  public user$: Observable<T>;

  /**
   * Subscribe to unsatisfied requireUsers.
   *
   * @type {Observable<T>}
   */
  public userRequiredFails$: Observable<void>;

  /**
   * Observable for current authentication state.
   *
   * @type {Observable<boolean>}
   */
  public authenticated$: Observable<boolean>;

  /**
   * Observable for AuthService's activation state.
   *
   * @type {Observable<boolean>}
   */
  public activated$: Observable<boolean>;
  /**
   * Keeps track of the AuthService activation state.
   *
   * @type {BehaviorSubject<boolean>}
   * @private
   */
  protected activated: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  /**
   * Registers unsatisfied requireUsers.
   *
   * @type {Subject<void>}
   * @private
   */
  private _userRequiredFails: Subject<void> = new Subject<void>();
  /**
   * Holds the current user.
   *
   * @type {BehaviorSubject<T>}
   * @private
   */
  private currentUser: BehaviorSubject<T> = new BehaviorSubject<T>(null);

  /**
   * AuthService constructor.
   *
   * @param {AuthState} state
   * @param {AuthBackend<T>} backend
   * @param {AuthUserService<T>} userProvider
   */
  constructor(public state: AuthState,
              @Optional() private backend?: AuthBackend<T, R>,
              @Optional() private userProvider?: AuthUserService<T>) {
    console.log('Hello AuthService');

    this.user$ = this.currentUser.asObservable();

    this.activated$ = this.activated.asObservable().distinctUntilChanged();

    this.authenticated$ = this.user$.map((v) => v != null).distinctUntilChanged();

    this.userRequiredFails$ = this._userRequiredFails.asObservable();

    this.whenActivated().subscribe(() => console.info('AuthService activated.', this.user));
  }

  /**
   * Get the current user.
   *
   * @returns {string}
   */
  public get user(): T {
    return this.currentUser.getValue();
  }

  /**
   * Get user if exists, or trigger userRequiredFails$.
   * This way the subscribers don't receive a null user nor an error.
   *
   * @returns {Observable<T>}
   */
  public get userRequired$(): Observable<T> {
    return this.whenActivated().mergeMap(() => this.currentUser)
      .mergeMap((user: T) => {
        if (user === null) {
          console.log('Auth.userRequired$: User is null, aborting.');
          this._userRequiredFails.next();
          return Observable.of(user).delay(999999);
        }
        return Observable.of(user);
      })
      .do(null, (e) => {
        console.log('Auth.userRequired$: Error occurred, aborting.', e);
        this._userRequiredFails.next();
      });

  }

  /**
   * Get the current user object or throw an exception.
   *
   * @returns {T}
   */
  public getUserOrFail(): T {
    if (!this.user) {
      throw new Error('Required user, but none found.');
    }
    return this.user;
  }

  /**
   * Delete auth state.
   *
   * @returns {Observable<void>}
   */
  public logout(): Observable<void> {
    return this.deleteUserSession(this.user).do(() => {
      this.setUser(null);
    });
  }

  /**
   * Make an auth attempt.
   *
   * @param {R} credentials
   * @returns {Observable<T>}
   */
  public attempt(credentials: R): Observable<T> {
    const user = this.parseUserObservable(
      this.userFromCredentials(credentials)
    );

    return user.do((user) => this.setUser(user));
  }

  /**
   * Register a user.
   *
   * @param {R} credentials
   * @param {Partial<T>} extra
   * @returns {Observable<T>}
   */
  public register(credentials: R, extra?: Partial<T>): Observable<T> {
    const user = this.parseUserObservable(
      this.createUserFromCredentials(credentials, extra)
    );

    return user.do((user) => this.setUser(user));
  }

  /**
   * Initialize auth, optionally retrieving the current user.
   *
   * @param {any} userId
   * @param {string} token
   * @returns {Observable<T>}
   */
  public activate(userId: any, token?: string): Observable<T> {
    if (token != null) {
      this.state.setToken(token);
    }

    if (userId == null) {
      const alreadyActivated = this.activated.getValue();

      if (alreadyActivated) {
        // Activating a null user is only allowed once.
        throw new Error('AuthService.activate: Can not activate `null` user.');
      } else {
        this.setUser(null);

        this.activated.next(true);

        return Observable.of(null);
      }
    } else if (this.userProvider == null) {
      throw new Error('AuthService.activate: UserProvider dependency required.');
    }

    console.debug('AuthModule.AuthService.activate: Activating user.', userId);

    return this.userProvider.find(userId).do((user) => {
      this.setUser(user);

      this.activated.next(true);
    }, () => this.activated.next(true));
  }

  /**
   * Set the current user.
   *
   * @param {T} user
   */
  public setUser(user: T): void {
    console.debug('AuthService.setUser: Setting user.', user);

    this.currentUser.next(user);
  }

  /**
   * Get current authentication state.
   *
   * @returns {boolean}
   */
  public get authenticated(): boolean {
    return this.user != null;
  }

  /**
   * Check useable for ionViewCanEnter.
   *
   * @returns {Promise<boolean>}
   */
  public check(): Promise<boolean> {
    return this.whenActivated()
      .mergeMap(() => this.authenticated$.first())
      .do(
        (authenticated) => console.debug('AuthService.check:', authenticated),
        (err) => console.error('AuthService.check: Unhandled error', err)
      ).toPromise();
  }

  /**
   * Parse user through UserProvider if possible.
   *
   * @param {Observable<T>} observable
   * @returns {Observable<T>}
   */
  protected parseUserObservable(observable: Observable<T>): Observable<T> {
    if (this.userProvider) {
      return observable.mergeMap((data) => this.userProvider.parseUser(data));
    }

    return observable;
  }

  /**
   * Notify API that user session has been deleted.
   *
   * @param {T} user
   * @returns {Observable<void>}
   */
  protected deleteUserSession(user: T): Observable<void> {
    if (this.backend == null) {
      throw new Error('AuthService: You have not registered the AuthBackend.');
    }

    return this.backend.deleteUserSession(user);
  }

  /**
   * Retrieve user from API using credentials.
   *
   * @param {R} credentials
   * @returns {Observable<T>}
   */
  protected userFromCredentials(credentials: R): Observable<T> {
    if (this.backend == null) {
      throw new Error('AuthService: You have not registered the AuthBackend.');
    }

    return this.backend.userFromCredentials(credentials);
  }

  /**
   * Wait for activation complete.
   *
   * @returns {Observable<void>}
   */
  protected whenActivated(): Observable<void> {
    return this.activated$
      .filter((v) => v)
      .first()
      .map(() => {});
  }

  /**
   * Create user in API using credentials.
   *
   * @param {R} credentials
   * @param {T} extra
   * @returns {Observable<T>}
   */
  protected createUserFromCredentials(credentials: R, extra?: Partial<T>): Observable<T> {
    if (this.backend == null) {
      throw new Error('AuthService: You have not registered the AuthBackend.');
    }

    return this.backend.createUserFromCredentials(credentials);
  }
}
