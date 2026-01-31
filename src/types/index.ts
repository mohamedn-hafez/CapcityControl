// ============ ENUMS ============

export type SiteStatus = 'ACTIVE' | 'CLOSING' | 'PLANNED' | 'CLOSED';
export type ClosureStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type RiskStatus = 'OK' | 'WARNING' | 'RISK' | 'OVERFLOW' | 'CLOSED';

// ============ DOMAIN TYPES ============

export interface Region {
  id: string;
  code: string;
  name: string;
  country: string;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  regionId: string;
  region?: Region;
  status: SiteStatus;
  openingDate?: string;
  closingDate?: string;
  floors?: Floor[];
}

export interface Floor {
  id: string;
  code: string;
  name: string;
  siteId: string;
  site?: Site;
  zones?: Zone[];
  closurePlans?: ClosurePlan[];
}

export interface Zone {
  id: string;
  code: string;
  name: string;
  siteFloorZoneCode: string;
  floorId: string;
  floor?: Floor;
  zoneCapacities?: ZoneCapacity[];
  projectAssignments?: ProjectAssignment[];
}

// Client - parent of Project (NEW)
export interface Client {
  id: string;
  code: string;
  name?: string;
  projects?: Project[];
}

// Project - now linked to Client instead of Site
export interface Project {
  id: string;
  code: string;
  name?: string;
  clientId: string;
  client?: Client;
  projectAssignments?: ProjectAssignment[];
}

// Queue (Business Unit)
export interface Queue {
  id: string;
  code: string;
  name: string;
}

// ZoneCapacity - monthly capacity per zone (renamed from MonthlyCapacity)
export interface ZoneCapacity {
  id: string;
  zoneId: string;
  zone?: Zone;
  yearMonth: string;
  capacity: number;
}

// ProjectAssignment - monthly project headcount per zone (renamed from ZoneOccupancy)
export interface ProjectAssignment {
  id: string;
  zoneId: string;
  zone?: Zone;
  projectId: string;
  project?: Project;
  queueId: string;
  queue?: Queue;
  yearMonth: string;
  seats: number;
}

// Legacy type alias for backwards compatibility
export type MonthlyCapacity = ZoneCapacity & {
  year?: number;
  month?: number;
  occupiedSeats?: number;
  unallocated?: number;
};

// ClosurePlan - now at FLOOR level (not zone)
export interface ClosurePlan {
  id: string;
  floorId: string;
  floor?: Floor;
  closureDate: string;
  yearMonth: string;
  seatsAffected: number;
  status: ClosureStatus;
  allocations?: Allocation[];
}

export interface Allocation {
  id: string;
  closurePlanId: string;
  closurePlan?: ClosurePlan;
  sourceZoneId: string;
  sourceZone?: Zone;
  targetZoneId: string;
  targetZone?: Zone;
  allocatedSeats: number;
  allocationDate: string;
  isManual: boolean;
}

// ============ VIEW TYPES ============

export interface SiteCapacitySummary {
  siteId: string;
  siteCode: string;
  siteName: string;
  regionCode: string;
  regionName: string;
  status: SiteStatus;
  totalCapacity: number;
  totalOccupied: number;
  totalAvailable: number;
  utilizationPercent: number;
  riskStatus: RiskStatus;
  floors: FloorCapacitySummary[];
}

export interface FloorCapacitySummary {
  floorId: string;
  floorCode: string;
  floorName: string;
  totalCapacity: number;
  totalOccupied: number;
  totalAvailable: number;
  utilizationPercent: number;
  riskStatus: RiskStatus;
  isClosing?: boolean;
  zones: ZoneCapacitySummary[];
}

export interface ZoneCapacitySummary {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  siteFloorZoneCode: string;
  capacity: number;
  occupied: number;
  available: number;
  utilizationPercent: number;
  riskStatus: RiskStatus;
  isClosing: boolean;
  closureDate?: string;
}

export interface MonthlyDashboardData {
  yearMonth: string;
  year: number;
  month: number;
  monthName: string;
  sites: SiteCapacitySummary[];
  totalCapacity: number;
  totalOccupied: number;
  totalAvailable: number;
  closuresThisMonth: ClosurePlanSummary[];
}

// Closure summary for dashboard (floor-level)
export interface ClosurePlanSummary {
  id: string;
  floorId: string;
  siteName: string;
  floorName: string;
  zoneName?: string; // Comma-separated zone names
  closureDate: string;
  yearMonth: string;
  seatsAffected: number;
  status: ClosureStatus;
}

export interface AllocationZoneBreakdown {
  zoneId: string;
  zoneName: string;
  capacity: number;
  occupied: number;
  available: number;
}

export interface AllocationFloorBreakdown {
  floorId: string;
  floorName: string;
  zones: AllocationZoneBreakdown[];
  totalCapacity: number;
  totalOccupied: number;
  totalAvailable: number;
}

export interface AllocationRecommendation {
  targetSiteId: string;
  targetSiteName: string;
  targetSiteCode?: string;
  targetRegion: string;
  availableCapacity: number;
  recommendedAllocation: number;
  allocatedProjects?: string[];
  allocatedBusinessUnits?: string[];
  newUtilization: number;
  riskStatus: RiskStatus;
  isEditable: boolean;
  floorBreakdown?: AllocationFloorBreakdown[];
}

// ClosurePlanWithDetails - floor-level closure details
export interface ClosurePlanWithDetails {
  id: string;
  floorId: string;
  siteId: string;
  siteName: string;
  siteCode: string;
  floorName: string;
  zoneNames?: string; // Comma-separated zone names
  zoneCount?: number;
  regionCode: string;
  regionName: string;
  closureDate: string;
  yearMonth: string;
  seatsAffected: number;
  status: ClosureStatus;
  allocations: {
    id: string;
    targetSiteId: string;
    targetSiteName: string;
    targetZoneId: string;
    allocatedSeats: number;
    isManual: boolean;
  }[];
  totalAllocated: number;
  unseatedStaff: number;
}

// ============ FORM TYPES ============

// CreateClosureForm - now floor-level (not zone)
export interface CreateClosureForm {
  siteId: string;
  floorId: string;
  closureDate: string;
}

export interface UpdateCapacityForm {
  zoneId: string;
  yearMonth: string;
  capacity: number;
}

export interface CreateProjectAssignmentForm {
  projectId: string;
  zoneId: string;
  queueId: string;
  yearMonth: string;
  seats: number;
}

// ============ API RESPONSE TYPES ============

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============ UTILITY FUNCTIONS ============

export function getRiskStatus(utilization: number, isClosed: boolean = false): RiskStatus {
  if (isClosed) return 'CLOSED';
  if (utilization > 100) return 'OVERFLOW';
  if (utilization >= 95) return 'RISK';
  if (utilization >= 85) return 'WARNING';
  return 'OK';
}

export function getRiskColor(status: RiskStatus): string {
  switch (status) {
    case 'OK': return 'bg-green-100 text-green-800';
    case 'WARNING': return 'bg-yellow-100 text-yellow-800';
    case 'RISK': return 'bg-orange-100 text-orange-800';
    case 'OVERFLOW': return 'bg-red-100 text-red-800';
    case 'CLOSED': return 'bg-gray-100 text-gray-500';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export function getMonthName(month: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[month - 1] || '';
}

export function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}
