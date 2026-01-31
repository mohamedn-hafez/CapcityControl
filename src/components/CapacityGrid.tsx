import React from 'react';
import { ChevronRight, ChevronDown, Building2, Layers, LayoutGrid } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getRiskColor, type SiteCapacitySummary, type FloorCapacitySummary, type ZoneCapacitySummary } from '../types';

export function CapacityGrid() {
  const { state, toggleSiteExpanded, dispatch } = useApp();
  const { dashboardData, expandedSites, isLoading } = state;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available
      </div>
    );
  }

  const handleExpandAll = () => dispatch({ type: 'EXPAND_ALL_SITES' });
  const handleCollapseAll = () => dispatch({ type: 'COLLAPSE_ALL_SITES' });

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">
          Capacity Overview - {dashboardData.monthName} {dashboardData.year}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleExpandAll}
            className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
          >
            Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-100 text-xs font-medium text-gray-600 uppercase">
        <div className="col-span-4">Location</div>
        <div className="col-span-2 text-right">Capacity</div>
        <div className="col-span-2 text-right">Occupied</div>
        <div className="col-span-2 text-right">Available</div>
        <div className="col-span-2 text-right">Utilization</div>
      </div>

      {/* Sites */}
      <div className="divide-y">
        {dashboardData.sites.map((site) => (
          <SiteRow
            key={site.siteId}
            site={site}
            isExpanded={expandedSites.has(site.siteId)}
            onToggle={() => toggleSiteExpanded(site.siteId)}
          />
        ))}
      </div>

      {/* Total Row */}
      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-100 font-semibold text-gray-800 border-t">
        <div className="col-span-4">Total</div>
        <div className="col-span-2 text-right">{dashboardData.totalCapacity.toLocaleString()}</div>
        <div className="col-span-2 text-right">{dashboardData.totalOccupied.toLocaleString()}</div>
        <div className="col-span-2 text-right">{dashboardData.totalAvailable.toLocaleString()}</div>
        <div className="col-span-2 text-right">
          {dashboardData.totalCapacity > 0
            ? Math.round((dashboardData.totalOccupied / dashboardData.totalCapacity) * 100)
            : 0}%
        </div>
      </div>
    </div>
  );
}

// ============ SITE ROW ============

interface SiteRowProps {
  site: SiteCapacitySummary;
  isExpanded: boolean;
  onToggle: () => void;
}

function SiteRow({ site, isExpanded, onToggle }: SiteRowProps) {
  return (
    <div>
      {/* Site Header */}
      <div
        onClick={onToggle}
        className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-gray-50 cursor-pointer items-center"
      >
        <div className="col-span-4 flex items-center gap-2">
          <button className="p-0.5">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{site.siteName}</span>
          <span className="text-xs text-gray-400">({site.regionCode})</span>
        </div>
        <div className="col-span-2 text-right">{site.totalCapacity.toLocaleString()}</div>
        <div className="col-span-2 text-right">{site.totalOccupied.toLocaleString()}</div>
        <div className="col-span-2 text-right">{site.totalAvailable.toLocaleString()}</div>
        <div className="col-span-2 text-right">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getRiskColor(site.riskStatus)}`}>
            {site.utilizationPercent}%
          </span>
        </div>
      </div>

      {/* Floors */}
      {isExpanded && (
        <div className="bg-gray-50">
          {site.floors.map((floor) => (
            <FloorRow key={floor.floorId} floor={floor} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ FLOOR ROW ============

interface FloorRowProps {
  floor: FloorCapacitySummary;
}

function FloorRow({ floor }: FloorRowProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div>
      {/* Floor Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="grid grid-cols-12 gap-2 px-4 py-2 pl-10 hover:bg-gray-100 cursor-pointer items-center border-t border-gray-100"
      >
        <div className="col-span-4 flex items-center gap-2">
          <button className="p-0.5">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-400" />
            )}
          </button>
          <Layers className="w-3 h-3 text-gray-400" />
          <span className="text-sm">Floor {floor.floorName}</span>
        </div>
        <div className="col-span-2 text-right text-sm">{floor.totalCapacity.toLocaleString()}</div>
        <div className="col-span-2 text-right text-sm">{floor.totalOccupied.toLocaleString()}</div>
        <div className="col-span-2 text-right text-sm">{floor.totalAvailable.toLocaleString()}</div>
        <div className="col-span-2 text-right">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getRiskColor(floor.riskStatus)}`}>
            {floor.utilizationPercent}%
          </span>
        </div>
      </div>

      {/* Zones */}
      {isExpanded && (
        <div>
          {floor.zones.map((zone) => (
            <ZoneRow key={zone.zoneId} zone={zone} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ ZONE ROW ============

interface ZoneRowProps {
  zone: ZoneCapacitySummary;
}

function ZoneRow({ zone }: ZoneRowProps) {
  if (zone.riskStatus === 'CLOSED') {
    return (
      <div className="grid grid-cols-12 gap-2 px-4 py-2 pl-16 bg-gray-100 text-gray-400 items-center border-t border-gray-100">
        <div className="col-span-4 flex items-center gap-2">
          <LayoutGrid className="w-3 h-3" />
          <span className="text-sm">Zone {zone.zoneName}</span>
        </div>
        <div className="col-span-6 text-center">
          <span className="inline-block px-3 py-1 rounded bg-gray-200 text-gray-500 text-xs font-medium">
            CLOSED
          </span>
        </div>
        <div className="col-span-2 text-right text-xs text-gray-400">
          {zone.closureDate}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-2 px-4 py-2 pl-16 hover:bg-gray-100 items-center border-t border-gray-100">
      <div className="col-span-4 flex items-center gap-2">
        <LayoutGrid className="w-3 h-3 text-gray-400" />
        <span className="text-sm text-gray-600">Zone {zone.zoneName}</span>
        {zone.isClosing && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-600">
            Closing
          </span>
        )}
      </div>
      <div className="col-span-2 text-right text-sm text-gray-600">{zone.capacity}</div>
      <div className="col-span-2 text-right text-sm text-gray-600">{zone.occupied}</div>
      <div className="col-span-2 text-right text-sm text-gray-600">{zone.available}</div>
      <div className="col-span-2 text-right">
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getRiskColor(zone.riskStatus)}`}>
          {zone.utilizationPercent}%
        </span>
      </div>
    </div>
  );
}
