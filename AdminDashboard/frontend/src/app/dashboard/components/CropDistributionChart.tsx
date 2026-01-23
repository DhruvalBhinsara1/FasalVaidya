'use client';

import {
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';

interface CropDistributionChartProps {
  data: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
}

const COLORS = ['#4C763B', '#B0CE88', '#043915', '#FFFD8F', '#6ba354', '#8bc34a'];

export function CropDistributionChart({ data }: CropDistributionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-neutral-light">
        No scan data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#1a2e1a',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
          }}
          itemStyle={{
            color: '#ffffff',
          }}
          labelStyle={{
            color: '#ffffff',
          }}
          formatter={(value: number, name: string) => [`${value} scans`, name]}
        />
        <Legend 
          layout="vertical" 
          align="right" 
          verticalAlign="middle"
          formatter={(value) => (
            <span className="text-sm text-neutral">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
