/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_COLORS ={ active: '#2ec4b6', passed: '#4caf50', failed: '#e63946', payout_pending: '#f4a261', withdrawn: '#888' }
const STATUS_LABELS = { active: 'ACTIVE', passed: 'PASSED', failed: 'FAILED', payout_pending: 'PAYOUT PENDING', withdrawn: 'WITHDRAWN' }

function fmt(n) {
  const abs = Math.abs(n)
  return (n < 0 ? '-' : '+') + '$' + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtAbs(n) {
  return '$' + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Gauge bar
function Gauge({ value, max, color, label }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.08em' }}>{label}</span>
        <span style={{ fontFamily: 'Space Mono', fontSize: '8px', color }}>{fmtAbs(value)} / {fmtAbs(max)}</span>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

export default function Vault({ session }) {
  const [tab, setTab] = useState('accounts')
  const [accounts, setAccounts] = useState([])
  const [payouts, setPayouts] = useState([])
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [showPayoutForm, setShowPayoutForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)

  const [acctForm, setAcctForm] = useState({
    firm_name: '', account_type: '', account_size: '', entry_fee: '', profit_target_pct: 10,
    max_drawdown_pct: 10, daily_drawdown_pct: 5, current_balance: '', status: 'active', notes: '',
  })
  const [payoutForm, setPayoutForm] = useState({
    type: 'payout', amount: '', source: '', date: new Date().toISOString().slice(0, 10), notes: '',
  })

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [{ data: accts }, { data: pays }] = await Promise.all([
      supabase.from('prop_accounts').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('payouts').select('*').eq('user_id', session.user.id).order('date', { ascending: false }),
    ])
    setAccounts(accts || [])
    setPayouts(pays || [])
  }

  // ── accounts ──────────────────────────────────────────────
  const submitAccount = async (e) => {
    e.preventDefault()
    const size = Number(acctForm.account_size)
    const payload = {
      user_id: session.user.id,
      firm_name: acctForm.firm_name,
      account_type: acctForm.account_type,
      account_size: size,
      entry_fee: Number(acctForm.entry_fee) || 0,
      profit_target: size * (Number(acctForm.profit_target_pct) / 100),
      max_drawdown: size * (Number(acctForm.max_drawdown_pct) / 100),
      daily_drawdown: size * (Number(acctForm.daily_drawdown_pct) / 100),
      current_balance: Number(acctForm.current_balance) || size,
      status: acctForm.status,
      notes: acctForm.notes,
    }
    if (editingAccount) {
      const { data } = await supabase.from('prop_accounts').update(payload).eq('id', editingAccount).select().single()
      if (data) setAccounts(prev => prev.map(a => a.id === editingAccount ? data : a))
    } else {
      const { data } = await supabase.from('prop_accounts').insert(payload).select().single()
      if (data) setAccounts(prev => [data, ...prev])
    }
    resetAccountForm()
  }

  const deleteAccount = async (id) => {
    await supabase.from('prop_accounts').delete().eq('id', id)
    setAccounts(prev => prev.filter(a => a.id !== id))
  }

  const startEditAccount = (acct) => {
    setEditingAccount(acct.id)
    setAcctForm({
      firm_name: acct.firm_name,
      account_type: acct.account_type || '',
      account_size: acct.account_size,
      entry_fee: acct.entry_fee,
      profit_target_pct: ((acct.profit_target / acct.account_size) * 100).toFixed(0),
      max_drawdown_pct: ((acct.max_drawdown / acct.account_size) * 100).toFixed(0),
      daily_drawdown_pct: ((acct.daily_drawdown / acct.account_size) * 100).toFixed(0),
      current_balance: acct.current_balance,
      status: acct.status,
      notes: acct.notes || '',
    })
    setShowAccountForm(true)
  }

  const resetAccountForm = () => {
    setShowAccountForm(false)
    setEditingAccount(null)
    setAcctForm({ firm_name: '', account_type: '', account_size: '', entry_fee: '', profit_target_pct: 10, max_drawdown_pct: 10, daily_drawdown_pct: 5, current_balance: '', status: 'active', notes: '' })
  }

  // ── payouts ───────────────────────────────────────────────
  const submitPayout = async (e) => {
    e.preventDefault()
    const payload = {
      user_id: session.user.id,
      type: payoutForm.type,
      amount: Number(payoutForm.amount),
      source: payoutForm.source,
      date: payoutForm.date,
      notes: payoutForm.notes,
    }
    const { data } = await supabase.from('payouts').insert(payload).select().single()
    if (data) setPayouts(prev => [data, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)))
    setPayoutForm({ type: 'payout', amount: '', source: '', date: new Date().toISOString().slice(0, 10), notes: '' })
    setShowPayoutForm(false)
  }

  const deletePayout = async (id) => {
    await supabase.from('payouts').delete().eq('id', id)
    setPayouts(prev => prev.filter(p => p.id !== id))
  }

  // ── computed totals ───────────────────────────────────────
  const totalFees = accounts.reduce((s, a) => s + (a.entry_fee || 0), 0)
  const totalPayouts = payouts.filter(p => p.type === 'payout').reduce((s, p) => s + p.amount, 0)
  const totalFeesPaid = payouts.filter(p => p.type === 'fee').reduce((s, p) => s + p.amount, 0)
  const netPnl = totalPayouts - totalFeesPaid

  return (
    <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
      <div className="page-shell" style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }}>

        {/* header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '3rem', letterSpacing: '0.05em', lineHeight: 1, marginBottom: '4px' }}>THE VAULT</h1>
          <p style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.1em' }}>PRIVATE · NEVER SHOWN PUBLICLY</p>
        </div>

        {/* net summary bar */}
        <div className="vault-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'NET P&L', value: netPnl, color: netPnl >= 0 ? 'var(--green)' : 'var(--red)', signed: true },
            { label: 'TOTAL PAYOUTS', value: totalPayouts, color: 'var(--green)', signed: false },
            { label: 'TOTAL FEES PAID', value: totalFeesPaid, color: 'var(--red)', signed: false },
          ].map(({ label, value, color, signed }) => (
            <div key={label} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.12em', marginBottom: '6px' }}>{label}</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color, letterSpacing: '0.03em' }}>
                {signed ? fmt(value) : fmtAbs(value)}
              </div>
            </div>
          ))}
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #242424', marginBottom: '24px' }}>
          {[['accounts', 'PROP ACCOUNTS'], ['payouts', 'PAYOUTS']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Space Mono', fontSize: '10px', letterSpacing: '0.08em',
              color: tab === key ? 'var(--text)' : '#444440',
              borderBottom: tab === key ? '1px solid var(--red)' : '1px solid transparent',
              marginBottom: '-1px',
            }}>{label}</button>
          ))}
        </div>

        {/* ── ACCOUNTS TAB ── */}
        {tab === 'accounts' && (
          <div>
            <button onClick={() => { resetAccountForm(); setShowAccountForm(v => !v) }} className="btn btn-red" style={{ marginBottom: '20px', padding: '10px 20px', fontSize: '11px' }}>
              + ADD ACCOUNT
            </button>

            {showAccountForm && (
              <form onSubmit={submitAccount} className="card" style={{ padding: '24px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: '4px' }}>
                  {editingAccount ? 'EDIT ACCOUNT' : 'NEW PROP ACCOUNT'}
                </div>

                <div className="vault-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={lbl}>FIRM</label>
                    <input value={acctForm.firm_name} onChange={e => setAcctForm(p => ({ ...p, firm_name: e.target.value }))} placeholder="FTMO, Apex, etc." required style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>ACCOUNT TYPE</label>
                    <input value={acctForm.account_type} onChange={e => setAcctForm(p => ({ ...p, account_type: e.target.value }))} placeholder="Phase 1, Funded, etc." style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>STATUS</label>
                    <select value={acctForm.status} onChange={e => setAcctForm(p => ({ ...p, status: e.target.value }))} style={inp}>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>ACCOUNT SIZE ($)</label>
                    <input type="number" required value={acctForm.account_size} onChange={e => setAcctForm(p => ({ ...p, account_size: e.target.value }))} placeholder="100000" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>ENTRY FEE ($)</label>
                    <input type="number" value={acctForm.entry_fee} onChange={e => setAcctForm(p => ({ ...p, entry_fee: e.target.value }))} placeholder="500" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>CURRENT BALANCE ($)</label>
                    <input type="number" value={acctForm.current_balance} onChange={e => setAcctForm(p => ({ ...p, current_balance: e.target.value }))} placeholder="Same as size if new" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>PROFIT TARGET (%)</label>
                    <input type="number" value={acctForm.profit_target_pct} onChange={e => setAcctForm(p => ({ ...p, profit_target_pct: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>MAX DRAWDOWN (%)</label>
                    <input type="number" value={acctForm.max_drawdown_pct} onChange={e => setAcctForm(p => ({ ...p, max_drawdown_pct: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>DAILY DRAWDOWN (%)</label>
                    <input type="number" value={acctForm.daily_drawdown_pct} onChange={e => setAcctForm(p => ({ ...p, daily_drawdown_pct: e.target.value }))} style={inp} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>NOTES</label>
                  <input value={acctForm.notes} onChange={e => setAcctForm(p => ({ ...p, notes: e.target.value }))} placeholder="Phase 1, challenge #3..." style={inp} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-green" style={{ padding: '10px 20px', fontSize: '11px' }}>SAVE</button>
                  <button type="button" onClick={resetAccountForm} className="btn" style={{ padding: '10px 20px', fontSize: '11px' }}>CANCEL</button>
                </div>
              </form>
            )}

            {accounts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)' }}>NO ACCOUNTS YET</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {accounts.map(acct => {
                  const size = acct.account_size
                  const bal = acct.current_balance
                  const profit = bal - size
                  const profitColor = profit >= 0 ? 'var(--green)' : 'var(--red)'
                  const drawdownUsed = Math.max(0, size - bal)
                  const statusColor = STATUS_COLORS[acct.status] || 'var(--dim)'

                  return (
                    <div key={acct.id} className="card" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', letterSpacing: '0.05em', lineHeight: 1 }}>{acct.firm_name}</div>
                            {acct.account_type && <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.1em' }}>{acct.account_type.toUpperCase()}</div>}
                          </div>
                          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', marginTop: '3px' }}>
                            {fmtAbs(size)} ACCOUNT · ENTRY FEE {fmtAbs(acct.entry_fee)}
                          </div>
                          {acct.notes && <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', marginTop: '2px' }}>{acct.notes}</div>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontFamily: 'Space Mono', fontSize: '8px', color: statusColor, letterSpacing: '0.1em', padding: '3px 8px', border: `1px solid ${statusColor}`, borderRadius: '2px' }}>
                            {STATUS_LABELS[acct.status]}
                          </span>
                          <button onClick={() => startEditAccount(acct)} style={ghostBtn}>EDIT</button>
                          <button onClick={() => deleteAccount(acct.id)} style={{ ...ghostBtn, color: 'var(--red)' }}>✕</button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '24px', marginBottom: '14px' }}>
                        <div>
                          <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', marginBottom: '3px' }}>BALANCE</div>
                          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: 'var(--text)' }}>{fmtAbs(bal)}</div>
                        </div>
                        <div>
                          <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', marginBottom: '3px' }}>P&L</div>
                          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: profitColor }}>{fmt(profit)}</div>
                        </div>
                      </div>

                      <Gauge value={Math.max(0, profit)} max={acct.profit_target} color="var(--green)" label="PROFIT TARGET" />
                      <Gauge value={drawdownUsed} max={acct.max_drawdown} color="var(--red)" label="MAX DRAWDOWN USED" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── PAYOUTS TAB ── */}
        {tab === 'payouts' && (
          <div>
            <button onClick={() => setShowPayoutForm(v => !v)} className="btn btn-red" style={{ marginBottom: '20px', padding: '10px 20px', fontSize: '11px' }}>
              + LOG ENTRY
            </button>

            {showPayoutForm && (
              <form onSubmit={submitPayout} className="card" style={{ padding: '24px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: '4px' }}>NEW ENTRY</div>

                <div className="vault-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={lbl}>TYPE</label>
                    <select value={payoutForm.type} onChange={e => setPayoutForm(p => ({ ...p, type: e.target.value }))} style={inp}>
                      <option value="payout">PAYOUT RECEIVED</option>
                      <option value="fee">FEE PAID</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>DATE</label>
                    <input type="date" required value={payoutForm.date} onChange={e => setPayoutForm(p => ({ ...p, date: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>AMOUNT ($)</label>
                    <input type="number" required step="0.01" value={payoutForm.amount} onChange={e => setPayoutForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>SOURCE / FIRM</label>
                    <input value={payoutForm.source} onChange={e => setPayoutForm(p => ({ ...p, source: e.target.value }))} placeholder="FTMO, personal..." style={inp} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>NOTES</label>
                  <input value={payoutForm.notes} onChange={e => setPayoutForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional" style={inp} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-green" style={{ padding: '10px 20px', fontSize: '11px' }}>SAVE</button>
                  <button type="button" onClick={() => setShowPayoutForm(false)} className="btn" style={{ padding: '10px 20px', fontSize: '11px' }}>CANCEL</button>
                </div>
              </form>
            )}

            {payouts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)' }}>NO ENTRIES YET</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {payouts.map(p => {
                  const isPayout = p.type === 'payout'
                  const color = isPayout ? 'var(--green)' : 'var(--red)'
                  return (
                    <div key={p.id} className="card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--text)' }}>
                            {p.source || (isPayout ? 'Payout' : 'Fee')}
                          </div>
                          <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', marginTop: '2px' }}>
                            {p.date} {p.notes ? `· ${p.notes}` : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color }}>
                          {isPayout ? '+' : '-'}{fmtAbs(p.amount)}
                        </div>
                        <button onClick={() => deletePayout(p.id)} style={{ ...ghostBtn, color: 'var(--dim)' }}>✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const lbl = { fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', display: 'block', marginBottom: '6px', letterSpacing: '0.1em' }
const inp = { width: '100%', background: '#111', border: '1px solid #242424', padding: '10px 12px', color: 'var(--text)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
const ghostBtn = { background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', padding: '4px 6px', letterSpacing: '0.08em' }
