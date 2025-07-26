# TICKET-015: Multiple Watchlists

**Priority:** Medium  
**Story Points:** 5  
**Sprint:** TBD  
**Release:** 0.3.0  
**Type:** Feature Enhancement  

## Description

Extend the current watchlist functionality to support multiple named watchlists, allowing users to organize their tracked stocks into different categories (e.g., "Tech Stocks", "Dividend Stocks", "Growth Stocks", "Penny Stocks"). This will enable better organization and categorization of stocks that users want to monitor but don't necessarily own.

## Current State Analysis

### Current Watchlist Implementation
- **Current Approach**: Stocks with `quantity = 0` are treated as watchlist items
- **Limitation**: All watchlist items are in a single, unnamed list
- **Display**: Mixed with portfolio holdings in the same table
- **Organization**: No categorization or grouping capabilities

## Requirements

### 1. Database Schema Updates

#### 1.1 Watchlist Model
```prisma
model Watchlist {
  id          String   @id @default(cuid())
  userId      String   // Foreign key to User
  name        String   // User-defined name (e.g., "Tech Stocks")
  description String?  // Optional description
  color       String?  // Optional color for UI differentiation
  isDefault   Boolean  @default(false) // Default watchlist for quick adds
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  items       WatchlistItem[]
  
  @@index([userId])
  @@unique([userId, name]) // Unique watchlist names per user
}
```

#### 1.2 Watchlist Item Model
```prisma
model WatchlistItem {
  id          String    @id @default(cuid())
  watchlistId String    // Foreign key to Watchlist
  symbol      String    // Stock symbol
  notes       String?   // Optional user notes
  addedAt     DateTime  @default(now())
  targetPrice Float?    // Optional price target/alert
  
  // Relations
  watchlist   Watchlist @relation(fields: [watchlistId], references: [id], onDelete: Cascade)
  
  @@index([watchlistId])
  @@unique([watchlistId, symbol]) // Prevent duplicate symbols per watchlist
}
```

#### 1.3 Portfolio Model Updates
```prisma
model Portfolio {
  id            String   @id @default(cuid())
  userId        String   // Foreign key to User
  symbol        String
  quantity      Int      // Remove support for 0 - use Watchlist instead
  purchasePrice Float
  purchaseDate  DateTime
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([userId, symbol])
  
  // Constraint: quantity must be > 0 for actual holdings
  @@check([quantity > 0])
}
```

### 2. Backend API Changes

#### 2.1 New Watchlist Endpoints
```typescript
// Watchlist Management
GET    /api/watchlists              → Get all user watchlists
POST   /api/watchlists              → Create new watchlist
GET    /api/watchlists/:id          → Get specific watchlist with items
PUT    /api/watchlists/:id          → Update watchlist details
DELETE /api/watchlists/:id          → Delete watchlist

// Watchlist Items
POST   /api/watchlists/:id/items    → Add stock to watchlist
DELETE /api/watchlists/:id/items/:symbol → Remove stock from watchlist
PUT    /api/watchlists/:id/items/:symbol → Update item (notes, target price)

// Bulk Operations
POST   /api/watchlists/:id/items/bulk → Add multiple stocks
DELETE /api/watchlists/:id/items/bulk → Remove multiple stocks
```

#### 2.2 Updated Portfolio Endpoints
```typescript
// Remove quantity=0 support from portfolio endpoints
// Portfolio endpoints now only handle actual holdings (quantity > 0)
POST   /api/portfolio               → Create portfolio holding (quantity > 0)
GET    /api/portfolio               → Get actual holdings only
PUT    /api/portfolio/:id           → Update holding
DELETE /api/portfolio/:id           → Delete holding
GET    /api/portfolio/summary       → Summary of actual holdings only
```

### 3. Frontend Changes

#### 3.1 Watchlist Management UI
- [ ] Watchlist creation modal with name, description, color picker
- [ ] Watchlist listing/overview page
- [ ] Watchlist editing capabilities
- [ ] Default watchlist selection

#### 3.2 Navigation Updates
- [ ] Separate navigation for "Portfolio" vs "Watchlists"
- [ ] Watchlist dropdown/tabs for switching between lists
- [ ] Quick-add to default watchlist functionality

#### 3.3 Stock Management Updates
- [ ] "Add to Watchlist" dropdown in stock addition form
- [ ] Move stock between watchlists functionality
- [ ] Convert watchlist item to portfolio holding
- [ ] Bulk operations for watchlist management

#### 3.4 Display Components
```typescript
// New components needed:
- WatchlistSelector
- WatchlistCreator
- WatchlistManager
- WatchlistTable (separate from PortfolioTable)
- WatchlistSummary
```

### 4. Data Migration Strategy

#### 4.1 Migration Plan
```sql
-- Step 1: Create Watchlist and WatchlistItem tables
-- Step 2: Create default watchlist for each user
-- Step 3: Migrate existing Portfolio items with quantity=0 to default watchlist
-- Step 4: Remove Portfolio items with quantity=0
-- Step 5: Add constraint to Portfolio table (quantity > 0)
```

#### 4.2 Migration Script
- [ ] Preserve all existing watchlist data (quantity=0 items)
- [ ] Create "Default Watchlist" for existing users
- [ ] Migrate portfolio items with quantity=0 to watchlist items
- [ ] Clean up portfolio table to only contain actual holdings

### 5. UI/UX Enhancements

#### 5.1 Watchlist Organization
- [ ] Color-coded watchlist tabs/pills
- [ ] Drag-and-drop reordering of watchlists
- [ ] Search/filter across all watchlists
- [ ] Recent/frequently accessed watchlists

#### 5.2 Stock Management
- [ ] Quick actions: "Add to Portfolio", "Move to Watchlist"
- [ ] Price alerts integration (future enhancement)
- [ ] Notes and target price fields per watchlist item
- [ ] Import/export watchlist functionality

#### 5.3 Dashboard Integration
- [ ] Watchlist summary cards on main dashboard
- [ ] Recent watchlist activity
- [ ] Top performers across all watchlists
- [ ] Watchlist vs portfolio performance comparison

### 6. Advanced Features (Future Enhancements)

#### 6.1 Smart Watchlists
- [ ] Auto-categorization based on sector/industry
- [ ] Trending stocks suggestions
- [ ] Similar stocks recommendations
- [ ] Social/collaborative watchlists

#### 6.2 Analytics & Insights
- [ ] Watchlist performance tracking
- [ ] Price movement alerts
- [ ] Sector analysis across watchlists
- [ ] Historical watchlist performance

#### 6.3 Integration Features
- [ ] Import watchlists from other platforms
- [ ] Export to CSV/Excel with custom formatting
- [ ] API endpoints for third-party integrations
- [ ] Webhook notifications for price targets

### 7. Technical Considerations

#### 7.1 Performance Optimization
- [ ] Efficient loading of multiple watchlists
- [ ] Caching strategy for watchlist data
- [ ] Pagination for large watchlists
- [ ] Optimistic updates for better UX

#### 7.2 Data Validation
- [ ] Watchlist name uniqueness per user
- [ ] Symbol validation before adding to watchlist
- [ ] Maximum items per watchlist limits
- [ ] Color format validation

#### 7.3 Error Handling
- [ ] Graceful handling of deleted watchlists
- [ ] Bulk operation error reporting
- [ ] Conflict resolution for duplicate symbols
- [ ] Network failure recovery

### 8. Testing Strategy

#### 8.1 Backend Tests
- [ ] Watchlist CRUD operations
- [ ] Watchlist item management
- [ ] Data migration validation
- [ ] API authorization tests

#### 8.2 Frontend Tests
- [ ] Watchlist UI component tests
- [ ] Navigation between watchlists
- [ ] Bulk operations testing
- [ ] Drag-and-drop functionality

#### 8.3 Integration Tests
- [ ] End-to-end watchlist workflows
- [ ] Migration script validation
- [ ] Cross-browser compatibility
- [ ] Mobile responsiveness

## Success Criteria

- [ ] Users can create and manage multiple named watchlists
- [ ] Stock organization is intuitive and flexible
- [ ] Migration preserves all existing watchlist data
- [ ] Performance remains optimal with multiple watchlists
- [ ] Clear separation between portfolio holdings and watchlists
- [ ] Bulk operations work efficiently for large watchlists

## Dependencies

- **Follows**: TICKET-014 (Multi-User Support) - User association required
- **Blocks**: Future price alert features
- **Integration**: Current watchlist functionality (quantity=0 support)

## Risks & Mitigations

1. **Risk**: Data loss during migration from quantity=0 approach
   - **Mitigation**: Comprehensive backup and validation of migration

2. **Risk**: UI complexity with multiple watchlists
   - **Mitigation**: Progressive disclosure and intuitive navigation

3. **Risk**: Performance degradation with many watchlists
   - **Mitigation**: Lazy loading and efficient caching strategies

4. **Risk**: User confusion during transition
   - **Mitigation**: Clear migration notifications and help documentation

## Implementation Phases

### Phase 1: Foundation (Sprint 1)
- [ ] Database schema and migration
- [ ] Basic watchlist CRUD API endpoints
- [ ] Migration of existing quantity=0 items

### Phase 2: Core UI (Sprint 2)
- [ ] Watchlist management interface
- [ ] Basic watchlist display and navigation
- [ ] Stock addition/removal functionality

### Phase 3: Enhanced Features (Sprint 3)
- [ ] Bulk operations and advanced UI
- [ ] Color coding and organization features
- [ ] Import/export functionality

---

**Notes:**
- This ticket builds on the existing watchlist foundation (quantity=0)
- Provides better organization and user experience for stock tracking
- Maintains clean separation between actual holdings and watch items
- Enables future features like price alerts and collaborative lists
