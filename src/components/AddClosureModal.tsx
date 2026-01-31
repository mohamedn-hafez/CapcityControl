import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Users, AlertTriangle, Building2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { createClosure, fetchSites } from '../services/api';

interface AddClosureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ZoneInfo {
  id: string;
  code: string;
  name: string;
  siteFloorZoneCode: string;
}

interface FloorWithZones {
  id: string;
  code: string;
  name: string;
  zones?: ZoneInfo[];
}

interface SiteWithFloors {
  id: string;
  code: string;
  name: string;
  status: string;
  region?: { code: string; name: string };
  floors?: FloorWithZones[];
}

export function AddClosureModal({ isOpen, onClose }: AddClosureModalProps) {
  const { refreshData, state } = useApp();

  // Form state
  const [sites, setSites] = useState<SiteWithFloors[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [closureDate, setClosureDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived data
  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const floors = selectedSite?.floors || [];
  const selectedFloor = floors.find((f) => f.id === selectedFloorId);
  const zones = selectedFloor?.zones || [];

  // Get capacity info for all zones in the selected floor from dashboard data
  const floorCapacity = (() => {
    if (!selectedFloor || !state.dashboardData) return null;

    for (const site of state.dashboardData.sites) {
      if (site.siteId !== selectedSiteId) continue;

      for (const floor of site.floors) {
        if (floor.floorId === selectedFloorId) {
          return {
            totalCapacity: floor.totalCapacity,
            totalOccupied: floor.totalOccupied,
            zoneCount: floor.zones.length,
            isClosing: floor.isClosing || false,
          };
        }
      }
    }
    return null;
  })();

  // Load sites on mount
  useEffect(() => {
    if (isOpen) {
      loadSites();
      // Reset form
      setSelectedSiteId('');
      setSelectedFloorId('');
      setClosureDate('');
      setError(null);
    }
  }, [isOpen]);

  // Reset floor when site changes
  useEffect(() => {
    setSelectedFloorId('');
  }, [selectedSiteId]);

  const loadSites = async () => {
    try {
      const response = await fetchSites();
      if (response.success && response.data) {
        setSites(response.data as SiteWithFloors[]);
      }
    } catch (err) {
      console.error('Failed to load sites:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFloorId || !closureDate) {
      setError('Please select a floor and closure date');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await createClosure({
        floorId: selectedFloorId,
        closureDate,
        seatsAffected: floorCapacity?.totalOccupied || 0,
      });

      if (response.success) {
        await refreshData();
        onClose();
      } else {
        setError(response.error || 'Failed to create closure');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Plan Floor Closure</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Site Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a site...</option>
              {sites
                .filter((s) => s.status === 'ACTIVE')
                .map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.code}) - {site.region?.name || site.region?.code}
                  </option>
                ))}
            </select>
          </div>

          {/* Floor Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
            <select
              value={selectedFloorId}
              onChange={(e) => setSelectedFloorId(e.target.value)}
              disabled={!selectedSiteId}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select a floor...</option>
              {floors.map((floor) => (
                <option key={floor.id} value={floor.id}>
                  Floor {floor.name} ({floor.zones?.length || 0} zones)
                </option>
              ))}
            </select>
          </div>

          {/* Closure Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Closure Date
            </label>
            <input
              type="date"
              value={closureDate}
              onChange={(e) => setClosureDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Preview - Floor Info */}
          {selectedFloor && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              <div className="text-sm font-medium text-blue-800">Closure Preview</div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  {selectedSite?.name}
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Building2 className="w-4 h-4" />
                  Floor {selectedFloor.name}
                </div>
              </div>

              {floorCapacity && (
                <>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Users className="w-4 h-4" />
                      {floorCapacity.totalOccupied} / {floorCapacity.totalCapacity} seats
                    </div>
                    <div className="text-gray-600">
                      {floorCapacity.zoneCount} zone{floorCapacity.zoneCount !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="text-sm text-blue-700">
                    <strong>{floorCapacity.totalOccupied}</strong> staff will need to be relocated
                  </div>

                  {floorCapacity.isClosing && (
                    <div className="flex items-center gap-1 text-amber-600 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      This floor already has a closure planned
                    </div>
                  )}
                </>
              )}

              {/* Show zones that will be closed */}
              {zones.length > 0 && (
                <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-blue-200">
                  <span className="font-medium">Zones to close: </span>
                  {zones.map((z) => z.name).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFloorId || !closureDate || isLoading}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Closure Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
