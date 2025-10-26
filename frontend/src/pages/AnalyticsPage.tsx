import React from 'react';
import { GlassCard } from '../components/ui';
import { BarChart } from 'lucide-react';

export function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Analytics & Reports</h1>
      <GlassCard>
        <div className="text-center py-12">
          <BarChart className="h-16 w-16 mx-auto mb-4 text-blue-500" />
          <p className="text-white">Analytics dashboard coming soon...</p>
        </div>
      </GlassCard>
    </div>
  );
}
