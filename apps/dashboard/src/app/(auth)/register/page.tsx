import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '~/lib/auth';
import { RegisterForm } from '~/components/auth/register-form';

export const metadata: Metadata = { title: 'Create account' };

export default async function RegisterPage() {
  const session = await auth();
  if (session && session.error !== 'RefreshAccessTokenError') {
    if (session.orgSlug) {
      redirect(`/${session.orgSlug}/projects`);
    } else {
      redirect('/_/projects');
    }
  }

  return <RegisterForm />;
}
