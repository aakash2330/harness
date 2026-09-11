interface Window {
  desktop: {
    hello(): Promise<string>;
    claudeLoggedIn(): Promise<boolean>;
    claudeLogin(): Promise<void>;
    claudeLogout(): Promise<void>;
  };
}
