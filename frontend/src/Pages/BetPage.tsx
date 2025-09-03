import React, { useEffect, useMemo, useState } from 'react';
import { listMyGroups, GroupResponse } from '../api/group';
import { listBets, proposeBet, acceptBet, Bet } from '../api/bet';
import { listGames, GameSummary } from '../api/game';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  Divider,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Paper,
} from '@mui/material';

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
function authToken() {
  try { return JSON.parse(localStorage.getItem('authUser') || '{}')?.token; }
  catch { return undefined; }
}

export default function BetPage() {
  // groups + selection (left panel unchanged)
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');

  // list + feedback
  const [bets, setBets] = useState<Bet[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // propose form state
  const auth = JSON.parse(localStorage.getItem('authUser')!);
  const [userId, setUserId] = useState<string>(auth?.id ?? '');
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

  // sports + games (NEW)
  const [sports, setSports] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [sportsError, setSportsError] = useState<string | null>(null);

  // games
  const [games, setGames] = useState<GameSummary[]>([]);
  const selectedGame = useMemo(
    () => games.find(g => g.id === gameId),
    [games, gameId]
  );

  // ---- NEW: admin action buttons loading flags
  const [busyRefresh, setBusyRefresh] = useState(false);
  const [busySettle, setBusySettle] = useState(false);

  const listItem = (active: boolean): React.CSSProperties => ({
    padding: '0.55rem 0.65rem',
    borderRadius: 6,
    cursor: 'pointer',
    background: active ? '#eef5ff' : 'transparent',
    border: active ? '1px solid #cfe3ff' : '1px solid transparent',
    marginBottom: 6,
  });

  // ------- load groups (unchanged) -------
  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem('authUser')!);
    listMyGroups(auth.id)
      .then(mine => {
        setGroups(mine);
        if (!selectedGroup && mine.length > 0) setSelectedGroup(mine[0].id);
      })
      .catch(() => setError('Could not load your groups'));
  }, []);

  // ------- load bets when group changes (unchanged) -------
  useEffect(() => {
    if (!selectedGroup) return;
    loadBets();
  }, [selectedGroup]);

  // ------- NEW: load sports (next 2 days) -------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSportsError(null);
      try {
        const token = authToken();
        const res = await fetch(`${API_BASE}/sports?days=${DAYS_WINDOW}`, {
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error(await res.text());
        const list: string[] = await res.json();
        if (!cancelled) {
          setSports(list || []);
          if (!selectedSport && list?.length) setSelectedSport(list[0]);
        }
      } catch (e) {
        if (!cancelled) setSportsError('Could not load sports');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ------- NEW: load games whenever sport changes -------
  useEffect(() => {
    if (!selectedSport) return;
    let cancelled = false;
    (async () => {
      try {
        const token = authToken();
        const res = await fetch(
          `${API_BASE}/sports/${encodeURIComponent(selectedSport)}/games?days=${DAYS_WINDOW}`,
          {
            headers: {
              Accept: 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
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
        // keep silent; manual Game ID still works
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSport]);

  // ------- existing: initial listGames fallback (kept) -------
  useEffect(() => {
    // If sport picker hasn’t selected anything yet, keep your legacy loader
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

  // ---------- Prefill from selected game/odds ----------
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
        if (typeof homeOdds === 'number' && homeOdds > 1) {
          setOdds(round2(homeOdds));
        }
        break;
      }
      case 'SPREAD': {
        setPick('HOME');
        if (typeof o.spreads?.lineHome === 'number') {
          setSpreadPoints(String(o.spreads.lineHome));
        }
        if (typeof o.spreads?.oddsHome === 'number' && o.spreads.oddsHome > 1) {
          setOdds(round2(o.spreads.oddsHome));
        }
        break;
      }
      case 'TOTALS': {
        setTotalsDirection('OVER');
        if (typeof o.totals?.line === 'number') {
          setTotalsLine(String(o.totals.line));
        }
        if (typeof o.totals?.over === 'number' && o.totals.over > 1) {
          setOdds(round2(o.totals.over));
        }
        break;
      }
      default:
        break;
    }
  }

  // when you change game, prefill fields for current market
  function handlePickGame(newGameId: string) {
    setGameId(newGameId);
    const g = games.find(x => x.id === newGameId);
    prefillFromGame(g, marketType);
  }

  // when you change market, re-apply prefill if a game is selected
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
    try {
      await acceptBet(betId, userId);
      setMessage('Bet accepted!');
      loadBets();
    } catch (e: any) {
      setError(e.response?.data || 'Error accepting bet');
    }
  }

  // ---- NEW: Admin actions (two buttons) ----
  async function refreshOddsAndGames() {
    try {
      setBusyRefresh(true);
      setMessage(null);
      setError(null);
      const token = authToken();

      // 1) tell backend to refresh odds/sports/games
      const res = await fetch(`${API_BASE}/api/admin/refresh?sport=all`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(await res.text());

      // 2) re-pull sports list, then games for selectedSport
      const resSports = await fetch(`${API_BASE}/sports?days=${DAYS_WINDOW}`, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (resSports.ok) {
        const list: string[] = await resSports.json();
        setSports(list || []);
        if (!selectedSport && list?.length) {
          setSelectedSport(list[0]);
        }
      }
      if (selectedSport) {
        const resGames = await fetch(
          `${API_BASE}/sports/${encodeURIComponent(selectedSport)}/games?days=${DAYS_WINDOW}`,
          {
            headers: {
              Accept: 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
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
      setError(e?.message || 'Failed to refresh sports/games');
    } finally {
      setBusyRefresh(false);
    }
  }

  async function settleAcceptedBets() {
    try {
      setBusySettle(true);
      setMessage(null);
      setError(null);
      const token = authToken();

      // Prefer new endpoint
      let res = await fetch(`${API_BASE}/api/admin/scores/refresh?sport=all`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      // Fallback to older name if needed
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_BASE}/api/admin/sync-scores`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
      }
      if (!res.ok) throw new Error(await res.text());

      await loadBets(); // reflect any settlements
      setMessage('Settlement check complete.');
    } catch (e: any) {
      setError(e?.message || 'Failed to settle accepted bets');
    } finally {
      setBusySettle(false);
    }
  }

  // Reusable picker block (sport + game dropdowns)
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
            {/* Leave empty list as-is; user can still type Game ID manually below */}
          </Select>
        </FormControl>
      </>
    );
  }

  // Dynamic fields per market (left panel untouched)
  function renderProposeFields() {
    // Common tail (keeps your free-typing amount box)
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
            {/* NEW: Sport + Game pickers */}
            <SportGamePickers />

            {/* still allow manual override */}
            <TextField
              label="Game ID"
              value={gameId}
              onChange={e => setGameId(e.target.value)}
              required
            />
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

            <TextField
              label="Game ID"
              value={gameId}
              onChange={e => setGameId(e.target.value)}
              required
            />
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

            <TextField
              label="Game ID"
              value={gameId}
              onChange={e => setGameId(e.target.value)}
              required
            />
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
            <TextField
              label="Game ID"
              value={gameId}
              onChange={e => setGameId(e.target.value)}
              required
            />
            <TextField
              label="Player Name"
              value={ppPlayerName}
              onChange={e => setPpPlayerName(e.target.value)}
              required
            />
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
            <TextField
              label="Game ID"
              value={gameId}
              onChange={e => setGameId(e.target.value)}
              required
            />
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
            <TextField
              label="Prop Type (e.g., TOTAL_POINTS)"
              value={tpPropType}
              onChange={e => setTpPropType(e.target.value)}
              required
            />
            <TextField
              label="Line (e.g., 100.5)"
              value={tpLine}
              onChange={e => setTpLine(e.target.value)}
              inputProps={{ inputMode: 'decimal' }}
              required
            />
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
            <TextField
              label="Game ID"
              value={gameId}
              onChange={e => setGameId(e.target.value)}
              required
            />
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
            <TextField
              label="Game ID"
              value={gameId}
              onChange={e => setGameId(e.target.value)}
              required
            />
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
  }

  function renderBetRow(b: Bet) {
    const isOpen = b.status === 'OPEN';
    const sp = (b as any).details?.spreadPoints;
    const total = (b as any).details?.totalLine;

    let pickLabel = b.pick;
    if (b.marketType === 'SPREAD' && typeof sp === 'number') {
      pickLabel = `${b.pick} ${sp > 0 ? `+${sp}` : sp}`;
    } else if (b.marketType === 'TOTALS' && typeof total === 'number') {
      pickLabel = `${b.pick} ${total}`; // OVER 210.5 / UNDER 210.5
    }

    return (
      <ListItem key={b.id} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        <Typography>
          <strong>{b.marketType}</strong> — {pickLabel} @ {b.odds} — $
          {(b.amountCents / 100).toFixed(2)} — Status: {b.status}
        </Typography>
        {isOpen && (
          <Button size="small" onClick={() => onAccept(b.id)} sx={{ mt: 1 }}>
            Accept
          </Button>
        )}
      </ListItem>
    );
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 2, mt: 4 }}>
      {/* LEFT: Your Groups (unchanged) */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Your Groups
        </Typography>
        <Divider sx={{ mb: 1 }} />
        {groups.length === 0 && <div>No groups yet.</div>}
        {groups.map(g => (
          <div
            key={g.id}
            style={listItem(g.id === selectedGroup)}
            onClick={() => setSelectedGroup(g.id)}
            title={`Switch to ${g.name}`}
          >
            <div style={{ fontWeight: 600 }}>{g.name}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Code: {g.inviteCode}</div>
          </div>
        ))}
      </Paper>

      {/* RIGHT: stacked panels */}
      <Box sx={{ display: 'grid', gap: 2 }}>
        {/* NEW: Admin toolbar */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={refreshOddsAndGames}
            disabled={busyRefresh}
          >
            {busyRefresh ? 'Refreshing…' : 'Refresh Sports & Games'}
          </Button>
          <Button
            variant="outlined"
            onClick={settleAcceptedBets}
            disabled={busySettle}
          >
            {busySettle ? 'Settling…' : 'Settle Accepted Bets'}
          </Button>
        </Box>

        {/* Top: Unsettled bets */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Open & Accepted Bets
          </Typography>
          {!selectedGroup ? (
            <Typography>Select a group to view bets.</Typography>
          ) : (
            <List>
              {bets
                .filter(b => b.status !== 'RESOLVED' && b.status !== 'VOID')
                .map(renderBetRow)}
            </List>
          )}
        </Paper>

        {/* Bottom: Propose bet (dynamic fields) */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Propose a Bet
          </Typography>

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
            <Box
              component="form"
              onSubmit={e => {
                e.preventDefault();
                onPropose();
              }}
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 2,
                alignItems: 'start',
              }}
            >
              <TextField
                label="Your User ID"
                value={userId}
                onChange={e => setUserId(e.target.value)}
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

              {renderProposeFields()}

              <Box sx={{ gridColumn: '1 / -1' }}>
                <Button type="submit" variant="contained">
                  Propose Bet
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
