import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getMonthName } from '../types';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const YEAR = 2026;

export function MonthSelector() {
  const { state, selectMonth } = useApp();
  const [, currentMonth] = state.selectedYearMonth.split('-').map(Number);

  const handlePrevMonth = () => {
    if (currentMonth > 1) {
      selectMonth(`${YEAR}-${String(currentMonth - 1).padStart(2, '0')}`);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth < 12) {
      selectMonth(`${YEAR}-${String(currentMonth + 1).padStart(2, '0')}`);
    }
  };

  return (
    <div className="bg-white border-b px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-700">{YEAR}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            disabled={currentMonth === 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex gap-1">
            {MONTHS.map((month) => {
              const isSelected = month === currentMonth;
              return (
                <button
                  key={month}
                  onClick={() => selectMonth(`${YEAR}-${String(month).padStart(2, '0')}`)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {getMonthName(month)}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleNextMonth}
            disabled={currentMonth === 12}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="text-sm text-gray-500">
          {state.dashboardData && (
            <span>
              Total: {state.dashboardData.totalOccupied.toLocaleString()} /{' '}
              {state.dashboardData.totalCapacity.toLocaleString()} seats
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
