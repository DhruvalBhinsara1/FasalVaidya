'use client';

import {
    Area,
    Bar,
    CartesianGrid,
    ComposedChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

interface ScanActivityChartProps {
  data: Array<{
    day: string;
    scans: number;
  }>;
}

export function ScanActivityChart({ data }: ScanActivityChartProps) {
  // Create smooth wavy data for the area overlay
  const dataWithWave = data.map((item, index) => ({
    ...item,
    wave: item.scans > 0 ? item.scans * 0.3 : 0, // 30% of actual value for subtle wave
  }));

  return (
    <div className="relative">
      <style jsx>{`
        @keyframes wave-flow {
          0% { opacity: 0.3; }
          50% { opacity: 0.6; }
          100% { opacity: 0.3; }
        }
        .wave-animation {
          animation: wave-flow 3s ease-in-out infinite;
        }
      `}</style>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={dataWithWave} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#B0CE88" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#B0CE88" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis 
            dataKey="day" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a2e1a',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Bar 
            dataKey="scans" 
            fill="#4C763B" 
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          <Area
            type="monotone"
            dataKey="wave"
            stroke="#8bc34a"
            strokeWidth={2}
            fill="url(#waveGradient)"
            className="wave-animation"
            isAnimationActive={true}
            animationDuration={2000}
            animationEasing="ease-in-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
