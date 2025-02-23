import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/auth-context';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export function AuthLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn(email, password);
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col py-12 px-4 sm:px-6 lg:px-8">
      <div className="fixed top-4 left-4">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>
      
      <div className="flex-1 flex flex-col justify-center">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <Bot className="h-12 w-12 text-primary animate-float" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Sign in to Recipe AI
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="text-red-600 text-sm text-center">
                  {error}
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  </div>
                ) : (
                  'Sign in'
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    New to Recipe AI?
                  </span>
                </div>
              </div>

              <Link to="/register">
                <Button variant="outline" className="w-full">
                  Create a new account
                </Button>
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}