import React, { useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Bot, ChefHat, Sparkles, LogOut, Menu, X, Refrigerator, Search } from 'lucide-react';
import { useAuth } from '../contexts/auth-context';
import { Button } from './ui/button';

export function Layout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const handleSignOut = async () => {
    try {
      setError(null);
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      setError('Failed to sign out. Please try again.');
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const NavLinks = () => (
    <>
      <Link
        to="/"
        className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
          location.pathname === '/'
            ? 'text-primary border-b-2 border-primary'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <Sparkles className="h-4 w-4 mr-2" />
        AI Kitchen
      </Link>
      <Link
        to="/pantry"
        className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
          location.pathname === '/pantry'
            ? 'text-primary border-b-2 border-primary'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <Refrigerator className="h-4 w-4 mr-2" />
        My Pantry
      </Link>
      <Link
        to="/recipes"
        className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
          location.pathname === '/recipes'
            ? 'text-primary border-b-2 border-primary'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <ChefHat className="h-4 w-4 mr-2" />
        My Recipes
      </Link>
      <Link
        to="/discover"
        className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
          location.pathname === '/discover'
            ? 'text-primary border-b-2 border-primary'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <Search className="h-4 w-4 mr-2" />
        Discover
      </Link>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <nav className="bg-card/80 backdrop-blur-lg border-b border-border/40 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Bot className="h-8 w-8 text-primary animate-float" />
                <span className="ml-2 text-xl font-bold bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
                  Recipe AI
                </span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <NavLinks />
              </div>
            </div>
            <div className="flex items-center">
              {error && (
                <div className="mr-4 text-sm text-destructive">{error}</div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </>
                )}
              </Button>
              <div className="sm:hidden ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  {isMobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              <div className="flex flex-col space-y-4 px-4">
                <NavLinks />
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}