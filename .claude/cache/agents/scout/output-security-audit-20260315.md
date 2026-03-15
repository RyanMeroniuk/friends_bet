# Security & Correctness Audit: friends_bet
Generated: 2026-03-15

---

## Summary

18 files audited across auth, wallet, bet, settlement, config, DTOs, controllers, and frontend. No TODO/FIXME comments found in Java source. The auth layer is well-structured; the main risks are authorization gaps (IDOR), a missing wallet-transaction write path, admin secret timing-attack exposure, and several correctness edge cases.

---

## Findings

### CRITICAL

---

#### FINDING C-1: IDOR on Wallet Deposit - Any Authenticated User Can Credit/Debit Any User's Wallet
**File:** `WalletController.java:22-29`, `WalletService.java:36-55`
**Severity:** CRITICAL

`POST /api/groups/{groupId}/wallets/deposit` takes a `userId` from the request body (`WalletDepositRequest`) and acts on that wallet. The controller never checks whether the authenticated principal matches `req.getUserId()`. Any authenticated user can deposit or withdraw from any other user's wallet in any group they know the ID for.

```java
// WalletController.java line 27 — no authentication check on req.getUserId()
WalletResponse resp = walletService.deposit(groupId, req);
```

The fix is to resolve `userId` from `Authentication` (same pattern `BetService` already uses for proposer/acceptor), and reject if the body UID doesn't match the principal.

---

#### FINDING C-2: IDOR on listBalances - Any Authenticated User Can View Anyone's Balance
**File:** `WalletController.java:33-37`
**Severity:** HIGH (bordering CRITICAL for a financial app)

`GET /api/groups/{groupId}/wallets` returns all balances for a group with no membership check. A user who is not a member of the group can freely enumerate all member balances. `BetService` checks `groupMemberRepo.existsByGroup_IdAndUser_Id` before acting; `WalletService.listBalances` does not.

---

#### FINDING C-3: IDOR on Bet Listing - Members of One Group Can List Bets for Any Group
**File:** `BetController.java:96-102`, `BetService.java:170-174`
**Severity:** HIGH

`GET /api/groups/{groupId}/bets` — `listByGroup` only verifies the group exists, not that the requester is a member. Any authenticated user can enumerate bets (including picks, amounts, odds, participant IDs) for any group.

---

#### FINDING C-4: IDOR on Group Member Listing
**File:** `GroupController.java:60-63`

`GET /api/groups/{groupId}/members` — no membership check. Any authenticated user can discover who is in any group by brute-forcing group UUIDs.

---

#### FINDING C-5: `GET /api/users/{userId}/groups` — No Authorization Check
**File:** `GroupController.java:44-47`

Retrieves all groups for an arbitrary `userId` from the path. Any authenticated user can pass any userId and see another user's group membership. Must compare `userId` against the authenticated principal.

---

### HIGH

---

#### FINDING H-1: `POST /api/groups/{groupId}/bets/settle-accepted` — Accessible to Any Group Member
**File:** `BetController.java:63-90`
**Severity:** HIGH

Any authenticated group member (not just admin) can trigger settlement for a group. Settlement calls `scoreSyncService.refreshScores` and `settlementService.settleAcceptedBetsForGroup`, which permanently moves money. A malicious member could time-trigger settlement before score data is valid. Endpoint should be restricted to admin or group-owner role.

---

#### FINDING H-2: Wallet Transaction Audit Table Created but Never Written
**File:** `V9__wallet_balance_constraint_and_audit.sql`, `WalletService.java`
**Severity:** HIGH (correctness + forensics)

Migration V9 creates `wallet_transactions` as an audit log with a comment saying it tracks `DEPOSIT`, `WITHDRAWAL`, `BET_PROPOSE`, etc. But `WalletService.deposit` never inserts a row into `wallet_transactions`. The audit trail is entirely empty, which means there is no way to reconstruct balance history, debug disputes, or detect manipulation after the fact.

---

#### FINDING H-3: Admin Secret Comparison is Timing-Attack Vulnerable
**File:** `AdminSecretFilter.java:37`
**Severity:** HIGH (for production deployments)

```java
!adminSecret.equals(header)
```

`String.equals` is not constant-time. An attacker making thousands of requests can measure response time to byte-guess the secret. Replace with `MessageDigest.isEqual` on the HMAC-SHA256 digests of both values, or use `org.springframework.security.crypto.codec.Hex` / `MessageDigest.isEqual(digest(adminSecret), digest(header))`.

---

#### FINDING H-4: `safeSetResolvedAt` Uses Reflection and Silently Ignores Errors
**File:** `SettlementService.java:256-262`

```java
private void safeSetResolvedAt(Bet b, Instant when) {
    try {
        var m = b.getClass().getMethod("setResolvedAt", Instant.class);
        m.invoke(b, when);
    } catch (Throwable ignored) {
    }
}
```

`Bet.java:118-119` has `setResolvedAt` as a public method — this reflection is unnecessary, the direct call would work and is type-safe. More critically, if the `Throwable` is a real error (e.g., `setResolvedAt` does exist but throws), settlement still completes with `resolvedAt = null`. This also silently swallows `OutOfMemoryError`. Call `b.setResolvedAt(when)` directly.

---

### MEDIUM

---

#### FINDING M-1: `extractJtiUnsafe` Manual JSON Parsing is Fragile
**File:** `JwtUtil.java:54-80`

The hand-rolled JTI extractor (used on logout when the token is expired/invalid) scans for `"jti"` as a raw string in the decoded payload. It will fail on any whitespace variation, will match `"jti"` inside a string value, and is not needed — `Jwts.parserBuilder()...parseClaimsJwt()` (without signature verification) from the JJWT library can parse unsigned claims from an expired token. Alternatively, Jackson's `ObjectMapper` on `parts[1]` would be safer. The current approach could return a wrong JTI and fail to revoke the token on logout.

---

#### FINDING M-2: `CreateBetRequest` Odds Validation Too Permissive at DTO Layer
**File:** `CreateBetRequest.java:30`, `BetService.java:64`

The DTO uses `@Positive` (> 0) but `BetService.propose` enforces `> 1.0`. These are inconsistent. A value of `1.0` passes DTO validation but throws an `IllegalArgumentException` in the service, leaking the raw exception message through `BetController`'s `handleBadRequest`. The DTO annotation should be `@DecimalMin(value = "1.0", inclusive = false)` so validation fails at the DTO layer with a proper 400.

---

#### FINDING M-3: Information Disclosure — Raw Exception Messages Returned to Client
**File:** `AuthController.java:136-140`, `BetController.java:124-127`, `GlobalExceptionHandler.java:29-34`

All three places return `ex.getMessage()` directly from `IllegalArgumentException` to the client. Currently the messages are intentionally generic ("User not found: <username>"), but `UserService.requireByUsername` at line 58 includes the username in the message:

```java
throw new IllegalArgumentException("User not found: " + username);
```

This confirms to an attacker whether a given username exists. The message should be generic ("User not found") without the username.

---

#### FINDING M-4: No Rate Limiting on Login / Register / Refresh
**File:** `SecurityConfig.java`, `AuthController.java`

`/api/users/login`, `/api/users/register`, and `/api/users/refresh` are fully public with no rate limiting. An attacker can attempt unlimited password guesses or token refresh calls. Spring Security's `RequestRateLimiterFilter` (Bucket4j / Redis) or a gateway-level limit should be applied.

---

#### FINDING M-5: Refresh Cookie SameSite is "Lax", Not "Strict"
**File:** `AuthController.java:149`

```java
.sameSite("Lax")
```

`Lax` allows the cookie to be sent on top-level navigations (e.g., a `<form>` POST from an external site). Since the refresh endpoint at `/api/users/refresh` is a POST that issues tokens, `Strict` would be safer. `Lax` is acceptable if the API is purely cross-origin and the CORS policy is correctly locked down, but for an HttpOnly token-issuing endpoint, `Strict` is the right default.

---

#### FINDING M-6: `GET /api/groups` Returns All Groups to Any Authenticated User
**File:** `GroupController.java:38-40`

The comment says "admin view" but the endpoint has no admin guard (no `AdminSecretFilter`, no role check). Any authenticated user can list all groups, group names, and invite codes.

---

#### FINDING M-7: CORS `allowCredentials(true)` + Wildcard Risk is Mitigated but Configuration is Not Hardened
**File:** `SecurityConfig.java:90-99`

CORS is correctly configured to require explicit origins (no `*`), and `allowCredentials(true)` is set with named origins. The default is `http://localhost:3000,http://localhost:5173`. If `app.cors.allowed-origins` is not set in production, the dev origins remain active in production. This should be a required env-var with no fallback default, or the fallback should be an empty list that causes startup failure.

---

#### FINDING M-8: `isHttps` Trusts `X-Forwarded-Proto` Unconditionally
**File:** `AuthController.java:167-171`

```java
String forwardedProto = request.getHeader("X-Forwarded-Proto");
return forwardedProto != null && forwardedProto.equalsIgnoreCase("https");
```

Without Spring's `ForwardedHeaderFilter` (or its equivalent), this header is attacker-controlled. If a direct-to-server HTTP request includes `X-Forwarded-Proto: https`, the `secure` flag is set on the refresh cookie even though the channel is HTTP, making the cookie visible. Either install `ForwardedHeaderFilter` (register it as a Spring bean), or apply the forwarded-proto check only when behind a trusted proxy.

---

### LOW

---

#### FINDING L-1: `JoinGroupRequest` userId Not Validated Against Authenticated User
**File:** `GroupController.java:51-56`

`POST /api/groups/{inviteCode}/join` takes a `userId` from the body (inferred from `JoinGroupRequest`). If the service uses that body UID without checking the authenticated principal, a user could join a group on behalf of another user. This needs verification in `GroupMemberService.joinGroup`.

---

#### FINDING L-2: `settleAcceptedBetsForGroup` and `settleGame` Are Both `@Transactional` with Nested Calls
**File:** `SettlementService.java:57`, `SettlementService.java:121-141`

`settleAcceptedBetsForGroup` is `@Transactional` and calls `settleGame` which is also `@Transactional`. By default Spring uses `REQUIRED` propagation — the inner transaction joins the outer one. This is correct behavior, but it means the entire group's settlement is one giant transaction. A single wallet constraint violation (e.g., `chk_balance_non_negative`) on one bet will roll back ALL settlements in the group. Consider `REQUIRES_NEW` on `settleGame` or per-bet error handling so one bad bet doesn't block all others.

---

#### FINDING L-3: `WalletDepositRequest.amountCents` Has No Validation Annotation
**File:** `WalletDepositRequest.java:13`

The comment notes it can be negative (withdrawal), so no `@Positive` makes sense. But there is also no `@NotNull` (it's a primitive `long`, so that's fine) and no max bound. A caller could submit `Long.MAX_VALUE` and cause an arithmetic overflow at `w.getBalanceCents() + req.getAmountCents()` in `WalletService.java:47`. Add a range check (e.g., `Math.abs(amountCents) <= some_max`).

---

#### FINDING L-4: `Bet.status` is a Free String With No Database Enum Constraint
**File:** `Bet.java:49-50`, migrations

`status` is stored as a `VARCHAR` with no `CHECK (status IN ('OPEN', 'ACCEPTED', 'RESOLVED', 'VOID'))` constraint. Application code uses string literals like `"OPEN"`, `"ACCEPTED"` scattered across `BetService` and `SettlementService`. A migration typo or direct DB write could introduce an unknown status that leaves the bet permanently unresettled. Add a DB CHECK constraint or convert to a proper enum.

---

#### FINDING L-5: `SettlementService.evaluateOutcome` — PLAYER_PROP, PARLAY, SAME_GAME Fall Through to `NEEDS_DATA`
**File:** `SettlementService.java:195-197`

`BetService.normalizeMarket` accepts `PLAYER_PROP`, `TEAM_PROP`, `SAME_GAME`, `PARLAY`. All of these hit `default: return Outcome.NEEDS_DATA` in `evaluateOutcome`. Bets of these types will never be settled automatically. They are silently skipped in the settlement loop. There is no notification, no stuck-bet detection, and no admin flag. These bets will hold escrowed funds indefinitely.

---

#### FINDING L-6: `frontend/src/api/axios.ts` — 403 Heuristic Triggers Token Refresh on Business-Logic Errors
**File:** `axios.ts:98-111`

```typescript
const looksAuth403 =
  status === 403 &&
  /unauth|auth|token|expired|jwt|not\s*authenticated/i.test(bodyStr);
```

`AdminSecretFilter.java:38` returns `403` with body `"Invalid admin secret"`. This string does not match the regex, so it is safe. However if any business-logic 403 contains one of those keywords (e.g., an error message like "Not authenticated as group member"), it will trigger an unnecessary token refresh loop. This is a minor bug that wastes a round-trip and could confuse the client auth state.

---

#### FINDING L-7: Access Token Not Revoked on Logout
**File:** `AuthController.java:105-124`, `TokenService.java`

Logout only revokes the refresh token. The 15-minute access token (in-memory on the client) remains valid until it naturally expires. If an attacker steals an access token from memory/logs, they have up to 15 minutes of continued access after the user has logged out. Short-lived access tokens partially mitigate this, but for higher-assurance scenarios a token deny-list (e.g., Redis set of revoked JTIs) should be used.

---

## No Issues Found

- JWT secret is read from env var only (`${JWT_SECRET_B64}`), not hardcoded. (VERIFIED: `application.yml:6`)
- BCrypt is used for password hashing. (VERIFIED: `SecurityConfig.java:112-114`)
- Refresh tokens are stored server-side and checked against the DB on every use. (VERIFIED: `TokenService.java:42-61`)
- Refresh token rotation is implemented — old JTI is revoked before new one is issued. (VERIFIED: `TokenService.java:52-58`)
- Pessimistic locking on wallet ops prevents double-spend on concurrent deposits. (VERIFIED: `WalletRepository.java:19-21`)
- Pessimistic locking on bet acceptance prevents two users accepting the same bet. (VERIFIED: `BetRepository.java:20-22`)
- DB-level non-negative balance constraint exists. (VERIFIED: `V9__wallet_balance_constraint_and_audit.sql:3-4`)
- Proposer cannot accept their own bet. (VERIFIED: `BetService.java:144-146`)
- Bet proposer is always set from the authenticated session, not client-supplied. (VERIFIED: `BetService.java:56-60`)
- Token type claim is validated — refresh tokens cannot be used as access tokens. (VERIFIED: `JwtAuthenticationFilter.java:50-54`)
- Audience/issuer are validated in `parseAndValidate` via JJWT's parser. (VERIFIED: `JwtUtil.java:41-47`)
- H2 console is only permitted when `spring.h2.console.enabled=true`. (VERIFIED: `SecurityConfig.java:69-71`)
- Admin endpoints require both a valid JWT AND the `X-Admin-Secret` header. (VERIFIED: `AdminSecretFilter.java`, `SecurityConfig.java:78-83`)
- `application-dev.yml` devpass is in a separate profile, not in base config.
- No TODO/FIXME comments found in any Java source file.

---

## Priority Fix Order

| Priority | Finding | Effort |
|----------|---------|--------|
| 1 | C-1: IDOR wallet deposit (any user credits any wallet) | Low — add principal check in controller |
| 2 | C-2: IDOR listBalances (no membership check) | Low |
| 3 | C-3/C-4: IDOR bet/member listing | Low |
| 4 | C-5: `GET /users/{userId}/groups` no auth check | Low |
| 5 | H-1: Any member can trigger settlement | Low — add admin/owner check |
| 6 | H-2: Wallet audit table never written | Medium — insert to wallet_transactions in WalletService |
| 7 | H-3: Admin secret timing attack | Low — use MessageDigest.isEqual |
| 8 | H-4: Remove reflection in safeSetResolvedAt | Trivial |
| 9 | M-3: Username enumeration in error message | Trivial |
| 10 | M-8: Unchecked X-Forwarded-Proto | Low — add ForwardedHeaderFilter bean |
