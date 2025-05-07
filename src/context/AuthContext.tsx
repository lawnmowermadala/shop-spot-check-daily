
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/sonner';

// Define the types for our POS user
export interface POSUser {
  id: string;
  username: string;
  role: string;
  qr_code: string | null;
  active: boolean;
}

// Define the context type
interface AuthContextType {
  user: POSUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithQR: (qrCode: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<POSUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for user in localStorage on initial load
    const savedUser = localStorage.getItem('pos_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('pos_user');
      }
    }
    setLoading(false);
  }, []);

  // Login with username and password
  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pos_users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .eq('active', true)
        .single();

      if (error) {
        throw new Error('Invalid username or password');
      }

      if (!data) {
        throw new Error('User not found');
      }

      setUser(data as POSUser);
      localStorage.setItem('pos_user', JSON.stringify(data));
      toast.success(`Welcome back, ${data.username}!`);
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Login with QR code
  const loginWithQR = async (qrCode: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pos_users')
        .select('*')
        .eq('qr_code', qrCode)
        .eq('active', true)
        .single();

      if (error) {
        throw new Error('Invalid QR code');
      }

      if (!data) {
        throw new Error('User not found');
      }

      setUser(data as POSUser);
      localStorage.setItem('pos_user', JSON.stringify(data));
      toast.success(`Welcome back, ${data.username}!`);
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    setUser(null);
    localStorage.removeItem('pos_user');
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithQR, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Create a hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
