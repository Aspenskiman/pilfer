const COLORS = ['#f5b841', '#ff4f64', '#4fe0b5', '#fff7e8', '#8b7bff']

// Deterministic pseudo-random so server and client render the same pieces.
function rand(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/**
 * One burst of confetti that falls once and is gone. Render it in response to
 * something the player did (joined, finished, won). Hidden for reduced motion.
 */
export function Confetti({ pieces = 48 }: { pieces?: number }) {
  return (
    <div className="pf-confetti" aria-hidden="true">
      {Array.from({ length: pieces }, (_, i) => (
        <i
          key={i}
          style={
            {
              left: `${(rand(i, 1) * 100).toFixed(2)}%`,
              background: COLORS[i % COLORS.length],
              width: `${(7 + rand(i, 2) * 7).toFixed(1)}px`,
              height: `${(10 + rand(i, 3) * 10).toFixed(1)}px`,
              animationDuration: `${(2.2 + rand(i, 4) * 1.8).toFixed(2)}s`,
              animationDelay: `${(rand(i, 5) * 0.7).toFixed(2)}s`,
              '--pf-drift': `${((rand(i, 6) - 0.5) * 30).toFixed(1)}vw`,
              '--pf-spin': `${(360 + rand(i, 7) * 720).toFixed(0)}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
