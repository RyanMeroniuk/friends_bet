# Security & Quality Fixes Implementation Plan

**Project:** friends_bet
**Created:** 2026-03-15
**Source:** Security audit of auth, wallet, bet, and settlement flows

---

## Priority 1: Must-Fix (Security Holes)

### 1.1 — IDOR: Wallet Deposit Allows Acting on Any User's Wallet

**Files:** `WalletController.java`, `WalletService.java`
**Issue:** `POST /api/groups/{groupId}/wallets/deposit` takes `userId` from the request body with no check that the authenticated user matches. User A can deposit into or drain User B's wallet.
**Fix:** Extract the authenticated user's ID from `SecurityContextHolder` (same pattern as `BetService.currentUserId()`). Ignore the body `userId` or validate it matches the principal.
**Tests to update:** `WalletControllerTest`, `WalletServiceTest`, `BetLifecycleIntegrationTest`

---

### 1.2 — IDOR: Anyone Can View Any Group's Balances

**Files:** `WalletService.java:60-69`
**Issue:** `GET /api/groups/{groupId}/wallets` returns all balances with no membership check.
**Fix:** Add `groupMemberRepo.existsByGroup_IdAndUser_Id(groupId, currentUserId)` check before returning data. Throw `IllegalArgumentException("Not a member of this group")` if false.
**Tests to add:** Verify non-member gets 400 on `listBalances`

---

### 1.3 — IDOR: Anyone Can List Bets for Any Group

**Files:** `BetService.java:170-174`
**Issue:** `GET /api/groups/{groupId}/bets` only checks group exists, not that the requester is a member.
**Fix:** Add membership check (same pattern as 1.2).
**Tests to add:** Verify non-member gets 400 on `listBets`

---

### 1.4 — IDOR: Anyone Can List Members of Any Group

**Files:** `GroupMemberService.java` (the `listMembers` method)
**Issue:** `GET /api/groups/{groupId}/members` has no membership check.
**Fix:** Add membership check using authenticated principal.
**Tests to add:** Verify non-member gets 400

---

### 1.5 — IDOR: Anyone Can List Another User's Groups

**Files:** `GroupController.java:44-47`
**Issue:** `GET /api/users/{userId}/groups` takes `userId` from path with no check against the authenticated principal.
**Fix:** Extract authenticated user ID and verify it matches the path `userId`. Or remove the path variable and always use the authenticated user's ID.
**Tests to add:** Verify user A can't list user B's groups

---

### 1.6 — Settlement Accessible to Any Authenticated User

**Files:** `BetController.java:63-90`
**Issue:** `POST /api/groups/{groupId}/bets/settle-accepted` moves escrowed money. Any authenticated user who knows a group ID can trigger it.
**Fix:** Either restrict to group members only (with membership check), or move to the admin endpoint behind `AdminSecretFilter`.
**Tests to update:** `BetControllerTest.settleAccepted_200`

---

### 1.7 — Admin Secret Timing Attack

**File:** `AdminSecretFilter.java:37`
**Issue:** `adminSecret.equals(header)` is not constant-time. Vulnerable to timing attacks.
**Fix:**
```java
import java.security.MessageDigest;
// ...
if (!MessageDigest.isEqual(adminSecret.getBytes(), header.getBytes())) {
```
**Tests:** Existing admin tests still pass (behavioral change is invisible to tests)

---

## Priority 2: Should-Fix (Quality & Polish)

### 2.1 — Wire Up Wallet Audit Table

**Files:** `WalletService.java`, new `WalletTransactionRepository.java`, new `WalletTransaction.java` model
**Issue:** Migration V9 creates `wallet_transactions` table but nothing writes to it.
**Fix:** Create `WalletTransaction` entity and repository. In `WalletService.deposit()`, insert a row after every balance change with type (`DEPOSIT`, `WITHDRAWAL`, `BET_PROPOSE`, `BET_ACCEPT`, `BET_WIN`, `BET_REFUND`), amount, before/after balance, and timestamp.
**Note:** The `deposit` method is called by `BetService` and `SettlementService` too — those will automatically get audit entries. Consider adding a `reason` parameter to `deposit()` to distinguish the source.
**Tests to add:** Verify audit rows are written after deposit, propose, settle

---

### 2.2 — Remove Reflection Hack in SettlementService

**File:** `SettlementService.java:256-262`
**Issue:** `safeSetResolvedAt` uses reflection to call `b.setResolvedAt(when)` — a public setter that exists on `Bet.java`. The `catch (Throwable ignored)` silently swallows all errors.
**Fix:** Replace with direct call:
```java
private void finalizeAndSave(Bet b) {
    b.setResolvedAt(Instant.now());
    betRepo.save(b);
}
```
Delete the `safeSetResolvedAt` method entirely.
**Tests:** Existing `SettlementServiceTest` covers this path

---

### 2.3 — Fix DTO Odds Validation Mismatch

**File:** `CreateBetRequest.java:30`
**Issue:** DTO uses `@Positive` (allows 0.5), but service requires `> 1.0`. Values between 0 and 1 pass validation then hit a raw error.
**Fix:** Replace `@Positive` with `@DecimalMin(value = "1.0", inclusive = false, message = "Odds must be greater than 1.0")`.
**Tests to update:** `DtoValidationTest.CreateBetRequest_negativeOdds_violation` — add a test for odds = 0.5

---

### 2.4 — Fix Username Enumeration

**File:** `UserService.java:58`
**Issue:** `"User not found: " + username` confirms whether a specific username exists.
**Fix:** Change to `"User not found"` (no username echo).
**Tests:** Update `UserServiceTest.requireByUsername_notFound_throws` if it asserts on the message

---

### 2.5 — GET /api/groups Exposes All Groups Including Invite Codes

**File:** `GroupController.java:38-40`
**Issue:** Any authenticated user sees all groups and their invite codes. Comment says "admin view" but no admin guard.
**Fix:** Either restrict to admin (behind `AdminSecretFilter`), or remove it and only expose `GET /api/users/{userId}/groups` for the authenticated user's own groups.
**Tests to update:** `GroupControllerTest.list_200_returnsGroups`

---

## Priority 3: Nice-to-Have (Differentiators)

### 3.1 — Rate Limiting on Auth Endpoints

**Files:** `pom.xml`, new `RateLimitFilter.java` or Bucket4j config
**Issue:** Login, register, and refresh accept unlimited requests. Brute-force is trivial.
**Fix:** Add Bucket4j dependency and a filter that limits login/register to ~10 requests per IP per minute. Log rate-limit hits.
**Tests to add:** Integration test that verifies 429 after threshold

---

### 3.2 — CHECK Constraint on bet.status

**File:** New migration `V10__bet_status_constraint.sql`
**Issue:** `bet.status` is a free string. A bad write can create an unsettleable bet.
**Fix:**
```sql
ALTER TABLE bets ADD CONSTRAINT chk_bet_status
    CHECK (status IN ('OPEN', 'ACCEPTED', 'RESOLVED', 'VOID'));
```
**Tests:** Existing tests pass since they only use valid statuses

---

### 3.3 — Access Token Deny-List on Logout

**Files:** New `TokenDenyListService.java`, `JwtAuthenticationFilter.java`
**Issue:** Stolen access tokens remain valid for 15 minutes after logout.
**Fix:** On logout, add the access token's JTI to an in-memory `ConcurrentHashMap<String, Instant>` (or Redis). In `JwtAuthenticationFilter`, after parsing, check the deny-list. Entries auto-expire after 15 minutes (access token TTL). No persistence needed.
**Tests to add:** Verify that a logged-out access token is rejected

---

### 3.4 — Refresh Cookie SameSite=Strict

**File:** `AuthController.java:149`
**Issue:** `SameSite("Lax")` allows the cookie on top-level cross-site navigations.
**Fix:** Change to `SameSite("Strict")`. Since the refresh endpoint is only called by the SPA (same origin), `Strict` works.
**Tests:** Existing cookie tests still pass

---

### 3.5 — Guard Against Unsettleable Market Types

**Files:** `BetService.java`, `SettlementService.java:195-197`
**Issue:** Non-standard market types (e.g., PLAYER_PROP) are accepted but `evaluateOutcome` returns `NEEDS_DATA`, so escrowed funds are stuck forever.
**Fix:** In `BetService.propose`, validate `marketType` against an allowed set: `Set.of("WINNER", "SPREAD", "TOTALS")`. Reject anything else with a clear error.
**Tests to add:** `BetServiceTest` — verify unsupported market type throws

---

### 3.6 — Production CORS Default

**File:** `SecurityConfig.java:34`
**Issue:** Default CORS origins include `localhost:3000` and `localhost:5173`. If the property isn't set in prod, dev origins are active.
**Fix:** Default to empty string `""` and fail fast in `parseCorsOrigins` if empty in non-dev profiles.
**Tests:** None needed (config behavior)

---

## Implementation Order

| # | Fix | Scope | Risk |
|---|-----|-------|------|
| 1 | 1.7 Admin secret timing | 1 line | None |
| 2 | 2.2 Remove reflection hack | 5 lines | None |
| 3 | 2.4 Username enumeration | 1 line | None |
| 4 | 2.3 Odds validation mismatch | 1 annotation | None |
| 5 | 3.4 SameSite=Strict | 1 line | None |
| 6 | 1.1–1.5 IDOR fixes | ~50 lines across 5 files | Medium — need auth context wiring |
| 7 | 1.6 Settlement access control | ~10 lines | Low |
| 8 | 2.5 Groups endpoint exposure | ~10 lines | Low |
| 9 | 2.1 Wallet audit table | New entity + repo + service changes | Medium |
| 10 | 3.2 Bet status constraint | 1 migration | Low |
| 11 | 3.5 Market type allowlist | ~5 lines | Low |
| 12 | 3.3 Access token deny-list | New service + filter change | Medium |
| 13 | 3.1 Rate limiting | New dependency + filter | Medium |
| 14 | 3.6 CORS default | ~5 lines | Low |

---

## Test Impact

- Fixes 1–5 are trivial and existing tests pass unchanged
- IDOR fixes (6) require new negative test cases in controller/service tests
- Wallet audit (9) needs new tests verifying transaction rows
- Token deny-list (12) needs a new integration test

## Notes

- All IDOR fixes follow the same pattern already used in `BetService`: extract user from `SecurityContextHolder`, verify membership via `groupMemberRepo`
- The wallet audit table schema already exists from migration V9 — just needs the entity and writes
- Rate limiting can be deferred if deploying behind a gateway (Cloudflare, AWS ALB) that handles it
