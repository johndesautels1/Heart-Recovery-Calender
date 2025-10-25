import React from 'react';
import { GlassCard } from '../components/ui';
import { UtensilsCrossed } from 'lucide-react';

export function MealsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Meal Tracking</h1>
      <GlassCard>
        <div className="text-center py-12">
          <UtensilsCrossed className="h-16 w-16 mx-auto mb-4 text-orange-500" />
          <p className="text-gray-600">Meal tracking coming soon...</p>
        </div>
      </GlassCard>
    </div>
  );
}
