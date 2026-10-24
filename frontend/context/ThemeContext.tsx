import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  isDark: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  syncWithBackend: (token: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'craffle_theme';
const LEGACY_DARK_KEY = 'craffle_dark';

// Helper to determine initial theme
function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    const legacy = localStorage.getItem(LEGACY_DARK_KEY);
    if (legacy === 'true') return 'dark';
    if (legacy === 'false') return 'light';
  } catch {
    // LocalStorage might be disabled
  }
  return 'system';
}

// Helper to check system dark mode
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);

  // Resolved theme is either explicitly selected or inherited from system
  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? systemTheme : theme;
  const isDark = resolvedTheme === 'dark';

  // Apply .dark class to <html> and set color-scheme
  const applyThemeToDOM = useCallback((activeResolved: 'light' | 'dark') => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (activeResolved === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, []);

  // Update theme setting
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_KEY, newTheme);
      const computedResolved = newTheme === 'system' ? getSystemTheme() : newTheme;
      localStorage.setItem(LEGACY_DARK_KEY, String(computedResolved === 'dark'));
    } catch {
      // LocalStorage error ignore
    }

    const computedResolved = newTheme === 'system' ? getSystemTheme() : newTheme;
    applyThemeToDOM(computedResolved);

    // If user is authenticated, save preference to MongoDB
    try {
      const token = localStorage.getItem('craffle_token');
      if (token) {
        fetch('/api/settings', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ darkMode: computedResolved === 'dark' })
        }).catch(() => {});
      }
    } catch {
      // Ignore background sync errors
    }
  }, [applyThemeToDOM]);

  // Toggle between light and dark directly
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  // Sync preference with backend settings for authenticated user
  const syncWithBackend = useCallback(async (token: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.darkMode === 'boolean') {
          const currentLocal = localStorage.getItem(THEME_KEY);
          // If user hasn't explicitly set "system", reconcile with backend
          if (!currentLocal) {
            setTheme(data.darkMode ? 'dark' : 'light');
          }
        }
      }
    } catch {
      // Fallback silently to local preference
    }
  }, [setTheme]);

  // Listen to OS system color scheme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSystemTheme);
      if (theme === 'system') {
        applyThemeToDOM(newSystemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyThemeToDOM]);

  // Apply to DOM on initial mount & whenever resolvedTheme changes
  useEffect(() => {
    applyThemeToDOM(resolvedTheme);
  }, [resolvedTheme, applyThemeToDOM]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        isDark,
        setTheme,
        toggleTheme,
        syncWithBackend
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
