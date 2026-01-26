
import { Site, SiteStatus } from './types';

export const INITIAL_SITES: Site[] = [
  {
    id: 'alpha',
    name: 'Site Alpha',
    totalCapacity: 500,
    currentOccupancy: 420,
    status: SiteStatus.ACTIVE,
    maintenanceBufferPercent: 5
  },
  {
    id: 'bravo',
    name: 'Site Bravo',
    totalCapacity: 200,
    currentOccupancy: 180,
    status: SiteStatus.CLOSING,
    maintenanceBufferPercent: 5
  },
  {
    id: 'charlie',
    name: 'Site Charlie',
    totalCapacity: 350,
    currentOccupancy: 300,
    status: SiteStatus.ACTIVE,
    maintenanceBufferPercent: 5
  }
];

export const BUFFER_PERCENT_DEFAULT = 5;
