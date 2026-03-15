package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.model.Game;
import com.ryanmeroniuk.friends_bet.odds.TheOddsApiClient;
import com.ryanmeroniuk.friends_bet.odds.TheOddsApiClient.ScoreEvent;
import com.ryanmeroniuk.friends_bet.repository.GameRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ScoreSyncServiceTest {

    @Mock
    private TheOddsApiClient client;

    @Mock
    private GameRepository gameRepo;

    @Mock
    private SettlementService settlement;

    @InjectMocks
    private ScoreSyncService scoreSyncService;

    @Test
    void refreshScores_completedGame_settles() {
        ReflectionTestUtils.setField(scoreSyncService, "defaultDaysFrom", 3);

        String extId = "ext-game-1";
        UUID gameId = UUID.randomUUID();
        Game game = new Game(extId, "Lakers", "Celtics", Instant.now());
        game.setId(gameId);

        ScoreEvent event = completedEvent(extId, "Lakers", "Celtics", 110, 95);

        when(client.fetchScores("basketball_nba", 3)).thenReturn(Mono.just(List.of(event)));
        when(gameRepo.findByExternalGameId(extId)).thenReturn(Optional.of(game));
        when(settlement.setFinalScore(gameId, 110, 95)).thenReturn(2);

        ScoreSyncService.ScoreSyncSummary summary = scoreSyncService.refreshScores("basketball_nba", null);

        assertThat(summary.eventsChecked).isEqualTo(1);
        assertThat(summary.completedEventsSeen).isEqualTo(1);
        assertThat(summary.gamesMatched).isEqualTo(1);
        assertThat(summary.gamesFinalized).isEqualTo(1);
        assertThat(summary.betsSettled).isEqualTo(2);

        verify(settlement).setFinalScore(gameId, 110, 95);
    }

    @Test
    void refreshScores_gameAlreadyFinal_skips() {
        ReflectionTestUtils.setField(scoreSyncService, "defaultDaysFrom", 3);

        String extId = "ext-game-2";
        Game game = new Game(extId, "Lakers", "Celtics", Instant.now());
        game.setId(UUID.randomUUID());
        game.setFinal(true);
        game.setFinalAt(Instant.now());

        ScoreEvent event = completedEvent(extId, "Lakers", "Celtics", 110, 95);

        when(client.fetchScores("basketball_nba", 3)).thenReturn(Mono.just(List.of(event)));
        when(gameRepo.findByExternalGameId(extId)).thenReturn(Optional.of(game));

        ScoreSyncService.ScoreSyncSummary summary = scoreSyncService.refreshScores("basketball_nba", null);

        assertThat(summary.gamesAlreadyFinal).isEqualTo(1);
        assertThat(summary.gamesFinalized).isEqualTo(0);
        verify(settlement, never()).setFinalScore(any(UUID.class), anyInt(), anyInt());
    }

    @Test
    void refreshScores_gameNotInDb_skips() {
        ReflectionTestUtils.setField(scoreSyncService, "defaultDaysFrom", 3);

        ScoreEvent event = completedEvent("unknown-ext", "Team A", "Team B", 50, 40);

        when(client.fetchScores("basketball_nba", 3)).thenReturn(Mono.just(List.of(event)));
        when(gameRepo.findByExternalGameId("unknown-ext")).thenReturn(Optional.empty());

        ScoreSyncService.ScoreSyncSummary summary = scoreSyncService.refreshScores("basketball_nba", null);

        assertThat(summary.completedEventsSeen).isEqualTo(1);
        assertThat(summary.gamesMatched).isEqualTo(0);
        verify(settlement, never()).setFinalScore(any(UUID.class), anyInt(), anyInt());
    }

    @Test
    void refreshScores_incompleteEvent_skips() {
        ReflectionTestUtils.setField(scoreSyncService, "defaultDaysFrom", 3);

        ScoreEvent event = new ScoreEvent();
        event.id = "ext-live";
        event.completed = false;
        event.home_team = "Lakers";
        event.away_team = "Celtics";

        when(client.fetchScores("basketball_nba", 3)).thenReturn(Mono.just(List.of(event)));

        ScoreSyncService.ScoreSyncSummary summary = scoreSyncService.refreshScores("basketball_nba", null);

        assertThat(summary.eventsChecked).isEqualTo(1);
        assertThat(summary.completedEventsSeen).isEqualTo(0);
        verify(gameRepo, never()).findByExternalGameId(any());
    }

    @Test
    void refreshScores_missingScores_skips() {
        ReflectionTestUtils.setField(scoreSyncService, "defaultDaysFrom", 3);

        String extId = "ext-no-scores";
        Game game = new Game(extId, "Lakers", "Celtics", Instant.now());
        game.setId(UUID.randomUUID());

        ScoreEvent event = new ScoreEvent();
        event.id = extId;
        event.completed = true;
        event.home_team = "Lakers";
        event.away_team = "Celtics";
        event.scores = null; // no scores

        when(client.fetchScores("basketball_nba", 3)).thenReturn(Mono.just(List.of(event)));
        when(gameRepo.findByExternalGameId(extId)).thenReturn(Optional.of(game));

        ScoreSyncService.ScoreSyncSummary summary = scoreSyncService.refreshScores("basketball_nba", null);

        assertThat(summary.gamesMatched).isEqualTo(1);
        assertThat(summary.gamesFinalized).isEqualTo(0);
        verify(settlement, never()).setFinalScore(any(UUID.class), anyInt(), anyInt());
    }

    @Test
    void refreshScores_apiError_capturedInSummary() {
        ReflectionTestUtils.setField(scoreSyncService, "defaultDaysFrom", 3);

        when(client.fetchScores("basketball_nba", 3))
                .thenReturn(Mono.error(new RuntimeException("API rate limit exceeded")));

        ScoreSyncService.ScoreSyncSummary summary = scoreSyncService.refreshScores("basketball_nba", null);

        assertThat(summary.perSport).hasSize(1);
        assertThat(summary.perSport.get(0).errors).containsExactly("API rate limit exceeded");
        assertThat(summary.gamesFinalized).isEqualTo(0);
    }

    @Test
    void refreshScores_allSports_iteratesConfigured() {
        ReflectionTestUtils.setField(scoreSyncService, "configuredSportKeys", "basketball_nba,americanfootball_nfl");
        ReflectionTestUtils.setField(scoreSyncService, "defaultDaysFrom", 3);

        when(client.fetchScores(eq("basketball_nba"), eq(3))).thenReturn(Mono.just(List.of()));
        when(client.fetchScores(eq("americanfootball_nfl"), eq(3))).thenReturn(Mono.just(List.of()));

        ScoreSyncService.ScoreSyncSummary summary = scoreSyncService.refreshScores("all", null);

        assertThat(summary.sportsVisited).isEqualTo(2);
        assertThat(summary.perSport).hasSize(2);
        assertThat(summary.perSport).extracting(ps -> ps.sport)
                .containsExactly("basketball_nba", "americanfootball_nfl");
    }

    // --- helpers ---

    private static ScoreEvent completedEvent(String id, String homeTeam, String awayTeam,
                                              int homeScore, int awayScore) {
        ScoreEvent event = new ScoreEvent();
        event.id = id;
        event.completed = true;
        event.home_team = homeTeam;
        event.away_team = awayTeam;

        ScoreEvent.Score home = new ScoreEvent.Score();
        home.name = homeTeam;
        home.score = homeScore;

        ScoreEvent.Score away = new ScoreEvent.Score();
        away.name = awayTeam;
        away.score = awayScore;

        event.scores = List.of(home, away);
        return event;
    }

}
