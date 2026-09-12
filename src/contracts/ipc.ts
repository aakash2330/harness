export interface DesktopBridge {
  chat: {
    send(text: string): Promise<string>;
  };
  auth: {
    loggedIn(): Promise<boolean>;
    login(): Promise<void>;
    logout(): Promise<void>;
  };
}
