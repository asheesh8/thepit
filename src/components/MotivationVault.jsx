import { Link } from 'react-router-dom'
import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGLTF, OrbitControls, Environment } from '@react-three/drei'

const CARS = [
  { src: '/porsche_gt3_rs.glb',    scale: 1.0, position: [0, -0.3, 0] },
  { src: '/audi_rs6gt_avant.glb',  scale: 1.1, position: [0, -0.4, 0] },
]

function CarModel({ car }) {
  const { scene } = useGLTF(car.src)
  return <primitive object={scene} scale={car.scale} position={car.position} rotation={[0, -0.4, 0]} />
}

CARS.forEach(c => useGLTF.preload(c.src))

export default function MotivationVault({ profile, stats, isOwn }) {
  const [car] = useState(() => CARS[Math.floor(Math.random() * CARS.length)])

  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 50)
    return () => clearTimeout(t)
  }, [])

  const totalPnl = Number(stats?.totalPnl || 0)
  const pnlLabel = totalPnl >= 0 ? `+$${totalPnl.toFixed(0)}` : `-$${Math.abs(totalPnl).toFixed(0)}`
  const goalText = profile?.goal_text?.trim()

  // Don't render for other profiles if they haven't set a goal
  if (!goalText && !isOwn) return null

  return (
    <section className="motivation-vault" aria-label="Motivation vault">
      <div className="motivation-copy">
        <div className="motivation-kicker">WHY WE DO IT</div>

        {goalText ? (
          <>
            <h2 style={{ fontSize: '1.9rem', lineHeight: 1.1, marginBottom: '2px' }}>
              {goalText}
            </h2>
            <div className="motivation-stats">
              <span>{pnlLabel} PUBLIC P&L</span>
              <span>{stats?.backtestCount || 0} BACKTEST REPS</span>
            </div>
            {isOwn && (
              <Link to="/settings" className="btn motivation-link">EDIT GOAL</Link>
            )}
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '1.6rem', lineHeight: 1.1, color: 'var(--dim)' }}>
              SET YOUR WHY
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
              What are you building toward? Keep the dream visible every time you open your profile.
            </p>
            <Link to="/settings" className="btn btn-green motivation-link">ADD YOUR GOAL →</Link>
          </>
        )}
      </div>

      <div className="motivation-stage">
        <div className="motivation-pfp-coin">
          <div className="motivation-pfp" style={{ background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'var(--black)' }}>
            {!profile?.avatar_url && profile?.username?.slice(0, 1).toUpperCase()}
          </div>
          <span>SAVE THE WHY</span>
        </div>

        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <Canvas
            camera={{ position: [6, 2.5, 6], fov: 38 }}
            gl={{ antialias: true }}
            style={{ width: '100%', height: '100%' }}
            resize={{ debounce: 0, offsetSize: true }}
          >
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 8, 5]} intensity={1.2} />
            <Environment preset="night" />
            <Suspense fallback={null}>
              <CarModel car={car} />
            </Suspense>
            <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.2} />
          </Canvas>
        </div>

      </div>
    </section>
  )
}
