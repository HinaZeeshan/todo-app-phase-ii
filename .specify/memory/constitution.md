<!--
Sync Impact Report:
Version Change: [new] → 1.0.0
Modified Principles: Initial creation
Added Sections: All sections created (Core Principles, Architecture & Technology Standards, Security Requirements, Development Workflow, Code Quality & Testing, Governance)
Removed Sections: None
Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check section references this file
  ✅ spec-template.md - Requirements alignment verified
  ✅ tasks-template.md - Task categorization aligns with principles
  ⚠️ commands/*.md - No command files found at expected location
Follow-up TODOs: None - all placeholders resolved
-->

# Todo Full-Stack Web Application Constitution

## Core Principles

### I. Spec-Driven Development (NON-NEGOTIABLE)

All development MUST follow the Spec-Driven Development methodology. No manual coding is permitted outside of Claude Code execution. The workflow is strictly:

1. Specification → Planning → Tasks → Implementation
2. Each phase produces documented artifacts in `specs/<feature>/`
3. No deviation from defined specs without updating the spec first
4. No implementation without corresponding tasks in `tasks.md`

**Rationale**: Ensures reproducibility, traceability, and alignment between requirements and implementation. Prevents scope creep and maintains a clear audit trail.

### II. Security-First Architecture

Security is the primary architectural constraint. All design decisions MUST prioritize security over convenience:

- **Authentication**: Better Auth MUST be used as the authentication provider
- **Authorization**: JWT tokens are the single source of truth for user identity
- **Data Isolation**: User data MUST be isolated at both database and API levels
- **Zero Trust**: Every API endpoint MUST validate authenticated user identity
- **No Cross-User Access**: Under no circumstances may one user access another user's data

**Rationale**: Multi-user systems require defense-in-depth. A single authorization failure compromises the entire system. Security cannot be retrofitted.

### III. Clear Separation of Concerns

The system architecture MUST maintain strict boundaries between layers:

- **Frontend (Next.js)**: Client-side UI, state management, user interactions
- **Backend (FastAPI)**: Business logic, data persistence, API contracts
- **Authentication (Better Auth)**: Identity verification, JWT issuance, token management

No layer may assume responsibilities of another. Communication occurs only through defined contracts (REST APIs, JWT tokens).

**Rationale**: Separation enables independent testing, deployment, and scaling. Reduces coupling and improves maintainability.

### IV. Performance-Conscious Design

Performance optimization is permitted but MUST NOT change features or behavior:

- Optimizations target latency, throughput, or resource usage only
- No feature additions during performance work
- All optimizations require before/after measurement
- Security and correctness trump performance

**Rationale**: Performance work without constraints leads to scope creep. Keeping optimizations separate from feature work maintains clarity and testability.

### V. Deterministic and Reproducible Outputs

All development outputs MUST be deterministic and reproducible:

- Same inputs produce same outputs
- No reliance on undocumented assumptions
- All dependencies explicitly declared
- Environment configuration externalized (`.env`)
- No hardcoded secrets, tokens, or user identifiers

**Rationale**: Reproducibility is essential for debugging, testing, and collaboration. Non-deterministic systems cannot be reliably automated or verified.

## Architecture & Technology Standards

### Backend Stack
- **Framework**: FastAPI (Python)
- **Database**: Neon Serverless PostgreSQL
- **ORM**: SQLModel (required for type safety and SQLAlchemy integration)
- **Authentication**: Better Auth (JWT-based)

### Frontend Stack
- **Framework**: Next.js 16+ with App Router
- **UI Pattern**: Responsive, mobile-first design
- **State Management**: React hooks and context (prefer simplicity)
- **API Communication**: Fetch with JWT in Authorization header

### API Design
- **Style**: RESTful principles
- **Authentication**: JWT Bearer tokens in `Authorization` header
- **Response Format**: JSON with predictable, typed structure
- **Error Handling**: Consistent error taxonomy with HTTP status codes
- **Validation**: Request validation at API boundary (no trust of client input)

## Security Requirements

### Authentication Flow
1. User submits credentials to Better Auth
2. Better Auth validates and issues JWT token
3. Frontend stores token securely (httpOnly cookie recommended)
4. Frontend includes token in `Authorization: Bearer <token>` header for all API requests
5. Backend validates JWT signature using shared secret on every request
6. Backend extracts `user_id` from verified JWT claims
7. Backend uses `user_id` to scope all data operations

### Authorization Rules
- **User Identity Source**: JWT claims only (never trust client-provided `user_id`)
- **URL Parameter Validation**: If URL contains `user_id`, it MUST match JWT `user_id`
- **Database Queries**: All queries MUST filter by authenticated `user_id`
- **Error Messages**: No information leakage (avoid revealing existence of other users' data)

### Data Protection
- All secrets in `.env` (never committed to version control)
- Database credentials rotated and scoped (least privilege)
- JWT secret strong and rotated periodically
- Password hashing via Better Auth (bcrypt/argon2)
- HTTPS required in production
- CORS configured to whitelist allowed origins only

## Development Workflow

### Agentic Dev Stack Phases

1. **Specification** (`/sp.specify`):
   - User provides feature description
   - Generate `specs/<feature>/spec.md` with user stories and requirements
   - Define acceptance criteria and success metrics

2. **Planning** (`/sp.plan`):
   - Analyze specification
   - Produce `specs/<feature>/plan.md` with technical architecture
   - Generate supporting docs: `research.md`, `data-model.md`, `quickstart.md`, `contracts/`

3. **Tasks** (`/sp.tasks`):
   - Convert plan into actionable tasks
   - Organize by user story and dependency
   - Output to `specs/<feature>/tasks.md`

4. **Implementation** (`/sp.implement`):
   - Execute tasks sequentially or in parallel (where marked `[P]`)
   - Commit after each logical unit
   - Validate against acceptance criteria

### Agent Delegation
Specialized agents MUST be invoked for domain-specific work:

- **Auth Agent**: Authentication, JWT, Better Auth integration, security audits
- **FastAPI Backend Agent**: Backend routes, async optimization, API performance
- **Frontend Agent**: Next.js components, rendering performance, bundle optimization
- **DB Agent**: Schema design, query optimization, migrations, connection pooling

Invoke agents proactively after domain-specific implementation using the Task tool with appropriate `subagent_type`.

### Prompt History Records (PHRs)
Every user interaction MUST produce a PHR in `history/prompts/`:
- **Constitution**: `history/prompts/constitution/`
- **Feature Work**: `history/prompts/<feature-name>/`
- **General**: `history/prompts/general/`

PHRs capture: stage, title, date, full user prompt, assistant response, files modified, tests run.

### Architecture Decision Records (ADRs)
When architecturally significant decisions are made, suggest (never auto-create):

```
📋 Architectural decision detected: [brief description]
   Document reasoning and tradeoffs? Run `/sp.adr [decision-title]`
```

Significance test (ALL must be true):
- **Impact**: Long-term consequences (framework, data model, API, security, platform)
- **Alternatives**: Multiple viable options considered
- **Scope**: Cross-cutting and influences system design

## Code Quality & Testing

### Code Standards
- Type hints required (Python backend)
- TypeScript preferred (Next.js frontend)
- Linting and formatting enforced (`ruff`/`black` for Python, `eslint`/`prettier` for JS/TS)
- No commented-out code in commits
- Clear, descriptive variable names (no abbreviations unless standard)

### Testing Requirements
- **Contract Tests**: Verify API contracts match `contracts/` documentation
- **Integration Tests**: Validate user journeys end-to-end
- **Unit Tests**: Optional unless explicitly requested
- Test coverage NOT a primary goal (focus on critical paths)
- Tests MUST fail before implementation (Red-Green-Refactor if TDD requested)

### Error Handling
- Explicit error paths for all failure modes
- No silent failures or swallowed exceptions
- User-facing errors: clear, actionable messages
- Backend errors: structured logging with context (user_id, request_id, timestamp)

### Performance Standards
- API endpoints: Target <200ms p95 latency
- Frontend: Target <3s initial load, <1s navigation
- Database: Index all foreign keys and commonly queried fields
- No N+1 queries (use joins or batch fetching)

## Governance

### Amendment Process
1. Propose amendment with rationale and impact analysis
2. Document in ADR if architecturally significant
3. Update constitution with incremented version
4. Propagate changes to dependent templates and docs
5. Create PHR documenting the amendment

### Versioning Policy
- **MAJOR**: Backward-incompatible governance changes (e.g., removing a principle)
- **MINOR**: New principle or section added
- **PATCH**: Clarifications, wording improvements, non-semantic changes

### Compliance
- All PRs and reviews MUST verify constitutional compliance
- Complexity deviations MUST be justified in `plan.md` Complexity Tracking section
- Constitution supersedes all other practices or conventions
- For runtime guidance, refer to `CLAUDE.md`

### Constraints Enforcement
- No manual coding (Claude Code execution only)
- No feature creep beyond spec scope
- No changes to existing functionality during performance optimization
- No architectural changes without updating spec and plan first

**Version**: 1.0.0 | **Ratified**: 2026-01-14 | **Last Amended**: 2026-01-14
