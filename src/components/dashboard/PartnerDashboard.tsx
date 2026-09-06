import React, { useState } from 'react';
import { Store, BarChart2, Calendar, Users, TrendingUp, Star } from 'lucide-react';

type PartnerType = 'hotel' | 'restaurant' | 'cafe' | 'adventure';

interface PartnerStats {
  views: number | null;
  bookings: number | null;
  revenue: number | null;
  rating: number | null;
}

interface PartnerOffer {
  id: string;
  title: string;
  discount: string;
  validUntil: string;
}

export const PartnerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'offers' | 'analytics'>('overview');

  const stats: PartnerStats = {
    views: null,
    bookings: null,
    revenue: null,
    rating: null,
  };

  const offers: PartnerOffer[] = [];

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border-token rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary-action/10 text-primary-action flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Partner Dashboard</h1>
            <p className="text-sm text-text-secondary">Partner reporting and offer management are not implemented. No business metrics are available.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-elevated border border-border-token p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 className="w-4 h-4 text-primary-action" />
              <span className="text-xs text-text-secondary uppercase tracking-wider">Views</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.views ?? 'Unavailable'}</p>
          </div>
          <div className="bg-surface-elevated border border-border-token p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-primary-action" />
              <span className="text-xs text-text-secondary uppercase tracking-wider">Bookings</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.bookings ?? 'Unavailable'}</p>
          </div>
          <div className="bg-surface-elevated border border-border-token p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary-action" />
              <span className="text-xs text-text-secondary uppercase tracking-wider">Revenue</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.revenue === null ? 'Unavailable' : `NPR ${stats.revenue.toLocaleString()}`}</p>
          </div>
          <div className="bg-surface-elevated border border-border-token p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-primary-action" />
              <span className="text-xs text-text-secondary uppercase tracking-wider">Rating</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.rating ?? 'Unavailable'}</p>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border-token rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-primary-action" />
          <h2 className="text-xl font-bold text-white">Active Offers</h2>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Offer data unavailable.</p>
          {offers.map(offer => (
            <div key={offer.id} className="bg-surface-elevated border border-border-token p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{offer.title}</p>
                <p className="text-xs text-text-secondary mt-1">Valid until {offer.validUntil}</p>
              </div>
              <span className="text-primary-action font-bold">{offer.discount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
