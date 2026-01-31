import React, { useState, useEffect } from 'react';
import { MapPin, Users, Check, AlertTriangle, RefreshCw, Save, ChevronDown, ChevronRight, Building2, Calendar, Lightbulb, Layers } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchAllocations, saveAllocations, type AllocationData, type BusinessUnitSummary, type UnseatedProject, type DateRecommendation, type FloorBreakdown } from '../services/api';
import { getRiskColor, type AllocationRecommendation, type AllocationFloorBreakdown } from '../types';

export function AllocationPanel() {
  const { state, refreshData } = useApp();
  const { selectedClosureId, closures } = state;

  const [allocationData, setAllocationData] = useState<AllocationData | null>(null);
  const [allocations, setAllocations] = useState<AllocationRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [expandedBUs, setExpandedBUs] = useState<Set<string>>(new Set());
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());

  // Load allocations when a closure is selected
  useEffect(() => {
    if (selectedClosureId) {
      loadAllocations();
    } else {
      setAllocationData(null);
      setAllocations([]);
    }
  }, [selectedClosureId]);

  const loadAllocations = async () => {
    if (!selectedClosureId) return;

    setIsLoading(true);
    try {
      const response = await fetchAllocations(selectedClosureId);
      if (response.success && response.data) {
        setAllocationData(response.data);
        setAllocations(response.data.recommendations);
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Failed to load allocations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAllocationChange = (index: number, value: number) => {
    const newAllocations = [...allocations];
    newAllocations[index] = {
      ...newAllocations[index],
      recommendedAllocation: Math.max(0, Math.min(value, newAllocations[index].availableCapacity)),
    };
    setAllocations(newAllocations);
    setHasChanges(true);
  };

  const handleAutoAllocate = () => {
    if (!allocationData) return;

    let remaining = allocationData.closurePlan.seatsAffected;
    const newAllocations = allocations.map((alloc) => {
      const toAllocate = Math.min(remaining, alloc.availableCapacity);
      remaining -= toAllocate;
      return { ...alloc, recommendedAllocation: toAllocate };
    });

    setAllocations(newAllocations);
    setHasChanges(true);
  };

  const toggleBUExpanded = (bu: string) => {
    const newExpanded = new Set(expandedBUs);
    if (newExpanded.has(bu)) {
      newExpanded.delete(bu);
    } else {
      newExpanded.add(bu);
    }
    setExpandedBUs(newExpanded);
  };

  const toggleClientExpanded = (clientKey: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientKey)) {
      newExpanded.delete(clientKey);
    } else {
      newExpanded.add(clientKey);
    }
    setExpandedClients(newExpanded);
  };

  const toggleSiteExpanded = (siteId: string) => {
    const newExpanded = new Set(expandedSites);
    if (newExpanded.has(siteId)) {
      newExpanded.delete(siteId);
    } else {
      newExpanded.add(siteId);
    }
    setExpandedSites(newExpanded);
  };

  const handleSave = async () => {
    if (!selectedClosureId) return;

    setIsSaving(true);
    try {
      const allocationData = allocations
        .filter((a) => a.recommendedAllocation > 0)
        .map((a) => ({
          targetSiteId: a.targetSiteId,
          allocatedSeats: a.recommendedAllocation,
          isManual: true,
        }));

      await saveAllocations(selectedClosureId, allocationData);
      await refreshData();
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save allocations:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedClosureId) {
    return (
      <div className="bg-white rounded-lg shadow h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Select a closure plan to view allocations</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow h-full flex flex-col items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-blue-600 absolute top-0 left-0"></div>
        </div>
        <div className="mt-4 text-sm text-gray-600 animate-pulse">Loading allocation recommendations...</div>
        <div className="mt-2 text-xs text-gray-400">Calculating optimal placements</div>
      </div>
    );
  }

  if (!allocationData) {
    return (
      <div className="bg-white rounded-lg shadow h-full flex items-center justify-center text-gray-500">
        No allocation data available
      </div>
    );
  }

  const totalAllocated = allocations.reduce((sum, a) => sum + a.recommendedAllocation, 0);
  const unseated = allocationData.closurePlan.seatsAffected - totalAllocated;

  return (
    <div className="bg-white rounded-lg shadow h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-800">Allocation Plan</h2>
          <div className="flex gap-2">
            <button
              onClick={handleAutoAllocate}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              <RefreshCw className="w-3 h-3" />
              Auto-Allocate
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Closure Info */}
        <div className="text-sm">
          <div className="font-medium text-gray-700">
            {allocationData.closurePlan.siteName} - Floor {allocationData.closurePlan.floorName}
          </div>
          <div className="flex items-center gap-4 mt-1 text-gray-500">
            <span>Closure: {formatDate(allocationData.closurePlan.closureDate)}</span>
            <span>Region: {allocationData.closurePlan.regionName || allocationData.closurePlan.regionCode}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-gray-50 rounded p-2 text-center">
            <div className="text-lg font-semibold text-gray-800">
              {allocationData.closurePlan.seatsAffected}
            </div>
            <div className="text-xs text-gray-500">Displaced</div>
          </div>
          <div className="bg-green-50 rounded p-2 text-center">
            <div className="text-lg font-semibold text-green-700">{totalAllocated}</div>
            <div className="text-xs text-gray-500">Allocated</div>
          </div>
          <div className={`rounded p-2 text-center ${unseated > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
            <div className={`text-lg font-semibold ${unseated > 0 ? 'text-red-700' : 'text-gray-800'}`}>
              {unseated}
            </div>
            <div className="text-xs text-gray-500">Unseated</div>
          </div>
        </div>

        {/* Smart Date Recommendation */}
        {allocationData.dateRecommendation && (
          <DateRecommendationBox recommendation={allocationData.dateRecommendation} />
        )}
      </div>

      {/* Occupancy Breakdown */}
      {allocationData.byBusinessUnit && allocationData.byBusinessUnit.length > 0 && (
        <div className="border-b">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>Staff Breakdown by Business Unit</span>
              <span className="text-xs text-gray-400">
                ({allocationData.byBusinessUnit.length} BUs, {allocationData.occupancyBreakdown?.length || 0} projects)
              </span>
            </div>
            {showBreakdown ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {showBreakdown && (
            <div className="px-4 pb-3 space-y-2">
              {allocationData.byBusinessUnit.map((bu) => (
                <div key={bu.businessUnit} className="border rounded-lg overflow-hidden">
                  {/* Business Unit Header */}
                  <button
                    onClick={() => toggleBUExpanded(bu.businessUnit)}
                    className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {expandedBUs.has(bu.businessUnit) ? (
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                      )}
                      <span className="font-medium text-gray-700">{bu.businessUnit}</span>
                      <span className="text-xs text-gray-400">
                        ({bu.clients?.length || bu.projects.length} {bu.clients?.length ? 'clients' : 'projects'})
                      </span>
                    </div>
                    <span className="font-semibold text-gray-800">{bu.totalSeats} seats</span>
                  </button>

                  {/* Expanded: Show Clients (or fallback to projects) */}
                  {expandedBUs.has(bu.businessUnit) && (
                    <div className="bg-white">
                      {bu.clients && bu.clients.length > 0 ? (
                        // New hierarchical structure: Clients → Projects
                        bu.clients.map((client) => {
                          const clientKey = `${bu.businessUnit}_${client.client}`;
                          return (
                            <div key={client.client} className="border-t">
                              {/* Client Header */}
                              <button
                                onClick={() => toggleClientExpanded(clientKey)}
                                className="w-full px-4 py-1.5 flex items-center justify-between bg-purple-50 hover:bg-purple-100 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  {expandedClients.has(clientKey) ? (
                                    <ChevronDown className="w-3 h-3 text-purple-400" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-purple-400" />
                                  )}
                                  <span className="font-medium text-purple-700">{client.client}</span>
                                  <span className="text-purple-400">({client.projects.length} projects)</span>
                                </div>
                                <span className="font-semibold text-purple-800">{client.totalSeats} seats</span>
                              </button>

                              {/* Projects under Client */}
                              {expandedClients.has(clientKey) && (
                                <div className="divide-y divide-gray-100">
                                  {client.projects.map((project) => (
                                    <div
                                      key={project.projectCode}
                                      className="px-6 py-1 flex items-center justify-between text-xs bg-white"
                                    >
                                      <span className="font-mono text-gray-500">{project.projectCode}</span>
                                      <span className="font-medium text-gray-700">{project.seats}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        // Fallback: flat projects list (backward compatibility)
                        <div className="divide-y">
                          {bu.projects.map((project) => (
                            <div
                              key={project.projectCode}
                              className="px-3 py-1.5 flex items-center justify-between text-xs bg-white"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-16 font-mono text-gray-500">{project.projectCode}</span>
                                <span className="text-gray-600">{project.client}</span>
                              </div>
                              <span className="font-medium text-gray-700">{project.seats}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Allocations Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr className="text-left text-xs font-medium text-gray-500 uppercase">
              <th className="px-4 py-2">Destination</th>
              <th className="px-4 py-2 text-right">Available</th>
              <th className="px-4 py-2 text-right">Allocate</th>
              <th className="px-4 py-2 text-right">New Util</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {allocations.map((alloc, index) => (
              <React.Fragment key={alloc.targetSiteId}>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {alloc.floorBreakdown && alloc.floorBreakdown.length > 0 && (
                        <button
                          onClick={() => toggleSiteExpanded(alloc.targetSiteId)}
                          className="p-0.5 hover:bg-gray-200 rounded"
                        >
                          {expandedSites.has(alloc.targetSiteId) ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      )}
                      <div>
                        <div className="font-medium text-gray-800">{alloc.targetSiteName}</div>
                        <div className="text-xs text-gray-500">
                          {alloc.targetRegion}
                          {alloc.floorBreakdown && alloc.floorBreakdown.length > 0 && (
                            <span className="ml-2 text-gray-400">
                              ({alloc.floorBreakdown.length} floors)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {alloc.allocatedBusinessUnits && alloc.allocatedBusinessUnits.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 ml-6">
                        {alloc.allocatedBusinessUnits.map((bu) => (
                          <span key={bu} className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                            {bu}
                          </span>
                        ))}
                      </div>
                    )}
                    {alloc.allocatedProjects && alloc.allocatedProjects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 ml-6">
                        {alloc.allocatedProjects.map((proj) => (
                          <span key={proj} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                            {proj}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600">
                    {alloc.availableCapacity}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      min="0"
                      max={alloc.availableCapacity}
                      value={alloc.recommendedAllocation}
                      onChange={(e) => handleAllocationChange(index, parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getRiskColor(alloc.riskStatus)}`}>
                      {alloc.newUtilization}%
                    </span>
                  </td>
                </tr>
                {/* Floor/Zone Breakdown */}
                {expandedSites.has(alloc.targetSiteId) && alloc.floorBreakdown && (
                  <tr>
                    <td colSpan={4} className="px-0 py-0">
                      <FloorBreakdownTable floors={alloc.floorBreakdown} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Unseated Projects Warning */}
      {allocationData.unseatedProjects && allocationData.unseatedProjects.length > 0 && (
        <div className="px-4 py-3 border-t bg-red-50">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-semibold">
              {allocationData.unseatedProjects.length} projects cannot be allocated
            </span>
          </div>
          <div className="text-xs text-red-600 mb-2">
            No destination site has enough capacity for these projects (projects must stay together):
          </div>
          <div className="flex flex-wrap gap-2">
            {allocationData.unseatedProjects.map((proj) => (
              <div key={proj.projectCode} className="px-2 py-1 bg-red-100 border border-red-200 rounded text-xs">
                <span className="font-mono font-medium text-red-800">{proj.projectCode}</span>
                <span className="text-red-600 ml-1">({proj.seats} seats)</span>
                {proj.businessUnit && (
                  <span className="text-red-500 ml-1 italic">{proj.businessUnit}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Footer */}
      <div className="px-4 py-3 border-t bg-gray-50">
        {unseated === 0 ? (
          <div className="flex items-center gap-2 text-green-600">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">All staff allocated successfully</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {unseated} staff members still need allocation
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ============ DATE RECOMMENDATION BOX ============

interface DateRecommendationBoxProps {
  recommendation: DateRecommendation;
}

function DateRecommendationBox({ recommendation }: DateRecommendationBoxProps) {
  // If capacity is available and stable through December
  const isStableThroughDecember = recommendation.stableThrough?.endsWith('-12');

  // If capacity is available and stable, show success
  if (recommendation.hasCapacity && isStableThroughDecember) {
    return (
      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2 text-green-700">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">Capacity stable through year-end</span>
        </div>
        <p className="text-xs text-green-600 mt-1">
          {recommendation.reason}
        </p>
      </div>
    );
  }

  // If capacity is available but NOT stable through December
  if (recommendation.hasCapacity && !isStableThroughDecember) {
    return (
      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-700">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">Capacity Warning</span>
        </div>
        <p className="text-xs text-yellow-600 mt-1">
          {recommendation.reason}
        </p>
      </div>
    );
  }

  // If no capacity - show recommended month
  if (!recommendation.hasCapacity && recommendation.suggestedClosureMonth) {
    return (
      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 text-blue-700">
          <Lightbulb className="w-4 h-4" />
          <span className="text-sm font-medium">Recommended Closure Date</span>
        </div>
        <p className="text-sm text-blue-800 mt-2 font-medium">
          Suggest closing in {recommendation.suggestedMonthName}
        </p>
        <div className="flex items-center gap-4 mt-2 text-xs text-blue-600">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Capacity: {recommendation.capacityAvailable} seats
          </span>
          <span>Stable through December</span>
        </div>
        <p className="text-xs text-blue-500 mt-2 italic">
          {recommendation.reason}
        </p>
      </div>
    );
  }

  // No capacity at all - show error
  if (!recommendation.hasCapacity && !recommendation.suggestedClosureMonth) {
    return (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">No Stable Capacity Found</span>
        </div>
        <p className="text-xs text-red-600 mt-1">
          {recommendation.reason}
        </p>
      </div>
    );
  }

  return null;
}

// ============ FLOOR/ZONE BREAKDOWN TABLE ============

interface FloorBreakdownTableProps {
  floors: AllocationFloorBreakdown[];
}

function FloorBreakdownTable({ floors }: FloorBreakdownTableProps) {
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());

  const toggleFloor = (floorId: string) => {
    const newExpanded = new Set(expandedFloors);
    if (newExpanded.has(floorId)) {
      newExpanded.delete(floorId);
    } else {
      newExpanded.add(floorId);
    }
    setExpandedFloors(newExpanded);
  };

  const getUtilizationColor = (occupied: number, capacity: number) => {
    if (capacity === 0) return 'text-gray-400';
    const util = (occupied / capacity) * 100;
    if (util > 100) return 'text-red-600';
    if (util >= 95) return 'text-orange-600';
    if (util >= 85) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-gray-50 border-t border-b mx-4 my-1 rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-gray-100 border-b flex items-center gap-2">
        <Layers className="w-4 h-4 text-gray-500" />
        <span className="text-xs font-medium text-gray-600">Floor & Zone Capacity Details</span>
      </div>
      <div className="divide-y divide-gray-200">
        {floors.map((floor) => (
          <div key={floor.floorId}>
            {/* Floor Row */}
            <button
              onClick={() => toggleFloor(floor.floorId)}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 text-sm"
            >
              <div className="flex items-center gap-2">
                {expandedFloors.has(floor.floorId) ? (
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                )}
                <span className="font-medium text-gray-700">{floor.floorName}</span>
                <span className="text-xs text-gray-400">({floor.zones.length} zones)</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-500">
                  {floor.totalOccupied} / {floor.totalCapacity}
                </span>
                <span className={`font-medium ${getUtilizationColor(floor.totalOccupied, floor.totalCapacity)}`}>
                  {floor.totalAvailable} avail
                </span>
              </div>
            </button>

            {/* Zone Details */}
            {expandedFloors.has(floor.floorId) && (
              <div className="bg-white">
                {floor.zones.map((zone) => (
                  <div
                    key={zone.zoneId}
                    className="px-8 py-1.5 flex items-center justify-between text-xs border-t border-gray-100"
                  >
                    <span className="text-gray-600">{zone.zoneName}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 w-20 text-right">
                        {zone.occupied} / {zone.capacity}
                      </span>
                      <span className={`font-medium w-16 text-right ${getUtilizationColor(zone.occupied, zone.capacity)}`}>
                        {zone.available} avail
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
