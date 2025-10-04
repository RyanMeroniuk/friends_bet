import React, { useEffect, useMemo, useState } from 'react';
import { listMyGroups, GroupResponse } from '../api/group';
import { listBets, proposeBet, acceptBet, Bet } from '../api/bet';
import { listGames, GameSummary } from '../api/game';
import {
  Typography,
  TextField,
  Button as MUIButton,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';

import { refreshSports, settleAcceptedBets as settleAcceptedBetsApi } from '../api/bet';
import { useAuth } from '../context/AuthContext';

/* Shared layout + cards to match Wallet */
import TwoColumn from '../components/TwoColumn';
import SectionCard from '../components/SectionCard';
import RightRail from '../components/RightRail';

/* Group selector strip (same as Wallet) */
import GroupScroller, { GroupChip } from '../components/GroupScroller';

/* Header you named */
import BetHeader from '../components/BetHeader';

type MarketType =
  | 'WINNER'
  | 'SPREAD'
  | 'TOTALS'
  | 'PLAYER_PROP'
  | 'TEAM_PROP'
  | 'SAME_GAME'
  | 'PARLAY';

const DAYS_WINDOW = 2; // next 2 days per backend endpoints
const API_BASE = (process.env.REACT_APP_API_BASE || '').replace(/\/$/, '');

export default function BetPage() {
  // groups + selection
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');

  // list + feedback
  const [bets, setBets] = useState<Bet[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // propose form state
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [gameId, setGameId] = useState<string>('');
  const [marketType, setMarketType] = useState<MarketType>('WINNER');
  const [pick, setPick] = useState<string>('HOME'); // WINNER/SPREAD team
  const [amountCents, setAmountCents] = useState<string>(''); // free typing
  const [odds, setOdds] = useState<number>(1.8);

  // SPREAD
  const [spreadPoints, setSpreadPoints] = useState<string>(''); // "-3.5"

  // TOTALS (Over/Under)
  const [totalsLine, setTotalsLine] = useState<string>(''); // "210.5"
  const [totalsDirection, setTotalsDirection] = useState<'OVER' | 'UNDER'>('OVER');

  // PLAYER_PROP
  const [ppPlayerName, setPpPlayerName] = useState('');
  const [ppStatType, setPpStatType] = useState<'POINTS' | 'REBOUNDS' | 'ASSISTS' | 'GOALS' | 'SAVES' | 'CUSTOM'>('POINTS');
  const [ppLine, setPpLine] = useState<string>('');
  const [ppDirection, setPpDirection] = useState<'OVER' | 'UNDER'>('OVER');

  // TEAM_PROP
  const [tpTeam, setTpTeam] = useState<'HOME' | 'AWAY'>('HOME');
  const [tpPropType, setTpPropType] = useState('TOTAL_POINTS');
  const [tpLine, setTpLine] = useState<string>('');
  const [tpDirection, setTpDirection] = useState<'OVER' | 'UNDER'>('OVER');

  // SAME_GAME / PARLAY
  const [sgpLegs, setSgpLegs] = useState<string>('');
  const [parlayLegs, setParlayLegs] = useState<string>('');

  // sports + games
  const [sports, setSports] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [sportsError, setSportsError] = useState<string | null>(null);

  // games
  const [games, setGames] = useState<GameSummary[]>([]);
  const selectedGame = useMemo(
    () => games.find(g => g.id === gameId),
    [games, gameId]
  );

  // admin action loading flags
  const [busyRefresh, setBusyRefresh] = useState(false);
  const [busySettle, setBusySettle] = useState(false);

  // ------- load groups -------
  useEffect(() => {
    if (!userId) return;
    listMyGroups(userId)
      .then(mine => {
        setGroups(mine);
        if (!selectedGroup && mine.length > 0) setSelectedGroup(mine[0].id);
      })
      .catch(() => setError('Could not load your groups'));
  }, [userId]);

  // ------- load bets when group changes -------
  useEffect(() => {
    if (!selectedGroup) return;
    loadBets();
  }, [selectedGroup]);

  // ------- load sports (next 2 days) -------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSportsError(null);
      try {
        const res = await fetch(`${API_BASE}/sports?days=${DAYS_WINDOW}`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(await res.text());
        const list: string[] = await res.json();
        if (!cancelled) {
          setSports(list || []);
          if (!selectedSport && list?.length) setSelectedSport(list[0]);
        }
      } catch {
        if (!cancelled) setSportsError('Could not load sports');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ------- load games whenever sport changes -------
  useEffect(() => {
    if (!selectedSport) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/sports/${encodeURIComponent(selectedSport)}/games?days=${DAYS_WINDOW}`,
          { headers: { Accept: 'application/json' } }
        );
        if (!res.ok) throw new Error(await res.text());
        const list: any[] = await res.json();
        const mapped: GameSummary[] = (list || []).map((g: any) => ({
          id: g.id,
          homeTeam: g.homeTeam,
          awayTeam: g.awayTeam,
          startTime: g.startTime,
        }));
        if (!cancelled) {
          setGames(mapped);
          if (mapped.length > 0) {
            setGameId(prev => prev || mapped[0].id);
          } else {
            setGameId('');
          }
        }
      } catch {
        // ignore; manual Game ID still works
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSport]);

  // ------- existing: initial listGames fallback -------
  useEffect(() => {
    if (selectedSport) return;
    (async () => {
      try {
        const list = await listGames();
        setGames(list);
      } catch (e) {
        console.warn('Failed to load games', e);
      }
    })();
  }, [selectedSport]);

  async function loadBets() {
    try {
      setError(null);
      const data = await listBets(selectedGroup);
      setBets(data);
    } catch (e: any) {
      setError(e.response?.data || 'Could not load bets');
    }
  }

  function resetMarketSpecificFields() {
    setSpreadPoints('');
    setTotalsLine('');
    setTotalsDirection('OVER');
    setPpPlayerName('');
    setPpStatType('POINTS');
    setPpLine('');
    setPpDirection('OVER');
    setTpTeam('HOME');
    setTpPropType('TOTAL_POINTS');
    setTpLine('');
    setTpDirection('OVER');
    setSgpLegs('');
    setParlayLegs('');
  }

  function round2(n: number) {
    return Math.round(n * 100) / 100;
  }

  function prefillFromGame(game: GameSummary | undefined, market: MarketType) {
    if (!game) return;
    const o = (game as any).odds || {};
    switch (market) {
      case 'WINNER': {
        setPick('HOME');
        const homeOdds = o.h2h?.home;
        if (typeof homeOdds === 'number' && homeOdds > 1) setOdds(round2(homeOdds));
        break;
      }
      case 'SPREAD': {
        setPick('HOME');
        if (typeof o.spreads?.lineHome === 'number') setSpreadPoints(String(o.spreads.lineHome));
        if (typeof o.spreads?.oddsHome === 'number' && o.spreads.oddsHome > 1) setOdds(round2(o.spreads.oddsHome));
        break;
      }
      case 'TOTALS': {
        setTotalsDirection('OVER');
        if (typeof o.totals?.line === 'number') setTotalsLine(String(o.totals.line));
        if (typeof o.totals?.over === 'number' && o.totals.over > 1) setOdds(round2(o.totals.over));
        break;
      }
      default:
        break;
    }
  }

  function handlePickGame(newGameId: string) {
    setGameId(newGameId);
    const g = games.find(x => x.id === newGameId);
    prefillFromGame(g, marketType);
  }

  function handleMarketChange(next: MarketType) {
    setMarketType(next);
    setMessage(null);
    setError(null);
    resetMarketSpecificFields();
    if (selectedGame) prefillFromGame(selectedGame, next);
  }

  async function onPropose() {
    setMessage(null);
    setError(null);

    if (!userId) return setError('User session missing');
    if (!selectedGroup) return setError('Select a group first');
    if (!gameId.trim()) return setError('Game ID is required');

    // amount — free-typing, digits only
    if (amountCents.trim() === '') return setError('Amount (cents) is required');
    const amt = parseInt(amountCents, 10);
    if (Number.isNaN(amt) || amt <= 0) return setError('Amount (cents) must be a positive integer');

    if (Number.isNaN(odds) || odds <= 1.0) return setError('Odds must be > 1.0');

    let details: Record<string, any> | undefined;
    let submitPick = pick; // default

    switch (marketType) {
      case 'SPREAD': {
        const pts = Number(spreadPoints);
        if (Number.isNaN(pts)) return setError('Enter a valid spread (e.g., -3.5)');
        details = { spreadPoints: pts };
        break;
      }
      case 'TOTALS': {
        const lineNum = parseFloat(totalsLine);
        if (Number.isNaN(lineNum)) return setError('Totals line must be a number');
        details = { totalLine: lineNum };
        submitPick = totalsDirection; // OVER/UNDER
        break;
      }
      case 'PLAYER_PROP': {
        if (!ppPlayerName.trim()) return setError('Player name is required');
        const lineNum = parseFloat(ppLine);
        if (Number.isNaN(lineNum)) return setError('Player prop line must be a number');
        details = {
          playerName: ppPlayerName.trim(),
          statType: ppStatType,
          line: lineNum,
          direction: ppDirection,
        };
        submitPick = ppDirection;
        break;
      }
      case 'TEAM_PROP': {
        const lineNum = parseFloat(tpLine);
        if (Number.isNaN(lineNum)) return setError('Team prop line must be a number');
        if (!tpPropType.trim()) return setError('Team prop type is required');
        details = {
          team: tpTeam,
          propType: tpPropType.trim(),
          line: lineNum,
          direction: tpDirection,
        };
        submitPick = tpTeam; // HOME/AWAY
        break;
      }
      case 'SAME_GAME': {
        const legs = parlayLegs.split('\n').map(s => s.trim()).filter(Boolean);
        if (legs.length === 0) return setError('Add at least one SGP leg (one per line)');
        details = { legs };
        submitPick = 'SGP';
        break;
      }
      case 'PARLAY': {
        const legs = parlayLegs.split('\n').map(s => s.trim()).filter(Boolean);
        if (legs.length === 0) return setError('Add at least one Parlay leg (one per line)');
        details = { legs };
        submitPick = 'PARLAY';
        break;
      }
      default:
        break; // WINNER
    }

    try {
      await proposeBet(
        selectedGroup,
        userId,
        gameId.trim(),
        marketType,
        submitPick.toUpperCase(),
        amt,
        odds,
        details
      );
      setMessage('Bet proposed!');
      setAmountCents('');
      setOdds(1.8);
      resetMarketSpecificFields();
      loadBets();
    } catch (e: any) {
      setError(e.response?.data || 'Error proposing bet');
    }
  }

  async function onAccept(betId: string) {
    setMessage(null);
    setError(null);
    if (!userId) {
      setError('User session missing');
      return;
    }
    try {
      await acceptBet(betId, userId);
      setMessage('Bet accepted!');
      loadBets();
    } catch (e: any) {
      setError(e.response?.data || 'Error accepting bet');
    }
  }

  async function refreshOddsAndGames() {
    try {
      setBusyRefresh(true);
      setMessage(null);
      setError(null);

      await refreshSports(selectedSport || undefined);

      const resSports = await fetch(`${API_BASE}/sports?days=${DAYS_WINDOW}`, {
        headers: { Accept: 'application/json' },
      });
      if (resSports.ok) {
        const list: string[] = await resSports.json();
        setSports(list || []);
        if (!selectedSport && list?.length) setSelectedSport(list[0]);
      }

      if (selectedSport) {
        const resGames = await fetch(
          `${API_BASE}/sports/${encodeURIComponent(selectedSport)}/games?days=${DAYS_WINDOW}`,
          { headers: { Accept: 'application/json' } }
        );
        if (resGames.ok) {
          const list: any[] = await resGames.json();
          const mapped: GameSummary[] = (list || []).map((g: any) => ({
            id: g.id,
            homeTeam: g.homeTeam,
            awayTeam: g.awayTeam,
            startTime: g.startTime,
          }));
          setGames(mapped);
          if (mapped.length > 0) setGameId(prev => prev || mapped[0].id);
        }
      }

      setMessage('Sports & games refreshed.');
    } catch (e: any) {
      const data = e?.response?.data;
      const msg = (data && typeof data === 'object' && 'message' in data)
        ? (data as any).message
        : (typeof data === 'string' ? data : e?.message);
      setError(msg || 'Failed to refresh sports/games');
    } finally {
      setBusyRefresh(false);
    }
  }

  async function settleAcceptedBets() {
    try {
      setBusySettle(true);
      setMessage(null);
      setError(null);
      if (!selectedGroup) throw new Error('Select a group first');

      const res = await settleAcceptedBetsApi(selectedGroup);
      await loadBets();
      setMessage(`Settlement check complete${typeof res?.settled === 'number' ? ` — ${res.settled} settled.` : '.'}`);
    } catch (e: any) {
      setError(e?.message || 'Failed to settle accepted bets');
    } finally {
      setBusySettle(false);
    }
  }

  function SportGamePickers() {
    return (
      <>
        <FormControl>
          <InputLabel id="sport-picker">Sport</InputLabel>
          <Select
            labelId="sport-picker"
            label="Sport"
            value={selectedSport}
            onChange={e => setSelectedSport(String(e.target.value))}
            displayEmpty
          >
            {sports.length === 0 && <MenuItem value=""><em>No sports</em></MenuItem>}
            {sports.map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <InputLabel id="game-picker">Pick Game</InputLabel>
          <Select
            labelId="game-picker"
            label="Pick Game"
            value={gameId}
            onChange={e => handlePickGame(String(e.target.value))}
            displayEmpty
          >
            {games.map(g => (
              <MenuItem key={g.id} value={g.id}>
                {g.homeTeam} vs {g.awayTeam} — {new Date(g.startTime).toLocaleString()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </>
    );
  }

  // ---- UI helpers for card rendering ----
  function formatPick(b: Bet): string {
    const sp = (b as any).details?.spreadPoints;
    const total = (b as any).details?.totalLine;
    if (b.marketType === 'SPREAD' && typeof sp === 'number') {
      return `${b.pick} ${sp > 0 ? `+${sp}` : sp}`;
    }
    if (b.marketType === 'TOTALS' && typeof total === 'number') {
      return `${b.pick} ${total}`;
    }
    return b.pick;
  }
  function statusTone(status: Bet['status']) {
    switch (status) {
      case 'OPEN': return { bg: 'var(--fb-accent-1)', text: 'var(--fb-text)' };
      case 'ACCEPTED': return { bg: '#EAF7FF', text: '#1e3a8a' };
      case 'RESOLVED': return { bg: '#ecfdf5', text: '#065f46' };
      case 'VOID': return { bg: '#fef2f2', text: '#7f1d1d' };
      default: return { bg: '#f1f5f9', text: '#334155' };
    }
  }

  const selectedGroupName =
    groups.find(g => g.id === selectedGroup)?.name ?? '—';

  // Adapt API groups to GroupScroller chips (minimal fields; UI-only)
  const groupChips: GroupChip[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    active: g.id === selectedGroup,
    membersCount: 0,
    winRatePct: 0,
  })) as GroupChip[];

  const main = (
    <>
      <BetHeader
        onRefreshSports={refreshOddsAndGames}
        onSettleAccepted={settleAcceptedBets}
        busyRefresh={busyRefresh}
        busySettle={busySettle}
        rightSlot={
          <span style={{ fontSize: 12, color: 'var(--fb-muted)' }}>
            Selected: <b>{selectedGroupName}</b>
          </span>
        }
      />

      {/* Select Group strip */}
      <div style={{ marginBottom: 8 }}>
        <SectionCard title="Select Group">
          <GroupScroller
            groups={groupChips}
            onSelect={(id) => setSelectedGroup(id)}
          />
        </SectionCard>
      </div>

      {/* Bets list — redesigned as card grid */}
      <div style={{ marginBottom: 8 }}>
        <SectionCard title="Open & Accepted Bets">
          {!selectedGroup ? (
            <Typography>Select a group to view bets.</Typography>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 12,
              }}
            >
              {bets
                .filter(b => b.status !== 'RESOLVED' && b.status !== 'VOID')
                .map((b) => {
                  const tone = statusTone(b.status);
                  return (
                    <div
                      key={b.id}
                      className="fb-fade"
                      style={{
                        border: '1px solid var(--fb-border)',
                        background: 'var(--fb-surface)',
                        borderRadius: 16,
                        padding: 16,
                        display: 'grid',
                        gap: 12,
                      }}
                    >
                      {/* Header row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700, color: 'var(--fb-text)', fontSize: 18 }}>
                          {b.gameId}
                        </div>
                        <span
                          className="fb-badge"
                          style={{
                            background: tone.bg,
                            color: tone.text,
                            borderColor: 'var(--fb-border)',
                            fontWeight: 700,
                          }}
                        >
                          {b.status}
                        </span>
                      </div>

                      {/* Key-Value rows */}
                      <div className="fb-kv">
                        <div className="fb-kv__row">
                          <span className="fb-kv__label">Market:</span>
                          <span className="fb-kv__value">{b.marketType}</span>
                        </div>
                        <div className="fb-kv__row">
                          <span className="fb-kv__label">Pick:</span>
                          <span className="fb-kv__value">{formatPick(b)}</span>
                        </div>
                        <div className="fb-kv__row">
                          <span className="fb-kv__label">Amount:</span>
                          <span className="fb-kv__value">${(b.amountCents / 100).toFixed(2)}</span>
                        </div>
                        <div className="fb-kv__row">
                          <span className="fb-kv__label">Odds:</span>
                          <span className="fb-kv__value">{b.odds}</span>
                        </div>
                      </div>

                      {/* Footer row: time + action */}
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                          borderTop: '1px solid var(--fb-border)',
                          paddingTop: 12,
                        }}
                      >
                        <div style={{ fontSize: 12, color: 'var(--fb-muted)' }}>
                          {/* We don’t have a kickoff on the bet object—show created time as a proxy if present */}
                          {('createdAt' in b && (b as any).createdAt)
                            ? new Date((b as any).createdAt).toLocaleString()
                            : 'Active'}
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                          {b.status === 'OPEN' && (
                            <button
                              className="fb-btn fb-btn--primary fb-btn--md"
                              onClick={() => onAccept(b.id)}
                            >
                              Accept
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Propose bet (unchanged logic; lightly cleaned grid) */}
      <SectionCard title="Propose a Bet">
        {sportsError && (
          <Typography color="error" sx={{ mb: 1 }}>
            {sportsError}
          </Typography>
        )}
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        {message && (
          <Typography color="secondary" sx={{ mb: 2 }}>
            {message}
          </Typography>
        )}

        {!selectedGroup ? (
          <Typography>Select a group first.</Typography>
        ) : (
          <form
            onSubmit={e => {
              e.preventDefault();
              onPropose();
            }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
              alignItems: 'start',
            }}
          >
            <TextField
              label="Your User ID"
              value={userId}
              InputProps={{ readOnly: true }}
              helperText={userId ? undefined : 'Sign in again if this is empty'}
              required
            />

            <FormControl>
              <InputLabel id="market-label">Market</InputLabel>
              <Select
                labelId="market-label"
                label="Market"
                value={marketType}
                onChange={e => handleMarketChange(e.target.value as MarketType)}
              >
                <MenuItem value="WINNER">Moneyline (WINNER)</MenuItem>
                <MenuItem value="SPREAD">Spread</MenuItem>
                <MenuItem value="TOTALS">Totals (O/U)</MenuItem>
                <MenuItem value="PLAYER_PROP">Player Prop</MenuItem>
                <MenuItem value="TEAM_PROP">Team Prop</MenuItem>
                <MenuItem value="SAME_GAME">Same Game (SGP)</MenuItem>
                <MenuItem value="PARLAY">Parlay</MenuItem>
              </Select>
            </FormControl>

            {/* Market-specific inputs */}
            {(() => {
              const commonEnd = (
                <>
                  <TextField
                    label="Odds (decimal)"
                    type="number"
                    value={odds}
                    onChange={e => setOdds(+e.target.value)}
                    inputProps={{ step: '0.01', min: 1.01 }}
                    required
                  />
                  <TextField
                    label="Amount (cents)"
                    type="text"
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                    value={amountCents}
                    onChange={e => setAmountCents(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 500"
                    required
                  />
                </>
              );

              switch (marketType) {
                case 'WINNER':
                  return (
                    <>
                      <SportGamePickers />
                      <TextField label="Game ID" value={gameId} onChange={e => setGameId(e.target.value)} required />
                      <FormControl>
                        <InputLabel id="pick-label">Pick</InputLabel>
                        <Select
                          labelId="pick-label"
                          label="Pick"
                          value={pick}
                          onChange={e => setPick(String(e.target.value))}
                        >
                          <MenuItem value="HOME">HOME</MenuItem>
                          <MenuItem value="AWAY">AWAY</MenuItem>
                        </Select>
                      </FormControl>
                      {commonEnd}
                    </>
                  );
                case 'SPREAD':
                  return (
                    <>
                      <SportGamePickers />
                      <TextField label="Game ID" value={gameId} onChange={e => setGameId(e.target.value)} required />
                      <FormControl>
                        <InputLabel id="spread-team">Team</InputLabel>
                        <Select
                          labelId="spread-team"
                          label="Team"
                          value={pick}
                          onChange={e => setPick(String(e.target.value))}
                        >
                          <MenuItem value="HOME">HOME</MenuItem>
                          <MenuItem value="AWAY">AWAY</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        label="Spread Points (e.g., -3.5)"
                        value={spreadPoints}
                        onChange={e => setSpreadPoints(e.target.value)}
                        placeholder="-3.5"
                        inputProps={{ inputMode: 'decimal' }}
                        required
                      />
                      {commonEnd}
                    </>
                  );
                case 'TOTALS':
                  return (
                    <>
                      <SportGamePickers />
                      <TextField label="Game ID" value={gameId} onChange={e => setGameId(e.target.value)} required />
                      <TextField
                        label="Totals Line (e.g., 210.5)"
                        value={totalsLine}
                        onChange={e => setTotalsLine(e.target.value)}
                        inputProps={{ inputMode: 'decimal' }}
                        required
                      />
                      <FormControl>
                        <InputLabel id="totals-dir">Direction</InputLabel>
                        <Select
                          labelId="totals-dir"
                          label="Direction"
                          value={totalsDirection}
                          onChange={e => setTotalsDirection(e.target.value as 'OVER' | 'UNDER')}
                        >
                          <MenuItem value="OVER">OVER</MenuItem>
                          <MenuItem value="UNDER">UNDER</MenuItem>
                        </Select>
                      </FormControl>
                      {commonEnd}
                    </>
                  );
                case 'PLAYER_PROP':
                  return (
                    <>
                      <TextField label="Game ID" value={gameId} onChange={e => setGameId(e.target.value)} required />
                      <TextField label="Player Name" value={ppPlayerName} onChange={e => setPpPlayerName(e.target.value)} required />
                      <FormControl>
                        <InputLabel id="pp-stat">Stat</InputLabel>
                        <Select
                          labelId="pp-stat"
                          label="Stat"
                          value={ppStatType}
                          onChange={e => setPpStatType(e.target.value as any)}
                        >
                          <MenuItem value="POINTS">POINTS</MenuItem>
                          <MenuItem value="REBOUNDS">REBOUNDS</MenuItem>
                          <MenuItem value="ASSISTS">ASSISTS</MenuItem>
                          <MenuItem value="GOALS">GOALS</MenuItem>
                          <MenuItem value="SAVES">SAVES</MenuItem>
                          <MenuItem value="CUSTOM">CUSTOM</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        label="Line (e.g., 22.5)"
                        value={ppLine}
                        onChange={e => setPpLine(e.target.value)}
                        inputProps={{ inputMode: 'decimal' }}
                        required
                      />
                      <FormControl>
                        <InputLabel id="pp-dir">Direction</InputLabel>
                        <Select
                          labelId="pp-dir"
                          label="Direction"
                          value={ppDirection}
                          onChange={e => setPpDirection(e.target.value as any)}
                        >
                          <MenuItem value="OVER">OVER</MenuItem>
                          <MenuItem value="UNDER">UNDER</MenuItem>
                        </Select>
                      </FormControl>
                      {commonEnd}
                    </>
                  );
                case 'TEAM_PROP':
                  return (
                    <>
                      <TextField label="Game ID" value={gameId} onChange={e => setGameId(e.target.value)} required />
                      <FormControl>
                        <InputLabel id="tp-team">Team</InputLabel>
                        <Select
                          labelId="tp-team"
                          label="Team"
                          value={tpTeam}
                          onChange={e => setTpTeam(e.target.value as any)}
                        >
                          <MenuItem value="HOME">HOME</MenuItem>
                          <MenuItem value="AWAY">AWAY</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField label="Prop Type (e.g., TOTAL_POINTS)" value={tpPropType} onChange={e => setTpPropType(e.target.value)} required />
                      <TextField label="Line (e.g., 100.5)" value={tpLine} onChange={e => setTpLine(e.target.value)} inputProps={{ inputMode: 'decimal' }} required />
                      <FormControl>
                        <InputLabel id="tp-dir">Direction</InputLabel>
                        <Select
                          labelId="tp-dir"
                          label="Direction"
                          value={tpDirection}
                          onChange={e => setTpDirection(e.target.value as any)}
                        >
                          <MenuItem value="OVER">OVER</MenuItem>
                          <MenuItem value="UNDER">UNDER</MenuItem>
                        </Select>
                      </FormControl>
                      {commonEnd}
                    </>
                  );
                case 'SAME_GAME':
                  return (
                    <>
                      <TextField label="Game ID" value={gameId} onChange={e => setGameId(e.target.value)} required />
                      <TextField
                        label="Legs (one per line)"
                        value={sgpLegs}
                        onChange={e => setSgpLegs(e.target.value)}
                        multiline
                        minRows={3}
                        placeholder={`Example:\nHOME -3.5\nPLAYER X OVER 22.5 PTS`}
                        required
                      />
                      {commonEnd}
                    </>
                  );
                case 'PARLAY':
                  return (
                    <>
                      <TextField label="Game ID" value={gameId} onChange={e => setGameId(e.target.value)} required />
                      <TextField
                        label="Legs (one per line)"
                        value={parlayLegs}
                        onChange={e => setParlayLegs(e.target.value)}
                        multiline
                        minRows={3}
                        placeholder={`Example:\nGAME_A HOME ML\nGAME_B OVER 210.5`}
                        required
                      />
                      {commonEnd}
                    </>
                  );
                default:
                  return null;
              }
            })()}

            <div style={{ gridColumn: '1 / -1' }}>
              <MUIButton type="submit" variant="contained">
                Propose Bet
              </MUIButton>
            </div>
          </form>
        )}
      </SectionCard>
    </>
  );

  const right = (
    <RightRail>{/* future tips/cards */}</RightRail>
  );

  return <TwoColumn main={main} right={right} />;
}
