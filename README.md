# Angular JWT Auth

This light weight module includes a convenient `AuthService` to be used and extended by your code. A HttpClient interceptor automatically exchanges JWT token from the `Authentication` bearer header.

If you want to implement JWT auth easily and maintain user state, but also maintain the possibility to extend functionality as your app grows, this module can help you as it won't limit you. 

## Installation

Install the package from NPM:
```
npm install ngx-jwt-auth --save
```

Import the module in your app:
```
import { AuthModule } from 'ngx-jwt-auth';

@NgModule({
    ...
    imports: [
        ...
        AuthModule.forRoot(),
    ],
    ...
})
```

`AuthModule.forRoot()` automatically injects a HTTP Interceptor.

## Activation

`AuthService` uses generics to make life easy for you when handling your User objects. If you haven't already, create an interface for your users. For example:

```
// src/services/user/user.model.ts

export interface User {
    id: string;
    age: number;
    email: string;
}
```

Before `AuthService` starts working, you have to activate it. The reason for this is to allow your app to load an existing user session, before telling any subscribing components that the user is unauthenticated.
You might do this in your main app component.

```
// src/app/app.component.ts

import { AuthService } from 'ngx-jwt-auth';
import { User } from '../../services/user/user.model';

@Component()
export class MyApp {
    constructor(private authService: AuthService<User>) {
        // Do anything you need before activating auth.
        const authReady: Promise<void> = Promise.resolve();
        
        authReady.then(() => {
            const userId = null; // If you want to reactivate a user.
            const token = null; // If you want to reactivate an old user session.
        
            // Even if you pass null, you have to activate the authService when your application loads.
            authService.activate(userId, token);
        });
    }
}
```

## Usage

**Important**: If you haven't activated `AuthService`, see the section above.

At this point you can already inject `AuthService<User>` into your components, and call any of the methods. For example:

```
// Set or get the current user.
authService.setUser(user);

const user: User = authService.user;

// Check authentication state.
const authenticated: boolean = authService.authenticated;

// Set or get the JWT token
authService.state.setToken(token);

const token: string = authService.state.getToken();

// Subscribe to events.
authService.user$
    .subscribe((user) => console.log('Current user is: ', user));

authService.authenticated$
    .subscribe((authenticated) => console.log('User ' + (authenticated ? 'is' : 'NOT') + ' authenticated.'));

authService.state.unauthorized$
    .subscribe(() => console.error('Unauthorized for API call. Login again?'));
 
```

But setting the JWT token and user manually doesn't do much good. How about these methods:

```
// Attempt to register a user.
authService.register({
    email: 'hello@example.org',
    password: 'Abc:123%',
}).subscribe(
    (user: User) => console.log('User registered and logged in: ', user),
    (err) => console.error('Failed to register user: ', err)
);

// Attempt to login a user.
authService.attempt({
   email: 'hello@example.org',
   password: 'Abc:123%',
}).subscribe(
   (user: User) => console.log('User logged in: ', user),
   (err) => console.error('Login failed: ', err)
);

// Logout a user
authService.logout().subscribe(
(user: User) => console.log('User logged out.'),
(err) => console.error('Failed to logout')
);
```

These methods need a little bit of help, as they don't know anything about your API. So let's look at how to make them work:

## Basic Backend Implementation

For maximum flexibility, consider extending the `AuthService` (see next section).

You can implement the basic functionality needed for `AuthService` to communicate with your API, by creating a simple class:

```
// src/services/api/api.auth.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import { AuthBackend } from 'ngx-jwt-auth';
import { User } from '../../services/user/user.model';

@Injectable()
export class ApiAuth extends AuthBackend<User> {
  constructor(private http: HttpClient) {
    super(); // Must call parent constructor.
  }

  /**
   * Notify API that user session has been deleted.
   *
   * @param {T} user
   * @returns {Observable<void>}
   */
  public deleteUserSession(user: T): Observable<void> {
    return this.http.delete('https://my-api.example.org/auth', {
        observe: 'response',
        responseType: 'text',
    }).map((v) => {
        console.debug('ApiAuth.deleteUserSession completed.', v);
        
        // Don't return anything (void)
    });
  }

  /**
   * Retrieve user from API using credentials.
   *
   * @param {R} credentials
   * @returns {Observable<T>}
   */
  public userFromCredentials(credentials: R): Observable<T> {
    return this.http.post<User>('https://my-api.example.org/auth', credentials);
  }

  /**
   * Create user in API using credentials.
   *
   * @param {R} credentials
   * @param {T} extra
   * @returns {Observable<T>}
   */
  public createUserFromCredentials(credentials: R, extra?: T): Observable<T> {
    const data = Object.assign({}, extra, credentials);
  
    return this.http.post<User>('https://my-api.example.org/user', data);
  }
}
```

Make your backend available in your app module:

```
import { AuthModule, AuthBackend } from 'ngx-jwt-auth';
import { ApiAuth } from '../services/api/api.auth';

@NgModule({
    ...
    imports: [
        ...
        AuthModule.forRoot(),
    ],
    providers: [
        ...
        {provide: AuthBackend, useClass: ApiAuth},
    ],
    ...
})
```

Now `AuthService` will automatically pick up your backend class and use it whenever needed. You should never have to inject or call your backend manually.

## Implementing your UserService

If you want to be able to activate users `AuthService.activate`, and actually restore their user object (name, email, etc.), not just their JWT token, then you have to provide a way to resolve a user object.

You typically already have some `UserService` with a `get` or `find` method, that you can pass on to AuthService.

Simply extend your own `UserService` with the `AuthUserService`.

```
// src/services/user/user.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { AuthUserService } from 'ngx-jwt-auth';
import { User } from '../../services/user/user.model';

@Injectable()
export class UserService extends AuthUserService<User> {

    constructor(private http: HttpClient) { }

    public function find(userId): Observable<User> {
        return this.http.get<User>('https://my-api.example.org/user/' + userId);        
    }
}
```

Now just publish your `UserService` as an `AuthUserService` in your app module:

```
import { AuthModule, AuthUserService } from 'ngx-jwt-auth';
import { UserService } from '../services/user/user.auth';

@NgModule({
    ...
    imports: [
        ...
        AuthModule.forRoot(),
    ],
    providers: [
        ...
        {provide: AuthUserService, useClass: UserService},
    ],
    ...
})
```

## Extending and Advanced Backend Implementation 

You may create your own `AuthService` (let's call it `AuthProvider`), extending the `AuthService` from this module, and implementing your own logic in there.

```
// src/providers/auth/auth.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from 'ngx-jwt-auth';
import { User } from '../../services/user/user.model';

@Injectable()
export class AuthProvider extends AuthService<User> {
    constructor(private http: HttpClient,
                public state: AuthState,
                private userProvider: UserProvider) {
        // Must call parent constructor.
        super(state, null, userProvider);
    }
    
    // You can add the same backend methods here, as you would in the `AuthBackend` class.
    
    // protected deleteUserSession(user: T): Observable<void>;
    // protected userFromCredentials(credentials: R): Observable<T>;
    // protected createUserFromCredentials(credentials: R, extra?: T): Observable<T>;
    
    // Add any custom logic here
}
```

## Contributing

This module is still in early stage and has a lot of potential. Any suggestions and pull requests are most welcome, just keep in mind the goal of this Auth module is to be light weight and versatile compared to some of the heavier alternatives out there. 

