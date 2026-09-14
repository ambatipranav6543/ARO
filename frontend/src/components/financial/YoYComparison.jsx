import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export function YoYComparison({ data = [], priorLabel = 'Prior Period', currentLabel = 'Current Period', unit = '' }) {
  return (
    <div style={{ width: '100%', height: '360px', paddingTop: '10px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          barSize={24}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="metric"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
            tickFormatter={(val) => unit ? `${val} ${unit}` : `${val}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              fontSize: '12px'
            }}
            formatter={(value, name) => [unit ? `${value} ${unit}` : `${value}`, name === 'previous' ? priorLabel : currentLabel]}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }}
            formatter={(val) => (val === 'previous' ? priorLabel : currentLabel)}
          />
          <Bar dataKey="previous" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="current" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
