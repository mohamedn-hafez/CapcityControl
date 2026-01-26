
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Site, SimulationResult } from '../types';

interface Props {
  sites: Site[];
  result: SimulationResult;
}

const CapacityChart: React.FC<Props> = ({ sites, result }) => {
  const data = sites.map(site => {
    const impact = result.siteImpacts.find(i => i.siteId === site.id);
    const finalOccupancy = impact ? impact.newOccupancy : (site.status === 'CLOSING' ? 0 : site.currentOccupancy);
    const utilization = impact ? impact.newUtilization : (site.status === 'CLOSING' ? 0 : (site.currentOccupancy / site.totalCapacity) * 100);

    return {
      name: site.name,
      Capacity: site.totalCapacity,
      Occupancy: finalOccupancy,
      Utilization: utilization,
      status: site.status
    };
  });

  return (
    <div className="h-80 w-full bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <h3 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">Site Utilization Post-Migration</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" fontSize={12} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis fontSize={12} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip 
            cursor={{ fill: '#f1f5f9' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend />
          <Bar dataKey="Occupancy" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.Utilization > 95 ? '#ef4444' : entry.Utilization > 85 ? '#f59e0b' : '#3b82f6'} 
              />
            ))}
          </Bar>
          <Bar dataKey="Capacity" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CapacityChart;
