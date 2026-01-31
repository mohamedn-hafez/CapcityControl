import type {
  ApiResponse,
  Site,
  MonthlyDashboardData,
  ClosurePlanWithDetails,
  AllocationRecommendation,
  Client,
  Project,
  Queue,
  ZoneCapacity,
  ProjectAssignment,
  Region,
  Floor,
  Zone,
} from '../types';

const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('API fetch failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ============ SITES ============

export async function fetchSites(): Promise<ApiResponse<Site[]>> {
  return fetchApi<Site[]>('/sites');
}

// ============ DASHBOARD ============

export async function fetchDashboard(yearMonth: string): Promise<ApiResponse<MonthlyDashboardData>> {
  return fetchApi<MonthlyDashboardData>(`/dashboard?yearMonth=${yearMonth}`);
}

// ============ CLOSURES ============

export async function fetchClosures(): Promise<ApiResponse<ClosurePlanWithDetails[]>> {
  return fetchApi<ClosurePlanWithDetails[]>('/closures');
}

// Create closure - now at floor level
export async function createClosure(data: {
  floorId: string;
  closureDate: string;
  seatsAffected?: number;
}): Promise<ApiResponse<any>> {
  return fetchApi('/closures', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteClosure(id: string): Promise<ApiResponse<void>> {
  return fetchApi(`/closures?id=${id}`, {
    method: 'DELETE',
  });
}

// ============ ALLOCATIONS ============

export interface OccupancyBreakdownItem {
  projectCode: string;
  clientCode: string; // Changed from projectSiteCode
  businessUnit: string;
  businessUnitCode: string;
  seats: number;
}

export interface ClientSummary {
  client: string;
  totalSeats: number;
  projects: {
    projectCode: string;
    seats: number;
  }[];
}

export interface BusinessUnitSummary {
  businessUnit: string;
  totalSeats: number;
  clients: ClientSummary[];
  projects: {
    projectCode: string;
    client: string;
    seats: number;
  }[];
}

export interface UnseatedProject {
  projectCode: string;
  seats: number;
  businessUnit?: string;
}

export interface DateRecommendation {
  hasCapacity: boolean;
  suggestedClosureMonth: string | null;
  suggestedMonthName: string | null;
  capacityAvailable: number;
  stableThrough: string | null;
  reason: string;
}

export interface ZoneBreakdown {
  zoneId: string;
  zoneName: string;
  capacity: number;
  occupied: number;
  available: number;
}

export interface FloorBreakdown {
  floorId: string;
  floorName: string;
  zones: ZoneBreakdown[];
  totalCapacity: number;
  totalOccupied: number;
  totalAvailable: number;
}

export interface AllocationData {
  closurePlan: {
    id: string;
    siteName: string;
    floorName: string;
    zoneNames?: string; // Comma-separated zone names (floor-level closure)
    closureDate: string;
    seatsAffected: number;
    regionCode: string;
    regionName?: string;
  };
  occupancyBreakdown: OccupancyBreakdownItem[];
  byBusinessUnit: BusinessUnitSummary[];
  recommendations: AllocationRecommendation[];
  allocatedProjects: string[];
  unseatedProjects: UnseatedProject[];
  totalAllocated: number;
  unseatedStaff: number;
  dateRecommendation?: DateRecommendation;
}

export async function fetchAllocations(closurePlanId: string): Promise<ApiResponse<AllocationData>> {
  return fetchApi<AllocationData>(`/allocations?closurePlanId=${closurePlanId}`);
}

export async function saveAllocations(
  closurePlanId: string,
  allocations: { targetSiteId: string; allocatedSeats: number; isManual?: boolean }[]
): Promise<ApiResponse<any>> {
  return fetchApi('/allocations', {
    method: 'POST',
    body: JSON.stringify({ closurePlanId, allocations }),
  });
}

// ============ CAPACITY ============

export async function updateCapacity(data: {
  zoneId: string;
  yearMonth: string;
  capacity: number;
}): Promise<ApiResponse<any>> {
  return fetchApi('/admin/zone-capacity', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============ ADMIN API - REGIONS ============

export async function fetchRegions(): Promise<ApiResponse<Region[]>> {
  return fetchApi<Region[]>('/admin/regions');
}

export async function createRegion(data: { code: string; name: string; country: string }): Promise<ApiResponse<Region>> {
  return fetchApi('/admin/regions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRegion(id: string, data: { code: string; name: string; country: string }): Promise<ApiResponse<Region>> {
  return fetchApi(`/admin/regions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteRegion(id: string): Promise<ApiResponse<void>> {
  return fetchApi(`/admin/regions/${id}`, {
    method: 'DELETE',
  });
}

// ============ ADMIN API - SITES ============

export async function fetchAdminSites(): Promise<ApiResponse<Site[]>> {
  return fetchApi<Site[]>('/admin/sites');
}

export async function createSite(data: {
  code: string;
  name: string;
  regionId: string;
  status?: string;
  openingDate?: string;
  closingDate?: string;
}): Promise<ApiResponse<Site>> {
  return fetchApi('/admin/sites', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSite(id: string, data: {
  code: string;
  name: string;
  regionId: string;
  status?: string;
  openingDate?: string;
  closingDate?: string;
}): Promise<ApiResponse<Site>> {
  return fetchApi(`/admin/sites/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSite(id: string): Promise<ApiResponse<void>> {
  return fetchApi(`/admin/sites/${id}`, {
    method: 'DELETE',
  });
}

// ============ ADMIN API - FLOORS ============

export async function fetchFloors(): Promise<ApiResponse<Floor[]>> {
  return fetchApi<Floor[]>('/admin/floors');
}

export async function createFloor(data: { code: string; name: string; siteId: string }): Promise<ApiResponse<Floor>> {
  return fetchApi('/admin/floors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateFloor(id: string, data: { code: string; name: string; siteId: string }): Promise<ApiResponse<Floor>> {
  return fetchApi(`/admin/floors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteFloor(id: string): Promise<ApiResponse<void>> {
  return fetchApi(`/admin/floors/${id}`, {
    method: 'DELETE',
  });
}

// ============ ADMIN API - ZONES ============

export async function fetchZones(): Promise<ApiResponse<Zone[]>> {
  return fetchApi<Zone[]>('/admin/zones');
}

export async function createZone(data: {
  code: string;
  name: string;
  siteFloorZoneCode: string;
  floorId: string;
}): Promise<ApiResponse<Zone>> {
  return fetchApi('/admin/zones', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateZone(id: string, data: {
  code: string;
  name: string;
  siteFloorZoneCode: string;
  floorId: string;
}): Promise<ApiResponse<Zone>> {
  return fetchApi(`/admin/zones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteZone(id: string): Promise<ApiResponse<void>> {
  return fetchApi(`/admin/zones/${id}`, {
    method: 'DELETE',
  });
}

// ============ ADMIN API - CLIENTS (NEW) ============

export async function fetchClients(): Promise<ApiResponse<Client[]>> {
  return fetchApi<Client[]>('/admin/clients');
}

export async function createClient(data: { code: string; name?: string }): Promise<ApiResponse<Client>> {
  return fetchApi('/admin/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateClient(id: string, data: { code: string; name?: string }): Promise<ApiResponse<Client>> {
  return fetchApi(`/admin/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteClient(id: string): Promise<ApiResponse<void>> {
  return fetchApi(`/admin/clients/${id}`, {
    method: 'DELETE',
  });
}

// ============ ADMIN API - PROJECTS ============

export async function fetchProjects(): Promise<ApiResponse<Project[]>> {
  return fetchApi<Project[]>('/admin/projects');
}

export async function createProject(data: { code: string; name?: string; clientId: string }): Promise<ApiResponse<Project>> {
  return fetchApi('/admin/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProject(id: string, data: { code: string; name?: string; clientId: string }): Promise<ApiResponse<Project>> {
  return fetchApi(`/admin/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string): Promise<ApiResponse<void>> {
  return fetchApi(`/admin/projects/${id}`, {
    method: 'DELETE',
  });
}

// ============ ADMIN API - QUEUES (Business Units) ============

export async function fetchQueues(): Promise<ApiResponse<Queue[]>> {
  return fetchApi<Queue[]>('/admin/queues');
}

export async function createQueue(data: { code: string; name: string }): Promise<ApiResponse<Queue>> {
  return fetchApi('/admin/queues', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateQueue(id: string, data: { code: string; name: string }): Promise<ApiResponse<Queue>> {
  return fetchApi(`/admin/queues/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteQueue(id: string): Promise<ApiResponse<void>> {
  return fetchApi(`/admin/queues/${id}`, {
    method: 'DELETE',
  });
}

// ============ ADMIN API - ZONE CAPACITY (Fact Table) ============

export async function fetchZoneCapacities(yearMonth?: string): Promise<ApiResponse<ZoneCapacity[]>> {
  const query = yearMonth ? `?yearMonth=${yearMonth}` : '';
  return fetchApi<ZoneCapacity[]>(`/admin/zone-capacity${query}`);
}

export async function createZoneCapacity(data: {
  zoneId: string;
  yearMonth: string;
  capacity: number;
}): Promise<ApiResponse<ZoneCapacity>> {
  return fetchApi('/admin/zone-capacity', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteZoneCapacity(id: string): Promise<ApiResponse<void>> {
  return fetchApi(`/admin/zone-capacity/${id}`, {
    method: 'DELETE',
  });
}

// ============ ADMIN API - PROJECT ASSIGNMENT (Fact Table) ============

export async function fetchProjectAssignments(yearMonth?: string): Promise<ApiResponse<ProjectAssignment[]>> {
  const query = yearMonth ? `?yearMonth=${yearMonth}` : '';
  return fetchApi<ProjectAssignment[]>(`/admin/project-assignments${query}`);
}

export async function createProjectAssignment(data: {
  projectId: string;
  zoneId: string;
  queueId: string;
  yearMonth: string;
  seats: number;
}): Promise<ApiResponse<ProjectAssignment>> {
  return fetchApi('/admin/project-assignments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteProjectAssignment(id: string): Promise<ApiResponse<void>> {
  return fetchApi(`/admin/project-assignments/${id}`, {
    method: 'DELETE',
  });
}

// ============ ADMIN API - COPY MONTH DATA ============

export async function copyMonthData(data: {
  sourceMonth: string;
  targetMonth: string;
  copyCapacity?: boolean;
  copyAssignments?: boolean;
}): Promise<ApiResponse<{
  sourceMonth: string;
  targetMonth: string;
  capacitiesCopied: number;
  assignmentsCopied: number;
}>> {
  return fetchApi('/admin/copy-month-data', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
