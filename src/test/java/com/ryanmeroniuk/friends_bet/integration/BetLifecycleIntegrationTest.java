package com.ryanmeroniuk.friends_bet.integration;

import com.ryanmeroniuk.friends_bet.dto.*;
import com.ryanmeroniuk.friends_bet.model.Game;
import com.ryanmeroniuk.friends_bet.repository.GameRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class BetLifecycleIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private GameRepository gameRepo;

    private String user1Token;
    private String user1Id;
    private String user2Token;
    private String user2Id;
    private UUID groupId;
    private UUID gameId;

    @BeforeEach
    void setUp() {
        // Register user1
        CreateUserRequest u1 = new CreateUserRequest();
        u1.setUsername("betuser1_" + UUID.randomUUID().toString().substring(0, 6));
        u1.setEmail("betuser1_" + UUID.randomUUID().toString().substring(0, 6) + "@example.com");
        u1.setPassword("password123");
        ResponseEntity<AccessTokenResponse> r1 = rest.postForEntity("/api/users/register", u1, AccessTokenResponse.class);
        user1Token = r1.getBody().getAccessToken();
        user1Id = getProfile(user1Token).getId().toString();

        // Register user2
        CreateUserRequest u2 = new CreateUserRequest();
        u2.setUsername("betuser2_" + UUID.randomUUID().toString().substring(0, 6));
        u2.setEmail("betuser2_" + UUID.randomUUID().toString().substring(0, 6) + "@example.com");
        u2.setPassword("password123");
        ResponseEntity<AccessTokenResponse> r2 = rest.postForEntity("/api/users/register", u2, AccessTokenResponse.class);
        user2Token = r2.getBody().getAccessToken();
        user2Id = getProfile(user2Token).getId().toString();

        // Create group (user1)
        HttpHeaders h1 = authHeaders(user1Token);
        h1.setContentType(MediaType.APPLICATION_JSON);
        CreateGroupRequest groupReq = new CreateGroupRequest();
        groupReq.setName("BetTestGroup_" + UUID.randomUUID().toString().substring(0, 6));
        ResponseEntity<GroupResponse> groupResp = rest.exchange(
                "/api/groups", HttpMethod.POST, new HttpEntity<>(groupReq, h1), GroupResponse.class);
        assertThat(groupResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        groupId = groupResp.getBody().getId();
        String inviteCode = groupResp.getBody().getInviteCode();

        // User1 joins group (creator auto-joined via group creation? Check...)
        // Actually GroupService.createGroup may not auto-join. Let's join both users.
        joinGroup(user1Token, inviteCode, user1Id);
        joinGroup(user2Token, inviteCode, user2Id);

        // Create a game in the future
        Game game = new Game("ext-" + UUID.randomUUID(), "Home Team", "Away Team",
                Instant.now().plus(1, ChronoUnit.DAYS));
        game.setSport("basketball_nba");
        game = gameRepo.save(game);
        gameId = game.getId();
    }

    @Test
    void fullBetLifecycle() {
        // Deposit funds for both users
        deposit(user1Token, groupId, user1Id, 10_000);
        deposit(user2Token, groupId, user2Id, 10_000);

        // Verify balances
        WalletResponse[] balances = listBalances(user1Token, groupId);
        assertThat(balances).hasSize(2);

        // Propose bet (user1)
        CreateBetRequest betReq = new CreateBetRequest();
        betReq.setGroupId(groupId);
        betReq.setGameId(gameId);
        betReq.setMarketType("WINNER");
        betReq.setPick("HOME");
        betReq.setAmountCents(5_000);
        betReq.setOdds(2.0);

        HttpHeaders h1 = authHeaders(user1Token);
        h1.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<BetResponse> proposeResp = rest.exchange(
                "/api/groups/" + groupId + "/bets", HttpMethod.POST,
                new HttpEntity<>(betReq, h1), BetResponse.class);
        assertThat(proposeResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        BetResponse bet = proposeResp.getBody();
        assertThat(bet.status()).isEqualTo("OPEN");
        assertThat(bet.amountCents()).isEqualTo(5_000);
        UUID betId = bet.id();

        // Accept bet (user2) — acceptor stake = 5000 * (2.0 - 1) = 5000
        AcceptBetRequest acceptReq = new AcceptBetRequest();
        HttpHeaders h2 = authHeaders(user2Token);
        h2.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<BetResponse> acceptResp = rest.exchange(
                "/api/bets/" + betId + "/accept", HttpMethod.POST,
                new HttpEntity<>(acceptReq, h2), BetResponse.class);
        assertThat(acceptResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(acceptResp.getBody().status()).isEqualTo("ACCEPTED");
        assertThat(acceptResp.getBody().acceptorStakeCents()).isEqualTo(5_000);

        // Verify balances after escrow: user1 has 5000 (10000-5000), user2 has 5000 (10000-5000)
        balances = listBalances(user1Token, groupId);
        for (WalletResponse w : balances) {
            assertThat(w.getBalanceCents()).isEqualTo(5_000);
        }

        // Finalize game: HOME wins 100-90
        // Use settlement service directly via admin endpoint (or repository)
        Game game = gameRepo.findById(gameId).orElseThrow();
        game.setHomeScore(100);
        game.setAwayScore(90);
        game.setFinal(true);
        game.setFinalAt(Instant.now());
        gameRepo.save(game);

        // Settle bets for group
        ResponseEntity<Map> settleResp = rest.exchange(
                "/api/groups/" + groupId + "/bets/settle-accepted", HttpMethod.POST,
                new HttpEntity<>(h1), Map.class);
        assertThat(settleResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((Integer) settleResp.getBody().get("settled")).isEqualTo(1);

        // Verify payouts: user1 (proposer, picked HOME) wins pool (5000+5000=10000)
        balances = listBalances(user1Token, groupId);
        long user1Balance = 0, user2Balance = 0;
        for (WalletResponse w : balances) {
            if (w.getUserId().toString().equals(user1Id)) user1Balance = w.getBalanceCents();
            if (w.getUserId().toString().equals(user2Id)) user2Balance = w.getBalanceCents();
        }
        assertThat(user1Balance).isEqualTo(15_000); // 5000 remaining + 10000 payout
        assertThat(user2Balance).isEqualTo(5_000);   // 5000 remaining, lost stake
    }

    @Test
    void proposeBet_insufficientFunds_returns400() {
        // Deposit only 100 cents
        deposit(user1Token, groupId, user1Id, 100);

        CreateBetRequest betReq = new CreateBetRequest();
        betReq.setGroupId(groupId);
        betReq.setGameId(gameId);
        betReq.setMarketType("WINNER");
        betReq.setPick("HOME");
        betReq.setAmountCents(5_000); // more than balance
        betReq.setOdds(2.0);

        HttpHeaders h1 = authHeaders(user1Token);
        h1.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<String> resp = rest.exchange(
                "/api/groups/" + groupId + "/bets", HttpMethod.POST,
                new HttpEntity<>(betReq, h1), String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void acceptOwnBet_returns400() {
        deposit(user1Token, groupId, user1Id, 10_000);

        CreateBetRequest betReq = new CreateBetRequest();
        betReq.setGroupId(groupId);
        betReq.setGameId(gameId);
        betReq.setMarketType("WINNER");
        betReq.setPick("HOME");
        betReq.setAmountCents(1_000);
        betReq.setOdds(2.0);

        HttpHeaders h1 = authHeaders(user1Token);
        h1.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<BetResponse> proposeResp = rest.exchange(
                "/api/groups/" + groupId + "/bets", HttpMethod.POST,
                new HttpEntity<>(betReq, h1), BetResponse.class);
        UUID betId = proposeResp.getBody().id();

        // Try to accept own bet
        AcceptBetRequest acceptReq = new AcceptBetRequest();
        ResponseEntity<String> resp = rest.exchange(
                "/api/bets/" + betId + "/accept", HttpMethod.POST,
                new HttpEntity<>(acceptReq, h1), String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(resp.getBody()).contains("Proposer cannot accept own bet");
    }

    // ── Helpers ──

    private HttpHeaders authHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }

    private UserProfileResponse getProfile(String token) {
        HttpHeaders headers = authHeaders(token);
        ResponseEntity<UserProfileResponse> resp = rest.exchange(
                "/api/users/me", HttpMethod.GET, new HttpEntity<>(headers), UserProfileResponse.class);
        return resp.getBody();
    }

    private void joinGroup(String token, String inviteCode, String userId) {
        HttpHeaders headers = authHeaders(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        JoinGroupRequest req = new JoinGroupRequest();
        req.setUserId(UUID.fromString(userId));
        rest.exchange("/api/groups/" + inviteCode + "/join", HttpMethod.POST,
                new HttpEntity<>(req, headers), String.class);
    }

    private void deposit(String token, UUID groupId, String userId, long amountCents) {
        HttpHeaders headers = authHeaders(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        WalletDepositRequest req = new WalletDepositRequest(UUID.fromString(userId), amountCents);
        rest.exchange("/api/groups/" + groupId + "/wallets/deposit", HttpMethod.POST,
                new HttpEntity<>(req, headers), WalletResponse.class);
    }

    private WalletResponse[] listBalances(String token, UUID groupId) {
        HttpHeaders headers = authHeaders(token);
        ResponseEntity<WalletResponse[]> resp = rest.exchange(
                "/api/groups/" + groupId + "/wallets", HttpMethod.GET,
                new HttpEntity<>(headers), WalletResponse[].class);
        return resp.getBody();
    }
}
