// auth.d.ts
declare module "#auth-utils" {
  interface User {
    id: string;

    login: string;
    givenName: string;
    familyName: string;
  }

  interface UserSession {
    userSessionField: string;
  }

  interface SecureSessionData {
    secureSessionField: string;
  }
}

export {};
