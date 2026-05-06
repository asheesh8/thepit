import { BADGES, badgeByKey } from '../lib/discipline'

const toneColor = {
  red: 'var(--red)',
  green: 'var(--green)',
  gold: 'var(--gold)',
}

export default function BadgeStrip({ badgeKeys = [], currentStreak = 0, compact = false }) {
  const earned = badgeKeys.map(key => badgeByKey[key]).filter(Boolean)

  return (
    <div style={{ marginBottom: compact ? '16px' : '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
        <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.12em' }}>
          PIT STREAK: <span style={{ color: 'var(--red)' }}>{currentStreak}</span> DAYS
        </div>
        <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', opacity: 0.7 }}>
          {earned.length}/{BADGES.length} BADGES
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {(earned.length ? earned : [{ key: 'empty', label: 'No Badges Yet', rule: 'Earned through honest work', tone: 'red' }]).map(badge => (
          <span
            key={badge.key}
            title={badge.rule}
            className="tag"
            style={{
              color: toneColor[badge.tone] || 'var(--dim)',
              opacity: badge.key === 'empty' ? 0.45 : 1,
              fontSize: compact ? '8px' : '9px',
            }}
          >
            {badge.label}
          </span>
        ))}
      </div>
    </div>
  )
}
