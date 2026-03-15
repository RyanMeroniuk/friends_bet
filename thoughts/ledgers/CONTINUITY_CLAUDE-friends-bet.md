# Session: friends-bet
Updated: 2026-03-15T05:24:15.680Z

## Goal
To be confirmed by user - onboarding complete, awaiting stated goal.

## Constraints
- Tech Stack: Java 17, Spring Boot 3.5.0, React 19 + TypeScript, MUI v7
- Framework: Spring MVC (backend), Create React App (frontend)
- Build: ./mvnw package (backend), npm run build (frontend)
- Test: ./mvnw test (JUnit 5 + H2 in-memory), npm test (Jest)
- Patterns: Layered Controller -> Service -> Repository; all money in cents; pessimistic locking for concurrency safety

## Key Decisions
- All wallet operations go through WalletService.deposit() as a single write path (positive = credit, negative = debit/escrow)
- Pessimistic locking (SELECT FOR UPDATE) used on Wallet and Bet rows to prevent race conditions
- Bet settlement is event-driven: ScoreSyncService fetches final scores from The Odds API, then delegates to SettlementService
- JSONB `details` column on Bet stores market-specific data (spread line, total line) and settlement audit trail
- JWT access tokens + persisted refresh tokens; AdminSecretFilter guards admin endpoints

## State
- Now: [→] Onboarding complete - codebase analyzed
- Next: Awaiting user goal to determine focus area

## Working Set
- Key files:
  - src/main/java/com/ryanmeroniuk/friends_bet/service/BetService.java
  - src/main/java/com/ryanmeroniuk/friends_bet/service/SettlementService.java
  - src/main/java/com/ryanmeroniuk/friends_bet/service/WalletService.java
  - src/main/java/com/ryanmeroniuk/friends_bet/service/ScoreSyncService.java
  - src/main/java/com/ryanmeroniuk/friends_bet/controller/GlobalExceptionHandler.java (untracked, new)
  - frontend/src/Pages/ (AuthPage, BetPage, GroupPage, WalletPage)
- Test command: ./mvnw test
- Build command: ./mvnw package -DskipTests
- Dev command: docker compose up -d && ./mvnw spring-boot:run (backend) + cd frontend && npm start

## Open Questions
- UNCONFIRMED: ScoreSyncService polling trigger - @Scheduled vs admin-only endpoint
- UNCONFIRMED: V1 migration baseline content (not present in migrations/ directory)
- UNCONFIRMED: Frontend AuthContext token refresh flow alignment with backend refresh token rotation
- UNCONFIRMED: DTO validation changes in recently-modified files (CreateBetRequest, CreateGroupRequest, etc.)

## Codebase Summary
friends_bet is a full-stack peer-to-peer sports betting app for friend groups. The Spring Boot backend
exposes a REST API secured with JWT. Users join Groups, each of which maintains per-user Wallets (balances
in cents). Members propose Bets on real sports Games (NBA, NFL, MLB, NHL), which other group members can
accept. Funds are escrowed at propose/accept time via pessimistic-locked wallet writes. Settlement runs
automatically: ScoreSyncService polls The Odds API for final scores, then SettlementService evaluates
WINNER/SPREAD/TOTALS markets and credits the winner's wallet. Three race conditions were recently fixed
(concurrent bet acceptance, double settlement, concurrent deposits). A GlobalExceptionHandler was just
added to centralize 400 error responses. The React frontend uses MUI v7 for UI, axios (proxied to :8080),
and React Context for auth/group state.
