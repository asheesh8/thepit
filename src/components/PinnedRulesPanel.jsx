/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { contextLabel } from '../lib/pinnedRules'

export default function PinnedRulesPanel({ session, context = 'global', variant = 'rail' }) {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRules()
  }, [session.user.id, context])

  const loadRules = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('pinned_rules')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_pinned', true)
      .in('context', ['global', context])
      .order('context', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(6)

    setRules(data || [])
    setLoading(false)
  }

  return (
    <aside className={`pinned-rules-panel pinned-rules-${variant}`}>
      <div className="pinned-rules-kicker">PINNED RULES</div>
      {loading ? (
        <div className="pinned-rules-empty">LOADING...</div>
      ) : rules.length === 0 ? (
        <Link to="/settings" className="pinned-rules-empty">
          ADD RULES IN SETTINGS
        </Link>
      ) : (
        <div className="pinned-rules-list">
          {rules.map(rule => (
            <div key={rule.id} className="pinned-rule">
              <span>{contextLabel(rule.context)}</span>
              <p>{rule.body}</p>
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
