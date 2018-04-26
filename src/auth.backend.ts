import { Observable } from 'rxjs/Observable';
import { AuthCredentials } from './auth.credentials';

export abstract class AuthBackend<T, R = AuthCredentials> {
  /**
   * Notify API that user session has been deleted.
   *
   * @param {T} user
   * @returns {Observable<void>}
   */
  public abstract deleteUserSession(user: T): Observable<void>;

  /**
   * Retrieve user from API using credentials.
   *
   * @param {R} credentials
   * @returns {Observable<T>}
   */
  public abstract userFromCredentials(credentials: R): Observable<T>;

  /**
   * Create user in API using credentials.
   *
   * @param {R} credentials
   * @param {T} extra
   * @returns {Observable<T>}
   */
  public abstract createUserFromCredentials(credentials: R, extra?: T): Observable<T>;
}

