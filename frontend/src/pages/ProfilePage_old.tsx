import React from 'react';
import { GlassCard } from '../components/ui';
import { User } from 'lucide-react';
import { useSession } from '../contexts/SessionContext';

export function ProfilePage() {
  const { user } = useSession();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Profile Settings</h1>
      <GlassCard>
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-10 w-10 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user?.name}</h2>
              <p className="text-gray-600">{user?.email}</p>
            </div>
          </div>
          <p className="text-gray-600">Profile management coming soon...</p>
        </div>
      </GlassCard>
    </div>
  );
}
