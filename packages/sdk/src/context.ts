export type Context = {
    apiKey: string;
  };
  
export const createContext = (apiKey: string): Context => ({ apiKey });
  