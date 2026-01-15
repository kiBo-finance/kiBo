# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**kiBoアプリ** is a multi-currency personal finance management system built with Waku (React Server Components framework), focusing on Japanese users with comprehensive multi-currency support and scheduled transaction management.

## Development Environment

### Docker Setup (Recommended)

```bash
# Start full development environment
docker-compose up --build

# Start only database services
docker-compose up -d postgres redis

# Run database operations from container
docker-compose -f docker-compose.dev.yml --profile migration run --rm migrate

# Application runs on: http://localhost:3000
# PostgreSQL: localhost:5432 (kibo_user/kibo_password/kibo_dev)
# Redis: localhost:6379
```

### Local Development

```bash
# Development server
bun run dev

# Database operations
bun run db:push          # Push schema changes
bun run db:migrate       # Create migration
bun run db:seed          # Seed currency data
bun run db:studio        # Prisma Studio (port 5555)

# Code quality
bun run lint             # Check code with oxlint
bun run lint:fix         # Auto-fix lint issues
bun run format           # Format code with oxfmt
bun run format:check     # Check formatting
bun run type-check       # TypeScript validation

# Build and production
bun run build
bun run start
```

## Architecture Overview

### Tech Stack

- **Runtime**: Bun (package manager + runtime)
- **Framework**: Waku v1.0.0-alpha.2 (React Server Components, TypeScript)
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: better-auth with email/password
- **State Management**: Jotai (atomic state management)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Currency**: @dinero.js/currencies + decimal.js for precision
- **Code Quality**: oxlint (linting) + oxfmt (formatting)

### Directory Structure

```
src/
├── pages/           # Waku pages (file-based routing)
│   ├── _layout.tsx  # Root layout
│   ├── index.tsx    # Home page
│   ├── login.tsx    # Login page
│   ├── dashboard/   # Dashboard pages
│   │   ├── _layout.tsx
│   │   └── ...
│   └── _api/        # API routes (note the underscore prefix)
│       ├── auth/
│       ├── accounts/
│       └── ...
├── components/      # React components
│   ├── ui/          # shadcn/ui components
│   ├── providers/   # Context providers
│   └── ...
├── lib/             # Utilities, hooks, actions
│   ├── actions/     # Server actions
│   ├── atoms/       # Jotai atoms
│   ├── hooks/       # Custom hooks
│   └── ...
└── styles.css       # Global styles
```

### Waku-Specific Patterns

**Server Components (default):**
```tsx
// src/pages/index.tsx
import { HomeClient } from '../components/HomeClient'

export default function HomePage() {
  return <HomeClient />
}

export const getConfig = async () => {
  return { render: 'dynamic' } as const
}
```

**Client Components:**
```tsx
// src/components/HomeClient.tsx
'use client'

import { useRouter } from 'waku/router/client'
import { Link } from 'waku/router/client'

export function HomeClient() {
  const router = useRouter()
  // Note: Link uses 'to' prop, not 'href'
  return <Link to={"/dashboard" as any}>Dashboard</Link>
}
```

**API Routes:**
```tsx
// src/pages/_api/health/route.ts
export async function GET(request: Request): Promise<Response> {
  return Response.json({ status: 'ok' })
}

export const getConfig = async () => {
  return { render: 'dynamic' } as const
}
```

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

### Code Style (oxlint/oxfmt)

- Line width: 100 characters
- Indentation: 2 spaces
- Quotes: Single quotes
- Semicolons: No (minimal style)
- Trailing commas: ES5
- Strict TypeScript with no explicit any
- Auto import sorting (React, Next.js, packages, local)
- TailwindCSS class sorting

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
- RESTful API routes in `src/pages/_api/` for external integration
- better-auth handles all authentication endpoints at `/api/auth/*`
- API routes use standard Web `Request`/`Response` (not Next.js specific types)

## Testing and Validation

### Health Check

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","database":"connected"}
```

### Authentication Test

```bash
# Sign up new user
curl -X POST http://localhost:3000/api/auth/sign-up/email \
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
bun test                 # Run all tests (using Jest)
bun run test:watch       # Watch mode testing
bun run test:coverage    # Coverage report
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


# Discord Conversation Logger Rules

## Important Message Logging Rules

Please use discord-conversation-logger MCP to log messages in the following cases:

### 1. User Messages (human)
- Task start/change/completion instructions
- Important decisions or confirmations
- Error reports or issue identification

### 2. Assistant Messages (assistant)
- Task completion reports
- Important suggestions or solutions
- Error resolution methods
- Summary of significant changes made

### 3. System Messages (system)
- Critical errors or warnings
- Important environment changes
- Security-related notifications

## Logging Format
```
mcp__discord-conversation-logger__log_conversation( message: "Actual message content", role: "human" | "assistant" | "system", context: "Brief context description" )
```

## Cases Not Requiring Logs
- Simple acknowledgments
- Intermediate progress reports
- Temporary debug outputs
