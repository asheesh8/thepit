export default function Avatar({ url, username, size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      border: '1px solid var(--border)',
      background: url ? `url(${url}) center/cover no-repeat` : 'var(--dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', fontFamily: 'Bebas Neue',
      fontSize: `${Math.round(size * 0.42)}px`, color: 'var(--red)', lineHeight: 1,
    }}>
      {!url && (username?.[0]?.toUpperCase() || '?')}
    </div>
  )
}
