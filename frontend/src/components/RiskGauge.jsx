import './RiskGauge.css'

const R = 80
const CX = 100
const CY = 100
const STROKE = 14

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 180) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  }
}

function arcPath(startAngle, endAngle) {
  const start = polarToCartesian(CX, CY, R, endAngle)
  const end = polarToCartesian(CX, CY, R, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

export default function RiskGauge({ probability, label }) {
  const pct = Math.max(0, Math.min(1, probability))
  const needleAngle = pct * 180

  const color = pct >= 0.5 ? 'var(--risk-high)' : pct >= 0.3 ? 'var(--risk-moderate)' : 'var(--risk-low)'
  const needleTip = polarToCartesian(CX, CY, R - STROKE / 2 - 4, needleAngle)

  return (
    <div className="risk-gauge">
      <svg viewBox="0 0 200 118" width="220" height="130">
        <path d={arcPath(0, 180)} fill="none" stroke="var(--line)" strokeWidth={STROKE} strokeLinecap="round" />
        <path
          d={arcPath(0, needleAngle)}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          className="risk-gauge__fill"
        />
        <line
          x1={CX}
          y1={CY}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke="var(--ink)"
          strokeWidth="2"
          className="risk-gauge__needle"
        />
        <circle cx={CX} cy={CY} r="4" fill="var(--ink)" />
      </svg>
      <div className="risk-gauge__readout">
        <span className="risk-gauge__pct" style={{ color }}>
          {Math.round(pct * 100)}%
        </span>
        <span className="risk-gauge__label">{label === 'HIGH' ? 'Elevated risk' : 'Lower risk'}</span>
      </div>
    </div>
  )
}
