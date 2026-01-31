import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Building2, MapPin, Layers, Grid3X3, Briefcase, Users, Save, AlertTriangle, X, Database, Search, ArrowUpDown, ArrowUp, ArrowDown, UserCircle, BarChart3, ClipboardList } from 'lucide-react';

interface AdminPanelProps {
  onBack: () => void;
}

type TabType = 'regions' | 'sites' | 'floors' | 'zones' | 'clients' | 'projects' | 'queues' | 'zone-capacity' | 'project-assignments';

interface Region {
  id: string;
  code: string;
  name: string;
  country: string;
}

interface Site {
  id: string;
  code: string;
  name: string;
  regionId: string;
  region?: Region;
  status: string;
  openingDate?: string;
  closingDate?: string;
}

interface Floor {
  id: string;
  code: string;
  name: string;
  siteId: string;
}

interface Zone {
  id: string;
  code: string;
  name: string;
  siteFloorZoneCode: string;
  floorId: string;
}

interface Client {
  id: string;
  code: string;
  name?: string;
}

interface Project {
  id: string;
  code: string;
  name?: string;
  clientId: string;
  client?: Client;
}

interface Queue {
  id: string;
  code: string;
  name: string;
}

interface ZoneCapacity {
  id: string;
  zoneId: string;
  zone?: Zone & { floor?: Floor & { site?: Site } };
  yearMonth: string;
  capacity: number;
}

interface ProjectAssignment {
  id: string;
  zoneId: string;
  zone?: Zone & { floor?: Floor & { site?: Site } };
  projectId: string;
  project?: Project;
  queueId: string;
  queue?: Queue;
  yearMonth: string;
  seats: number;
}

const API_BASE = '/api/admin';

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('regions');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [regions, setRegions] = useState<Region[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [zoneCapacities, setZoneCapacities] = useState<ZoneCapacity[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([]);

  // Month filter for fact tables
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Edit states
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Search and sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    // Fact tables need yearMonth filter
    if (['zone-capacity', 'project-assignments'].includes(activeTab)) {
      loadData(activeTab, selectedMonth);
    } else {
      loadData(activeTab);
    }
    // Always load related data (needed for dropdowns)
    if (activeTab !== 'regions') {
      loadRelatedData();
    }
  }, [activeTab, selectedMonth]);

  const loadRelatedData = async () => {
    try {
      // Load regions for sites/other tabs
      const regionsRes = await fetch(`${API_BASE}/regions`);
      const regionsData = await regionsRes.json();
      if (regionsData.success) setRegions(regionsData.data);

      // Load sites for floors/zones tabs
      if (['floors', 'zones'].includes(activeTab)) {
        const sitesRes = await fetch(`${API_BASE}/sites`);
        const sitesData = await sitesRes.json();
        if (sitesData.success) setSites(sitesData.data);
      }

      // Load floors for zones tab
      if (activeTab === 'zones') {
        const floorsRes = await fetch(`${API_BASE}/floors`);
        const floorsData = await floorsRes.json();
        if (floorsData.success) setFloors(floorsData.data);
      }

      // Load clients for projects tab
      if (activeTab === 'projects') {
        const clientsRes = await fetch(`${API_BASE}/clients`);
        const clientsData = await clientsRes.json();
        if (clientsData.success) setClients(clientsData.data);
      }

      // Load zones for zone-capacity and project-assignments tabs
      if (['zone-capacity', 'project-assignments'].includes(activeTab)) {
        const zonesRes = await fetch(`${API_BASE}/zones`);
        const zonesData = await zonesRes.json();
        if (zonesData.success) setZones(zonesData.data);
      }

      // Load projects and queues for project-assignments tab
      if (activeTab === 'project-assignments') {
        const projectsRes = await fetch(`${API_BASE}/projects`);
        const projectsData = await projectsRes.json();
        if (projectsData.success) setProjects(projectsData.data);

        const queuesRes = await fetch(`${API_BASE}/queues`);
        const queuesData = await queuesRes.json();
        if (queuesData.success) setQueues(queuesData.data);
      }
    } catch (err) {
      console.error('Failed to load related data:', err);
    }
  };

  const loadData = async (tab: TabType, yearMonth?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Fact tables use yearMonth filter
      const query = ['zone-capacity', 'project-assignments'].includes(tab) && yearMonth
        ? `?yearMonth=${yearMonth}`
        : '';
      const response = await fetch(`${API_BASE}/${tab}${query}`);
      const data = await response.json();
      if (data.success) {
        switch (tab) {
          case 'regions': setRegions(data.data); break;
          case 'sites': setSites(data.data); break;
          case 'floors': setFloors(data.data); break;
          case 'zones': setZones(data.data); break;
          case 'clients': setClients(data.data); break;
          case 'projects': setProjects(data.data); break;
          case 'queues': setQueues(data.data); break;
          case 'zone-capacity': setZoneCapacities(data.data); break;
          case 'project-assignments': setProjectAssignments(data.data); break;
        }
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (tab: TabType, id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(`${API_BASE}/${tab}/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        loadData(tab);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSave = async (tab: TabType, item: any) => {
    try {
      const isNew = !item.id || item.id.startsWith('new_');
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? `${API_BASE}/${tab}` : `${API_BASE}/${tab}/${item.id}`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      const data = await response.json();
      if (data.success) {
        setEditingItem(null);
        setShowAddForm(false);
        loadData(tab);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'regions', label: 'Regions', icon: <MapPin className="w-4 h-4" /> },
    { id: 'sites', label: 'Sites', icon: <Building2 className="w-4 h-4" /> },
    { id: 'floors', label: 'Floors', icon: <Layers className="w-4 h-4" /> },
    { id: 'zones', label: 'Zones', icon: <Grid3X3 className="w-4 h-4" /> },
    { id: 'clients', label: 'Clients', icon: <UserCircle className="w-4 h-4" /> },
    { id: 'projects', label: 'Projects', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'queues', label: 'Business Units', icon: <Users className="w-4 h-4" /> },
    { id: 'zone-capacity', label: 'Zone Capacity', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'project-assignments', label: 'Assignments', icon: <ClipboardList className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
                <p className="text-sm text-gray-500">Database Management</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setEditingItem(null);
                setShowAddForm(false);
                setSearchQuery('');
                setSortConfig(null);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow">
          {error && (
            <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Toolbar: Search + Add */}
          <div className="p-4 border-b flex items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${tabs.find((t) => t.id === activeTab)?.label}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Add Button */}
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingItem({ id: `new_${Date.now()}` });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add New {tabs.find((t) => t.id === activeTab)?.label.slice(0, -1)}
            </button>
          </div>

          {/* Table Content */}
          <div className="p-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {activeTab === 'regions' && (
                  <RegionsTable
                    regions={regions}
                    editingItem={editingItem}
                    showAddForm={showAddForm}
                    onEdit={setEditingItem}
                    onDelete={(id) => handleDelete('regions', id)}
                    onSave={(item) => handleSave('regions', item)}
                    onCancel={() => { setEditingItem(null); setShowAddForm(false); }}
                    searchQuery={searchQuery}
                    sortConfig={sortConfig}
                    onSort={setSortConfig}
                  />
                )}
                {activeTab === 'sites' && (
                  <SitesTable
                    sites={sites}
                    regions={regions}
                    editingItem={editingItem}
                    showAddForm={showAddForm}
                    onEdit={setEditingItem}
                    onDelete={(id) => handleDelete('sites', id)}
                    onSave={(item) => handleSave('sites', item)}
                    onCancel={() => { setEditingItem(null); setShowAddForm(false); }}
                    searchQuery={searchQuery}
                    sortConfig={sortConfig}
                    onSort={setSortConfig}
                  />
                )}
                {activeTab === 'floors' && (
                  <FloorsTable
                    floors={floors}
                    sites={sites}
                    editingItem={editingItem}
                    showAddForm={showAddForm}
                    onEdit={setEditingItem}
                    onDelete={(id) => handleDelete('floors', id)}
                    onSave={(item) => handleSave('floors', item)}
                    onCancel={() => { setEditingItem(null); setShowAddForm(false); }}
                    searchQuery={searchQuery}
                    sortConfig={sortConfig}
                    onSort={setSortConfig}
                  />
                )}
                {activeTab === 'zones' && (
                  <ZonesTable
                    zones={zones}
                    floors={floors}
                    sites={sites}
                    editingItem={editingItem}
                    showAddForm={showAddForm}
                    onEdit={setEditingItem}
                    onDelete={(id) => handleDelete('zones', id)}
                    onSave={(item) => handleSave('zones', item)}
                    onCancel={() => { setEditingItem(null); setShowAddForm(false); }}
                    searchQuery={searchQuery}
                    sortConfig={sortConfig}
                    onSort={setSortConfig}
                  />
                )}
                {activeTab === 'clients' && (
                  <ClientsTable
                    clients={clients}
                    editingItem={editingItem}
                    showAddForm={showAddForm}
                    onEdit={setEditingItem}
                    onDelete={(id) => handleDelete('clients', id)}
                    onSave={(item) => handleSave('clients', item)}
                    onCancel={() => { setEditingItem(null); setShowAddForm(false); }}
                    searchQuery={searchQuery}
                    sortConfig={sortConfig}
                    onSort={setSortConfig}
                  />
                )}
                {activeTab === 'projects' && (
                  <ProjectsTable
                    projects={projects}
                    clients={clients}
                    editingItem={editingItem}
                    showAddForm={showAddForm}
                    onEdit={setEditingItem}
                    onDelete={(id) => handleDelete('projects', id)}
                    onSave={(item) => handleSave('projects', item)}
                    onCancel={() => { setEditingItem(null); setShowAddForm(false); }}
                    searchQuery={searchQuery}
                    sortConfig={sortConfig}
                    onSort={setSortConfig}
                  />
                )}
                {activeTab === 'queues' && (
                  <QueuesTable
                    queues={queues}
                    editingItem={editingItem}
                    showAddForm={showAddForm}
                    onEdit={setEditingItem}
                    onDelete={(id) => handleDelete('queues', id)}
                    onSave={(item) => handleSave('queues', item)}
                    onCancel={() => { setEditingItem(null); setShowAddForm(false); }}
                    searchQuery={searchQuery}
                    sortConfig={sortConfig}
                    onSort={setSortConfig}
                  />
                )}
                {activeTab === 'zone-capacity' && (
                  <ZoneCapacityTable
                    zoneCapacities={zoneCapacities}
                    zones={zones}
                    editingItem={editingItem}
                    showAddForm={showAddForm}
                    onEdit={setEditingItem}
                    onDelete={(id) => handleDelete('zone-capacity', id)}
                    onSave={(item) => handleSave('zone-capacity', item)}
                    onCancel={() => { setEditingItem(null); setShowAddForm(false); }}
                    searchQuery={searchQuery}
                    sortConfig={sortConfig}
                    onSort={setSortConfig}
                    selectedMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                  />
                )}
                {activeTab === 'project-assignments' && (
                  <ProjectAssignmentsTable
                    projectAssignments={projectAssignments}
                    zones={zones}
                    projects={projects}
                    queues={queues}
                    editingItem={editingItem}
                    showAddForm={showAddForm}
                    onEdit={setEditingItem}
                    onDelete={(id) => handleDelete('project-assignments', id)}
                    onSave={(item) => handleSave('project-assignments', item)}
                    onCancel={() => { setEditingItem(null); setShowAddForm(false); }}
                    searchQuery={searchQuery}
                    sortConfig={sortConfig}
                    onSort={setSortConfig}
                    selectedMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ TABLE COMPONENTS ============

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

interface TableProps<T> {
  editingItem: T | null;
  showAddForm: boolean;
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
  onSave: (item: T) => void;
  onCancel: () => void;
  searchQuery: string;
  sortConfig: SortConfig;
  onSort: (config: SortConfig) => void;
}

// Sortable header component
function SortableHeader({ label, sortKey, sortConfig, onSort }: {
  label: string;
  sortKey: string;
  sortConfig: SortConfig;
  onSort: (config: SortConfig) => void;
}) {
  const isActive = sortConfig?.key === sortKey;
  const direction = isActive ? sortConfig.direction : null;

  const handleClick = () => {
    if (!isActive) {
      onSort({ key: sortKey, direction: 'asc' });
    } else if (direction === 'asc') {
      onSort({ key: sortKey, direction: 'desc' });
    } else {
      onSort(null);
    }
  };

  return (
    <th
      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 select-none"
      onClick={handleClick}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 text-gray-300" />
        )}
      </div>
    </th>
  );
}

// Helper to sort and filter data
function useFilteredSortedData<T extends Record<string, any>>(
  data: T[],
  searchQuery: string,
  sortConfig: SortConfig,
  searchFields: (keyof T)[]
): T[] {
  return useMemo(() => {
    let result = [...data];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(query);
        })
      );
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchQuery, sortConfig, searchFields]);
}

function RegionsTable({ regions, editingItem, showAddForm, onEdit, onDelete, onSave, onCancel, searchQuery, sortConfig, onSort }: TableProps<Region> & { regions: Region[] }) {
  const [form, setForm] = useState<Partial<Region>>({});
  const filteredRegions = useFilteredSortedData(regions, searchQuery, sortConfig, ['code', 'name', 'country']);

  useEffect(() => {
    if (editingItem) setForm(editingItem);
  }, [editingItem]);

  const isEditing = (id: string) => editingItem?.id === id;

  return (
    <>
      {searchQuery && <div className="px-4 py-2 text-sm text-gray-500">Found {filteredRegions.length} of {regions.length} regions</div>}
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <SortableHeader label="Code" sortKey="code" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Name" sortKey="name" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Country" sortKey="country" sortConfig={sortConfig} onSort={onSort} />
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {showAddForm && editingItem?.id?.startsWith('new_') && (
            <tr className="bg-blue-50">
              <td className="px-4 py-2">
                <input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-2 py-1 border rounded" placeholder="REGION_CODE" />
              </td>
              <td className="px-4 py-2">
                <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-2 py-1 border rounded" placeholder="Region Name" />
              </td>
              <td className="px-4 py-2">
                <input value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full px-2 py-1 border rounded" placeholder="Country" />
              </td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => onSave(form as Region)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                <button onClick={onCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded ml-1"><X className="w-4 h-4" /></button>
              </td>
            </tr>
          )}
          {filteredRegions.map((region) => (
            <tr key={region.id} className={isEditing(region.id) ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
              {isEditing(region.id) ? (
                <>
                  <td className="px-4 py-2"><input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-2 py-1 border rounded" /></td>
                  <td className="px-4 py-2"><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-2 py-1 border rounded" /></td>
                  <td className="px-4 py-2"><input value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full px-2 py-1 border rounded" /></td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onSave(form as Region)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                    <button onClick={onCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded ml-1"><X className="w-4 h-4" /></button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-2 font-mono">{region.code}</td>
                  <td className="px-4 py-2">{region.name}</td>
                  <td className="px-4 py-2">{region.country}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onEdit(region)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(region.id)} className="p-1 text-red-600 hover:bg-red-50 rounded ml-1"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function SitesTable({ sites, regions, editingItem, showAddForm, onEdit, onDelete, onSave, onCancel, searchQuery, sortConfig, onSort }: TableProps<Site> & { sites: Site[]; regions: Region[] }) {
  const [form, setForm] = useState<Partial<Site>>({});
  // Add region name to sites for search
  const sitesWithRegion = useMemo(() => sites.map((s) => ({ ...s, regionName: s.region?.name || '' })), [sites]);
  const filteredSites = useFilteredSortedData(sitesWithRegion, searchQuery, sortConfig, ['code', 'name', 'regionName', 'status']);

  useEffect(() => {
    if (editingItem) setForm(editingItem);
  }, [editingItem]);

  const isEditing = (id: string) => editingItem?.id === id;

  return (
    <>
      {searchQuery && <div className="px-4 py-2 text-sm text-gray-500">Found {filteredSites.length} of {sites.length} sites</div>}
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <SortableHeader label="Code" sortKey="code" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Name" sortKey="name" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Region" sortKey="regionName" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={onSort} />
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {showAddForm && editingItem?.id?.startsWith('new_') && (
            <tr className="bg-blue-50">
              <td className="px-4 py-2"><input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-2 py-1 border rounded" placeholder="S1" /></td>
              <td className="px-4 py-2"><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-2 py-1 border rounded" placeholder="Site Name" /></td>
              <td className="px-4 py-2">
                <select value={form.regionId || ''} onChange={(e) => setForm({ ...form, regionId: e.target.value })} className="w-full px-2 py-1 border rounded">
                  <option value="">Select Region</option>
                  {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </td>
              <td className="px-4 py-2">
                <select value={form.status || 'ACTIVE'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-2 py-1 border rounded">
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PLANNED">PLANNED</option>
                  <option value="CLOSING">CLOSING</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => onSave(form as Site)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                <button onClick={onCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded ml-1"><X className="w-4 h-4" /></button>
              </td>
            </tr>
          )}
          {filteredSites.map((site) => (
            <tr key={site.id} className={isEditing(site.id) ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
              {isEditing(site.id) ? (
                <>
                  <td className="px-4 py-2"><input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-2 py-1 border rounded" /></td>
                  <td className="px-4 py-2"><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-2 py-1 border rounded" /></td>
                  <td className="px-4 py-2">
                    <select value={form.regionId || ''} onChange={(e) => setForm({ ...form, regionId: e.target.value })} className="w-full px-2 py-1 border rounded">
                      {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select value={form.status || ''} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-2 py-1 border rounded">
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="PLANNED">PLANNED</option>
                      <option value="CLOSING">CLOSING</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onSave(form as Site)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                    <button onClick={onCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded ml-1"><X className="w-4 h-4" /></button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-2 font-mono">{site.code}</td>
                  <td className="px-4 py-2">{site.name}</td>
                  <td className="px-4 py-2">{site.region?.name || site.regionId}</td>
                  <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs ${site.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{site.status}</span></td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onEdit(site)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(site.id)} className="p-1 text-red-600 hover:bg-red-50 rounded ml-1"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function FloorsTable({ floors, sites, editingItem, showAddForm, onEdit, onDelete, onSave, onCancel, searchQuery, sortConfig, onSort }: TableProps<Floor> & { floors: Floor[]; sites: Site[] }) {
  const [form, setForm] = useState<Partial<Floor>>({});
  const floorsWithSite = useMemo(() => floors.map((f) => ({ ...f, siteName: sites.find((s) => s.id === f.siteId)?.name || '' })), [floors, sites]);
  const filteredFloors = useFilteredSortedData(floorsWithSite, searchQuery, sortConfig, ['code', 'name', 'siteName']);

  useEffect(() => {
    if (editingItem) setForm(editingItem);
  }, [editingItem]);

  const isEditing = (id: string) => editingItem?.id === id;

  return (
    <>
      {searchQuery && <div className="px-4 py-2 text-sm text-gray-500">Found {filteredFloors.length} of {floors.length} floors</div>}
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <SortableHeader label="Code" sortKey="code" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Name" sortKey="name" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Site" sortKey="siteName" sortConfig={sortConfig} onSort={onSort} />
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {showAddForm && editingItem?.id?.startsWith('new_') && (
            <tr className="bg-blue-50">
              <td className="px-4 py-2"><input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-2 py-1 border rounded" placeholder="F01" /></td>
              <td className="px-4 py-2"><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-2 py-1 border rounded" placeholder="Floor Name" /></td>
              <td className="px-4 py-2">
                <select value={form.siteId || ''} onChange={(e) => setForm({ ...form, siteId: e.target.value })} className="w-full px-2 py-1 border rounded">
                  <option value="">Select Site</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => onSave(form as Floor)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                <button onClick={onCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded ml-1"><X className="w-4 h-4" /></button>
              </td>
            </tr>
          )}
          {filteredFloors.map((floor) => (
            <tr key={floor.id} className={isEditing(floor.id) ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
              {isEditing(floor.id) ? (
                <>
                  <td className="px-4 py-2"><input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-2 py-1 border rounded" /></td>
                  <td className="px-4 py-2"><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-2 py-1 border rounded" /></td>
                  <td className="px-4 py-2">
                    <select value={form.siteId || ''} onChange={(e) => setForm({ ...form, siteId: e.target.value })} className="w-full px-2 py-1 border rounded">
                      {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onSave(form as Floor)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                    <button onClick={onCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded ml-1"><X className="w-4 h-4" /></button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-2 font-mono">{floor.code}</td>
                  <td className="px-4 py-2">{floor.name}</td>
                  <td className="px-4 py-2">{floor.siteName}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onEdit(floor)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(floor.id)} className="p-1 text-red-600 hover:bg-red-50 rounded ml-1"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ZonesTable({ zones, floors, sites, editingItem, showAddForm, onEdit, onDelete, onSave, onCancel, searchQuery, sortConfig, onSort }: TableProps<Zone> & { zones: Zone[]; floors: Floor[]; sites: Site[] }) {
  const [form, setForm] = useState<Partial<Zone>>({});
  const [selectedSiteId, setSelectedSiteId] = useState('');

  const zonesWithFloor = useMemo(() => zones.map((z) => {
    const floor = floors.find((f) => f.id === z.floorId);
    const site = floor ? sites.find((s) => s.id === floor.siteId) : null;
    return { ...z, floorName: floor?.name || '', siteName: site?.name || '' };
  }), [zones, floors, sites]);
  const filteredZones = useFilteredSortedData(zonesWithFloor, searchQuery, sortConfig, ['code', 'name', 'siteFloorZoneCode', 'floorName', 'siteName']);

  useEffect(() => {
    if (editingItem) {
      setForm(editingItem);
      const floor = floors.find((f) => f.id === editingItem.floorId);
      if (floor) setSelectedSiteId(floor.siteId);
    }
  }, [editingItem]);

  const isEditing = (id: string) => editingItem?.id === id;
  const siteFilteredFloors = floors.filter((f) => f.siteId === selectedSiteId);

  return (
    <>
      {searchQuery && <div className="px-4 py-2 text-sm text-gray-500">Found {filteredZones.length} of {zones.length} zones</div>}
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <SortableHeader label="Code" sortKey="code" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Name" sortKey="name" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Site/Floor Code" sortKey="siteFloorZoneCode" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Floor" sortKey="floorName" sortConfig={sortConfig} onSort={onSort} />
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {showAddForm && editingItem?.id?.startsWith('new_') && (
            <tr className="bg-blue-50">
              <td className="px-4 py-2"><input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-2 py-1 border rounded" placeholder="Z01" /></td>
              <td className="px-4 py-2"><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-2 py-1 border rounded" placeholder="A" /></td>
              <td className="px-4 py-2"><input value={form.siteFloorZoneCode || ''} onChange={(e) => setForm({ ...form, siteFloorZoneCode: e.target.value })} className="w-full px-2 py-1 border rounded" placeholder="S1F01Z01" /></td>
              <td className="px-4 py-2">
                <select value={selectedSiteId} onChange={(e) => setSelectedSiteId(e.target.value)} className="w-full px-2 py-1 border rounded mb-1">
                  <option value="">Site...</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={form.floorId || ''} onChange={(e) => setForm({ ...form, floorId: e.target.value })} className="w-full px-2 py-1 border rounded">
                  <option value="">Floor...</option>
                  {siteFilteredFloors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => onSave(form as Zone)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                <button onClick={onCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded ml-1"><X className="w-4 h-4" /></button>
              </td>
            </tr>
          )}
          {filteredZones.map((zone) => (
            <tr key={zone.id} className={isEditing(zone.id) ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
              {isEditing(zone.id) ? (
                <>
                  <td className="px-4 py-2"><input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-2 py-1 border rounded" /></td>
                  <td className="px-4 py-2"><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-2 py-1 border rounded" /></td>
                  <td className="px-4 py-2"><input value={form.siteFloorZoneCode || ''} onChange={(e) => setForm({ ...form, siteFloorZoneCode: e.target.value })} className="w-full px-2 py-1 border rounded" /></td>
                  <td className="px-4 py-2">
                    <select value={form.floorId || ''} onChange={(e) => setForm({ ...form, floorId: e.target.value })} className="w-full px-2 py-1 border rounded">
                      {floors.map((f) => <option key={f.id} value={f.id}>{sites.find((s) => s.id === f.siteId)?.name} - {f.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onSave(form as Zone)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                    <button onClick={onCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded ml-1"><X className="w-4 h-4" /></button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-2 font-mono">{zone.code}</td>
                  <td className="px-4 py-2">{zone.name}</td>
                  <td className="px-4 py-2 font-mono">{zone.siteFloorZoneCode}</td>
                  <td className="px-4 py-2">{zone.siteName} - {zone.floorName}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onEdit(zone)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(zone.id)} className="p-1 text-red-600 hover:bg-red-50 rounded ml-1"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ClientsTable({ clients, editingItem, showAddForm, onEdit, onDelete, onSave, onCancel, searchQuery, sortConfig, onSort }: TableProps<Client> & { clients: Client[] }) {
  const [form, setForm] = useState<Partial<Client>>({});
  const filteredClients = useFilteredSortedData(clients, searchQuery, sortConfig, ['code', 'name']);

  useEffect(() => {
    if (editingItem) setForm(editingItem);
  }, [editingItem]);

  const isEditing = (id: string) => editingItem?.id === id;

  return (
    <>
      {searchQuery && <div className="px-4 py-2 text-sm text-gray-500">Found {filteredClients.length} of {clients.length} clients</div>}
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <SortableHeader label="Code" sortKey="code" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Name" sortKey="name" sortConfig={sortConfig} onSort={onSort} />
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {showAddForm && editingItem?.id?.startsWith('new_') && (
            <tr className="bg-blue-50">
              <td className="px-4 py-2"><input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-2 py-1 border rounded" placeholder="CLIENT1" /></td>
              <td className="px-4 py-2"><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-2 py-1 border rounded" placeholder="Client Name" /></td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => onSave(form as Client)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                <button onClick={onCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded ml-1"><X className="w-4 h-4" /></button>
              </td>
            </tr>
          )}
          {filteredClients.map((client) => (
            <tr key={client.id} className={isEditing(client.id) ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
              {isEditing(client.id) ? (
                <>
                  <td className="px-4 py-2"><input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-2 py-1 border rounded" /></td>
                  <td className="px-4 py-2"><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-2 py-1 border rounded" /></td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onSave(form as Client)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                    <button onClick={onCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded ml-1"><X className="w-4 h-4" /></button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-2 font-mono">{client.code}</td>
                  <td className="px-4 py-2">{client.name || '-'}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onEdit(client)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(client.id)} className="p-1 text-red-600 hover:bg-red-50 rounded ml-1"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ProjectsTable({ projects, clients, editingItem, showAddForm, onEdit, onDelete, onSave, onCancel, searchQuery, sortConfig, onSort }: TableProps<Project> & { projects: Project[]; clients: Client[] }) {
  const [form, setForm] = useState<Partial<Project>>({});
  const projectsWithClient = useMemo(() => projects.map((p) => ({ ...p, clientName: p.client?.name || clients.find((c) => c.id === p.clientId)?.name || '' })), [projects, clients]);
  const filteredProjects = useFilteredSortedData(projectsWithClient, searchQuery, sortConfig, ['code', 'name', 'clientName']);

  useEffect(() => {
    if (editingItem) setForm(editingItem);
  }, [editingItem]);

  const isEditing = (id: string) => editingItem?.id === id;

  return (
    <>
      {searchQuery && <div className="px-4 py-2 text-sm text-gray-500">Found {filteredProjects.length} of {projects.length} projects</div>}
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <SortableHeader label="Code" sortKey="code" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Name" sortKey="name" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Client" sortKey="clientName" sortConfig={sortConfig} onSort={onSort} />
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {showAddForm && editingItem?.id?.startsWith('new_') && (
            <tr className="bg-blue-50">
              <td className="px-4 py-2"><input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-2 py-1 border rounded" placeholder="P1" /></td>
              <td className="px-4 py-2"><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-2 py-1 border rounded" placeholder="Project Name" /></td>
              <td className="px-4 py-2">
                <select value={form.clientId || ''} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="w-full px-2 py-1 border rounded">
                  <option value="">Select Client</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name || c.code}</option>)}
                </select>
              </td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => onSave(form as Project)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                <button onClick={onCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded ml-1"><X className="w-4 h-4" /></button>
              </td>
            </tr>
          )}
          {filteredProjects.map((project) => (
            <tr key={project.id} className={isEditing(project.id) ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
              {isEditing(project.id) ? (
                <>
                  <td className="px-4 py-2"><input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-2 py-1 border rounded" /></td>
                  <td className="px-4 py-2"><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-2 py-1 border rounded" /></td>
                  <td className="px-4 py-2">
                    <select value={form.clientId || ''} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="w-full px-2 py-1 border rounded">
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name || c.code}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onSave(form as Project)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                    <button onClick={onCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded ml-1"><X className="w-4 h-4" /></button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-2 font-mono">{project.code}</td>
                  <td className="px-4 py-2">{project.name || '-'}</td>
                  <td className="px-4 py-2">{project.clientName || project.client?.code || '-'}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onEdit(project)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(project.id)} className="p-1 text-red-600 hover:bg-red-50 rounded ml-1"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function QueuesTable({ queues, editingItem, showAddForm, onEdit, onDelete, onSave, onCancel, searchQuery, sortConfig, onSort }: TableProps<Queue> & { queues: Queue[] }) {
  const [form, setForm] = useState<Partial<Queue>>({});
  const filteredQueues = useFilteredSortedData(queues, searchQuery, sortConfig, ['code', 'name']);

  useEffect(() => {
    if (editingItem) setForm(editingItem);
  }, [editingItem]);

  const isEditing = (id: string) => editingItem?.id === id;

  return (
    <>
      {searchQuery && <div className="px-4 py-2 text-sm text-gray-500">Found {filteredQueues.length} of {queues.length} business units</div>}
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <SortableHeader label="Code" sortKey="code" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Name (Business Unit)" sortKey="name" sortConfig={sortConfig} onSort={onSort} />
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {showAddForm && editingItem?.id?.startsWith('new_') && (
            <tr className="bg-blue-50">
              <td className="px-4 py-2"><input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-2 py-1 border rounded" placeholder="BU1" /></td>
              <td className="px-4 py-2"><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-2 py-1 border rounded" placeholder="Business Unit Name" /></td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => onSave(form as Queue)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                <button onClick={onCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded ml-1"><X className="w-4 h-4" /></button>
              </td>
            </tr>
          )}
          {filteredQueues.map((queue) => (
            <tr key={queue.id} className={isEditing(queue.id) ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
              {isEditing(queue.id) ? (
                <>
                  <td className="px-4 py-2"><input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-2 py-1 border rounded" /></td>
                  <td className="px-4 py-2"><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-2 py-1 border rounded" /></td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onSave(form as Queue)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                    <button onClick={onCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded ml-1"><X className="w-4 h-4" /></button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-2 font-mono">{queue.code}</td>
                  <td className="px-4 py-2">{queue.name}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onEdit(queue)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(queue.id)} className="p-1 text-red-600 hover:bg-red-50 rounded ml-1"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ============ FACT TABLE COMPONENTS ============

interface FactTableProps<T> extends TableProps<T> {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

function ZoneCapacityTable({
  zoneCapacities,
  zones,
  editingItem,
  showAddForm,
  onEdit,
  onDelete,
  onSave,
  onCancel,
  searchQuery,
  sortConfig,
  onSort,
  selectedMonth,
  onMonthChange,
}: FactTableProps<ZoneCapacity> & { zoneCapacities: ZoneCapacity[]; zones: Zone[] }) {
  const [form, setForm] = useState<Partial<ZoneCapacity>>({ yearMonth: selectedMonth });

  // Add zone info for search
  const capacitiesWithZone = useMemo(() => zoneCapacities.map((zc) => {
    const zone = zc.zone || zones.find((z) => z.id === zc.zoneId);
    return {
      ...zc,
      zoneName: zone?.name || '',
      siteFloorZoneCode: zone?.siteFloorZoneCode || '',
    };
  }), [zoneCapacities, zones]);

  const filteredCapacities = useFilteredSortedData(capacitiesWithZone, searchQuery, sortConfig, ['zoneName', 'siteFloorZoneCode', 'yearMonth']);

  useEffect(() => {
    if (editingItem) setForm({ ...editingItem, yearMonth: editingItem.yearMonth || selectedMonth });
  }, [editingItem, selectedMonth]);

  useEffect(() => {
    setForm((f) => ({ ...f, yearMonth: selectedMonth }));
  }, [selectedMonth]);

  const isEditing = (id: string) => editingItem?.id === id;

  return (
    <>
      {/* Month Selector */}
      <div className="px-4 py-2 border-b bg-gray-50 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-600">Month:</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
          className="px-3 py-1 border rounded text-sm"
        />
        <span className="text-sm text-gray-500">
          {zoneCapacities.length} records for {selectedMonth}
        </span>
      </div>

      {searchQuery && <div className="px-4 py-2 text-sm text-gray-500">Found {filteredCapacities.length} of {zoneCapacities.length} records</div>}
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <SortableHeader label="Zone" sortKey="siteFloorZoneCode" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Month" sortKey="yearMonth" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Capacity" sortKey="capacity" sortConfig={sortConfig} onSort={onSort} />
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {showAddForm && editingItem?.id?.startsWith('new_') && (
            <tr className="bg-blue-50">
              <td className="px-4 py-2">
                <select value={form.zoneId || ''} onChange={(e) => setForm({ ...form, zoneId: e.target.value })} className="w-full px-2 py-1 border rounded">
                  <option value="">Select Zone</option>
                  {zones.map((z) => <option key={z.id} value={z.id}>{z.siteFloorZoneCode} - {z.name}</option>)}
                </select>
              </td>
              <td className="px-4 py-2">
                <input type="month" value={form.yearMonth || selectedMonth} onChange={(e) => setForm({ ...form, yearMonth: e.target.value })} className="w-full px-2 py-1 border rounded" />
              </td>
              <td className="px-4 py-2">
                <input type="number" value={form.capacity || ''} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 border rounded" placeholder="100" />
              </td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => onSave(form as ZoneCapacity)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                <button onClick={onCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded ml-1"><X className="w-4 h-4" /></button>
              </td>
            </tr>
          )}
          {filteredCapacities.map((zc) => (
            <tr key={zc.id} className={isEditing(zc.id) ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
              {isEditing(zc.id) ? (
                <>
                  <td className="px-4 py-2">
                    <select value={form.zoneId || ''} onChange={(e) => setForm({ ...form, zoneId: e.target.value })} className="w-full px-2 py-1 border rounded">
                      {zones.map((z) => <option key={z.id} value={z.id}>{z.siteFloorZoneCode} - {z.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input type="month" value={form.yearMonth || ''} onChange={(e) => setForm({ ...form, yearMonth: e.target.value })} className="w-full px-2 py-1 border rounded" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" value={form.capacity || ''} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 border rounded" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onSave(form as ZoneCapacity)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                    <button onClick={onCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded ml-1"><X className="w-4 h-4" /></button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-2 font-mono">{zc.siteFloorZoneCode}</td>
                  <td className="px-4 py-2">{zc.yearMonth}</td>
                  <td className="px-4 py-2 font-medium">{zc.capacity}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onEdit(zc)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(zc.id)} className="p-1 text-red-600 hover:bg-red-50 rounded ml-1"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ProjectAssignmentsTable({
  projectAssignments,
  zones,
  projects,
  queues,
  editingItem,
  showAddForm,
  onEdit,
  onDelete,
  onSave,
  onCancel,
  searchQuery,
  sortConfig,
  onSort,
  selectedMonth,
  onMonthChange,
}: FactTableProps<ProjectAssignment> & { projectAssignments: ProjectAssignment[]; zones: Zone[]; projects: Project[]; queues: Queue[] }) {
  const [form, setForm] = useState<Partial<ProjectAssignment>>({ yearMonth: selectedMonth });

  // Add related info for search
  const assignmentsWithInfo = useMemo(() => projectAssignments.map((pa) => {
    const zone = pa.zone || zones.find((z) => z.id === pa.zoneId);
    const project = pa.project || projects.find((p) => p.id === pa.projectId);
    const queue = pa.queue || queues.find((q) => q.id === pa.queueId);
    return {
      ...pa,
      zoneName: zone?.name || '',
      siteFloorZoneCode: zone?.siteFloorZoneCode || '',
      projectCode: project?.code || '',
      queueName: queue?.name || '',
    };
  }), [projectAssignments, zones, projects, queues]);

  const filteredAssignments = useFilteredSortedData(assignmentsWithInfo, searchQuery, sortConfig, ['siteFloorZoneCode', 'projectCode', 'queueName', 'yearMonth']);

  useEffect(() => {
    if (editingItem) setForm({ ...editingItem, yearMonth: editingItem.yearMonth || selectedMonth });
  }, [editingItem, selectedMonth]);

  useEffect(() => {
    setForm((f) => ({ ...f, yearMonth: selectedMonth }));
  }, [selectedMonth]);

  const isEditing = (id: string) => editingItem?.id === id;

  return (
    <>
      {/* Month Selector */}
      <div className="px-4 py-2 border-b bg-gray-50 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-600">Month:</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
          className="px-3 py-1 border rounded text-sm"
        />
        <span className="text-sm text-gray-500">
          {projectAssignments.length} records for {selectedMonth}
        </span>
      </div>

      {searchQuery && <div className="px-4 py-2 text-sm text-gray-500">Found {filteredAssignments.length} of {projectAssignments.length} records</div>}
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <SortableHeader label="Zone" sortKey="siteFloorZoneCode" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Project" sortKey="projectCode" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Business Unit" sortKey="queueName" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Month" sortKey="yearMonth" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="Seats" sortKey="seats" sortConfig={sortConfig} onSort={onSort} />
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {showAddForm && editingItem?.id?.startsWith('new_') && (
            <tr className="bg-blue-50">
              <td className="px-4 py-2">
                <select value={form.zoneId || ''} onChange={(e) => setForm({ ...form, zoneId: e.target.value })} className="w-full px-2 py-1 border rounded text-xs">
                  <option value="">Zone...</option>
                  {zones.map((z) => <option key={z.id} value={z.id}>{z.siteFloorZoneCode}</option>)}
                </select>
              </td>
              <td className="px-4 py-2">
                <select value={form.projectId || ''} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="w-full px-2 py-1 border rounded text-xs">
                  <option value="">Project...</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
                </select>
              </td>
              <td className="px-4 py-2">
                <select value={form.queueId || ''} onChange={(e) => setForm({ ...form, queueId: e.target.value })} className="w-full px-2 py-1 border rounded text-xs">
                  <option value="">BU...</option>
                  {queues.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
                </select>
              </td>
              <td className="px-4 py-2">
                <input type="month" value={form.yearMonth || selectedMonth} onChange={(e) => setForm({ ...form, yearMonth: e.target.value })} className="w-full px-2 py-1 border rounded text-xs" />
              </td>
              <td className="px-4 py-2">
                <input type="number" value={form.seats || ''} onChange={(e) => setForm({ ...form, seats: parseInt(e.target.value) || 0 })} className="w-20 px-2 py-1 border rounded" placeholder="10" />
              </td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => onSave(form as ProjectAssignment)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                <button onClick={onCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded ml-1"><X className="w-4 h-4" /></button>
              </td>
            </tr>
          )}
          {filteredAssignments.map((pa) => (
            <tr key={pa.id} className={isEditing(pa.id) ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
              {isEditing(pa.id) ? (
                <>
                  <td className="px-4 py-2">
                    <select value={form.zoneId || ''} onChange={(e) => setForm({ ...form, zoneId: e.target.value })} className="w-full px-2 py-1 border rounded text-xs">
                      {zones.map((z) => <option key={z.id} value={z.id}>{z.siteFloorZoneCode}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select value={form.projectId || ''} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="w-full px-2 py-1 border rounded text-xs">
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select value={form.queueId || ''} onChange={(e) => setForm({ ...form, queueId: e.target.value })} className="w-full px-2 py-1 border rounded text-xs">
                      {queues.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input type="month" value={form.yearMonth || ''} onChange={(e) => setForm({ ...form, yearMonth: e.target.value })} className="w-full px-2 py-1 border rounded text-xs" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" value={form.seats || ''} onChange={(e) => setForm({ ...form, seats: parseInt(e.target.value) || 0 })} className="w-20 px-2 py-1 border rounded" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onSave(form as ProjectAssignment)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                    <button onClick={onCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded ml-1"><X className="w-4 h-4" /></button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-2 font-mono text-xs">{pa.siteFloorZoneCode}</td>
                  <td className="px-4 py-2 font-mono">{pa.projectCode}</td>
                  <td className="px-4 py-2">{pa.queueName}</td>
                  <td className="px-4 py-2">{pa.yearMonth}</td>
                  <td className="px-4 py-2 font-medium">{pa.seats}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onEdit(pa)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(pa.id)} className="p-1 text-red-600 hover:bg-red-50 rounded ml-1"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
