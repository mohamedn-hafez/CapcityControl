
export enum SiteStatus {
  ACTIVE = 'ACTIVE',
  CLOSING = 'CLOSING',
  EXPANDING = 'EXPANDING'
}

export interface Site {
  id: string;
  name: string;
  totalCapacity: number;
  currentOccupancy: number;
  status: SiteStatus;
  maintenanceBufferPercent: number; // e.g., 5 for 5%
}

export interface SimulationResult {
  displacedStaff: number;
  remainingCapacity: number;
  unseatedStaff: number;
  siteImpacts: {
    siteId: string;
    allocatedStaff: number;
    newOccupancy: number;
    newUtilization: number;
    riskStatus: 'SUCCESS' | 'RISK' | 'OVERFLOW';
  }[];
  overallStatus: 'SUCCESS' | 'RISK' | 'OVERFLOW';
  summary?: string;
}

export interface AIAnalysisRequest {
  sites: Site[];
  result: SimulationResult;
}
