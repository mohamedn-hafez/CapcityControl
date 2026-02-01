import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  username: string;
  name: string | null;
  role: 'USER' | 'ADMIN';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string; pendingApproval?: boolean; pendingVerification?: boolean }>;
  register: (email: string, username: string, password: string, name?: string) => Promise<{ success: boolean; error?: string; pendingApproval?: boolean; pendingVerification?: boolean }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'capacitypulse_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      setToken(storedToken);
      fetchCurrentUser(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const response = await fetch('/api/auth?action=me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await response.json();
      if (data.success && data.data?.user) {
        setUser(data.data.user);
      } else {
        // Invalid token, clear it
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (identifier: string, password: string) => {
    try {
      const response = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await response.json();

      if (data.success && data.data) {
        const { token: newToken, user: userData } = data.data;
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
        setUser(userData);
        return { success: true };
      } else {
        // Check if pending verification
        if (data.pendingVerification) {
          return { success: false, error: data.error, pendingVerification: true };
        }
        // Check if pending approval
        if (data.pendingApproval) {
          return { success: false, error: data.error, pendingApproval: true };
        }
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Network error' };
    }
  };

  const register = async (email: string, username: string, password: string, name?: string) => {
    try {
      const response = await fetch('/api/auth?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, name }),
      });
      const data = await response.json();

      if (data.success && data.data) {
        // Check if pending verification (email confirmation required)
        if (data.data.pendingVerification) {
          return { success: true, pendingVerification: true, pendingApproval: data.data.pendingApproval };
        }
        // Check if pending approval only (no token returned)
        if (data.data.pendingApproval) {
          return { success: true, pendingApproval: true };
        }
        // Normal registration with immediate access
        const { token: newToken, user: userData } = data.data;
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
        setUser(userData);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Network error' };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
