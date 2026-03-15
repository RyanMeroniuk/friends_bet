# Test Suite Implementation Plan

**Project:** friends_bet (Spring Boot 3.5 / Java 17 + React 19 / TypeScript)  
**Created:** 2026-03-14  
**Status:** Ready for implementation

---

## What Already Exists (DO NOT re-implement)

| Test File | Tests | Style |
|-----------|-------|-------|
| `BetServiceTest` | 3 unit tests (propose, accept, self-accept rejection) | Mockito `@ExtendWith` |
| `SettlementServiceTest` | 5 unit tests (WINNER/TOTALS/SPREAD settlement, push, void) | Mockito `@ExtendWith` |
| `WalletServiceConcurrencyTest` | 3 integration tests (concurrent deposit/withdraw/mixed) | `@SpringBootTest` + H2 |
| `FriendsBetApplicationTests` | 1 smoke test (context loads) | `@SpringBootTest` |
| `App.test.tsx` | 1 broken boilerplate | Jest + RTL |

## Test Infrastructure Already Available

- **H2 in-memory DB** configured in `application-test.properties` (PostgreSQL mode, Flyway disabled, `create-drop`)
- **Mockito** via `spring-boot-starter-test`
- **JWT test secret** configured: `jwt.secret=dGVzdC10ZXN0Li4u`
- **Frontend:** Jest + `@testing-library/react` + `@testing-library/user-event` already in `package.json`
- **No Testcontainers** (not in pom.xml; H2 is the test DB)

---

## Phase 1: Service Unit Tests (Mockito)

Foundation layer. No Spring context needed. Fast.

### Step 1.1 — UserService Unit Tests

**File:** `src/test/java/com/ryanmeroniuk/friends_bet/service/UserServiceTest.java`  
**Style:** `@ExtendWith(MockitoExtension.class)` with `@Mock UserRepository`, `@Mock PasswordEncoder`

**Scenarios:**
1. `register_success` — saves user with hashed password, returns User
2. `register_duplicateUsername_throws` — `findByUsername` returns present, expects `IllegalArgumentException("Username already in use")`
3. `register_duplicateEmail_throws` — `findByEmail` returns present, expects `IllegalArgumentException("Email already registered")`
4. `login_byUsername_success` — `findByUsername` returns user, `passwordEncoder.matches` returns true
5. `login_byEmail_success` — `findByUsername` returns empty, `findByEmail` returns user, password matches
6. `login_wrongPassword_throws` — user found but `matches` returns false, expects `IllegalArgumentException("Invalid credentials")`
7. `login_notFound_throws` — both lookups empty, expects `IllegalArgumentException("Invalid credentials")`
8. `requireByUsername_found` — returns user
9. `requireByUsername_notFound_throws` — expects `IllegalArgumentException`

**Infrastructure needed:** None beyond Mockito.

---

### Step 1.2 — WalletService Unit Tests

**File:** `src/test/java/com/ryanmeroniuk/friends_bet/service/WalletServiceTest.java`  
**Style:** `@ExtendWith(MockitoExtension.class)` with `@Mock WalletRepository`, `@Mock GroupRepository`, `@Mock UserRepository`

**Scenarios:**
1. `deposit_createsNewWallet_whenNoneExists` — `findByGroupAndUserForUpdate` returns empty, verify `save` called twice (create + update)
2. `deposit_addsToExistingBalance` — wallet exists with 5000 cents, deposit 3000, verify balance set to 8000
3. `deposit_withdrawal_success` — wallet has 5000, deposit -3000, verify balance 2000
4. `deposit_insufficientFunds_throws` — wallet has 1000, deposit -2000, expects `IllegalArgumentException("Insufficient funds")`
5. `deposit_groupNotFound_throws` — `groupRepo.findById` returns empty
6. `deposit_userNotFound_throws` — `userRepo.findById` returns empty
7. `listBalances_returnsAllWallets` — verify mapping to `WalletResponse`
8. `listBalances_groupNotFound_throws` — expects `IllegalArgumentException`

**Infrastructure needed:** None.

---

### Step 1.3 — GroupService Unit Tests

**File:** `src/test/java/com/ryanmeroniuk/friends_bet/service/GroupServiceTest.java`  
**Style:** `@ExtendWith(MockitoExtension.class)`

**Scenarios:**
1. `createGroup_savesAndReturnsDto` — verify GroupResponse has name, inviteCode, id
2. `listGroups_returnsAll` — mock `findAll` with 2 groups, verify 2 DTOs returned
3. `listGroupsForUser_success` — user exists, has 2 memberships, returns 2 GroupResponses
4. `listGroupsForUser_userNotFound_throws` — `userRepo.findById` empty, expects `IllegalArgumentException`
5. `listGroupsForUser_noMemberships_returnsEmpty` — user exists but `findAllByUser` returns empty list

---

### Step 1.4 — GroupMemberService Unit Tests

**File:** `src/test/java/com/ryanmeroniuk/friends_bet/service/GroupMemberServiceTest.java`  
**Style:** `@ExtendWith(MockitoExtension.class)`

**Scenarios:**
1. `joinGroup_success` — invite code valid, user exists, not already member, verify save + response fields
2. `joinGroup_invalidInviteCode_throws` — `findByInviteCode` returns empty
3. `joinGroup_userNotFound_throws` — user not found
4. `joinGroup_alreadyMember_throws` — `findByGroupAndUser` returns present, expects `IllegalArgumentException("User already in group")`
5. `listMembers_success` — group exists, 2 members, verify response list
6. `listMembers_groupNotFound_throws` — `findById` returns empty

---

### Step 1.5 — TokenService Unit Tests

**File:** `src/test/java/com/ryanmeroniuk/friends_bet/service/TokenServiceTest.java`  
**Style:** `@ExtendWith(MockitoExtension.class)` with `@Mock JwtUtil`, `@Mock RefreshTokenRepository`

**Scenarios:**
1. `issueTokenPair_revokesOldTokens_andIssuesNew` — verify `revokeActiveTokensForUser` called, verify new access+refresh tokens returned
2. `rotateRefreshToken_success` — old token found, not revoked/expired, verify old revoked, new pair issued
3. `rotateRefreshToken_notFound_throws` — `findById` returns empty
4. `rotateRefreshToken_alreadyRevoked_throws` — token is revoked
5. `rotateRefreshToken_expired_throws` — token is expired
6. `rotateRefreshToken_subjectMismatch_throws` — claims uid doesn't match token user
7. `revokeRefreshToken_success` — token found, not yet revoked, verify revoked and saved
8. `revokeRefreshToken_alreadyRevoked_noop` — token found but already revoked, verify save NOT called again

---

### Step 1.6 — ScoreSyncService Unit Tests

**File:** `src/test/java/com/ryanmeroniuk/friends_bet/service/ScoreSyncServiceTest.java`  
**Style:** `@ExtendWith(MockitoExtension.class)` with `@Mock TheOddsApiClient`, `@Mock GameRepository`, `@Mock SettlementService`

**Scenarios:**
1. `refreshScores_singleSport_completedGame_settles` — API returns completed event, game found in DB not yet final, verify `setFinalScore` called with correct scores
2. `refreshScores_singleSport_gameAlreadyFinal_skips` — game is already final, verify `setFinalScore` NOT called
3. `refreshScores_singleSport_gameNotInDb_skips` — `findByExternalGameId` returns empty
4. `refreshScores_singleSport_incompleteEvent_skips` — event `completed = false`
5. `refreshScores_singleSport_missingScores_skips` — event completed but scores null
6. `refreshScores_singleSport_apiError_capturedInSummary` — `fetchScores` throws, verify error in `PerSport.errors`
7. `refreshScores_allSports_iteratesConfigured` — set `configuredSportKeys` via reflection, verify each sport processed

**Infrastructure needed:** ReflectionTestUtils to set `@Value` fields (`configuredSportKeys`, `defaultDaysFrom`).

---

## Phase 2: Controller Tests (`@WebMvcTest`)

Slice tests. Loads only the web layer + security. Mocks all services.

### Step 2.1 — Test Security Helper

**File:** `src/test/java/com/ryanmeroniuk/friends_bet/support/TestJwtHelper.java`  
**Purpose:** Generate valid JWT access tokens for `@WebMvcTest` tests so requests pass the `JwtAuthenticationFilter`.

**Contents:**
- Static method `generateAccessToken(String username, UUID userId)` using the test secret from `application-test.properties`
- Returns a Bearer token string
- Uses the same `JwtUtil` signing logic (HS256 + test secret)

**Why needed:** All authenticated endpoints require `Authorization: Bearer <token>`. Without this helper, every `@WebMvcTest` would need to mock the filter chain or use `@WithMockUser` (which doesn't work well with custom JWT filters).

---

### Step 2.2 — AuthController Tests

**File:** `src/test/java/com/ryanmeroniuk/friends_bet/controller/AuthControllerTest.java`  
**Style:** `@WebMvcTest(AuthController.class)` + `@MockBean UserService`, `@MockBean TokenService`, `@MockBean JwtUtil` + `@AutoConfigureMockMvc`  
**Note:** Also need `@MockBean` for `UserDetailsService` and the filter beans since Security config loads them.

**Scenarios:**
1. `register_201_returnsAccessToken` — POST `/api/users/register` with valid body, verify 201 + `accessToken` in response + `Set-Cookie: refresh` header
2. `register_400_blankUsername` — missing username, verify 400 + validation error for `username`
3. `register_400_invalidEmail` — bad email format, verify 400
4. `register_400_shortPassword` — password < 8 chars, verify 400
5. `register_400_duplicateUsername` — `userService.register` throws `IllegalArgumentException`, verify 400
6. `login_200_returnsAccessToken` — POST `/api/users/login` valid creds, verify 200 + token + cookie
7. `login_401_invalidCredentials` — `userService.login` throws, verify 401
8. `login_400_blankFields` — missing required fields, verify 400
9. `refresh_200_rotatesTokens` — POST `/api/users/refresh` with valid refresh cookie, verify new access token + new cookie
10. `refresh_401_missingCookie` — no cookie, verify 401
11. `refresh_401_invalidToken` — cookie present but `jwtUtil.parseAndValidate` throws
12. `logout_204_clearsCookie` — POST `/api/users/logout`, verify 204 + `Set-Cookie` with `maxAge=0`
13. `me_200_returnsProfile` — GET `/api/users/me` with valid access token, verify user profile JSON
14. `me_401_unauthenticated` — GET `/api/users/me` without token, verify 401

---

### Step 2.3 — GroupController Tests

**File:** `src/test/java/com/ryanmeroniuk/friends_bet/controller/GroupControllerTest.java`  
**Style:** `@WebMvcTest(GroupController.class)` + `@MockBean GroupService`, `@MockBean GroupMemberService`

**Scenarios:**
1. `create_201_returnsGroup` — POST `/api/groups` with valid auth + body
2. `create_400_blankName` — name missing, verify validation error
3. `create_400_nameTooShort` — name 1 char (min 2)
4. `create_401_noAuth` — no token, verify 401
5. `list_200_returnsGroups` — GET `/api/groups` with auth
6. `listForUser_200_returnsUserGroups` — GET `/api/users/{id}/groups`
7. `join_201_returnsGroupMember` — POST `/api/groups/{code}/join` with valid body
8. `join_400_invalidInviteCode` — service throws, verify 400
9. `members_200_returnsList` — GET `/api/groups/{id}/members`

---

### Step 2.4 — BetController Tests

**File:** `src/test/java/com/ryanmeroniuk/friends_bet/controller/BetControllerTest.java`  
**Style:** `@WebMvcTest(BetController.class)` + `@MockBean BetService`, `@MockBean SettlementService`, `@MockBean ScoreSyncService`

**Scenarios:**
1. `proposeBet_201_returnsBet` — POST `/api/groups/{id}/bets` with valid JSON
2. `proposeBet_400_missingFields` — omit required fields (gameId, marketType, pick)
3. `proposeBet_400_groupIdMismatch` — body groupId differs from path groupId
4. `proposeBet_401_noAuth` — no token
5. `listBets_200` — GET `/api/groups/{id}/bets`
6. `acceptBet_200` — POST `/api/bets/{id}/accept`
7. `settleAccepted_200` — POST `/api/groups/{id}/bets/settle-accepted`, verify response contains `settled` count

---

### Step 2.5 — WalletController Tests

**File:** `src/test/java/com/ryanmeroniuk/friends_bet/controller/WalletControllerTest.java`  
**Style:** `@WebMvcTest(WalletController.class)` + `@MockBean WalletService`

**Scenarios:**
1. `deposit_200_returnsWalletResponse` — POST `/api/groups/{id}/wallets/deposit` with valid body
2. `deposit_400_nullUserId` — missing userId
3. `deposit_401_noAuth` — no bearer token
4. `listBalances_200` — GET `/api/groups/{id}/wallets`

---

### Step 2.6 — AdminController Tests

**File:** `src/test/java/com/ryanmeroniuk/friends_bet/controller/AdminControllerTest.java`  
**Style:** `@WebMvcTest(AdminController.class)` + `@MockBean OddsService`, `@MockBean ScoreSyncService`, `@MockBean SettlementService`

**Scenarios:**
1. `refresh_200` — POST `/api/admin/refresh?sport=basketball_nba` with valid auth
2. `refreshScores_200` — POST `/api/admin/scores/refresh`
3. `finalizeGame_200` — POST `/api/admin/games/{id}/final?homeScore=100&awayScore=98`
4. `settle_200` — POST `/api/admin/games/{id}/settle`
5. `adminEndpoints_401_noAuth` — all admin endpoints without auth return 401

**Note:** AdminController also requires the `AdminSecretFilter` header. Tests should verify that behavior too (sending `X-Admin-Secret` header).

---

## Phase 3: Security & Filter Tests

### Step 3.1 — JwtAuthenticationFilter Unit Tests

**File:** `src/test/java/com/ryanmeroniuk/friends_bet/filter/JwtAuthenticationFilterTest.java`  
**Style:** Plain JUnit + Mockito. Instantiate filter directly, mock `JwtUtil` and `UserDetailsService`, use `MockHttpServletRequest`/`MockHttpServletResponse`/`MockFilterChain`.

**Scenarios:**
1. `shouldNotFilter_publicPaths` — verify `shouldNotFilter` returns true for `/api/users/register`, `/api/users/login`, `/api/users/refresh`, `/api/users/logout`, `/h2-console/anything`
2. `shouldFilter_protectedPaths` — returns false for `/api/groups`, `/api/bets/123/accept`, etc.
3. `doFilter_validAccessToken_setsAuthentication` — valid Bearer header, `parseAndValidate` returns claims with `token_type=access`, verify `SecurityContextHolder` has authentication set
4. `doFilter_refreshToken_doesNotAuthenticate` — token_type is `refresh`, verify context stays empty
5. `doFilter_noAuthHeader_passesThrough` — no Authorization header, chain.doFilter still called, context empty
6. `doFilter_invalidToken_clearsContext` — `parseAndValidate` throws, verify context cleared, chain continues

---

### Step 3.2 — SecurityConfig Integration Test

**File:** `src/test/java/com/ryanmeroniuk/friends_bet/config/SecurityConfigTest.java`  
**Style:** `@SpringBootTest` + `@AutoConfigureMockMvc` with `@ActiveProfiles("test")`

**Scenarios (verify the full filter chain wired together):**
1. `publicEndpoints_noAuth_200` — `/ping`, `/api/users/register` (POST), `/api/users/login` (POST)
2. `protectedEndpoints_noAuth_401` — `/api/groups`, `/api/users/me`, `/api/groups/{id}/bets`
3. `protectedEndpoints_validToken_200` — generate real JWT via `JwtUtil`, attach as Bearer, verify access
4. `publicGetEndpoints_sports_games` — GET `/api/sports`, GET `/api/games/upcoming` return 200 without auth

**Infrastructure needed:** Uses real `JwtUtil` bean (H2 + test properties).

---

## Phase 4: DTO Validation Tests

### Step 4.1 — DTO Validation Unit Tests

**File:** `src/test/java/com/ryanmeroniuk/friends_bet/dto/DtoValidationTest.java`  
**Style:** Plain JUnit + `jakarta.validation.Validator` (no Spring context)

**Setup:** `Validator validator = Validation.buildDefaultValidatorFactory().getValidator();`

**Scenarios:**
1. `CreateUserRequest_valid_noViolations`
2. `CreateUserRequest_blankUsername_violation`
3. `CreateUserRequest_usernameTooShort_violation` (< 3 chars)
4. `CreateUserRequest_usernameTooLong_violation` (> 30 chars)
5. `CreateUserRequest_invalidEmail_violation`
6. `CreateUserRequest_passwordTooShort_violation` (< 8 chars)
7. `LoginRequest_blankFields_violations`
8. `CreateGroupRequest_blankName_violation`
9. `CreateGroupRequest_nameTooShort_violation` (< 2 chars)
10. `CreateBetRequest_nullGameId_violation`
11. `CreateBetRequest_zeroAmount_violation` (min 1)
12. `CreateBetRequest_negativeOdds_violation`
13. `WalletDepositRequest_nullUserId_violation`
14. `JoinGroupRequest_nullUserId_violation`

**Infrastructure needed:** None. Pure validation API.

---

## Phase 5: Frontend Tests

### Step 5.1 — Replace Broken App.test.tsx

**File:** `frontend/src/App.test.tsx` (replace existing)  
**Style:** Jest + React Testing Library

**Scenarios:**
1. `renders_without_crashing` — basic smoke test that `<App />` renders (wrap with `MemoryRouter` + `AuthProvider` as needed)

**Infrastructure needed:** May need to mock `axios` globally. Create `frontend/src/__mocks__/axios.ts` if not present.

---

### Step 5.2 — AuthContext Tests

**File:** `frontend/src/context/AuthContext.test.tsx`  
**Style:** Jest + RTL + axios mock

**Scenarios:**
1. `initial_state_isLoggedOut` — render provider, verify `isAuthenticated` is false
2. `login_setsAuthState` — mock POST `/api/users/login` success, call `login()`, verify state updates
3. `login_failure_showsError` — mock 401 response, verify error state
4. `logout_clearsState` — after login, call `logout()`, verify state cleared
5. `refreshToken_onMount` — mock refresh endpoint, verify silent refresh on provider mount

**Infrastructure needed:** `jest.mock('axios')` or MSW. Axios mock is simpler to start.

---

### Step 5.3 — API Module Tests

**File:** `frontend/src/api/user.test.ts`  
**Style:** Jest + axios mock

**Scenarios:**
1. `registerUser_postsCorrectPayload` — verify axios called with `/api/users/register` + correct body
2. `loginUser_postsCorrectPayload` — verify request shape
3. `getProfile_sendsGetRequest` — verify GET to `/api/users/me`

**File:** `frontend/src/api/group.test.ts`

**Scenarios:**
1. `createGroup_postsCorrectPayload`
2. `listGroups_sendsGetRequest`
3. `joinGroup_postsWithInviteCode`

**File:** `frontend/src/api/wallet.test.ts`

**Scenarios:**
1. `deposit_postsCorrectPayload`
2. `listBalances_sendsGetRequest`

**Infrastructure needed:** Shared axios mock.

---

### Step 5.4 — Page Component Smoke Tests

**File:** `frontend/src/Pages/AuthPage.test.tsx`  
**Style:** Jest + RTL

**Scenarios:**
1. `renders_loginForm` — verify username/email and password fields present
2. `renders_registerForm` — switch to register tab, verify username + email + password fields
3. `submit_callsLogin` — fill form, submit, verify API called

**File:** `frontend/src/Pages/GroupPage.test.tsx`

**Scenarios:**
1. `renders_groupList` — mock groups API, verify group names displayed
2. `create_group_modal` — click create, verify modal appears

**Infrastructure needed:** Wrap components in `AuthProvider` + `MemoryRouter`. Mock all API calls.

---

## Phase 6: Integration Tests (Optional / Stretch)

### Step 6.1 — Full Auth Flow Integration

**File:** `src/test/java/com/ryanmeroniuk/friends_bet/integration/AuthFlowIntegrationTest.java`  
**Style:** `@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)` + `TestRestTemplate` + `@ActiveProfiles("test")`

**Scenarios:**
1. `fullAuthFlow` — register -> login -> access /me -> refresh -> logout -> /me returns 401
2. `duplicateRegistration_returns400`
3. `loginWithEmail_works`
4. `expiredRefreshToken_returns401`

---

### Step 6.2 — Bet Lifecycle Integration

**File:** `src/test/java/com/ryanmeroniuk/friends_bet/integration/BetLifecycleIntegrationTest.java`  
**Style:** `@SpringBootTest` + `TestRestTemplate` + `@ActiveProfiles("test")`

**Scenarios:**
1. `fullBetLifecycle` — create group -> add 2 users -> deposit funds -> propose bet -> accept bet -> finalize game -> verify settlement payouts
2. `proposeBet_insufficientFunds_returns400`
3. `acceptOwnBet_returns400`

---

## Implementation Order

| Priority | Step | Est. Time | Dependencies |
|----------|------|-----------|--------------|
| 1 | 1.1 UserServiceTest | 30 min | None |
| 2 | 1.2 WalletServiceTest | 30 min | None |
| 3 | 1.3 GroupServiceTest | 20 min | None |
| 4 | 1.4 GroupMemberServiceTest | 25 min | None |
| 5 | 1.5 TokenServiceTest | 30 min | None |
| 6 | 1.6 ScoreSyncServiceTest | 40 min | None |
| 7 | 4.1 DtoValidationTest | 25 min | None |
| 8 | 2.1 TestJwtHelper | 15 min | None |
| 9 | 3.1 JwtAuthFilterTest | 25 min | None |
| 10 | 2.2 AuthControllerTest | 45 min | Step 2.1 |
| 11 | 2.3 GroupControllerTest | 30 min | Step 2.1 |
| 12 | 2.4 BetControllerTest | 30 min | Step 2.1 |
| 13 | 2.5 WalletControllerTest | 20 min | Step 2.1 |
| 14 | 2.6 AdminControllerTest | 25 min | Step 2.1 |
| 15 | 3.2 SecurityConfigTest | 30 min | Step 2.1 |
| 16 | 5.1 Fix App.test.tsx | 10 min | None |
| 17 | 5.2 AuthContext tests | 30 min | Axios mock |
| 18 | 5.3 API module tests | 30 min | Axios mock |
| 19 | 5.4 Page smoke tests | 30 min | Steps 5.1-5.3 |
| 20 | 6.1 Auth flow integration | 45 min | Steps 1-3 |
| 21 | 6.2 Bet lifecycle integration | 45 min | Steps 1-3 |

## Test Count Summary

| Phase | New Tests | Category |
|-------|-----------|----------|
| Phase 1: Service units | ~38 | Unit (Mockito) |
| Phase 2: Controller slices | ~30 | Web slice (`@WebMvcTest`) |
| Phase 3: Security/filters | ~10 | Unit + Integration |
| Phase 4: DTO validation | ~14 | Unit (no Spring) |
| Phase 5: Frontend | ~15 | Jest + RTL |
| Phase 6: Integration | ~7 | Full stack (`@SpringBootTest`) |
| **Total new** | **~114** | |
| **Existing** | **12** | |
| **Grand total** | **~126** | |

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `@WebMvcTest` + custom Security filters = complex `@MockBean` wiring | Medium | Step 2.1 (TestJwtHelper) solves this once. If too complex, fall back to `@SpringBootTest` + `@AutoConfigureMockMvc` for controller tests. |
| H2 PostgreSQL mode incompatibility (jsonb, custom queries) | Medium | Existing concurrency tests prove H2 works. If specific queries fail, use `@Sql` to set up schema manually. |
| `AdminSecretFilter` may need special handling in tests | Low | Mock the filter or pass the secret header in test requests. |
| Frontend axios mock setup may be fragile | Low | Keep mocks simple. Test API modules separately from components. |

## Notes

- All `@WebMvcTest` tests need `@Import` or `@MockBean` for `JwtAuthenticationFilter`, `AdminSecretFilter`, `JwtUtil`, `UserDetailsService` since Spring Security auto-wires them.
- Follow existing test patterns: AssertJ assertions (`assertThat`), Mockito argument captors where applicable.
- Run with `./mvnw test -pl .` for backend, `cd frontend && npm test` for frontend.
- Every phase is independently shippable. Phase 1 alone adds 38 tests to the most critical business logic.
