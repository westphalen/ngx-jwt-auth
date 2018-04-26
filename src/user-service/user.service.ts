import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';

export abstract class AuthUserService<T> {
  /**
   * Find a user from id.
   * Make sure to perform any parsing within this method.
   *
   * @param   userId
   * @returns Observable<T>
   */
  public abstract find(userId: any): Observable<T>;

  /**
   * Parse the user object for normalization.
   * When user object is returned from calls to api,
   * they are parsed through this method.
   *
   * @param   {User} user
   * @returns {User}
   */
  public parseUser(user: T): Observable<T> {
    return Observable.of(user);
  }

}
