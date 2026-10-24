/**
 * AnalyticsCard.jsx
 * بطاقة إحصائية مع رسم بياني صغير
 */
import React from 'react';

export default function AnalyticsCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', // positive, negative, neutral
  icon,
  trend = [], // array of numbers for sparkline
  color = 'blue'
}) {
  const colors = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', accent: '#2563eb' },
    green: { bg: 'bg-green-50', text: 'text-green-600', accent: '#16a34a' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', accent: '#ea580c' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', accent: '#9333ea' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', accent: '#0d9488' },
  };

  const c = colors[color] || colors.blue;

  // Simple sparkline SVG
  const renderSparkline = () => {
    if (!trend.length) return null;
    
    const max = Math.max(...trend);
    const min = Math.min(...trend);
    const range = max - min || 1;
    const width = 80;
    const height = 30;
    const padding = 2;
    
    const points = trend.map((val, i) => {
      const x = padding + (i / (trend.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="opacity-60">
        <polyline
          fill="none"
          stroke={c.accent}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div className={`${c.bg} rounded-2xl p-5 transition-all hover:shadow-md`}>
      <div className="flex justify-between items-start mb-3">
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center text-xl`}>
          {icon}
        </div>
        {renderSparkline()}
      </div>
      
      <h3 className="text-gray-600 text-sm mb-1">{title}</h3>
      <div className="flex items-end gap-3">
        <span className={`text-3xl font-bold ${c.text}`}>{value}</span>
        {change !== undefined && (
          <span className={`text-sm font-medium ${
            changeType === 'positive' ? 'text-green-600' :
            changeType === 'negative' ? 'text-red-600' :
            'text-gray-500'
          }`}>
            {changeType === 'positive' && '↑'}
            {changeType === 'negative' && '↓'}
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
