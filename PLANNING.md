# Capacity Planner - Full Design Document

## Project Status: IN PROGRESS

**Last Updated:** January 31, 2026

| Milestone | Status |
|-----------|--------|
| Database Setup | COMPLETE |
| API Layer | COMPLETE |
| Core UI | COMPLETE |
| ZoneOccupancy Schema | COMPLETE |
| Allocation Engine v2 | COMPLETE |
| Modals & Forms | COMPLETE |
| Admin Panel | COMPLETE |
| **Data Fixes (All Months)** | **COMPLETE** |
| **Region Name Display** | **COMPLETE** |
| **Smart Date Recommendation** | **COMPLETE** |
| **Client Grouping** | **COMPLETE** |
| Import/Export | NOT STARTED |
| AI Integration | NOT STARTED |

---

## Confirmed Requirements

| Requirement | Decision | Status |
|-------------|----------|--------|
| Planning Horizon | 12+ months | DONE |
| Multiple Closures | Yes, different sites/dates | DONE |
| Allocation Priority | Same region first, then newest sites | DONE |
| View Level | Expandable floors/zones | DONE |
| Allocations | Editable (user can override) | DONE |
| Closed Zones | Show as "CLOSED" in grid | DONE |
| Data Entry | Manual form + batch import | PARTIAL |
| Geographic Regions | Sites grouped by region for allocation | DONE |
| Region Constraint | ONLY allocate within same region | DONE |
| Project Grouping | Keep same Project together when allocating | DONE |
| BU Grouping | Prefer same Business Unit on same site | DONE |
| Region Display | Show region NAME not CODE | DONE |
| Monthly Data | All 12 months must have capacity data | DONE |
| Smart Date Recommendation | Suggest closure date with stable capacity through year-end | DONE |
| Client Grouping | Group projects by Client under Business Unit | DONE |
| Year-End Stability | Allocations must be stable through December (no re-relocations) | DONE |

---

## User Stories Progress

### US-1: View Monthly Capacity Dashboard
**Status: COMPLETE**

- [x] Grid shows all sites as rows
- [x] Each cell shows "Occupied / Capacity"
- [x] Color coding: Green (<85%), Yellow (85-95%), Orange (95-100%), Red (>100%)
- [x] Click on site row to expand and see floors/zones
- [x] Closed zones show "CLOSED" badge
- [x] Month navigation (Jan-Dec 2026)

---

### US-2: Import Data from Excel
**Status: NOT STARTED**

- [ ] Upload button accepts .xlsx files
- [ ] System reads all sheets (Dim_Site, Dim_Floor, Fact_Capacity, etc.)
- [ ] Preview data before confirming import
- [ ] Show validation errors if data is malformed
- [ ] Merge with existing data or replace entirely (user choice)

---

### US-3: Plan a Site/Zone Closure
**Status: IN PROGRESS**

- [x] Closure plan list panel
- [x] View existing closures grouped by month
- [x] Add closure modal (form to create new closure) ✅
- [x] System shows affected seat count
- [x] Closure appears in timeline with visual indicator
- [x] All months after closure show "CLOSED" status
- [x] Delete closure (API endpoint added)
- [ ] Delete button in UI

---

### US-4: View Allocation Recommendations
**Status: COMPLETE** (Allocation Engine v2)

- [x] When closure is selected, system shows allocations
- [x] Sites sorted by: same region first, then newest, then available capacity
- [x] For each destination: available capacity, recommended allocation, new utilization %
- [x] Warning indicators for sites over 95% utilization
- [x] Unseated staff counter when capacity insufficient
- [x] **v2**: ONLY show sites in same region (hard constraint) ✅
- [x] **v2**: API returns breakdown by Project/BU ✅
- [x] **v2**: Frontend displays Project/BU breakdown ✅
- [x] **v2**: Keep same Project together (cannot split client teams) ✅
- [x] **v2**: Prefer same BU on same site (soft preference) ✅

---

### US-5: Edit Allocation Manually
**Status: COMPLETE**

- [x] Each allocation row is editable (number input)
- [x] Can change the number of seats allocated to each destination
- [x] System validates total doesn't exceed displaced staff count
- [x] Visual warning if allocation exceeds destination capacity
- [x] Save changes button
- [x] Auto-allocate button to reset to recommendations

---

### US-6: Update Monthly Capacity
**Status: NOT STARTED**

- [ ] Click on any cell to edit
- [ ] Can update: capacity, occupied seats
- [ ] Unallocated auto-calculates (capacity - occupied)
- [ ] Changes propagate to dependent calculations
- [ ] Batch edit mode: paste from Excel into multiple cells

---

### US-7: Add New Site (Planned/Opening)
**Status: NOT STARTED**

- [ ] Add site with name, code, opening date
- [ ] Add floors and zones within site
- [ ] Set monthly capacity ramp-up
- [ ] Before opening date, site shows as "PLANNED"
- [ ] After opening date, site is available for allocations

---

### US-8: Generate Executive Summary
**Status: NOT STARTED**

- [ ] Button to generate summary
- [ ] AI analyzes: closures, allocations, risk areas, recommendations
- [ ] Output is readable executive summary
- [ ] Can copy or export summary

---

### US-9: Export Plan to Excel
**Status: NOT STARTED**

- [ ] Export button generates .xlsx file
- [ ] Includes all sheets matching input format
- [ ] Includes allocation plan as new sheet
- [ ] Download automatically starts

---

## Implementation Phases

### Phase 1: Database & API Layer
**Status: COMPLETE**

- [x] Neon PostgreSQL database setup
- [x] Prisma schema with regions
- [x] Database seeded with Excel data
- [x] API: /api/dashboard - Monthly capacity data
- [x] API: /api/sites - Sites listing
- [x] API: /api/closures - Closure plans CRUD
- [x] API: /api/allocations - Allocation recommendations
- [x] API: /api/capacity - Capacity updates

### Phase 2: Core UI Components
**Status: COMPLETE**

- [x] Header component with action buttons
- [x] MonthSelector - Navigate Jan-Dec 2026
- [x] CapacityGrid - Expandable sites/floors/zones
- [x] Color coding by utilization
- [x] ClosurePanel - List of planned closures
- [x] AllocationPanel - Recommendations with editable inputs
- [x] React Context for state management
- [x] Local API server connected to real Neon database
- [x] Vite proxy configured for API requests

### Phase 3: Modals & Forms
**Status: COMPLETE**

- [x] AddClosureModal - Select site/floor/zone + date
- [x] AdminPanel - Full CRUD for all database tables
- [ ] EditCapacityModal - Update capacity/occupancy
- [x] Confirmation dialogs for delete actions
- [x] Form validation

### Phase 4: Import/Export
**Status: NOT STARTED**

- [ ] ImportExcelModal - Upload and parse xlsx
- [ ] Preview imported data
- [ ] Validation and error handling
- [ ] ExportExcel service - Generate downloadable xlsx
- [ ] Export current state to Excel format

### Phase 5: AI & Polish
**Status: NOT STARTED**

- [ ] Gemini AI integration for summaries
- [ ] Executive summary generation
- [ ] Error boundaries
- [ ] Loading skeletons
- [ ] Responsive design adjustments
- [ ] Keyboard shortcuts

---

## Files Created

### API Layer (`/api/`)
| File | Purpose |
|------|---------|
| `db.ts` | Prisma client singleton for Neon |
| `dashboard.ts` | GET monthly capacity by yearMonth |
| `sites.ts` | GET all sites with regions |
| `closures.ts` | GET/POST/DELETE closure plans |
| `allocations.ts` | GET recommendations, POST save allocations |
| `capacity.ts` | PUT update capacity/occupancy |

### Frontend (`/src/`)
| File | Purpose |
|------|---------|
| `types/index.ts` | TypeScript interfaces and utilities |
| `services/api.ts` | API client with mock data fallback |
| `services/mockData.ts` | Sample data for development |
| `context/AppContext.tsx` | React state management |
| `components/Header.tsx` | App header with buttons |
| `components/MonthSelector.tsx` | Month navigation |
| `components/CapacityGrid.tsx` | Main dashboard grid |
| `components/ClosurePanel.tsx` | Closure plans list |
| `components/AllocationPanel.tsx` | Allocation editor |
| `components/AdminPanel.tsx` | Admin CRUD for all DB tables |
| `components/AddClosureModal.tsx` | Modal to create zone closures |

### Configuration
| File | Purpose |
|------|---------|
| `server.ts` | Local Express API server (port 3001) |
| `vite.config.ts` | Vite config with /api proxy |
| `vercel.json` | Vercel deployment config |
| `prisma/schema.prisma` | Database schema |
| `prisma/seed.sql` | SQL seed script |
| `.env` | Neon database credentials |

---

## Technical Stack

| Component | Technology | Status |
|-----------|------------|--------|
| Frontend | React 19 + TypeScript | DONE |
| Styling | Tailwind CSS (CDN) | DONE |
| Charts | Recharts | Available |
| Database | Neon PostgreSQL | DONE |
| ORM | Prisma 7 | DONE |
| Excel I/O | xlsx (SheetJS) | Installed |
| AI | Google Gemini API | Not integrated |
| State | React Context + useReducer | DONE |
| Icons | Lucide React | DONE |
| Deployment | Vercel | Ready |

---

## Next Actions

### ~~Priority 1: Data & Display Fixes~~ ✅ COMPLETE

#### 1.1 Region Name Display ✅
**Status: COMPLETE**
- [x] Show region NAME instead of CODE in ClosurePanel (e.g., "Cairo" not "Africa-1")
- [x] Show region NAME in AllocationPanel header
- [x] Update API to return regionName in all responses

#### 1.2 MonthlyCapacity Data for All Months ✅
**Status: COMPLETE**
- [x] Created API endpoint: POST /api/admin/generate-monthly-capacity
- [x] Created API endpoint: POST /api/admin/generate-monthly-occupancy
- [x] Feb-Dec 2026 data generated from January baseline (605 capacity records, 56 occupancy records)

#### 1.3 Smart Closure Date Recommendation ✅
**Status: COMPLETE**
- [x] When no capacity available in closure month (same region)
- [x] Scan future months (Apr → May → Jun → ...)
- [x] Find first month where capacity is **sufficient AND stable through December**
- [x] Return: `suggestedClosureMonth`, `capacityAvailable`, `stableThrough`, `reason`
- [x] Display in AllocationPanel with visual recommendation box
- [x] Green box: Capacity stable through year-end
- [x] Yellow box: Capacity available but may need reallocation
- [x] Blue box: Suggested closure month with stable capacity
- [x] Red box: No stable capacity found

#### 1.4 Client Grouping in Breakdown ✅
**Status: COMPLETE**
- [x] New hierarchy: Business Unit → Client → Project
- [x] Client = `projectSiteCode` field (AmS1, EBS1, MiS1, etc.)
- [x] API returns nested structure with clients and projects
- [x] Frontend displays collapsible BU → Client → Project hierarchy
- [x] Example:
  ```
  OnShore (BU) → 154 seats
  ├── AmS1 (Client) → 95 seats
  │   ├── P3 → 34
  │   ├── P5 → 32
  │   └── P4 → 29
  ├── EBS1 (Client) → 55 seats
  │   └── P2 → 55
  └── MiS1 (Client) → 4 seats
      └── P6 → 4
  ```

---

### ~~Priority 1: ZoneOccupancy Schema~~ ✅ COMPLETE
- [x] Add `ZoneOccupancy` table to Prisma schema
- [x] Push schema to database
- [x] Import data from Excel `Fact_Occupancy` sheet (1991 rows imported)
- [x] Update allocation API to include project breakdown

### ~~Priority 2: Allocation Engine v2~~ ✅ COMPLETE
Update allocation logic:
- [x] Filter to SAME REGION only (hard constraint)
- [x] API returns Project/BU breakdown with seat counts
- [x] API groups by Business Unit for summary view
- [x] Frontend AllocationPanel displays breakdown (collapsible BU sections)
- [x] Keep Projects together (cannot split) ✅
- [x] Frontend shows allocated projects per site & unseated projects warning
- [x] Prefer same BU on same site (soft preference) ✅

### ~~Priority 3: Add Closure Modal~~ ✅ COMPLETE
Create form to add new closures:
- [x] Select site dropdown
- [x] Select floor dropdown (filtered by site)
- [x] Select zone dropdown (filtered by floor)
- [x] Date picker for closure date
- [x] Preview affected seats
- [x] Submit to API (POST /api/closures)
- [x] Delete closure (DELETE /api/closures)

### Priority 4: Edit Capacity Modal
Allow clicking on any capacity cell to edit:
- Show current capacity and occupancy
- Input fields for new values
- Auto-calculate unallocated
- Save to API

### ~~Priority 5: Test with Real API~~ ✅ COMPLETE
- [x] Local Express API server (server.ts) connected to Neon
- [x] Vite proxy configured for /api/* requests
- [x] All API endpoints tested and working with real data

### Priority 5: Import/Export Excel
- Build import modal with file upload
- Parse xlsx and validate data
- Build export functionality

### Priority 6: AI Summary
- Integrate Gemini API
- Generate executive summary from current data
- Display in modal or side panel

---

## Allocation Engine v2

### Data Structure ✅ COMPLETE

**Table: `ZoneOccupancy`** (imported from Excel Fact_Occupancy - 1991 rows)
```
- zoneId → Zone
- projectId → Project
- queueId → Queue (Business Unit)
- yearMonth → "2026-01"
- seats → headcount per project in zone
```

**Example API Response: Zone S1F03Z03 (ABS Floor 18)**
```json
{
  "occupancyBreakdown": [
    {"projectCode": "P2", "projectSiteCode": "EBS1", "businessUnit": "OnShore", "seats": 55},
    {"projectCode": "P3", "projectSiteCode": "AmS1", "businessUnit": "OnShore", "seats": 34},
    {"projectCode": "P5", "projectSiteCode": "AmS1", "businessUnit": "OnShore", "seats": 32},
    {"projectCode": "P4", "projectSiteCode": "AmS1", "businessUnit": "OnShore", "seats": 29},
    {"projectCode": "P6", "projectSiteCode": "MiS1", "businessUnit": "OnShore", "seats": 4},
    {"projectCode": "P1", "projectSiteCode": "RTS1", "businessUnit": "OnShore - SF", "seats": 1}
  ],
  "byBusinessUnit": [
    {"businessUnit": "OnShore", "totalSeats": 154, "projects": [...]},
    {"businessUnit": "OnShore - SF", "totalSeats": 1, "projects": [...]}
  ]
}
```

### Allocation Rules

**Hard Constraints (MUST)**
1. Same Region ONLY - never suggest sites from other regions
2. Project stays together - cannot split a client's team across sites

**Soft Preferences (SHOULD)**
3. Same Business Unit on same floor when possible
4. Fill zones sequentially, don't scatter across floors

### Algorithm Flow
1. Get zone occupancy breakdown (projects + headcounts)
2. Group by Business Unit
3. Find destination zones in SAME REGION only
4. Allocate BU groups together when capacity allows
5. Track unseated if insufficient capacity

---

## Allocation Engine v3 (PLANNED)

### Enhanced Smart Allocation

**New Feature: Closure Date Recommendation**

When user selects a closure date (e.g., April 2026) but no capacity is available:

1. **Scan Future Months**: Apr → May → Jun → Jul → Aug → Sep → Oct → Nov → Dec
2. **Check Capacity Stability**: For each candidate month, verify capacity remains sufficient through December
3. **Return Recommendation**:
   ```json
   {
     "hasCapacity": false,
     "suggestedClosureMonth": "2026-06",
     "suggestedMonthName": "June 2026",
     "capacityAvailable": 161,
     "stableThrough": "2026-12",
     "reason": "Capacity available and stable through year-end"
   }
   ```

**Why Year-End Stability?**
- Relocating staff is expensive (moving costs, training, productivity loss)
- Cannot relocate same staff multiple times in a year
- Management needs predictable, stable headcount planning

### Client Grouping Structure

**Current**: BU → Project
**New**: BU → Client → Project

```
Business Unit: OnShore (154 seats total)
├── Client: EBS1 (55 seats)
│   └── Project: P2 (55 seats)
├── Client: AmS1 (95 seats)
│   ├── Project: P3 (34 seats)
│   ├── Project: P5 (32 seats)
│   └── Project: P4 (29 seats)
└── Client: MiS1 (4 seats)
    └── Project: P6 (4 seats)
```

**Database Mapping**:
- `Project.projectSiteCode` = Client code (AmS1, EBS1, MiS1)
- Client is NOT a separate table, just a grouping field

---

## Data Source Strategy

**Decision: App as Primary Source**

- Initial data imported via SQL seed script
- All edits happen in the web app
- Data persists in Neon PostgreSQL database
- Export to Excel for sharing with stakeholders

---

## Database Schema v2 (PLANNED)

### Overview

The new schema separates concerns more cleanly:
- **Dimension Tables**: Static reference data (Region, Site, Floor, Zone, Client, Project)
- **Fact Tables**: Time-varying data entered by users (ZoneCapacity, ProjectAssignment)
- **Closure Planning**: Floor-level closures (not zone-level)

### Design Principles

1. **Monthly Fact Tables**: Capacity and assignments are tracked monthly via user-entered data
2. **Force Split for Multi-Zone Projects**: If a project needs to be in 2 zones, create 2 separate project entries
3. **Floor-Level Closures**: We close floors (with all their zones), not individual zones
4. **Client → Project Hierarchy**: Client is the parent of Project (not Site)

### New Entity Relationship

```
Region (1) ─────────────► Site (many)
                              │
                              ▼
                         Floor (many)
                              │
                              ▼
                         Zone (many)
                              │
                              ├──► ZoneCapacity (zone + yearMonth → capacity)
                              │
                              └──► ProjectAssignment (project + zone + yearMonth → seats)
                                        │
                                        ▼
Client (1) ──────────► Project (many) ◄─┘

Floor (1) ──────────► ClosurePlan (many) ──► closureDate, yearMonth
```

### Dimension Tables

#### Region (unchanged)
```sql
Region
├── id (PK)
├── code (unique) -- RIYADH, EASTERN, UAE, EUROPE
├── name -- Riyadh, Eastern Province, UAE, Europe
├── country -- Saudi Arabia, UAE, Poland
└── sites[] -- relation to Site
```

#### Site (unchanged)
```sql
Site
├── id (PK)
├── code (unique) -- S1, S2, etc.
├── name -- ABS, Crystal Plaza, etc.
├── regionId (FK) → Region
├── status -- ACTIVE, CLOSING, PLANNED, CLOSED
├── openingDate
├── closingDate
└── floors[] -- relation to Floor
```

#### Floor (unchanged)
```sql
Floor
├── id (PK)
├── code -- F01, F02, etc.
├── name -- "11", "12", "G", etc.
├── siteId (FK) → Site
├── zones[] -- relation to Zone
└── closurePlans[] -- NEW: relation to ClosurePlan
```

#### Zone (unchanged)
```sql
Zone
├── id (PK)
├── code -- Z01, Z02, etc.
├── name -- A, B, C, 1, 2, etc.
├── siteFloorZoneCode (unique) -- S1F01Z01
├── floorId (FK) → Floor
├── zoneCapacities[] -- relation to ZoneCapacity
└── projectAssignments[] -- relation to ProjectAssignment
```

#### Client (NEW)
```sql
Client
├── id (PK)
├── code (unique) -- AmS1, EBS1, MiS1, RTS1, etc.
├── name -- American Services 1, EB Services 1, etc.
└── projects[] -- relation to Project
```

#### Project (MODIFIED)
```sql
Project
├── id (PK)
├── code (unique) -- P1, P2, etc.
├── name
├── clientId (FK) → Client -- CHANGED from siteId
└── projectAssignments[] -- relation to ProjectAssignment
```

#### Queue (unchanged)
```sql
Queue
├── id (PK)
├── code (unique) -- BU1, BU2, etc.
├── name -- Gulf, Hosting, OffShore, etc.
└── projectAssignments[] -- relation to ProjectAssignment
```

### Fact Tables

#### ZoneCapacity (renamed from MonthlyCapacity)
```sql
ZoneCapacity
├── id (PK)
├── zoneId (FK) → Zone
├── yearMonth -- "2026-01"
├── capacity -- Total seats available in zone
└── (unique: zoneId + yearMonth)
```

**Note**: `occupiedSeats` and `unallocated` are CALCULATED from ProjectAssignment, not stored.

#### ProjectAssignment (renamed from ZoneOccupancy)
```sql
ProjectAssignment
├── id (PK)
├── projectId (FK) → Project
├── zoneId (FK) → Zone
├── queueId (FK) → Queue (Business Unit)
├── yearMonth -- "2026-01"
├── seats -- Headcount for this project in this zone
└── (unique: projectId + zoneId + yearMonth)
```

### Closure Planning

#### ClosurePlan (MODIFIED - now at Floor level)
```sql
ClosurePlan
├── id (PK)
├── floorId (FK) → Floor -- CHANGED from zoneId
├── closureDate
├── yearMonth -- "2026-04"
├── seatsAffected -- calculated from all zones in floor
├── status -- PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
└── allocations[] -- relation to Allocation
```

#### Allocation (unchanged)
```sql
Allocation
├── id (PK)
├── closurePlanId (FK) → ClosurePlan
├── sourceZoneId (FK) → Zone
├── targetZoneId (FK) → Zone
├── allocatedSeats
├── allocationDate
└── isManual
```

### Calculated Fields (not stored)

When displaying capacity data:
- `occupiedSeats` = SUM(ProjectAssignment.seats) WHERE zoneId = X AND yearMonth = Y
- `unallocated` = ZoneCapacity.capacity - occupiedSeats
- `utilizationPct` = (occupiedSeats / capacity) * 100

---

## Schema v2 Migration Impact Analysis

### Files Requiring Changes

#### HIGH IMPACT (Major Changes)

| File | Changes Required |
|------|------------------|
| `prisma/schema.prisma` | Add Client model, modify Project (clientId instead of siteId), modify ClosurePlan (floorId instead of zoneId), rename ZoneOccupancy → ProjectAssignment, simplify MonthlyCapacity (remove occupiedSeats/unallocated) |
| `server.ts` | Update ALL API endpoints - dashboard needs to calculate occupancy from ProjectAssignment, closures need floor-level logic, allocations need new joins |
| `src/services/api.ts` | Update TypeScript interfaces to match new schema |
| `src/types/index.ts` | Update types for Client, Project, ClosurePlan, etc. |

#### MEDIUM IMPACT (Moderate Changes)

| File | Changes Required |
|------|------------------|
| `src/components/AdminPanel.tsx` | Add Client CRUD, update Project form (Client dropdown instead of Site), update ClosurePlan form (Floor dropdown instead of Zone) |
| `src/components/AddClosureModal.tsx` | Change from zone selection to floor selection |
| `src/components/AllocationPanel.tsx` | Update to show Client → Project hierarchy |
| `src/components/ClosurePanel.tsx` | Update to show floor-level closures |

#### LOW IMPACT (Minor Changes)

| File | Changes Required |
|------|------------------|
| `src/components/CapacityGrid.tsx` | Minor updates to reflect new data structure |
| `src/context/AppContext.tsx` | Update state types |
| `prisma/seed.sql` | Rewrite to populate new schema |

### Migration Steps

1. **Create new Prisma schema** (schema.prisma v2)
2. **Create migration script** to:
   - Create Client table from unique projectSiteCode values
   - Update Project records to reference Client instead of Site
   - Create new ClosurePlan records at floor level
   - Rename ZoneOccupancy → ProjectAssignment
   - Simplify MonthlyCapacity (remove calculated fields)
3. **Update server.ts** - all API endpoints
4. **Update frontend types** and components
5. **Test all flows** (dashboard, closures, allocations, admin)

### Complexity Assessment

| Area | Complexity | Effort |
|------|------------|--------|
| Prisma Schema | Medium | ~1 hour |
| Data Migration | Medium | ~2 hours |
| Server API | High | ~4 hours |
| Frontend Types | Low | ~30 min |
| AdminPanel | Medium | ~2 hours |
| ClosurePanel | Low | ~1 hour |
| AllocationPanel | Medium | ~2 hours |
| AddClosureModal | Low | ~1 hour |
| Testing | Medium | ~2 hours |
| **Total** | **Medium-High** | **~15-16 hours** |

### Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Data loss during migration | Low | Take DB backup before migration |
| Breaking existing functionality | Medium | Test each component after changes |
| Allocation logic breaks | Medium | Keep existing allocation algorithm, just update data sources |
| Performance regression | Low | Calculated fields add minor overhead |

### Recommended Approach

1. **Backup current database** before any changes
2. **Create new schema** without dropping existing tables
3. **Migrate data** in a single transaction
4. **Update API** one endpoint at a time
5. **Update frontend** to use new data structures
6. **Run full regression test** before deploying

---

## Admin Panel v2 - Data Entry & Import

### Overview

After the database schema changes, the Admin Panel needs to support:
1. **Manual Entry**: Forms to add/edit records one at a time
2. **Bulk Import**: Upload CSV/Excel files using provided templates
3. **Template Downloads**: Users can download blank templates for each table

### UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Admin Panel                                              [X]   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐                                                │
│  │ Dimensions  │  ← Tab Group 1                                 │
│  │ ─────────── │                                                │
│  │ • Regions   │                                                │
│  │ • Sites     │                                                │
│  │ • Floors    │                                                │
│  │ • Zones     │                                                │
│  │ • Clients   │  ← NEW                                         │
│  │ • Projects  │                                                │
│  │ • Queues    │                                                │
│  ├─────────────┤                                                │
│  │ Fact Tables │  ← Tab Group 2                                 │
│  │ ─────────── │                                                │
│  │ • Zone      │                                                │
│  │   Capacity  │                                                │
│  │ • Project   │                                                │
│  │   Assignment│                                                │
│  ├─────────────┤                                                │
│  │ Closures    │  ← Tab Group 3                                 │
│  │ ─────────── │                                                │
│  │ • Closure   │                                                │
│  │   Plans     │                                                │
│  └─────────────┘                                                │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  [+ Add New]  [📥 Import CSV]  [📄 Download Template]     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Data Table with Edit/Delete actions                      │  │
│  │  ...                                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Dimension Tables - Forms & Templates

#### 1. Regions

**Manual Entry Form:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Code | Text | Yes | Unique, uppercase, no spaces |
| Name | Text | Yes | - |
| Country | Text | Yes | - |

**Import Template (regions_template.csv):**
```csv
code,name,country
RIYADH,Riyadh,Saudi Arabia
EASTERN,Eastern Province,Saudi Arabia
UAE,UAE,United Arab Emirates
EUROPE,Europe,Poland
```

---

#### 2. Sites

**Manual Entry Form:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Code | Text | Yes | Unique (S1, S2, etc.) |
| Name | Text | Yes | - |
| Region | Dropdown | Yes | Select from existing regions |
| Status | Dropdown | Yes | ACTIVE, CLOSING, PLANNED, CLOSED |
| Opening Date | Date | No | - |
| Closing Date | Date | No | - |

**Import Template (sites_template.csv):**
```csv
code,name,region_code,status,opening_date,closing_date
S1,ABS,RIYADH,ACTIVE,,
S2,Crystal Plaza,RIYADH,ACTIVE,,
S3,Sahafa Tower,EASTERN,ACTIVE,,
S4,Dammam Hub,EASTERN,PLANNED,2026-06-01,
```

**Notes:**
- `region_code` must match an existing Region.code
- Dates in YYYY-MM-DD format
- Leave dates empty if not applicable

---

#### 3. Floors

**Manual Entry Form:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Code | Text | Yes | F01, F02, etc. |
| Name | Text | Yes | Display name (e.g., "Floor 11", "Ground") |
| Site | Dropdown | Yes | Select from existing sites |

**Import Template (floors_template.csv):**
```csv
site_code,floor_code,floor_name
S1,F01,Floor 11
S1,F02,Floor 12
S1,F03,Floor 18
S2,F01,Ground
S2,F02,1st Floor
```

**Notes:**
- `site_code` must match an existing Site.code
- Combination of site_code + floor_code must be unique

---

#### 4. Zones

**Manual Entry Form:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Code | Text | Yes | Z01, Z02, etc. |
| Name | Text | Yes | Display name (e.g., "A", "B", "Zone 1") |
| Site | Dropdown | Yes | Filter for Floor dropdown |
| Floor | Dropdown | Yes | Filtered by selected Site |

**Import Template (zones_template.csv):**
```csv
site_code,floor_code,zone_code,zone_name
S1,F01,Z01,A
S1,F01,Z02,B
S1,F02,Z01,A
S1,F02,Z02,B
S1,F03,Z01,A
S1,F03,Z02,B
S1,F03,Z03,C
```

**Notes:**
- System auto-generates `siteFloorZoneCode` as S1F01Z01 format
- Combination of site_code + floor_code + zone_code must be unique

---

#### 5. Clients (NEW)

**Manual Entry Form:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Code | Text | Yes | Unique (AmS1, EBS1, etc.) |
| Name | Text | No | Full client name |

**Import Template (clients_template.csv):**
```csv
code,name
AmS1,American Services 1
EBS1,EB Services 1
MiS1,MI Services 1
RTS1,RT Services 1
GfS1,GF Services 1
```

---

#### 6. Projects

**Manual Entry Form:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Code | Text | Yes | Unique (P1, P2, etc.) |
| Name | Text | No | Project name |
| Client | Dropdown | Yes | Select from existing clients |

**Import Template (projects_template.csv):**
```csv
code,name,client_code
P1,Project 1,RTS1
P2,Project 2,EBS1
P3,Project 3,AmS1
P4,Project 4,AmS1
P5,Project 5,AmS1
P6,Project 6,MiS1
```

**Notes:**
- `client_code` must match an existing Client.code
- One project belongs to exactly one client
- If project needs to be in multiple zones, create separate project entries (force split)

---

#### 7. Queues (Business Units)

**Manual Entry Form:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Code | Text | Yes | Unique (BU1, BU2, etc.) |
| Name | Text | Yes | Business unit name |

**Import Template (queues_template.csv):**
```csv
code,name
BU1,Gulf
BU2,Hosting
BU3,OffShore
BU4,OnShore
BU5,OnShore - SF
```

---

### Fact Tables - Forms & Templates

#### 8. Zone Capacity (Monthly)

**Manual Entry Form:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Site | Dropdown | Yes | Filter for Floor/Zone |
| Floor | Dropdown | Yes | Filtered by Site |
| Zone | Dropdown | Yes | Filtered by Floor |
| Year-Month | Month Picker | Yes | YYYY-MM format |
| Capacity | Number | Yes | >= 0 |

**Import Template (zone_capacity_template.csv):**
```csv
site_floor_zone_code,year_month,capacity
S1F01Z01,2026-01,120
S1F01Z02,2026-01,100
S1F02Z01,2026-01,85
S1F02Z02,2026-01,90
S1F01Z01,2026-02,120
S1F01Z02,2026-02,100
```

**Notes:**
- `site_floor_zone_code` must match an existing Zone.siteFloorZoneCode
- `year_month` in YYYY-MM format
- Each zone + year_month combination must be unique
- Import can update existing records (upsert)

**Bulk Generation Option:**
- "Copy from previous month" button
- Select source month → target month
- System copies all capacity records to new month

---

#### 9. Project Assignment (Monthly Headcount)

**Manual Entry Form:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Project | Dropdown | Yes | - |
| Site | Dropdown | Yes | Filter for Floor/Zone |
| Floor | Dropdown | Yes | Filtered by Site |
| Zone | Dropdown | Yes | Filtered by Floor |
| Business Unit | Dropdown | Yes | - |
| Year-Month | Month Picker | Yes | YYYY-MM format |
| Seats | Number | Yes | >= 0 |

**Import Template (project_assignment_template.csv):**
```csv
project_code,site_floor_zone_code,queue_code,year_month,seats
P1,S1F01Z01,BU4,2026-01,25
P2,S1F01Z01,BU4,2026-01,55
P3,S1F01Z02,BU4,2026-01,34
P4,S1F02Z01,BU4,2026-01,29
P5,S1F02Z02,BU4,2026-01,32
P6,S1F03Z01,BU4,2026-01,4
```

**Notes:**
- `project_code` must match an existing Project.code
- `site_floor_zone_code` must match an existing Zone.siteFloorZoneCode
- `queue_code` must match an existing Queue.code
- Each project + zone + year_month combination must be unique
- Import can update existing records (upsert)

**Bulk Generation Option:**
- "Copy from previous month" button
- Select source month → target month
- System copies all assignment records to new month

---

### Closure Plans - Form & Template

#### 10. Closure Plans (Floor-Level)

**Manual Entry Form:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Site | Dropdown | Yes | Filter for Floor |
| Floor | Dropdown | Yes | Filtered by Site |
| Closure Date | Date Picker | Yes | - |
| Status | Dropdown | Yes | PLANNED, IN_PROGRESS, COMPLETED, CANCELLED |

**Import Template (closure_plans_template.csv):**
```csv
site_code,floor_code,closure_date,status
S1,F03,2026-04-01,PLANNED
S2,F01,2026-06-15,PLANNED
```

**Notes:**
- `site_code` + `floor_code` must match existing Site and Floor
- System auto-calculates `seatsAffected` from all zones in the floor
- System auto-generates `yearMonth` from closure_date

---

### Import Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Download    │ ──► │  Fill Data   │ ──► │   Upload     │ ──► │   Preview    │
│  Template    │     │  in Excel    │     │   CSV File   │     │   & Confirm  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                      │
                                                                      ▼
                                          ┌──────────────┐     ┌──────────────┐
                                          │   Success    │ ◄── │   Validate   │
                                          │   Summary    │     │   & Import   │
                                          └──────────────┘     └──────────────┘
```

**Step 1: Download Template**
- User clicks "Download Template" button
- System provides CSV file with headers and example rows
- Example rows are commented or marked as samples

**Step 2: Fill Data**
- User opens CSV in Excel/Sheets
- Fills in data following the format
- Saves as CSV (UTF-8)

**Step 3: Upload CSV**
- User clicks "Import CSV" button
- File picker opens
- User selects file

**Step 4: Preview & Validate**
- System parses CSV
- Shows preview table with:
  - ✅ Valid rows (green)
  - ⚠️ Rows that will update existing records (yellow)
  - ❌ Invalid rows with error messages (red)
- Shows summary: "X new records, Y updates, Z errors"

**Step 5: Confirm Import**
- User reviews and clicks "Import" or "Cancel"
- System processes valid rows
- Shows success summary with counts

**Error Handling:**
| Error Type | Message | Resolution |
|------------|---------|------------|
| Missing required field | "Row 5: 'code' is required" | Add missing value |
| Invalid reference | "Row 3: region_code 'XYZ' not found" | Use valid reference code |
| Duplicate key | "Row 7: Site code 'S1' already exists" | Remove duplicate or use update |
| Invalid format | "Row 2: 'opening_date' must be YYYY-MM-DD" | Fix date format |

---

### API Endpoints for Import

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/templates/:table` | GET | Download blank template CSV |
| `/api/admin/import/:table/validate` | POST | Validate CSV without importing |
| `/api/admin/import/:table` | POST | Import CSV data |
| `/api/admin/import/:table/preview` | POST | Parse and return preview data |

**Request (Import):**
```json
POST /api/admin/import/zones
Content-Type: multipart/form-data

file: zones_data.csv
mode: "upsert" | "insert_only" | "update_only"
```

**Response (Preview):**
```json
{
  "valid": [
    {"row": 1, "data": {"code": "Z01", "name": "A", ...}, "action": "insert"},
    {"row": 2, "data": {"code": "Z02", "name": "B", ...}, "action": "update"}
  ],
  "errors": [
    {"row": 3, "field": "site_code", "message": "Site 'S99' not found"}
  ],
  "summary": {
    "total": 3,
    "valid": 2,
    "inserts": 1,
    "updates": 1,
    "errors": 1
  }
}
```

---

### Implementation Priority

| Priority | Table | Complexity |
|----------|-------|------------|
| 1 | Clients | Low - New simple table |
| 2 | Projects | Low - Update existing form |
| 3 | Zone Capacity | Medium - Fact table with month picker |
| 4 | Project Assignment | Medium - Fact table with multiple lookups |
| 5 | Closure Plans | Low - Update to floor-level |
| 6 | Import System | High - Reusable for all tables |

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/AdminPanel.tsx` | Modify | Add Clients tab, update forms, add import UI |
| `src/components/ImportModal.tsx` | Create | Reusable import modal with preview |
| `src/components/TemplateDownload.tsx` | Create | Template download buttons |
| `server.ts` | Modify | Add import endpoints |
| `src/services/api.ts` | Modify | Add import API functions |
| `public/templates/*.csv` | Create | Template files for each table |
