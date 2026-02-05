import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Briefcase, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate network delay for effect
    await new Promise(resolve => setTimeout(resolve, 800));
    onLogin(email, password);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-4 font-sans">
      <div className="w-full max-w-[400px] animate-in fade-in zoom-in duration-500">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Briefcase className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="text-slate-500 mt-2">Enter your credentials to access the workspace</p>
        </div>

        <Card className="border-border/60 shadow-xl shadow-slate-200/50">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-xl">Sign in</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-xs text-primary hover:underline font-medium">Forgot password?</a>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
              <Button type="submit" className="w-full h-10 font-medium" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign in <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-center text-slate-500 mb-4">Demo Accounts (Click to fill)</p>
              <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" size="sm" className="w-full justify-start font-normal text-muted-foreground" onClick={() => { setEmail('alice.t@company.com'); setPassword('password'); }}>
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                  alice.t@company.com (Employee)
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start font-normal text-muted-foreground" onClick={() => { setEmail('bob.m@company.com'); setPassword('password'); }}>
                  <div className="h-2 w-2 rounded-full bg-amber-500 mr-2" />
                  bob.m@company.com (Manager - Has Team Access)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-center text-xs text-slate-400 mt-8">
          &copy; 2026 JobFlow AI Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
}
