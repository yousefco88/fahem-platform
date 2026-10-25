import React from 'react';
import { getStreakMessage, getLevelTitle, xpForLevel } from '../../hooks/useStreak';

/**
 * StreakBadge - يعرض سلسلة الأيام والـ XP والمستوى
 * يُستخدم في صفحة الطفل الرئيسية
 */
export default function StreakBadge({
  currentStreak = 0,
  bestStreak = 0,
  xpTotal = 0,
  level = 1,
  isActiveToday = false,
  compact = false,
  onClick
}) {
  const xpForNext = xpForLevel(level);
  const xpInLevel = xpTotal % 100;
  const xpProgress = (xpInLevel / xpForNext) * 100;
  const streakMessage = getStreakMessage(currentStreak);
  const levelTitle = getLevelTitle(level);

  // Compact version for top bar
  if (compact) {
    return (
      <div
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
          padding: '8px 16px',
          borderRadius: '20px',
          cursor: onClick ? 'pointer' : 'default',
          boxShadow: '0 2px 8px rgba(251, 191, 36, 0.3)',
          transition: 'transform 0.2s',
        }}
        title="اضغط لرؤية التفاصيل"
      >
        <span style={{ fontSize: '20px' }}>🔥</span>
        <span style={{ fontWeight: 800, color: 'var(--amber-text)', fontSize: '15px' }}>
          {currentStreak} {currentStreak === 1 ? 'يوم' : 'أيام'}
        </span>
        <span style={{ 
          background: '#fbbf24', 
          color: 'var(--amber-text)', 
          padding: '2px 8px', 
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 700
        }}>
          Lv.{level}
        </span>
      </div>
    );
  }

  // Full version for dashboard
  return (
    <div style={{
      background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
      borderRadius: '24px',
      padding: '24px',
      boxShadow: '0 8px 25px rgba(251, 191, 36, 0.3)',
      border: '2px solid #fbbf24',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative fire particles */}
      <div style={{
        position: 'absolute',
        top: '-10px',
        right: '20px',
        fontSize: '60px',
        opacity: 0.2
      }}>🔥</div>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px'
      }}>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px'
          }}>
            <span style={{ fontSize: '32px' }}>🔥</span>
            <span style={{
              fontSize: '36px',
              fontWeight: 900,
              color: 'var(--amber-text)',
              lineHeight: 1
            }}>
              {currentStreak}
            </span>
            <span style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--amber-text)'
            }}>
              {currentStreak === 1 ? 'يوم' : 'أيام متتالية'}
            </span>
          </div>
          <p style={{
            color: 'var(--amber-text)',
            fontSize: '14px',
            fontWeight: 600,
            margin: 0
          }}>
            {streakMessage}
          </p>
        </div>

        {/* Today's status */}
        <div style={{
          background: isActiveToday ? '#22c55e' : '#94a3b8',
          color: 'white',
          padding: '6px 14px',
          borderRadius: '16px',
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {isActiveToday ? '✅ نشط اليوم' : '⏳ لم تبدأ بعد'}
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {/* Best Streak */}
        <div style={{
          background: 'rgba(255,255,255,0.6)',
          padding: '12px',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', marginBottom: '4px' }}>🏆</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--amber-text)' }}>
            {bestStreak}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--amber-text)', fontWeight: 600 }}>
            أفضل سلسلة
          </div>
        </div>

        {/* Total XP */}
        <div style={{
          background: 'rgba(255,255,255,0.6)',
          padding: '12px',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', marginBottom: '4px' }}>⭐</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--amber-text)' }}>
            {xpTotal}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--amber-text)', fontWeight: 600 }}>
            نقاط XP
          </div>
        </div>

        {/* Level */}
        <div style={{
          background: 'rgba(255,255,255,0.6)',
          padding: '12px',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', marginBottom: '4px' }}>🎖️</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--amber-text)' }}>
            {level}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--amber-text)', fontWeight: 600 }}>
            {levelTitle}
          </div>
        </div>
      </div>

      {/* XP Progress bar */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--amber-text)',
          marginBottom: '6px'
        }}>
          <span>المستوى {level} → {level + 1}</span>
          <span>{xpInLevel}/{xpForNext} XP</span>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.5)',
          borderRadius: '10px',
          height: '12px',
          overflow: 'hidden'
        }}>
          <div style={{
            background: 'linear-gradient(90deg, #f59e0b, #eab308)',
            height: '100%',
            width: `${xpProgress}%`,
            borderRadius: '10px',
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

      {/* Motivational tip */}
      {!isActiveToday && (
        <div style={{
          marginTop: '16px',
          background: 'rgba(34, 197, 94, 0.2)',
          padding: '10px 14px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--green-text)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>💡</span>
          <span>أكمل درسًا واحدًا اليوم للحفاظ على سلسلتك!</span>
        </div>
      )}
    </div>
  );
}
