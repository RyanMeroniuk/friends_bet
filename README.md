# BigStu Bets

A virtual-currency sportsbook where friends and family bet against each other on real games. I built it so my dad and his friends could run their friendly bets in one place instead of keeping track by text message.

**Live demo:** https://friendsbet-production-18ac.up.railway.app

No real money is involved. Every group has its own virtual balance.

## Features

- **Private groups**: create a group and invite friends with a code. Each member gets a separate wallet in each group.
- **Three bet types**: moneyline, spread, and total (over/under), across 12 leagues: NFL, NCAAF, NBA, NCAAB, MLB, NHL, EPL, MLS, Champions League, La Liga, UFC/MMA, and boxing.
- **Peer-to-peer bets**: one member proposes a bet with a stake and odds, and another member accepts it. The proposer can cancel the bet until someone accepts.
- **Settlement from real scores**: final scores come from [The Odds API](https://the-odds-api.com). Clicking Settle pays the winner the whole pot, or refunds both sides on a tie.
- **Transaction history**: every balance change is recorded with its before and after balance.

## How the money works

All amounts are stored as whole cents (`long`), never as floating-point numbers.

1. **Propose:** the proposer's stake leaves their wallet immediately.
2. **Accept:** the acceptor pays `stake × (decimal odds − 1)`. Both stakes are now held on the bet.
3. **Settle:** the winner receives the whole pot. On a tie, or a result exactly on the line, both sides get their own stake back.
4. **Cancel:** an open bet that nobody accepted refunds the proposer.

Every balance change goes through one wallet method that locks the row, refuses to go below zero, and writes a ledger row. The application only ever inserts ledger rows; it never edits or deletes them.

### Concurrency

Wallet and bet rows are locked with `SELECT ... FOR UPDATE` (JPA `PESSIMISTIC_WRITE`) before any change, so two requests can't spend the same balance. The database also has a `CHECK (balance >= 0)` constraint as a second guard.

`WalletServiceConcurrencyTest` checks this: 20 threads start at the same moment and each try to withdraw from a balance that only covers 10 withdrawals. The test passes only if exactly 10 succeed and the balance ends at zero. Settlement is idempotent, because running it again only touches bets that are still unsettled.

## Security

- **Short-lived access tokens**: 15-minute JWTs, kept in memory in the browser and never in `localStorage`. Issuer and audience are validated.
- **Refresh tokens in HttpOnly cookies**: 14-day, single-use, `SameSite=Strict`. Each refresh revokes the old token in the database and issues a new pair.
- **Logout**: revokes the refresh token and adds the access token to a deny-list.
- **Brute-force protection**: an account locks for 15 minutes after 10 failed logins, and auth endpoints are rate-limited per IP with Bucket4j.
- **Safe defaults**: the app refuses to start outside the dev profile if it's using the development JWT key. Admin endpoints need a secret, which is compared in constant time. Passwords are hashed with BCrypt.

## Keeping the Odds API within the free tier

- The app only fetches the sport you're looking at, not all 12 leagues (up to 12× fewer calls per refresh).
- Odds are cached for 1 hour per sport.
- Each user can refresh at most once every 60 seconds.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.5, Spring Security, Spring Data JPA |
| Database | PostgreSQL 16 with Flyway migrations (H2 for tests) |
| Frontend | React 19, TypeScript, Axios (automatic token refresh with a single shared request) |
| Deployment | 3-stage Docker build (Node → Maven → JRE). The Spring Boot jar serves both the API and the React app. Hosted on Railway. |

## Running locally

**Prerequisites:** Java 17+, Node 18+, Docker (or a local PostgreSQL), and a free [Odds API key](https://the-odds-api.com).

```bash
# 1. Start PostgreSQL
docker compose up -d db

# 2. Start the backend
export ODDS_API_KEY="<your-odds-api-key>"
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# 3. Start the frontend (in a second terminal)
cd frontend
npm install
npm start
```

The app runs at `http://localhost:3000`.

For any non-dev deployment, also set `SPRING_PROFILES_ACTIVE`, `JWT_SECRET_B64` (a base64-encoded 256-bit key), `ADMIN_SECRET`, and the `SPRING_DATASOURCE_*` variables.

## Tests

```bash
./mvnw test            # backend: 134 JUnit tests
cd frontend && npm test   # frontend: Jest + React Testing Library
```

The backend tests include end-to-end MockMvc tests of the auth flow and the full bet lifecycle, settlement cases (win, tie, missing line, totals), DTO validation, and the concurrency tests described above.

## API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /api/users/register`, `/login`, `/refresh`, `/logout`; `GET /api/users/me` |
| Groups | `POST /api/groups`; `POST /api/groups/{inviteCode}/join`; `GET /api/groups/{groupId}/members` |
| Bets | `POST /api/groups/{groupId}/bets`; `GET /api/groups/{groupId}/bets`; `POST /api/bets/{betId}/accept`; `POST /api/bets/{betId}/cancel`; `POST /api/groups/{groupId}/bets/settle-accepted` |
| Wallets | `POST /api/groups/{groupId}/wallets/deposit`; `GET /api/groups/{groupId}/wallets`, `/transactions`, `/pending` |
| Games | `GET /api/sports`, `/api/sports/{sport}/games`, `/api/games/upcoming`, `/api/games/{gameId}/markets`; `POST /api/games/refresh` |

## Project structure

```
src/main/java/com/ryanmeroniuk/friends_bet/
├── config/       # Security and CORS
├── controller/   # REST endpoints
├── dto/          # Request and response objects
├── filter/       # JWT auth, rate limiting, admin secret
├── model/        # JPA entities
├── odds/         # The Odds API client
├── repository/   # Data access, including locking queries
├── service/      # Bets, settlement, wallets, odds, tokens
└── util/         # JWT signing, validation, and startup key check
src/main/resources/db/migration/   # Flyway schema
frontend/src/                      # React app
```
