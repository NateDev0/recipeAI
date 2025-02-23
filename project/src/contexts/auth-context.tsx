import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getInitialSession } from '../lib/supabase';
import type { User, AuthError } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const { data: { session }, error: sessionError } = await getInitialSession();
        
        if (!mounted) return;
        
        if (sessionError) {
          console.error('Session initialization error:', sessionError);
          setState({
            user: null,
            loading: false,
            error: 'Failed to initialize session',
          });
          return;
        }

        if (session?.user) {
          setState({
            user: session.user,
            loading: false,
            error: null,
          });

          // Create profile if needed
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', session.user.id)
              .maybeSingle();

            if (!profile && !profileError) {
              const { error: insertError } = await supabase
                .from('profiles')
                .insert([
                  {
                    id: session.user.id,
                    email: session.user.email,
                  },
                ])
                .select('id')
                .single();

              if (insertError) {
                console.error('Error creating profile:', insertError);
              }
            }
          } catch (error) {
            console.error('Profile check/creation error:', error);
          }
        } else {
          setState({ user: null, loading: false, error: null });
        }
      } catch (error) {
        if (!mounted) return;
        console.error('Auth initialization error:', error);
        setState({
          user: null,
          loading: false,
          error: 'Failed to initialize authentication',
        });
      }
    }

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          setState({
            user: session.user,
            loading: false,
            error: null,
          });
        } else {
          setState({ user: null, loading: false, error: null });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const state = useAuthState();

  const handleAuthError = useCallback((error: unknown) => {
    if (error instanceof Error) {
      const authError = error as AuthError;
      return authError.message || 'Authentication failed';
    }
    return 'An unexpected error occurred';
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/');
    } catch (error) {
      throw new Error(handleAuthError(error));
    }
  }, [navigate, handleAuthError]);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
            },
          ])
          .select('id')
          .single();

        if (profileError) {
          console.error('Error creating profile during signup:', profileError);
        }
      }

      navigate('/login');
    } catch (error) {
      throw new Error(handleAuthError(error));
    }
  }, [navigate, handleAuthError]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      throw new Error(handleAuthError(error));
    }
  }, [navigate, handleAuthError]);

  const value = useMemo(() => ({
    ...state,
    signIn,
    signUp,
    signOut,
  }), [state, signIn, signUp, signOut]);

  if (state.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full border-4 border-blue-600 border-t-transparent h-12 w-12 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}