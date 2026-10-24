/**
 * BadgeCard.jsx
 * عرض شارة إنجاز
 */
import React from 'react';
import { BADGE_CATEGORIES } from '../../data/badges';

export default function BadgeCard({ badge, earned = false, showDetails = false, onClick }) {
  const category = BADGE_CATEGORIES[badge.category];
  
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center p-4 rounded-xl transition-all duration-300
        ${earned 
          ? 'bg-gradient-to-br from-yellow-50 to-amber-100 shadow-lg hover:shadow-xl transform hover:-translate-y-1' 
          : 'bg-gray-100 opacity-50 grayscale'
        }
        ${onClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
      `}
      disabled={!onClick}
      style={{ minWidth: '100px' }}
    >
      {/* Badge Icon */}
      <div 
        className={`
          w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-2
          ${earned 
            ? 'bg-gradient-to-br from-yellow-300 to-amber-400 shadow-inner' 
            : 'bg-gray-200'
          }
        `}
        style={earned ? { boxShadow: `0 0 20px ${category.color}40` } : {}}
      >
        {badge.icon}
      </div>

      {/* Badge Name */}
      <h3 className={`font-bold text-sm text-center ${earned ? 'text-gray-800' : 'text-gray-500'}`}>
        {badge.name}
      </h3>

      {/* Category Tag */}
      <span 
        className="text-xs px-2 py-0.5 rounded-full mt-1"
        style={{ 
          backgroundColor: earned ? `${category.color}20` : '#e5e7eb',
          color: earned ? category.color : '#9ca3af'
        }}
      >
        {category.name}
      </span>

      {/* Details (if expanded) */}
      {showDetails && (
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-600 mb-1">{badge.description}</p>
          <span className="text-xs font-bold text-yellow-600">
            +{badge.xpReward} XP
          </span>
        </div>
      )}

      {/* Earned checkmark */}
      {earned && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow">
          <span className="text-white text-sm">✓</span>
        </div>
      )}

      {/* Locked icon for unearned */}
      {!earned && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">🔒</span>
        </div>
      )}
    </button>
  );
}
