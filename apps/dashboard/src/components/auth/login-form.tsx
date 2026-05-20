'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, type Login } from '@pulse-flags/types';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Check,
} from 'lucide-react';
import { Field, Input } from '@pulse-flags/ui';

export function LoginForm() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<Login>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: Login) => {
    setError(null);
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        setError('Invalid email or password.');
      } else {
        router.push('/');
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="size-full flex bg-background text-foreground bg-grid scanlines min-h-screen">
      {/* Left — form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-10 min-w-0">
        <Link href="/" className="flex items-center gap-2 self-start mb-12">
          <div className="size-8 rounded-md bg-primary/15 border border-primary/40 grid place-items-center glow-primary">
            <div className="size-4 rounded-sm bg-primary" />
          </div>
          <div className="font-mono leading-none">
            <div className="text-[16px] tracking-tight">pulse</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">v0.1.0</div>
          </div>
        </Link>

        <div className="max-w-[420px] w-full">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim mb-2">
            // authenticate
          </div>
          <h1 className="text-[28px] mb-2">welcome back</h1>
          <p className="font-mono text-[12.5px] text-muted-foreground mb-8">
            Sign in to your account
          </p>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">or with email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="email" required error={errors.email?.message}>
              <Input
                autoFocus
                type="email"
                placeholder="you@company.com"
                {...register('email')}
                prefix={<Mail className="size-3.5 text-muted-foreground" />}
                required
              />
            </Field>

            <Field
              label="password"
              required
              error={errors.password?.message}
              hint={
                <button type="button" className="text-primary hover:underline font-mono text-[11px]">
                  forgot?
                </button>
              }
            >
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  {...register('password')}
                  prefix={<Lock className="size-3.5 text-muted-foreground" />}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </Field>

            {error && (
              <p className="font-mono text-[12px] text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md font-mono text-[13px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'signing in…' : <>sign in <ArrowRight className="size-4" /></>}
            </button>
          </form>

          <div className="mt-6 font-mono text-[12px] text-muted-foreground">
            no account?{' '}
            <Link href="/register" className="text-primary hover:underline">register →</Link>
          </div>
        </div>
      </div>

      <FeaturePanel />
    </div>
  );
}

function FeaturePanel() {
  return (
    <div className="hidden lg:flex w-[480px] xl:w-[560px] border-l border-border bg-surface-0 flex-col p-10 relative overflow-hidden">
      <div className="absolute inset-0 noise opacity-30" />
      <div className="relative z-10">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim mb-3">// why pulse</div>
        <h2 className="text-[22px] leading-tight mb-8 max-w-[380px]">
          <span className="gradient-text">feature flags</span> that scale with your product.
        </h2>
        <div className="rounded-lg border border-border bg-surface-1 overflow-hidden mb-8">
          <div className="px-3 py-2 border-b border-border flex items-center gap-2">
            <span className="size-2 rounded-full bg-destructive/60" />
            <span className="size-2 rounded-full bg-warning/60" />
            <span className="size-2 rounded-full bg-primary/60" />
            <span className="ml-3 font-mono text-[10.5px] text-muted-foreground">feature configuration</span>
          </div>
          <pre className="p-4 font-mono text-[12px] leading-relaxed text-muted-foreground">
            <span className="text-primary">"features": </span>{'{'}{'\n'}
            <span className="text-foreground">  "checkout-redesign-v2":</span><span className="text-dim"> true,</span>{'\n'}
            <span className="text-foreground">  "pricing-cta-text":</span><span className="text-dim"> "Subscribe Now",</span>{'\n'}
            <span className="text-foreground">  "homepage-hero-v3":</span><span className="text-warning"> false</span>{'\n'}
            {'}  '}
          </pre>
        </div>
        <ul className="space-y-3">
          {[
            'p99 < 12ms global eval â€” three-tier SDK fallback',
            'self-hostable Â· no SaaS lock-in Â· MIT licensed',
            'developer-first DX with first-class SDKs',
            'audit log every change Â· optimistic locking built-in',
          ].map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[12.5px] text-muted-foreground">
              <Check className="size-3.5 text-primary mt-1 shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


