/**
 * Auth.js v5 configuration for the Pulse dashboard.
 *
 * Uses a custom Credentials provider that calls the Fastify API's
 * POST /api/v1/auth/login endpoint. The JWT access token and refresh
 * token are stored in the session and passed as Bearer tokens on every
 * API call.
 *
 * Token storage:
 * - accessToken  â†’ JWT session (in-memory in the browser)
 * - refreshToken â†’ HttpOnly cookie via Auth.js session
 *
 * The session is extended with the user's accessToken so the typed API
 * client can attach it to every request without re-reading cookies.
 */

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        try {
          const res = await fetch(`${API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed.data),
          });

          if (!res.ok) return null;

          const body = (await res.json()) as {
            data: {
              user: { id: string; email: string; name: string | null; avatarUrl: string | null };
              accessToken: string;
              refreshToken: string;
            };
          };

          // Fetch the user's first org so we can redirect them after login
          let orgSlug = '';
          try {
            const orgsRes = await fetch(`${API_URL}/api/v1/auth/me/orgs`, {
              headers: { 'Authorization': `Bearer ${body.data.accessToken}` },
            });
            if (orgsRes.ok) {
              const orgsBody = (await orgsRes.json()) as { data: { slug: string }[] };
              orgSlug = orgsBody.data[0]?.slug ?? '';
            }
          } catch {
            // Non-fatal â€” user will see landing page
          }

          return {
            id: body.data.user.id,
            email: body.data.user.email,
            name: body.data.user.name,
            image: body.data.user.avatarUrl,
            accessToken: body.data.accessToken,
            refreshToken: body.data.refreshToken,
            orgSlug,
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    // Persist accessToken, refreshToken, and orgSlug into the JWT
    async jwt({ token, user }) {
      if (user) {
        token['accessToken'] = (user as { accessToken: string }).accessToken;
        token['refreshToken'] = (user as { refreshToken: string }).refreshToken;
        token['orgSlug'] = (user as { orgSlug?: string }).orgSlug ?? '';
      }
      return token;
    },
    // Expose accessToken and orgSlug to the client session
    async session({ session, token }) {
      session.user.id = token.sub ?? '';
      (session as { accessToken?: string }).accessToken = token['accessToken'] as string;
      (session as { orgSlug?: string }).orgSlug = token['orgSlug'] as string;
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});

// Augment the session type so TypeScript knows about accessToken and orgSlug
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    orgSlug?: string;
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
}
