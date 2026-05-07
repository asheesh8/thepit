import { Link } from 'react-router-dom'

export default function MotivationVault({ profile, stats, isOwn }) {
  const totalPnl = Number(stats?.totalPnl || 0)
  const pnlLabel = totalPnl >= 0 ? `+$${totalPnl.toFixed(0)}` : `-$${Math.abs(totalPnl).toFixed(0)}`

  return (
    <section className="motivation-vault" aria-label="Motivation vault">
      <div className="motivation-copy">
        <div className="motivation-kicker">WHY WE DO IT</div>
        <h2>THE GARAGE FUND</h2>
        <p>
          Stack clean reps, protect the account, and keep the dream visible every time you open your profile.
        </p>
        <div className="motivation-stats">
          <span>{pnlLabel} PUBLIC P&L</span>
          <span>{stats?.backtestCount || 0} BACKTEST REPS</span>
        </div>
        {isOwn && <Link to="/settings" className="btn btn-green motivation-link">SET GOAL</Link>}
      </div>

      <div className="motivation-stage">
        <div className="motivation-pfp-coin">
          <div className="motivation-pfp" style={{ background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'var(--black)' }}>
            {!profile?.avatar_url && profile?.username?.slice(0, 1).toUpperCase()}
          </div>
          <span>SAVE THE WHY</span>
        </div>

        <div className="car-3d" aria-hidden="true">
          <div className="car-shadow" />
          <div className="car-body" />
          <div className="car-cabin" />
          <div className="car-glass" />
          <div className="car-light left" />
          <div className="car-light right" />
          <div className="car-wheel front"><span /></div>
          <div className="car-wheel rear"><span /></div>
        </div>

        <div className="piggy-bank-3d" aria-hidden="true">
          <div className="piggy-slot" />
          <div className="piggy-ear" />
          <div className="piggy-eye" />
          <div className="piggy-nose" />
          <div className="piggy-foot one" />
          <div className="piggy-foot two" />
        </div>
      </div>
    </section>
  )
}
