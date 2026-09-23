import { Bar, BarChart, Cell, ResponsiveContainer, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import './FactorChart.css'

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const row = payload[0].payload
  return (
    <div className="factor-tooltip">
      <div className="factor-tooltip__title">{row.display_name}</div>
      <div className="factor-tooltip__value">Patient value: {row.value}</div>
      <div className="factor-tooltip__impact">
        {row.shap_value > 0 ? 'Pushes risk up' : 'Pushes risk down'} · {row.shap_value.toFixed(3)}
      </div>
    </div>
  )
}

export default function FactorChart({ factors }) {
  const data = [...factors].sort((a, b) => a.shap_value - b.shap_value)

  return (
    <div className="factor-chart">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
          <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} axisLine={{ stroke: 'var(--line)' }} tickLine={false} />
          <YAxis
            type="category"
            dataKey="display_name"
            width={140}
            tick={{ fontSize: 12, fill: 'var(--ink)' }}
            axisLine={{ stroke: 'var(--line)' }}
            tickLine={false}
          />
          <ReferenceLine x={0} stroke="var(--line-strong)" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--brand-tint)' }} />
          <Bar dataKey="shap_value" radius={3} barSize={16}>
            {data.map((entry) => (
              <Cell key={entry.feature} fill={entry.shap_value > 0 ? 'var(--factor-up)' : 'var(--factor-down)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="factor-chart__legend">
        <span><i style={{ background: 'var(--factor-up)' }} /> Increases risk</span>
        <span><i style={{ background: 'var(--factor-down)' }} /> Decreases risk</span>
      </div>
    </div>
  )
}
