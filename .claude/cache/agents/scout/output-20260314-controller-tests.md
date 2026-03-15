# Codebase Report: Controller Tests - Full File Contents
Generated: 2026-03-14

## Summary

Full content captured for all 9 controllers, SecurityConfig, both filters, JwtUtil, all 15 DTOs,
application-test.properties, BetServiceTest (canonical test style), and UserServiceTest.

---

## CONTROLLERS

### AdminController
- Package: `com.ryanmeroniuk.friends_bet.controller`
- Path: `@RequestMapping("/api/admin")`
- Security: `authenticated()` + `AdminSecretFilter` (`X-Admin-Secret` header required)
- Dependencies: `OddsService odds`, `ScoreSyncService scoreSync`, `SettlementService settlement`

Endpoints:
| Method | Path | Params | Returns |
|--------|------|--------|---------|
| POST | /api/admin/refresh | `?sport=all` (default) | `Map<String,Object>{status,refreshed}` |
| POST | /api/admin/scores/refresh | `?sport=all`, `?daysFrom` (optional) | `ScoreSyncService.ScoreSyncSummary` |
| POST | /api/admin/games/{gameId}/final | `?homeScore`, `?awayScore` | `Map{gameId,homeScore,awayScore,settledBets}` |
| POST | /api/admin/games/{gameId}/settle | — | `Map{gameId,settledBets}` |

### AuthController
- Package: `com.ryanmeroniuk.friends_bet.controller`
- Path: `@RequestMapping("/api/users")`
- Security: `/register`, `/login`, `/refresh`, `/logout` are ALL `permitAll()`; `/me` requires auth
- Dependencies: `UserService userService`, `TokenService tokenService`, `JwtUtil jwtUtil`
- Notes: Sets `refresh` HttpOnly cookie via `Set-Cookie` header; uses `WebUtils.getCookie(req,"refresh")`

Endpoints:
| Method | Path | Body/Params | Returns | Status |
|--------|------|-------------|---------|--------|
| POST | /api/users/register | `CreateUserRequest` (JSON) | `AccessTokenResponse` | 201 |
| POST | /api/users/login | `LoginRequest` (JSON) | `AccessTokenResponse` | 200 |
| POST | /api/users/refresh | refresh cookie | `AccessTokenResponse` | 200 |
| POST | /api/users/logout | refresh cookie (optional) | void | 204 |
| GET | /api/users/me | Bearer token | `UserProfileResponse` | 200 |

Error handling:
- `IllegalArgumentException` → 400 (local `@ExceptionHandler`)
- Login failure (`IllegalArgumentException` from service) → 401 `ResponseStatusException`
- Missing/bad refresh cookie → 401 `ResponseStatusException`

### BetController
- Package: `com.ryanmeroniuk.friends_bet.controller`
- Path: `@RequestMapping("/api")`
- Security: All require auth (under `/api/**`)
- Dependencies: `BetService betService`, `SettlementService settlementService`, `ScoreSyncService scoreSyncService`

Endpoints:
| Method | Path | Body | Returns | Status |
|--------|------|------|---------|--------|
| POST | /api/groups/{groupId}/bets | `CreateBetRequest` (JSON) | `BetResponse` | 201 |
| POST | /api/groups/{groupId}/bets/settle-accepted | — | `Map{settled,sportsRefreshed?,scoreErrors?}` | 200 |
| GET | /api/groups/{groupId}/bets | — | `List<BetResponse>` | 200 |
| POST | /api/bets/{betId}/accept | `AcceptBetRequest` (JSON) | `BetResponse` | 200 |

Notes:
- `proposeBet`: if body `groupId` != path `groupId` → 400 with null body
- `@ExceptionHandler(IllegalArgumentException.class)` → 400

### GamesController
- Package: `com.ryanmeroniuk.friends_bet.controller`
- Path: `@RequestMapping("/api")`
- Security: `GET /api/sports/**` and `GET /api/games/**` are `permitAll()`
- Dependencies: `GameRepository gameRepo`, `OddsQuoteRepository quoteRepo`, `@Value("${odds.sportKeys:}") String configuredSportKeys`

Endpoints:
| Method | Path | Params | Returns |
|--------|------|--------|---------|
| GET | /api/sports | `?days=2` | `List<String>` (sport names) |
| GET | /api/sports/{sport}/games | `?days=2` | `List<GameDto>` |
| GET | /api/games/upcoming | `?days=2` | `Map<String, List<GameDto>>` grouped by sport |
| GET | /api/games/{gameId}/markets | — | `List<String>` market types |

### GlobalExceptionHandler
- `@RestControllerAdvice`
- `MethodArgumentNotValidException` → 400 `{error:"Validation failed", fields:{field:msg}}`
- `IllegalArgumentException` → 400 `{error:message}`

### GroupController
- Package: `com.ryanmeroniuk.friends_bet.controller`
- Path: `@RequestMapping("/api")`
- Security: All require auth
- Dependencies: `GroupService groupService`, `GroupMemberService memberService`

Endpoints:
| Method | Path | Body | Returns | Status |
|--------|------|------|---------|--------|
| POST | /api/groups | `CreateGroupRequest` (JSON, `@Valid`) | `GroupResponse` | 201 |
| GET | /api/groups | — | `List<GroupResponse>` | 200 |
| GET | /api/users/{userId}/groups | — | `List<GroupResponse>` | 200 |
| POST | /api/groups/{inviteCode}/join | `JoinGroupRequest` (JSON, `@Valid`) | `GroupMemberResponse` | 201 |
| GET | /api/groups/{groupId}/members | — | `List<GroupMemberResponse>` | 200 |

Note: `{inviteCode}` is a `String`, `{groupId}` is a `UUID`.

### OddsController
- Package: `com.ryanmeroniuk.friends_bet.controller`
- Path: `@RequestMapping("/api/odds")`
- Security: All require auth (under `/api/**`)
- Dependencies: `GameRepository gameRepo`, `OddsQuoteRepository quoteRepo`, `OddsService oddsService`

Endpoints:
| Method | Path | Params | Returns |
|--------|------|--------|---------|
| POST | /api/odds/refresh | `?sport=...` (required) | `Map<String,String>{status,sport}` |
| GET | /api/odds/games | — | `List<Map<String,Object>>{id,externalGameId,homeTeam,awayTeam,startTime}` |
| GET | /api/odds/games/{gameId}/quotes | — | `Map<String,List<Map<String,Object>>>` grouped by market |

### PingController
- No base path
- `GET /ping` → `"pong"` (String); `permitAll()`

### WalletController
- Package: `com.ryanmeroniuk.friends_bet.controller`
- Path: `@RequestMapping("/api/groups/{groupId}/wallets")`
- Security: All require auth
- Dependencies: `WalletService walletService`

Endpoints:
| Method | Path | Body | Returns | Status |
|--------|------|------|---------|--------|
| POST | /api/groups/{groupId}/wallets/deposit | `WalletDepositRequest` (JSON, `@Valid`) | `WalletResponse` | 200 |
| GET | /api/groups/{groupId}/wallets | — | `List<WalletResponse>` | 200 |

---

## SECURITY CONFIG

File: `src/main/java/com/ryanmeroniuk/friends_bet/config/SecurityConfig.java`

Key facts:
- **CSRF disabled**
- **STATELESS sessions**
- **CORS** enabled via `CorsConfigurationSource` bean (allowed origins from `app.cors.allowed-origins`)
- Unauthenticated → 401; access denied → 403
- Filter chain order: `adminSecretFilter` then `jwtAuthenticationFilter`, both before `UsernamePasswordAuthenticationFilter`

Permit-all paths:
- `/api/users/register`, `/api/users/login`, `/api/users/refresh`, `/api/users/logout`
- `/ping`, `/actuator/health`, `/actuator/info`
- `GET /api/sports/**`, `GET /api/games/**`
- `/h2-console/**` only if `spring.h2.console.enabled=true`

Authenticated:
- `/api/admin/**` (also gated by AdminSecretFilter)
- `/api/**` (everything else)

---

## FILTERS

### JwtAuthenticationFilter
File: `src/main/java/com/ryanmeroniuk/friends_bet/filter/JwtAuthenticationFilter.java`

- `shouldNotFilter`: skips register/login/refresh/logout/h2-console paths
- Extracts `Authorization: Bearer <token>`, parses with `JwtUtil.parseAndValidate()`
- Checks `token_type == "access"` claim; if not access token, passes through without auth
- Loads `UserDetails` via `UserDetailsService.loadUserByUsername()`
- Sets `UsernamePasswordAuthenticationToken` in `SecurityContextHolder`
- Any exception → clears context, continues filter chain (no hard reject)

### AdminSecretFilter
File: `src/main/java/com/ryanmeroniuk/friends_bet/filter/AdminSecretFilter.java`

- `shouldNotFilter`: only applies to paths starting with `/api/admin/`
- If `admin.secret` property is blank → 403 "Admin endpoints are disabled"
- Reads `X-Admin-Secret` header; if missing/wrong → 403 "Invalid admin secret"
- Otherwise passes through

---

## JWTUTIL

File: `src/main/java/com/ryanmeroniuk/friends_bet/util/JwtUtil.java`

- Reads `jwt.secret` (base64 encoded), `jwt.issuer` (default `friends-bet`), `jwt.audience` (default `friends-bet-client`)
- `generateAccessToken(user, ttlMs)` → `TokenDetails` (includes `token_type:"access"`, `roles:["USER"]`, `uid`, `jti`)
- `generateRefreshToken(user, ttlMs)` → `TokenDetails` (includes `token_type:"refresh"`, `uid`, `jti`)
- `parseAndValidate(token)` → `Claims` (throws `JwtException` on invalid/expired)
- `extractJtiUnsafe(token)` → extracts `jti` from payload without signature check (for logout)
- Inner record: `TokenDetails(token, jti, issuedAt, expiresAt, tokenType)`
- Inner enum: `TokenType { ACCESS, REFRESH }`

---

## DTOs (full field inventory)

### AcceptBetRequest
- `UUID acceptorId` (no validation annotations; set from Security context in service)

### AccessTokenResponse
- `String accessToken`

### BetMapper
- Static utility: `toResponse(Bet)` → `BetResponse`; `toResponse(List<Bet>)` → `List<BetResponse>`

### BetResponse (record)
- `UUID id, groupId, gameId, proposerId, acceptorId`
- `String marketType, pick, status, source`
- `long amountCents, acceptorStakeCents`
- `double odds`
- `Instant createdAt, resolvedAt, quotedAt, cutoffTime`
- `Map<String,Object> details`

### CreateBetRequest
- `@NotNull UUID groupId`
- `UUID proposerId` (no annotation, set from auth context)
- `@NotNull UUID gameId`
- `@NotBlank String marketType`
- `@NotBlank String pick`
- `@Min(1) long amountCents`
- `@Positive double odds`
- `Map<String,Object> details`
- `Instant cutoffTime`

### CreateGroupRequest
- `@NotBlank @Size(min=2,max=50) String name`

### CreateUserRequest
- `@NotBlank @Size(min=3,max=30) String username`
- `@NotBlank @Email String email`
- `@NotBlank @Size(min=8,max=100) String password`

### GameDto (record)
- `UUID id`, `String sport`, `Instant startTime`, `String homeTeam`, `String awayTeam`

### GroupMemberResponse
- `UUID id, groupId, userId`
- `Instant joinedAt`
- `String username`

### GroupResponse
- `UUID id`
- `String name, inviteCode`
- `Instant createdAt`

### JoinGroupRequest
- `@NotNull UUID userId`

### LoginRequest
- `@NotBlank String usernameOrEmail`
- `@NotBlank String password`

### UserProfileResponse
- `UUID id`
- `String username, email`
- `Instant createdAt`

### WalletDepositRequest
- `@NotNull UUID userId`
- `long amountCents` (no validation - can be negative for withdrawal)

### WalletResponse
- `UUID userId`
- `long balanceCents`

---

## APPLICATION-TEST.PROPERTIES

```
spring.datasource.url=jdbc:h2:mem:friendsbet;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
spring.datasource.driverClassName=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=

spring.jpa.hibernate.ddl-auto=create-drop
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect

spring.flyway.enabled=false
ODDS_API_KEY=test-key
odds.warmup.enabled=false
logging.level.org.springframework=ERROR

# Dummy base64 secret for JwtUtil in tests (32+ bytes when decoded)
jwt.secret=dGVzdC10ZXN0LXRlc3QtdGVzdC10ZXN0LXRlc3QtdGVzdC10ZXN0LXRlc3Q=
```

---

## TEST STYLE (from BetServiceTest + UserServiceTest)

### Framework
- JUnit 5 (`@ExtendWith(MockitoExtension.class)`)
- Mockito (`@Mock`, `@InjectMocks`, `@MockitoSettings(strictness = Strictness.LENIENT)`)
- AssertJ (`assertThat(...)`, `assertThatThrownBy(...)`)

### Patterns
- `@BeforeEach` / `@AfterEach` for `SecurityContextHolder.clearContext()`
- `when(...).thenReturn(...)` for stubs
- `when(...).thenAnswer(invocation -> ...)` to set ID on saved entity
- `ArgumentCaptor<T>` for verifying what was passed to mocks
- `verify(mock, never()).method(any())` for negative assertions
- Test method names: `snake_case` describing scenario + expected outcome (e.g. `propose_debits_proposer_and_persists_bet`)

### Helper methods pattern
```java
private static User buildUser(UUID id, String username) { ... }
private void authenticate(User user) {
    UsernamePasswordAuthenticationToken auth =
        new UsernamePasswordAuthenticationToken(user.getUsername(), "pw");
    SecurityContextHolder.getContext().setAuthentication(auth);
    when(userRepository.findByUsername(user.getUsername())).thenReturn(Optional.of(user));
}
```

### Integration test style
- `FriendsBetApplicationTests` uses `@SpringBootTest` + `@ActiveProfiles("test")`
- No controller tests exist yet (none under `src/test/.../controller/`)

---

## KEY NOTES FOR CONTROLLER TESTS

1. **No existing controller tests** - this would be a new `src/test/.../controller/` package

2. **MockMvc approach recommended** with `@WebMvcTest` (slices) or `@SpringBootTest` + `MockMvc`

3. **Security bypass for controller tests**: To test controller logic without JWT noise, either:
   - Use `@WithMockUser` from Spring Security Test
   - Or configure `@WebMvcTest` with `@MockBean` for the filter chain components

4. **AdminController tests** need `X-Admin-Secret` header AND a valid auth token (or mock both filters)

5. **Refresh cookie** tests for `AuthController` must set cookie in `MockHttpServletRequestBuilder`

6. **Public endpoints** (register, login, ping, GET /api/sports/*, GET /api/games/*) can be tested without auth headers

7. **JWT test secret** is already in `application-test.properties`:
   `jwt.secret=dGVzdC10ZXN0LXRlc3QtdGVzdC10ZXN0LXRlc3QtdGVzdC10ZXN0LXRlc3Q=`
   Decoded: `test-test-test-test-test-test-test-test-test` (44 chars, valid HMAC-SHA256 key)

---

## SERVICE CLASSES (for @MockBean in controller tests)

- `BetService` — for BetController
- `SettlementService` — for BetController, AdminController
- `ScoreSyncService` — for BetController, AdminController
- `UserService` — for AuthController
- `TokenService` — for AuthController
- `JwtUtil` — for AuthController, JwtAuthenticationFilter
- `GroupService` — for GroupController
- `GroupMemberService` — for GroupController
- `WalletService` — for WalletController
- `OddsService` — for AdminController, OddsController
- `GameRepository` — for GamesController, OddsController (direct repo injection)
- `OddsQuoteRepository` — for GamesController, OddsController (direct repo injection)

