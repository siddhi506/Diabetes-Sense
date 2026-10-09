import { Bar, BarChart, Cell, ResponsiveContainer, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import './FactorChart.css'

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const row = payload[0].payload
  return (
    <div className="factor-tooltip">
      <div className="factor-tooltip__title">{row.display_name}</div>
      <div className="factor-tooltip__value">Observed Patient Value: {row.value}</div>
      <div className="factor-tooltip__impact">
        {row.shap_value > 0 ? '▲ Increases predicted risk' : '▼ Decreases predicted risk'} · SHAP:{' '}
        {row.shap_value > 0 ? `+${row.shap_value.toFixed(4)}` : row.shap_value.toFixed(4)}
      </div>
    </div>
  )
}

export default function FactorChart({ factors = [] }) {
  const data = [...factors].sort((a, b) => a.shap_value - b.shap_value)
  const chartHeight = Math.max(260, data.length * 38)

  return (
    <div className="factor-chart">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={{ top: 6, right: 24, left: 4, bottom: 6 }}>
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="display_name"
            width={140}
            tick={{ fontSize: 11.5, fill: '#1e293b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
          />
          <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="3 3" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(46, 111, 107, 0.08)' }} />
          <Bar dataKey="shap_value" radius={4} barSize={16}>
            {data.map((entry) => (
              <Cell
                key={entry.feature}
                fill={entry.shap_value > 0 ? 'var(--factor-up, #e11d48)' : 'var(--factor-down, #16a34a)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="factor-chart__legend">
        <span>
          <i style={{ background: 'var(--factor-up, #e11d48)' }} /> Increases Predicted Risk (Positive SHAP)
        </span>
        <span>
          <i style={{ background: 'var(--factor-down, #16a34a)' }} /> Decreases Predicted Risk (Protective SHAP)
        </span>
      </div>
    </div>
  )
}
