import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '~/lib/auth';
import { LoginForm } from '~/components/auth/login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  const session = await auth();
  if (session && session.error !== 'RefreshAccessTokenError') {
    if (session.orgSlug) {
      redirect(`/${session.orgSlug}/projects`);
    } else {
      redirect('/_/projects');
    }
  }

  return <LoginForm />;
}
