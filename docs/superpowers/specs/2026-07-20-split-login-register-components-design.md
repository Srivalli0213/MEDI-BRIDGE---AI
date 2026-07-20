# Split Home/Login/Register into Their Own Components

## Context

`AppComponent` currently owns all three "pages" (home, login, register) as
`*ngIf` sections switched by a `currentView: 'home' | 'login' | 'register'`
field. Navigation is done via method calls (`handleLogin()`, `goHome()`,
etc.), and the URL never changes. `@angular/router` is already an installed
dependency but unused; the app bootstraps via `AppModule`
(`platformBrowserDynamic().bootstrapModule(AppModule)`).

## Goal

Extract Home, Login, and Register into their own standalone components,
wired together with Angular Router so each has its own URL. `AppComponent`
becomes a thin shell containing only the top navbar and a `<router-outlet>`.

## File structure

```
src/app/
  app.component.ts/.html/.css     (shell: navbar + <router-outlet>)
  app.routes.ts                   (route config)
  home/
    home.component.ts/.html/.css
  login/
    login.component.ts/.html/.css
  register/
    register.component.ts/.html/.css
src/main.ts                       (updated bootstrap)
```

`src/app/app.module.ts` is deleted.

## Routing

`src/app/app.routes.ts`:

```ts
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: '**', redirectTo: '' },
];
```

`src/main.ts` switches from `bootstrapModule(AppModule)` to
`bootstrapApplication(AppComponent, { providers: [provideRouter(routes)] })`.

## Components

All new components are **standalone** (`standalone: true`), importing
`CommonModule`/`RouterModule` directly as needed. No shared NgModule is
introduced.

- **AppComponent**: keeps `<nav class="topbar">` (logo + Login/Register
  buttons). The three `*ngIf` sections in the template are replaced by a
  single `<router-outlet>`. Nav buttons become `routerLink="/login"` /
  `routerLink="/register"`; logo becomes `routerLink="/"`. All
  `currentView`, `handleLogin`, `handleRegister`, `goHome`, `onLogin`,
  `onRegister` logic is removed from `AppComponent` — it has no view-state
  logic left.

- **HomeComponent**: the `landing-hero` section moves here verbatim as
  static markup, no logic.

- **LoginComponent**: the login `auth-page` section moves here. Owns
  `onLogin(event)` (unchanged behavior — `FormData` read, `alert(...)`
  stub, then navigates home). "Back" button navigates to `/` via
  `routerLink`; "Create one" link navigates to `/register` via
  `routerLink` (replacing the previous `goHome()` / `handleRegister()`
  method calls).

- **RegisterComponent**: mirrors LoginComponent. Owns `onRegister(event)`.
  "Back" → `/` via `routerLink`; "Already registered? Sign in" → `/login`
  via `routerLink`.

## Styles

- `.topbar` / `.nav-actions` / shared `.btn*` button styles stay in
  `app.component.css` (used by the shell's navbar).
- `.landing-hero` / `.panel*` rules move to `home.component.css`.
- `.auth-page` / `.form-card` rules move to `login.component.css`, and are
  duplicated as-is in `register.component.css` (both auth forms share
  identical styling; no shared partial is introduced to keep each
  component self-contained).

## Behavior parity

No behavior changes: same form fields, same `TODO: wire up real auth`
`alert(...)` stubs in `onLogin`/`onRegister`. The only functional change
is that navigation updates the browser URL (`/`, `/login`, `/register`)
via Angular Router instead of an in-memory `currentView` flag.

## Out of scope

- No real authentication/API wiring.
- No route guards.
- No lazy loading (routes reference components directly).
