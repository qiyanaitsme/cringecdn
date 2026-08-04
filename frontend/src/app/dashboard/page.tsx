'use client';

import { useAuth } from '@/hooks/useAuth';
import { DashboardHeader } from '@/components/dashboard/header';
import { DashboardContent } from '@/components/dashboard/content';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col">
      <DashboardHeader user={user} />
      <DashboardContent />
    </div>
  );
}