import React from 'react';
import { LayoutDashboard, Upload, Download, Sparkles, Settings } from 'lucide-react';

interface HeaderProps {
  onImport?: () => void;
  onExport?: () => void;
  onAISummary?: () => void;
  onAdmin?: () => void;
}

export function Header({ onImport, onExport, onAISummary, onAdmin }: HeaderProps) {
  return (
    <header className="bg-white border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">CapacityPulse</h1>
            <p className="text-sm text-gray-500">Call Center Site Consolidation</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAdmin}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700"
          >
            <Settings className="w-4 h-4" />
            Admin
          </button>
          <button
            onClick={onImport}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={onAISummary}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Sparkles className="w-4 h-4" />
            AI Summary
          </button>
        </div>
      </div>
    </header>
  );
}
