'use client';

import Header from '../../components/layout/Header';
import { AuthWrapper } from '../../components/auth/AuthWrapper';

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthWrapper requireAuth={true}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main>{children}</main>
      </div>
    </AuthWrapper>
  );
}