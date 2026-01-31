# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CapacityPulse - A React web application for simulating staff migration scenarios when closing or consolidating facilities. Built with React 19, TypeScript, Vite, and Tailwind CSS (via CDN).

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run preview      # Preview production build
```

## Environment Setup

Create `.env.local` with:
```
GEMINI_API_KEY=your_api_key_here
```

## Architecture

**Single-page application with three layers:**

- **App.tsx** - Main component containing all UI and the capacity simulation algorithm
- **services/geminiService.ts** - Google Gemini AI integration for generating executive summaries
- **components/CapacityChart.tsx** - Recharts-based visualization of site utilization

**Data flow:** Sites state → simulation calculation (useMemo) → UI updates + optional AI analysis

## Domain Model (types.ts)

- **Site** - Facility with capacity, occupancy, status (ACTIVE/CLOSING/EXPANDING), and maintenance buffer %
- **SimulationResult** - Displaced staff count, per-site impacts, unseated staff, overall status

## Capacity Calculation Logic

The simulation algorithm in App.tsx:
1. Separates sites into active/expanding vs closing
2. Calculates displaced staff from closing sites
3. Computes net vacancy per active site: `totalCapacity - currentOccupancy - bufferSeats`
4. Allocates displaced staff to sites with available vacancy
5. Tracks unseated staff if capacity is insufficient

**Risk thresholds:**
- SUCCESS: Utilization ≤ 95%
- RISK: Utilization > 95% and ≤ 100%
- OVERFLOW: Utilization > 100% or unseated staff exist

## AI Integration

Uses `@google/genai` package with Gemini 3 Flash Preview model. The service sends structured prompts containing site data and simulation results, returning executive summaries. Configuration: temperature=0.7, topP=0.95.

## Tech Stack

- React 19.2.4, TypeScript 5.8, Vite 6.2
- Tailwind CSS (CDN in index.html)
- Recharts for charts, Lucide React for icons
- Path alias: `@/*` maps to root directory
