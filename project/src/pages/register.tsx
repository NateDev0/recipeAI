import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/auth-context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }
      
      await signUp(email, password);
    } catch (err: any) {
      setError(err.message || 'Error creating account');
      console.error('Registration error:', err);
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
            Create your account
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 border border-gray-100">
            <form className="space-y-6" onSubmit={handleSubmit}>
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
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  className="mt-1"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Must be at least 6 characters long
                </p>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                Create account
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Already have an account?
                  </span>
                </div>
              </div>

              <Link to="/auth/login">
                <Button variant="outline" className="w-full">
                  Sign in instead
                </Button>
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}