import React, { createContext, useContext } from 'react';
import { heartbeatTheme } from './heartbeatTheme';

const HeartbeatThemeContext = createContext(heartbeatTheme);

interface HeartbeatThemeProviderProps {
  children: React.ReactNode;
}

export const HeartbeatThemeProvider: React.FC<HeartbeatThemeProviderProps> = ({ children }) => (
  <HeartbeatThemeContext.Provider value={heartbeatTheme}>
    {children}
  </HeartbeatThemeContext.Provider>
);

export const useHeartbeatTheme = () => {
  const context = useContext(HeartbeatThemeContext);
  if (!context) {
    throw new Error('useHeartbeatTheme must be used within a HeartbeatThemeProvider');
  }
  return context;
};