# Friends Bet

A full-stack social sports betting platform where friends can create private groups, deposit virtual currency, and place bets against each other on real sporting events.

## Features

- **Private Betting Groups** - Create invite-only groups for you and your friends
- **Real-Time Odds** - Live odds from The Odds API for NBA, NFL, MLB, and NHL
- **Multiple Market Types** - Moneyline (H2H), spreads, and totals
- **Virtual Wallet System** - Group-specific balances with deposits and escrow
- **Secure Authentication** - JWT-based auth with refresh token rotation

## Tech Stack

### Backend
- **Java 17** with **Spring Boot 3.5**
- **Spring Security** - Stateless JWT authentication
- **Spring Data JPA** - PostgreSQL with Flyway migrations
- **BCrypt** - Password hashing

### Frontend
- **React 19** with **TypeScript**
- **Axios** - API client with automatic token refresh

### Infrastructure
- **PostgreSQL** - Primary database
- **H2** - In-memory database for testing
- **Docker Compose** - Local development setup

## Security Highlights

This project implements several security best practices:

- **Refresh Token Rotation** - Single-use refresh tokens that rotate on each use, with database-backed revocation
- **HttpOnly Cookies** - Refresh tokens stored in HttpOnly cookies (not accessible to JavaScript)
- **Pessimistic Locking** - Database-level locking on wallet operations to prevent race conditions
- **Input Validation** - Bean Validation annotations on all DTOs with global exception handling
- **Non-Negative Balance Constraint** - Database CHECK constraint prevents negative balances
- **Escrow Model** - Bet stakes are debited immediately and held until settlement

## Getting Started

### Prerequisites

- Java 17+
- Node.js 18+
- PostgreSQL 14+ (or use Docker)
- Maven 3.8+

### Database Setup

```bash
# Option 1: Use Docker
docker-compose up -d postgres

# Option 2: Local PostgreSQL
createdb friendsbet
```

### Backend

```bash
# Set required environment variables
export JWT_SECRET_B64="<base64-encoded-256-bit-secret>"
export ODDS_API_KEY="<your-odds-api-key>"

# Run with dev profile
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

The app will be available at `http://localhost:3000`.

### Running Tests

```bash
# Backend tests
./mvnw test

# Includes:
# - Unit tests for betting logic
# - Settlement service tests
# - Wallet concurrency tests
```

## API Overview

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users/register` | POST | Create new account |
| `/api/users/login` | POST | Login and receive tokens |
| `/api/users/refresh` | POST | Rotate refresh token |
| `/api/users/logout` | POST | Revoke refresh token |
| `/api/users/me` | GET | Get current user profile |

### Groups
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/groups` | POST | Create a group |
| `/api/groups/{inviteCode}/join` | POST | Join via invite code |
| `/api/groups/{groupId}/members` | GET | List group members |

### Betting
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bets` | POST | Propose a bet |
| `/api/bets/{betId}/accept` | POST | Accept a bet |
| `/api/groups/{groupId}/bets` | GET | List group bets |

### Wallet
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/groups/{groupId}/wallets/deposit` | POST | Deposit/withdraw funds |
| `/api/groups/{groupId}/wallets` | GET | List group balances |

## Project Structure

```
friends_bet/
├── src/main/java/com/ryanmeroniuk/friends_bet/
│   ├── config/          # Security, CORS configuration
│   ├── controller/      # REST endpoints
│   ├── dto/             # Request/response objects
│   ├── filter/          # JWT authentication filter
│   ├── model/           # JPA entities
│   ├── repository/      # Data access layer
│   ├── service/         # Business logic
│   └── util/            # JWT utilities
├── src/main/resources/
│   ├── db/migration/    # Flyway migrations
│   └── application*.yml # Configuration
└── frontend/
    └── src/
        ├── api/         # Axios client
        ├── components/  # React components
        └── Pages/       # Page components
```

## Architecture Decisions

### Money Handling
All monetary values are stored as `long` cents (not floating-point dollars) to avoid precision errors. The wallet service uses `PESSIMISTIC_WRITE` locking to prevent race conditions during concurrent transactions.

### Token Strategy
- **Access Token**: 15-minute expiry, stored in memory only
- **Refresh Token**: 14-day expiry, HttpOnly cookie, database-backed with revocation support

### Bet Settlement
Bets follow an escrow model:
1. Proposer's stake is debited when bet is created
2. Acceptor's stake is debited when bet is accepted
3. Winner receives total pot on settlement
4. Loser's stake was already debited (no additional action needed)

## License

MIT
