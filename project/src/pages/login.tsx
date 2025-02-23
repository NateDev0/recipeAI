import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, ChefHat, Sparkles, ArrowRight, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/auth-context';
import { Button } from '../components/ui/button';

export function Login() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="bg-card/80 backdrop-blur-lg border-b border-border/40 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Bot className="h-8 w-8 text-primary animate-float" />
              <span className="ml-2 text-xl font-bold bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
                Recipe AI
              </span>
            </div>
            
            <div className="hidden md:flex md:items-center md:space-x-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">
                About
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <div className="flex items-center space-x-4">
                <Link to="/auth/login">
                  <Button variant="ghost">Sign in</Button>
                </Link>
                <Link to="/register">
                  <Button>Sign up</Button>
                </Link>
              </div>
            </div>

            <div className="md:hidden flex items-center">
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

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4">
              <div className="flex flex-col space-y-4">
                <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </a>
                <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">
                  About
                </a>
                <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </a>
                <Link to="/auth/login">
                  <Button variant="ghost" className="w-full">Sign in</Button>
                </Link>
                <Link to="/register">
                  <Button className="w-full">Sign up</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 text-center relative">
          <Bot className="h-16 w-16 text-primary mx-auto mb-8 animate-float" />
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            From{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
              'Nothing to Eat'
            </span>
            {' '}to{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
              'What's for Dinner?'
            </span>
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
            Cook Smarter with{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
              Recipe AI
            </span>
          </h2>
          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
            Your AI-powered kitchen assistant that helps you discover, create, and perfect recipes tailored to your taste
          </p>
          <div className="mt-10 flex gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="group">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline">
                See Features
              </Button>
            </a>
          </div>
        </div>

        {/* App Screenshots */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-[500px] bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl blur-3xl"></div>
            </div>
            <div className="relative glass-card rounded-2xl p-4 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=2400&q=80"
                alt="Recipe App Interface"
                className="w-full rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <h2 className="text-3xl font-bold text-center mb-16">
            Powerful Features for Modern Cooking
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="glass-card p-8 rounded-xl space-y-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">AI Recipe Generation</h3>
              <p className="text-muted-foreground">
                Get personalized recipe suggestions based on your preferences and available ingredients
              </p>
            </div>
            <div className="glass-card p-8 rounded-xl space-y-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <ChefHat className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Smart Recommendations</h3>
              <p className="text-muted-foreground">
                Receive intelligent suggestions for ingredient substitutions and cooking techniques
              </p>
            </div>
            <div className="glass-card p-8 rounded-xl space-y-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Recipe Collection</h3>
              <p className="text-muted-foreground">
                Save and organize your favorite recipes with AI-powered categorization
              </p>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="glass-card rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-8">About Recipe AI</h2>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <p className="text-lg text-muted-foreground">
                  Recipe AI is revolutionizing the way people cook at home. Our advanced AI technology understands your taste preferences, dietary restrictions, and cooking skill level to provide personalized recipe recommendations and cooking guidance.
                </p>
                <p className="text-lg text-muted-foreground">
                  Whether you're a beginner cook or a seasoned chef, Recipe AI helps you discover new recipes, perfect your techniques, and make the most of your ingredients.
                </p>
              </div>
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80"
                  alt="Cooking with AI"
                  className="rounded-xl shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <h2 className="text-3xl font-bold text-center mb-16">Choose Your Kitchen Companion</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Student Plan */}
            <div className="glass-card p-8 rounded-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-4 right-4 transform rotate-12">
                <span className="px-3 py-1 text-sm bg-blue-500 text-white rounded-full">
                  Student Special
                </span>
              </div>
              <h3 className="text-xl font-semibold">Student Chef</h3>
              <div className="text-4xl font-bold">$3.99<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
              <p className="text-muted-foreground">For when ramen just isn't cutting it anymore</p>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <Sparkles className="h-5 w-5 text-blue-500 mr-2" />
                  "Help! What's a colander?" guide
                </li>
                <li className="flex items-center">
                  <Sparkles className="h-5 w-5 text-blue-500 mr-2" />
                  Dorm-friendly recipes
                </li>
                <li className="flex items-center">
                  <Sparkles className="h-5 w-5 text-blue-500 mr-2" />
                  Microwave mastery tips
                </li>
                <li className="flex items-center">
                  <Sparkles className="h-5 w-5 text-blue-500 mr-2" />
                  Budget meal planning
                </li>
                <li className="flex items-center">
                  <Sparkles className="h-5 w-5 text-blue-500 mr-2" />
                  "Is this still good?" AI checker
                </li>
              </ul>
              <Link to="/register">
                <Button className="w-full bg-blue-500 hover:bg-blue-600">
                  Save 50% Today
                </Button>
              </Link>
              <p className="text-xs text-center text-muted-foreground">Valid student email required</p>
            </div>

            {/* Regular Plan */}
            <div className="glass-card p-8 rounded-xl space-y-6">
              <h3 className="text-xl font-semibold">Home Cook</h3>
              <div className="text-4xl font-bold">$6.99<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
              <p className="text-muted-foreground">Perfect for everyday cooking adventures</p>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <Sparkles className="h-5 w-5 text-primary mr-2" />
                  Everything in Student, plus:
                </li>
                <li className="flex items-center">
                  <Sparkles className="h-5 w-5 text-primary mr-2" />
                  Weekly meal planning
                </li>
                <li className="flex items-center">
                  <Sparkles className="h-5 w-5 text-primary mr-2" />
                  Smart shopping lists
                </li>
                <li className="flex items-center">
                  <Sparkles className="h-5 w-5 text-primary mr-2" />
                  Recipe scaling
                </li>
                <li className="flex items-center">
                  <Sparkles className="h-5 w-5 text-primary mr-2" />
                  Nutritional insights
                </li>
              </ul>
              <Link to="/register">
                <Button className="w-full">Get Cooking</Button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="glass-card p-8 rounded-xl space-y-6 border-2 border-primary">
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-full">
                  Most Popular
                </span>
              </div>
              <h3 className="text-xl font-semibold">Master Chef</h3>
              <div className="text-4xl font-bold">$9.99<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
              <p className="text-muted-foreground">For serious culinary enthusiasts</p>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <Sparkles className="h-5 w-5 text-primary mr-2" />
                  Everything in Home Cook, plus:
                </li>
                <li className="flex items-center">
                  <Sparkles className="h-5 w-5 text-primary mr-2" />
                  Advanced recipe customization
                </li>
                <li className="flex items-center">
                  <Sparkles className="h-5 w-5 text-primary mr-2" />
                  Wine pairing suggestions
                </li>
                <li className="flex items-center">
                  <Sparkles className="h-5 w-5 text-primary mr-2" />
                  Private chef consultations
                </li>
                <li className="flex items-center">
                  <Sparkles className="h-5 w-5 text-primary mr-2" />
                  Priority AI assistance
                </li>
              </ul>
              <Link to="/register">
                <Button className="w-full">Upgrade to Pro</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}