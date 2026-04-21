'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { loginSchema, type LoginFormValues } from '@/lib/validations';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Invalid email or password. Please try again.');
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1a1a2e] flex-col items-center justify-center p-12">
        <div className="max-w-md text-center space-y-6">
          <div className="relative mx-auto h-20 w-20">
            <Image
              src="https://admin.togahh.com/img/setting/01KE7GTXG885XMXHF6QRE0MPJZ.svg"
              alt="Togahh Logo"
              fill
              className="object-contain brightness-0 invert"
              unoptimized
            />
          </div>
          <h1 className="text-4xl font-bold text-white">TOGAHH</h1>
          <p className="text-lg text-white/70">
            Medical Tourism Automation Platform
          </p>
          <div className="grid grid-cols-3 gap-4 pt-6">
            {[
              { label: 'Campaigns', desc: 'AI-powered email outreach' },
              { label: 'Scraper', desc: 'Google Maps lead finder' },
              { label: 'Cleanup', desc: 'Auto contact management' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-white/5 p-4 text-center">
                <p className="text-sm font-semibold text-[#48cae4]">{item.label}</p>
                <p className="mt-1 text-xs text-white/50">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-gray-50 px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <div className="relative h-14 w-14">
              <Image
                src="https://admin.togahh.com/img/setting/01KE7GTXG885XMXHF6QRE0MPJZ.svg"
                alt="Togahh Logo"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">TOGAHH</h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sign in to Dashboard</h2>
            <p className="mt-1 text-sm text-gray-500">
              Access your automation control panel
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="admin@togahh.com"
                          className="pl-9"
                          type="email"
                          autoComplete="email"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="••••••••"
                          className="pl-9"
                          type="password"
                          autoComplete="current-password"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#0077b6] hover:bg-[#005f8f] text-white"
                size="lg"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Form>

          <p className="text-center text-xs text-gray-400">
            Togahh Automation Dashboard v1.0 · Secure Access Only
          </p>
        </div>
      </div>
    </div>
  );
}
