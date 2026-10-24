/**
 * BadgeGrid.jsx
 * عرض شبكة الشارات المكتسبة وغير المكتسبة
 */
import React, { useState } from 'react';
import { BADGES, BADGE_CATEGORIES } from '../../data/badges';
import BadgeCard from './BadgeCard';

export default function BadgeGrid({ earnedBadges = [], onBadgeClick }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBadge, setSelectedBadge] = useState(null);

  const categories = [
    { id: 'all', name: 'الكل', color: '#6366f1' },
    ...Object.entries(BADGE_CATEGORIES).map(([id, cat]) => ({ id, ...cat }))
  ];

  const filteredBadges = Object.values(BADGES).filter(
    badge => selectedCategory === 'all' || badge.category === selectedCategory
  );

  const earnedCount = earnedBadges.length;
  const totalCount = Object.keys(BADGES).length;
  const progress = Math.round((earnedCount / totalCount) * 100);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            🏅 الشارات والإنجازات
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            اجمع الشارات بالتعلم المستمر!
          </p>
        </div>
        
        {/* Progress */}
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {earnedCount}/{totalCount}
          </div>
          <div className="text-xs text-gray-500">شارة</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>التقدم الكلي</span>
          <span>{progress}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-l from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
              ${selectedCategory === cat.id 
                ? 'text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
            style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
        {filteredBadges.map(badge => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            earned={earnedBadges.includes(badge.id)}
            onClick={() => {
              setSelectedBadge(badge);
              onBadgeClick?.(badge);
            }}
          />
        ))}
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedBadge(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-sm w-full text-center"
            onClick={e => e.stopPropagation()}
          >
            <div 
              className={`
                w-24 h-24 rounded-full flex items-center justify-center text-5xl mx-auto mb-4
                ${earnedBadges.includes(selectedBadge.id)
                  ? 'bg-gradient-to-br from-yellow-300 to-amber-400' 
                  : 'bg-gray-200'
                }
              `}
            >
              {selectedBadge.icon}
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {selectedBadge.name}
            </h3>
            <p className="text-gray-600 mb-4">
              {selectedBadge.description}
            </p>
            <div className="flex justify-center gap-4 text-sm">
              <span 
                className="px-3 py-1 rounded-full"
                style={{ 
                  backgroundColor: BADGE_CATEGORIES[selectedBadge.category].color + '20',
                  color: BADGE_CATEGORIES[selectedBadge.category].color 
                }}
              >
                {BADGE_CATEGORIES[selectedBadge.category].name}
              </span>
              <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
                +{selectedBadge.xpReward} XP
              </span>
            </div>
            {earnedBadges.includes(selectedBadge.id) ? (
              <div className="mt-6 text-green-600 font-bold">
                ✓ مكتسبة
              </div>
            ) : (
              <div className="mt-6 text-gray-500">
                🔒 غير مكتسبة بعد
              </div>
            )}
            <button
              onClick={() => setSelectedBadge(null)}
              className="mt-4 px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
