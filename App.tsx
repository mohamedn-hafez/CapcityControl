
import React, { useState, useMemo } from 'react';
import { Site, SiteStatus, SimulationResult } from './types';
import { INITIAL_SITES } from './constants';
import { getAISummary } from './services/geminiService';
import CapacityChart from './components/CapacityChart';
import { 
  Users, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRightLeft, 
  Plus, 
  Trash2,
  Sparkles,
  LayoutDashboard,
  Settings2,
  Copy,
  FileJson
} from 'lucide-react';

const App: React.FC = () => {
  const [sites, setSites] = useState<Site[]>(INITIAL_SITES);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'json'>('summary');

  // Core Logic: Calculate Capacity and Migrations
  const simulation = useMemo((): SimulationResult => {
    const activeSites = sites.filter(s => s.status === SiteStatus.ACTIVE || s.status === SiteStatus.EXPANDING);
    const closingSites = sites.filter(s => s.status === SiteStatus.CLOSING);

    const displacedStaff = closingSites.reduce((acc, s) => acc + s.currentOccupancy, 0);
    
    // Calculate Net Vacancy for each active site
    const siteVacancies = activeSites.map(s => {
      const bufferSeats = Math.ceil(s.totalCapacity * (s.maintenanceBufferPercent / 100));
      const netVacancy = Math.max(0, s.totalCapacity - s.currentOccupancy - bufferSeats);
      return { siteId: s.id, netVacancy };
    });

    const totalAvailableVacancy = siteVacancies.reduce((acc, v) => acc + v.netVacancy, 0);
    
    let remainingDisplaced = displacedStaff;
    const siteImpacts: {
      siteId: string;
      allocatedStaff: number;
      newOccupancy: number;
      newUtilization: number;
      riskStatus: 'SUCCESS' | 'RISK' | 'OVERFLOW';
    }[] = [];

    activeSites.forEach(site => {
      const vacancyData = siteVacancies.find(v => v.siteId === site.id);
      const vacancy = vacancyData?.netVacancy || 0;
      
      const allocated = Math.min(remainingDisplaced, vacancy);
      remainingDisplaced -= allocated;

      const newOccupancy = site.currentOccupancy + allocated;
      const utilization = site.totalCapacity > 0 ? (newOccupancy / site.totalCapacity) * 100 : 0;
      
      let riskStatus: 'SUCCESS' | 'RISK' | 'OVERFLOW' = 'SUCCESS';
      if (utilization > 100) riskStatus = 'OVERFLOW';
      else if (utilization > 95) riskStatus = 'RISK';

      siteImpacts.push({
        siteId: site.id,
        allocatedStaff: allocated,
        newOccupancy,
        newUtilization: utilization,
        riskStatus
      });
    });

    const unseatedStaff = remainingDisplaced;
    let overallStatus: 'SUCCESS' | 'RISK' | 'OVERFLOW' = 'SUCCESS';
    if (unseatedStaff > 0) overallStatus = 'OVERFLOW';
    else if (siteImpacts.some(i => i.riskStatus === 'RISK')) overallStatus = 'RISK';

    return {
      displacedStaff,
      remainingCapacity: totalAvailableVacancy,
      unseatedStaff,
      siteImpacts,
      overallStatus
    };
  }, [sites]);

  const toggleSiteStatus = (id: string) => {
    setSites(prev => prev.map(s => {
      if (s.id === id) {
        const newStatus = s.status === SiteStatus.ACTIVE ? SiteStatus.CLOSING : SiteStatus.ACTIVE;
        return { ...s, status: newStatus };
      }
      return s;
    }));
  };

  const updateSiteValue = (id: string, field: keyof Site, value: number | string) => {
    setSites(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addSite = () => {
    const newSite: Site = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Facility ' + (sites.length + 1),
      totalCapacity: 200,
      currentOccupancy: 0,
      status: SiteStatus.ACTIVE,
      maintenanceBufferPercent: 5
    };
    setSites([...sites, newSite]);
  };

  const removeSite = (id: string) => {
    setSites(sites.filter(s => s.id !== id));
  };

  const handleGenerateSummary = async () => {
    setLoadingAI(true);
    setActiveTab('summary');
    const summary = await getAISummary(sites, simulation);
    setAiSummary(summary);
    setLoadingAI(false);
  };

  const exportDataJson = () => {
    const exportObj = {
      timestamp: new Date().toISOString(),
      summary: simulation,
      sites: sites.map(s => ({
        name: s.name,
        total_seats: s.totalCapacity,
        occupied: s.currentOccupancy,
        buffer: `${s.maintenanceBufferPercent}%`,
        status: s.status,
        impact: simulation.siteImpacts.find(i => i.siteId === s.id)
      }))
    };
    navigator.clipboard.writeText(JSON.stringify(exportObj, null, 2));
    alert('JSON data copied to clipboard');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <aside className="w-full lg:w-64 bg-slate-900 text-slate-300 p-6 flex flex-col border-r border-slate-800">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <LayoutDashboard size={24} />
          </div>
          <h1 className="text-white font-bold text-xl tracking-tight leading-none">Capacity<br/><span className="text-indigo-400">Planner</span></h1>
        </div>
        <nav className="flex-1 space-y-2">
          <button className="flex items-center gap-3 w-full p-3 rounded-lg bg-slate-800 text-white font-medium transition-colors">
            <ArrowRightLeft size={18} /> Simulation Hub
          </button>
          <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-slate-800 transition-colors">
            <Users size={18} /> Staff Directory
          </button>
          <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-slate-800 transition-colors">
            <Building2 size={18} /> Global Assets
          </button>
          <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-slate-800 transition-colors">
            <Settings2 size={18} /> Parameters
          </button>
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-800 text-xs">
          <p className="opacity-50">Planning Engine v2.0</p>
          <p className="mt-1">Cloud Deployment Sync: <span className="text-green-400">Online</span></p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-slate-50 p-6 lg:p-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Scenario Simulation</h2>
            <p className="text-slate-500 font-medium">Modeling: <span className="text-indigo-600">Close Site Bravo Case Study</span></p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={addSite} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-all shadow-sm">
              <Plus size={18} /> Add Site
            </button>
            <button onClick={exportDataJson} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-all shadow-sm">
              <Copy size={18} /> Export JSON
            </button>
            <button onClick={handleGenerateSummary} disabled={loadingAI} className={`flex items-center gap-2 px-4 py-2 ${loadingAI ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg font-medium transition-all shadow-md shadow-indigo-100`}>
              <Sparkles size={18} /> {loadingAI ? 'Analyzing...' : 'Generate AI Report'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Building2 size={20} /></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Capacity</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{sites.reduce((acc, s) => acc + s.totalCapacity, 0)}</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Users size={20} /></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Staff</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{sites.reduce((acc, s) => acc + s.currentOccupancy, 0)}</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><ArrowRightLeft size={20} /></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Impacted Staff</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{simulation.displacedStaff}</div>
          </div>
          <div className={`p-6 rounded-2xl shadow-sm border ${simulation.overallStatus === 'OVERFLOW' ? 'bg-red-50 border-red-100' : simulation.overallStatus === 'RISK' ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg ${simulation.overallStatus === 'OVERFLOW' ? 'bg-red-100 text-red-600' : simulation.overallStatus === 'RISK' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                {simulation.overallStatus === 'OVERFLOW' ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">Final Assessment</span>
            </div>
            <div className="text-3xl font-bold">{simulation.overallStatus}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">Facilities Configuration</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="px-6 py-4">Site Name</th>
                      <th className="px-6 py-4">Total Seats</th>
                      <th className="px-6 py-4">Occupied</th>
                      <th className="px-6 py-4">Buffer %</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sites.map(site => (
                      <tr key={site.id} className={`group hover:bg-slate-50 transition-colors ${site.status === SiteStatus.CLOSING ? 'bg-red-50/50' : ''}`}>
                        <td className="px-6 py-4">
                          <input value={site.name} onChange={(e) => updateSiteValue(site.id, 'name', e.target.value)} className="bg-transparent border-none focus:ring-2 focus:ring-indigo-100 rounded px-1 font-medium text-slate-900 w-full" />
                        </td>
                        <td className="px-6 py-4">
                          <input type="number" value={site.totalCapacity} onChange={(e) => updateSiteValue(site.id, 'totalCapacity', parseInt(e.target.value) || 0)} className="bg-transparent border-none focus:ring-2 focus:ring-indigo-100 rounded px-1 text-slate-600 w-20" />
                        </td>
                        <td className="px-6 py-4">
                          <input type="number" value={site.currentOccupancy} onChange={(e) => updateSiteValue(site.id, 'currentOccupancy', parseInt(e.target.value) || 0)} className="bg-transparent border-none focus:ring-2 focus:ring-indigo-100 rounded px-1 text-slate-600 w-20" />
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          <input type="number" value={site.maintenanceBufferPercent} onChange={(e) => updateSiteValue(site.id, 'maintenanceBufferPercent', parseInt(e.target.value) || 0)} className="bg-transparent border-none focus:ring-2 focus:ring-indigo-100 rounded px-1 text-slate-600 w-12" />%
                        </td>
                        <td className="px-6 py-4">
                          <button onClick={() => toggleSiteStatus(site.id)} className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest transition-all ${site.status === SiteStatus.ACTIVE ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white'}`}>
                            {site.status === SiteStatus.ACTIVE ? 'ACTIVE' : 'CLOSING'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => removeSite(site.id)} className="text-slate-300 hover:text-red-600 p-1">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <CapacityChart sites={sites} result={simulation} />
          </div>

          <div className="space-y-6">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
              <div className="flex border-b border-slate-100">
                <button onClick={() => setActiveTab('summary')} className={`flex-1 py-4 text-sm font-bold ${activeTab === 'summary' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Summary</button>
                <button onClick={() => setActiveTab('json')} className={`flex-1 py-4 text-sm font-bold ${activeTab === 'json' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>JSON</button>
              </div>
              <div className="flex-1 overflow-auto p-6">
                {activeTab === 'summary' ? (
                  aiSummary ? <div className="prose prose-sm text-slate-600 whitespace-pre-wrap">{aiSummary}</div> : <p className="text-slate-400 text-center py-20 italic">Run AI analysis for insights.</p>
                ) : (
                  <pre className="text-[10px] text-slate-500 bg-slate-50 p-4 rounded-lg h-full overflow-auto">
                    {JSON.stringify({ simulation }, null, 2)}
                  </pre>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
