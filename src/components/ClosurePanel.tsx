import React, { useState } from 'react';
import { Calendar, MapPin, Users, Plus, Trash2, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AddClosureModal } from './AddClosureModal';
import type { ClosurePlanWithDetails } from '../types';

export function ClosurePanel() {
  const { state, selectClosure } = useApp();
  const { closures, selectedClosureId } = state;
  const [showAddModal, setShowAddModal] = useState(false);

  // Group closures by month
  const closuresByMonth = closures.reduce((acc, closure) => {
    const key = closure.yearMonth;
    if (!acc[key]) acc[key] = [];
    acc[key].push(closure);
    return acc;
  }, {} as Record<string, ClosurePlanWithDetails[]>);

  const sortedMonths = Object.keys(closuresByMonth).sort();

  return (
    <div className="bg-white rounded-lg shadow h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Closure Plans
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
          title="Add Closure"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Closures List */}
      <div className="flex-1 overflow-y-auto">
        {sortedMonths.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No closures planned
          </div>
        ) : (
          sortedMonths.map((month) => (
            <div key={month}>
              {/* Month Header */}
              <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase border-b">
                {formatMonthHeader(month)}
              </div>

              {/* Closures in this month */}
              {closuresByMonth[month].map((closure) => (
                <ClosureItem
                  key={closure.id}
                  closure={closure}
                  isSelected={closure.id === selectedClosureId}
                  onSelect={() => selectClosure(closure.id)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-t bg-gray-50 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Total Closures:</span>
          <span className="font-medium">{closures.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Affected:</span>
          <span className="font-medium">
            {closures.reduce((sum, c) => sum + c.seatsAffected, 0)} seats
          </span>
        </div>
      </div>

      {/* Add Closure Modal */}
      <AddClosureModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}

// ============ CLOSURE ITEM ============

interface ClosureItemProps {
  closure: ClosurePlanWithDetails;
  isSelected: boolean;
  onSelect: () => void;
}

function ClosureItem({ closure, isSelected, onSelect }: ClosureItemProps) {
  const statusColor = getStatusColor(closure.status);
  const allocationStatus = closure.unseatedStaff > 0 ? 'warning' : 'success';

  return (
    <div
      onClick={onSelect}
      className={`px-4 py-3 border-b cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800 truncate">{closure.siteName}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor}`}>
              {closure.status}
            </span>
          </div>

          <div className="text-sm text-gray-500 mt-1">
            Floor {closure.floorName}
            {closure.zoneCount && closure.zoneCount > 0 && (
              <span className="text-gray-400 ml-1">
                ({closure.zoneCount} zone{closure.zoneCount > 1 ? 's' : ''})
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {closure.regionName || closure.regionCode}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {closure.seatsAffected} seats
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(closure.closureDate)}
            </span>
          </div>

          {/* Allocation Status */}
          <div className="mt-2">
            {allocationStatus === 'success' ? (
              <span className="text-xs text-green-600">
                All staff allocated ({closure.totalAllocated} seats)
              </span>
            ) : (
              <span className="text-xs text-orange-600">
                {closure.unseatedStaff} staff unallocated
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>
    </div>
  );
}

// ============ HELPERS ============

function formatMonthHeader(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'PLANNED':
      return 'bg-blue-100 text-blue-700';
    case 'IN_PROGRESS':
      return 'bg-yellow-100 text-yellow-700';
    case 'COMPLETED':
      return 'bg-green-100 text-green-700';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}
