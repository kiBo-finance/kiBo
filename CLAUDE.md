# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**kiBoアプリ** is a multi-currency personal finance management system built with Next.js 15, focusing on Japanese users with comprehensive multi-currency support and scheduled transaction management.

## Development Environment

### Docker Setup (Recommended)
```bash
# Start full development environment
docker-compose up --build

# Start only database services
docker-compose up -d postgres redis

# Run database operations from container
docker-compose -f docker-compose.dev.yml --profile migration run --rm migrate

# Application runs on: http://localhost:3001
# PostgreSQL: localhost:5432 (kibo_user/kibo_password/kibo_dev)
# Redis: localhost:6379
```

### Local Development
```bash
# Development server
npm run dev

# Database operations
npm run db:push          # Push schema changes
npm run db:migrate       # Create migration
npm run db:seed          # Seed currency data
npm run db:studio        # Prisma Studio (port 5555)

# Code quality
npm run lint             # Check code with Biome
npm run lint:fix         # Auto-fix issues
npm run format           # Format code
npm run type-check       # TypeScript validation

# Build and production
npm run build
npm run start
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 (App Router, React 19, TypeScript)
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: better-auth with email/password
- **State Management**: Jotai (atomic state management)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Currency**: @dinero.js/currencies + decimal.js for precision
- **Code Quality**: Biome (linting + formatting)

### Database Models

**Core Models:**
- `User` - Authentication (better-auth) + user preferences
- `Currency` - Multi-currency support (JPY, USD, EUR, etc.)
- `ExchangeRate` - Historical exchange rates
- `AppAccount` - Bank accounts (CASH, CHECKING, SAVINGS, FIXED_DEPOSIT)
- `Card` - Credit/debit cards (CREDIT, DEBIT)
- `Transaction` - Financial transactions with multi-currency support
- `ScheduledTransaction` - **Key feature**: Future/recurring transactions
- `Category` - Hierarchical expense/income categories
- `Budget` - Budget management

**Authentication Models (better-auth):**
- `Session` - User sessions
- `Account` - OAuth/credential accounts (uses accountId, providerId)
- `Verification` - Email verification tokens

### Key Features Architecture

**Multi-Currency System:**
- Base currency per user (default: JPY)
- Exchange rate history tracking
- Decimal.js for precise financial calculations
- Real-time conversion support

**Scheduled Transactions (Core Feature):**
- Future payment/income tracking
- Recurring transaction patterns
- Status management (PENDING, COMPLETED, OVERDUE, CANCELLED)
- Reminder system

**Account Transfer System:**
- Multi-currency account transfers
- Automatic exchange rate calculation
- Transaction history maintenance

## Configuration Details

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://kibo_user:kibo_password@localhost:5432/kibo_dev"

# Authentication
BETTER_AUTH_SECRET="dev-secret-key-minimum-32-characters-long"
BETTER_AUTH_URL="http://localhost:3000"

# Optional
EXCHANGE_RATE_API_KEY="your-api-key"
REDIS_URL="redis://localhost:6379"
NODE_ENV="development"
```

### Code Style (Biome)
- Line width: 100 characters
- Indentation: 2 spaces
- Quotes: Single quotes
- Semicolons: As needed
- Trailing commas: ES5
- Strict TypeScript with no explicit any

## Important Implementation Notes

### Authentication System
- Uses better-auth with Prisma adapter
- Email verification required for new users
- Session management with 7-day expiry
- Account model uses `accountId` and `providerId` (not `type`)

### Database Considerations
- **Financial Precision**: Use Decimal type for all monetary values
- **Multi-Currency**: All transactions store currency + exchange rate
- **User Isolation**: All data models include userId foreign key
- **Scheduled Transactions**: Core feature requiring careful status management

### State Management Pattern
- Jotai atoms for global state
- Derived atoms for calculated values (total assets, currency conversions)
- Client-side currency preference caching

### API Design
- Server Actions for data mutations
- RESTful API routes for external integration
- better-auth handles all authentication endpoints at `/api/auth/*`

## Testing and Validation

### Health Check
```bash
curl http://localhost:3001/api/health
# Expected: {"status":"ok","database":"connected"}
```

### Authentication Test
```bash
# Sign up new user
curl -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","name":"Test User"}'

# Should return user object with emailVerified: false
```

## Development Phases

**Phase 1 (Completed)**: Foundation setup with Docker environment
**Phase 2**: Authentication & Security implementation  
**Phase 3**: Core UI & State Management
**Phase 4**: Currency & Account Management
**Phase 5**: Transaction & Scheduled Transaction System

## Documentation
- Complete technical specifications in `claude_code_docs/`
- Multi-platform deployment guide in `DEPLOYMENT.md`
- Notification system setup in `docs/NOTIFICATIONS_SETUP.md`
- Docker configuration details in `claude_code_docs/docker_configuration.md`
- Implementation examples in `claude_code_docs/implementation_examples.md`

## Critical Points for Development

1. **Financial Accuracy**: Always use Decimal.js for monetary calculations
2. **Multi-Currency**: Store currency code and exchange rate with every transaction
3. **Scheduled Transactions**: Core differentiating feature requiring robust implementation
4. **Japanese Locale**: UI and default settings optimized for Japanese users
5. **better-auth Compatibility**: Account model schema differs from NextAuth patterns

## Server Configuration

- Always use Context7 mcp server.

## AI Development Guidelines

- Always use multiple sub-agents.

## Testing

Phase 1 testing infrastructure has been established:

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode testing  
npm run test:coverage    # Coverage report
```

Test files created:
- `__tests__/config.test.ts` - Project configuration validation
- `__tests__/schema.test.ts` - Zod schema validation tests
- `__tests__/lib/auth.test.ts` - Authentication configuration tests
- `__tests__/lib/db.test.ts` - Database connection tests
- `__tests__/lib/utils.test.ts` - Utility function tests

All Phase 1 infrastructure tests are passing with 23 test cases covering:
- Environment variable validation
- Package dependency verification
- Currency schema validation
- Account creation validation
- User registration validation
- Database connection verification