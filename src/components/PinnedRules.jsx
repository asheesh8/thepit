const RULES = [
  'Log every trade — wins AND losses.',
  'No revenge trading. Step away after 2 L\'s.',
  'Reflect before re-entry. No impulse re-enters.',
  'Callout execution, not people.',
  'Post real numbers. No cherry-picking.',
  'Strategy-linked trades only in funded context.',
]

export default function PinnedRules() {
  return (
    <div style={{ border: '1px solid var(--border)', background: 'rgba(34,34,34,0.82)', backdropFilter: 'blur(12px)', padding: '16px' }}>
      <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--red)', letterSpacing: '0.14em', marginBottom: '12px' }}>
        FLOOR RULES
      </div>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {RULES.map((rule, i) => (
          <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--red)', letterSpacing: '0.08em', flexShrink: 0, marginTop: '2px' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', lineHeight: 1.55, letterSpacing: '0.04em' }}>
              {rule}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
