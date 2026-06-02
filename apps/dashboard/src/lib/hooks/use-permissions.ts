import { useSession } from 'next-auth/react';
import { useMembers } from './use-org';
import { hasPermission, type OrgRole } from '@pulse-flags/types';

export function usePermission(orgSlug: string, permission: string) {
  const { data: session } = useSession();
  const { data: members, isLoading } = useMembers(orgSlug);

  if (!session?.user?.id) {
    return { hasPerm: false, isLoading: true };
  }

  if (isLoading) {
    return { hasPerm: false, isLoading: true };
  }

  const currentMember = members?.find((m) => m.user?.id === session.user.id);
  if (!currentMember) {
    return { hasPerm: false, isLoading: false };
  }

  const hasPerm = hasPermission(currentMember.role as OrgRole, permission);
  return { hasPerm, isLoading: false, role: currentMember.role };
}
