import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type {
  Site,
  MonthlyDashboardData,
  ClosurePlanWithDetails,
} from '../types';
import * as api from '../services/api';

// ============ STATE ============

interface AppState {
  // Data
  sites: Site[];
  dashboardData: MonthlyDashboardData | null;
  closures: ClosurePlanWithDetails[];

  // UI State
  selectedYearMonth: string;
  selectedClosureId: string | null;
  expandedSites: Set<string>;

  // Loading states
  isLoading: boolean;
  error: string | null;
}

const initialState: AppState = {
  sites: [],
  dashboardData: null,
  closures: [],
  selectedYearMonth: '2026-01',
  selectedClosureId: null,
  expandedSites: new Set(),
  isLoading: false,
  error: null,
};

// ============ ACTIONS ============

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SITES'; payload: Site[] }
  | { type: 'SET_DASHBOARD_DATA'; payload: MonthlyDashboardData }
  | { type: 'SET_CLOSURES'; payload: ClosurePlanWithDetails[] }
  | { type: 'SET_SELECTED_MONTH'; payload: string }
  | { type: 'SET_SELECTED_CLOSURE'; payload: string | null }
  | { type: 'TOGGLE_SITE_EXPANDED'; payload: string }
  | { type: 'EXPAND_ALL_SITES' }
  | { type: 'COLLAPSE_ALL_SITES' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SITES':
      return { ...state, sites: action.payload };
    case 'SET_DASHBOARD_DATA':
      return { ...state, dashboardData: action.payload };
    case 'SET_CLOSURES':
      return { ...state, closures: action.payload };
    case 'SET_SELECTED_MONTH':
      return { ...state, selectedYearMonth: action.payload };
    case 'SET_SELECTED_CLOSURE':
      return { ...state, selectedClosureId: action.payload };
    case 'TOGGLE_SITE_EXPANDED': {
      const newSet = new Set(state.expandedSites);
      if (newSet.has(action.payload)) {
        newSet.delete(action.payload);
      } else {
        newSet.add(action.payload);
      }
      return { ...state, expandedSites: newSet };
    }
    case 'EXPAND_ALL_SITES':
      return {
        ...state,
        expandedSites: new Set(state.dashboardData?.sites.map((s) => s.siteId) || []),
      };
    case 'COLLAPSE_ALL_SITES':
      return { ...state, expandedSites: new Set() };
    default:
      return state;
  }
}

// ============ CONTEXT ============

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Actions
  loadDashboard: (yearMonth?: string) => Promise<void>;
  loadClosures: () => Promise<void>;
  selectMonth: (yearMonth: string) => void;
  selectClosure: (closureId: string | null) => void;
  toggleSiteExpanded: (siteId: string) => void;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

// ============ PROVIDER ============

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadDashboard = async (yearMonth?: string) => {
    const month = yearMonth || state.selectedYearMonth;
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await api.fetchDashboard(month);
      if (response.success && response.data) {
        dispatch({ type: 'SET_DASHBOARD_DATA', payload: response.data });
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to load dashboard' });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadClosures = async () => {
    try {
      const response = await api.fetchClosures();
      if (response.success && response.data) {
        dispatch({ type: 'SET_CLOSURES', payload: response.data });
      }
    } catch (error: any) {
      console.error('Failed to load closures:', error);
    }
  };

  const selectMonth = (yearMonth: string) => {
    dispatch({ type: 'SET_SELECTED_MONTH', payload: yearMonth });
    loadDashboard(yearMonth);
  };

  const selectClosure = (closureId: string | null) => {
    dispatch({ type: 'SET_SELECTED_CLOSURE', payload: closureId });
  };

  const toggleSiteExpanded = (siteId: string) => {
    dispatch({ type: 'TOGGLE_SITE_EXPANDED', payload: siteId });
  };

  const refreshData = async () => {
    await Promise.all([loadDashboard(), loadClosures()]);
  };

  // Initial load
  useEffect(() => {
    refreshData();
  }, []);

  const value: AppContextType = {
    state,
    dispatch,
    loadDashboard,
    loadClosures,
    selectMonth,
    selectClosure,
    toggleSiteExpanded,
    refreshData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ============ HOOK ============

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
