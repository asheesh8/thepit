export default function BacktestReflectionCard({ reflection, session, onToggleFollowThrough, onTogglePublic, showAuthor = false }) {
  const canEdit = reflection.user_id === session?.user?.id

  return (
    <div className="card" style={{ padding: '18px', marginTop: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <h3 style={{ fontSize: '1.5rem', lineHeight: 1 }}>{reflection.title}</h3>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.08em', marginTop: '3px' }}>
            {showAuthor && reflection.profiles?.username ? `@${reflection.profiles.username} / ` : ''}
            {new Date(reflection.created_at).toLocaleDateString()} {reflection.sample_size ? `/ ${reflection.sample_size} SAMPLE` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span className="tag" style={{ color: reflection.is_public ? 'var(--green)' : 'var(--dim)', fontSize: '9px' }}>
            {reflection.is_public ? 'PUBLIC' : 'PRIVATE'}
          </span>
          {canEdit && onTogglePublic && (
            <button
              onClick={() => onTogglePublic(reflection)}
              className="btn"
              style={{ padding: '6px 10px', fontSize: '9px' }}
            >
              {reflection.is_public ? 'MAKE PRIVATE' : 'POST TO FLOOR'}
            </button>
          )}
          {canEdit && onToggleFollowThrough && (
            <button
              onClick={() => onToggleFollowThrough(reflection)}
              className={`btn ${reflection.completed_follow_through ? 'btn-green' : ''}`}
              style={{ padding: '6px 10px', fontSize: '9px' }}
            >
              {reflection.completed_follow_through ? 'FOLLOWED THROUGH' : 'MARK FOLLOW-THROUGH'}
            </button>
          )}
        </div>
      </div>
      <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text)', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>{reflection.body}</p>
      {reflection.lesson && (
        <div style={{ borderLeft: '2px solid var(--gold)', paddingLeft: '12px', marginBottom: '10px' }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: '4px' }}>LESSON</div>
          <p style={{ fontSize: '13px', color: 'var(--dim)', lineHeight: 1.6 }}>{reflection.lesson}</p>
        </div>
      )}
      {reflection.next_follow_through && (
        <div style={{ borderLeft: '2px solid var(--red)', paddingLeft: '12px' }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--red)', letterSpacing: '0.1em', marginBottom: '4px' }}>NEXT FOLLOW-THROUGH</div>
          <p style={{ fontSize: '13px', color: 'var(--dim)', lineHeight: 1.6 }}>{reflection.next_follow_through}</p>
        </div>
      )}
    </div>
  )
}
