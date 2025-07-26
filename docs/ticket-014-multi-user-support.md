# TICKET-014: Multi-User Support

**Priority:** Medium  
**Story Points:** 8  
**Sprint:** TBD  
**Release:** 0.3.0  
**Type:** Feature Enhancement  

## Description

Transform the current single-user portfolio tracker into a multi-user application with user authentication, data isolation, and proper user management. This will enable multiple users to maintain separate portfolios while sharing the same application instance.

## Current State Analysis

### Database Schema (SQLite)
- **Portfolio Model**: No user association - all portfolios are global
- **StockCache Model**: Global cache shared across all users (this is actually good for performance)
- **UserSettings Model**: Global settings, not user-specific
- **Database Type**: SQLite with file-based storage (`file:./dev.db`)

### Deployment Considerations
- **Current Setup**: File-based SQLite database
- **Database Deployment**: SQLite database file needs to be persistent across deployments
- **Scaling Concerns**: SQLite is single-writer, may need PostgreSQL for production multi-user scenarios

## Requirements

### 1. User Management System

#### 1.1 User Authentication
- [ ] User registration (email/password)
- [ ] User login/logout functionality  
- [ ] JWT token-based authentication
- [ ] Password reset functionality
- [ ] Email verification (optional for MVP)

#### 1.2 User Model
```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String?
  passwordHash String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  portfolios  Portfolio[]
  userSettings UserSetting[]
}
```

### 2. Data Schema Updates

#### 2.1 Portfolio Model Updates
```prisma
model Portfolio {
  id            String   @id @default(cuid())
  userId        String   // Foreign key to User
  symbol        String
  quantity      Int      // Now supports 0 for watchlist
  purchasePrice Float
  purchaseDate  DateTime
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId]) // Performance optimization
  @@index([userId, symbol]) // Prevent duplicate symbols per user
}
```

#### 2.2 User Settings Updates
```prisma
model UserSetting {
  id        String   @id @default(cuid())
  userId    String   // Foreign key to User
  key       String
  value     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, key]) // One setting per key per user
}
```

#### 2.3 Stock Cache (Unchanged - Global)
```prisma
// StockCache remains global for performance
// All users share the same stock market data
model StockCache {
  // ... existing fields remain the same
  // This is shared across all users for efficiency
}
```

### 3. Backend API Changes

#### 3.1 Authentication Middleware
- [ ] JWT token validation middleware
- [ ] User context injection in requests
- [ ] Protected route decorators

#### 3.2 API Endpoint Updates
```typescript
// Current: /api/portfolio
// New: /api/users/:userId/portfolio (or extract from JWT)

// All existing endpoints need user context:
POST   /api/portfolio           → Only creates for authenticated user
GET    /api/portfolio           → Only returns authenticated user's portfolio
PUT    /api/portfolio/:id       → Only updates if owned by authenticated user
DELETE /api/portfolio/:id       → Only deletes if owned by authenticated user
GET    /api/portfolio/summary   → Only summarizes authenticated user's portfolio
```

#### 3.3 New Authentication Endpoints
```typescript
POST   /api/auth/register       → User registration
POST   /api/auth/login          → User login
POST   /api/auth/logout         → User logout  
POST   /api/auth/refresh        → Refresh JWT token
POST   /api/auth/forgot-password → Password reset request
POST   /api/auth/reset-password  → Password reset confirmation
GET    /api/auth/me             → Get current user profile
PUT    /api/auth/me             → Update user profile
```

### 4. Frontend Changes

#### 4.1 Authentication UI
- [ ] Login/Register pages
- [ ] Protected route components
- [ ] User profile management
- [ ] Session management (auto-logout, token refresh)

#### 4.2 State Management Updates
- [ ] User context/state management
- [ ] Authentication state persistence
- [ ] Portfolio data scoped to current user

#### 4.3 Navigation Updates
- [ ] User menu in header
- [ ] Login/logout functionality
- [ ] Protected app routes

### 5. Database Migration Strategy

#### 5.1 Migration Plan
```sql
-- Step 1: Create User table
-- Step 2: Add userId foreign key to Portfolio (nullable initially)
-- Step 3: Create default user for existing portfolios
-- Step 4: Update all existing portfolios to belong to default user
-- Step 5: Make userId NOT NULL
-- Step 6: Update UserSettings with userId
```

#### 5.2 Data Migration Script
- [ ] Migrate existing portfolios to a default user
- [ ] Migrate existing settings to default user
- [ ] Preserve all existing data during migration

### 6. Deployment & Database Considerations

#### 6.1 Database Deployment Analysis

**Current SQLite Setup:**
- ✅ **Pros**: Simple, file-based, deploys with application
- ❌ **Cons**: Single-writer limitation, file persistence challenges in containerized deployments

**Deployment Options:**

**Option A: Enhanced SQLite (Recommended for MVP)**
```yaml
# Docker setup with volume persistence
volumes:
  - ./data:/app/data
environment:
  - DATABASE_URL=file:/app/data/production.db
```

**Option B: PostgreSQL (Recommended for Production)**
```yaml
# For serious multi-user production deployment
environment:
  - DATABASE_URL=postgresql://user:pass@postgres:5432/portfolio_db
```

#### 6.2 Database Deployment Strategy
- [ ] **SQLite**: Ensure database file persistence across deployments
- [ ] **Volume Mounting**: Configure persistent storage for database file
- [ ] **Backup Strategy**: Automated database backups
- [ ] **Migration Automation**: Run `prisma migrate deploy` on startup

#### 6.3 Production Considerations
- [ ] Connection pooling for PostgreSQL
- [ ] Database connection health checks
- [ ] Environment-specific database URLs
- [ ] Database seeding for production

### 7. Security Considerations

#### 7.1 Data Isolation
- [ ] User data isolation - users can only access their own portfolios
- [ ] SQL injection prevention (Prisma ORM helps)
- [ ] Authorization checks on all user-scoped endpoints

#### 7.2 Authentication Security
- [ ] Password hashing (bcrypt/argon2)
- [ ] JWT token security (short expiration, refresh tokens)
- [ ] Rate limiting on authentication endpoints
- [ ] CORS configuration for multi-origin deployments

### 8. Testing Strategy

#### 8.1 Backend Tests
- [ ] User authentication flow tests
- [ ] Data isolation tests (user A cannot access user B's data)
- [ ] Migration tests
- [ ] Authorization middleware tests

#### 8.2 Frontend Tests
- [ ] Authentication UI tests
- [ ] Protected route tests
- [ ] User session management tests

## Technical Debt & Migration Considerations

### Database Choice for Multi-User
1. **SQLite Limitations**:
   - Single-writer (one user writing at a time)
   - File-based storage requires careful deployment handling
   - Adequate for small-to-medium user bases (<100 concurrent users)

2. **PostgreSQL Migration Path**:
   - Better concurrent user support
   - Industry standard for multi-user web applications
   - Requires additional infrastructure (database server)
   - More complex deployment

### Deployment Database Strategy

**Answer to User Question: "Should database deploy with the app?"**

**Current SQLite Approach:**
- ✅ Database file CAN deploy with app (embedded)
- ⚠️ Requires persistent volume in production
- ⚠️ Data loss risk if container is recreated without proper volumes

**Recommended Production Approach:**
- 🔄 **Hybrid**: Application deploys with schema, database runs separately
- 📁 **SQLite**: Use persistent volumes for database file
- 🐘 **PostgreSQL**: External database service (managed or self-hosted)

## Implementation Phases

### Phase 1: Foundation (Sprint 1)
- [ ] Database schema updates and migration
- [ ] User model and authentication backend
- [ ] JWT middleware and protected routes

### Phase 2: Frontend Integration (Sprint 2)  
- [ ] Authentication UI components
- [ ] Protected routes and session management
- [ ] User portfolio scoping

### Phase 3: Production Ready (Sprint 3)
- [ ] Deployment configuration for database persistence
- [ ] Security hardening and testing
- [ ] Migration scripts and documentation

## Success Criteria

- [ ] Multiple users can register and maintain separate portfolios
- [ ] User data is completely isolated (security test required)
- [ ] Existing single-user data is preserved through migration
- [ ] Database deploys reliably with proper persistence
- [ ] Application performance is maintained with multiple users
- [ ] All existing functionality works within user-scoped context

## Dependencies

- **Blockers**: None
- **Dependencies**: Current portfolio functionality must remain stable
- **Follows**: TICKET-013 (Watchlist support)

## Risks & Mitigations

1. **Risk**: Data loss during migration
   - **Mitigation**: Comprehensive backup and rollback procedures

2. **Risk**: Performance degradation with multiple users
   - **Mitigation**: Database indexing and query optimization

3. **Risk**: Complex deployment with database persistence
   - **Mitigation**: Clear deployment documentation and Docker volume configuration

4. **Risk**: SQLite concurrent user limitations
   - **Mitigation**: Plan PostgreSQL migration path for scaling

---

**Notes:**
- This ticket transforms the application from single-user to multi-user
- Database can deploy with app (SQLite) but requires careful volume management
- Consider PostgreSQL migration for production scaling
- Existing data preservation is critical for user adoption
