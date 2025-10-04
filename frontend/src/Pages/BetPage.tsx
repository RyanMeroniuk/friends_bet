import React, { useEffect, useMemo, useRef, useState } from 'react';
import { listMyGroups, GroupResponse } from '../api/group';
import { listBets, proposeBet, acceptBet, Bet } from '../api/bet';
import { listGames, GameSummary } from '../api/game';
import { Typography } from '@mui/material';

import { refreshSports, settleAcceptedBets as settleAcceptedBetsApi } from '../api/bet';
import { useAuth } from '../context/AuthContext';

import TwoColumn from '../components/TwoColumn';
import SectionCard from '../components/SectionCard';
import RightRail from '../components/RightRail';
import EmptyState from '../components/EmptyState';
import GroupScroller, { GroupChip } from '../components/GroupScroller';
import BetHeader from '../components/BetHeader';
import { ToastContainer, ToastItem } from '../components/Toast';
import FormField from '../components/FormField';
import Input from '../components/Input';
import Select from '../components/Select';

type MarketType = 'WINNER' | 'SPREAD' | 'TOTALS';

type BetStatusFilter = 'all' | 'open' | 'accepted' | 'resolved' | 'void';

const DAYS_WINDOW = 2;
const API_BASE = (process.env.REACT_APP_API_BASE || '').replace(/\/$/, '');

const LS_KEY = 'fb_bets_prefs_v2';
type BetPrefs = {
  selectedGroup?: string;
  selectedSport?: string;
  selectedGameId?: string;
  marketType?: MarketType;
  amountCents?: string;
  odds?: number;
  betSearch?: string;
  statusTab?: BetStatusFilter;
};

const AMOUNT_PRESETS = [500, 1000, 2500, 5000];
const ODDS_PRESETS = [1.5, 1.7, 1.9, 2.2];
const MARKET_TYPES: MarketType[] = ['WINNER', 'SPREAD', 'TOTALS'];

export default function BetPage() {
  const initialPrefs: BetPrefs = (() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; }
    catch { return {}; }
  })();

  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>(initialPrefs.selectedGroup || '');
  const selectedGroupName = groups.find(g => g.id === selectedGroup)?.name ?? '—';

  const [bets, setBets] = useState<Bet[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingBets, setLoadingBets] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now());

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  function pushToast(text: string, tone: ToastItem['tone'] = 'info') {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, text, tone }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2600);
  }
  function closeToast(id: string) { setToasts(prev => prev.filter(t => t.id !== id)); }

  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [gameId, setGameId] = useState<string>(initialPrefs.selectedGameId || '');
  const initialMarketType = MARKET_TYPES.includes(initialPrefs.marketType as MarketType)
    ? (initialPrefs.marketType as MarketType)
    : 'WINNER';
  const [marketType, setMarketType] = useState<MarketType>(initialMarketType);
  const [pick, setPick] = useState<string>('HOME');
  const [amountCents, setAmountCents] = useState<string>(initialPrefs.amountCents || '');
  const [odds, setOdds] = useState<number>(typeof initialPrefs.odds === 'number' ? initialPrefs.odds : 1.8);

  const [spreadPoints, setSpreadPoints] = useState<string>('');
  const [totalsLine, setTotalsLine] = useState<string>('');
  const [totalsDirection, setTotalsDirection] = useState<'OVER' | 'UNDER'>('OVER');

  const [sports, setSports] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>(initialPrefs.selectedSport || '');
  const [sportsError, setSportsError] = useState<string | null>(null);
  const [sportsLoading, setSportsLoading] = useState<boolean>(false);

  const [games, setGames] = useState<GameSummary[]>([]);
  const [gamesLoading, setGamesLoading] = useState<boolean>(false);
  const selectedGame = useMemo(() => games.find(g => g.id === gameId), [games, gameId]);

  const [busyRefresh, setBusyRefresh] = useState(false);
  const [busySettle, setBusySettle] = useState(false);

  const [betSearch, setBetSearch] = useState<string>(initialPrefs.betSearch || '');
  const [statusTab, setStatusTab] = useState<BetStatusFilter>(initialPrefs.statusTab || 'all');

  const proposeRef = useRef<HTMLDivElement | null>(null);
  const openRef = useRef<HTMLDivElement | null>(null);
  const groupStripRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const [selectedBetId, setSelectedBetId] = useState<string | null>(null);
  const selectedBet = useMemo(() => bets.find(b => b.id === selectedBetId) || null, [bets, selectedBetId]);

  useEffect(() => {
    const prefs: BetPrefs = {
      selectedGroup,
      selectedSport,
      selectedGameId: gameId,
      marketType,
      amountCents,
      odds,
      betSearch,
      statusTab,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  }, [selectedGroup, selectedSport, gameId, marketType, amountCents, odds, betSearch, statusTab]);

  useEffect(() => {
    if (!userId) return;
    listMyGroups(userId)
      .then(mine => {
        setGroups(mine);
        if (!selectedGroup && mine.length > 0) setSelectedGroup(mine[0].id);
      })
      .catch(() => { setError('Could not load your groups'); pushToast('Could not load your groups', 'error'); });
  }, [userId]); // eslint-disable-line

  useEffect(() => {
    if (!selectedGroup) return;
    loadBets();
    setSelectedBetId(null);
  }, [selectedGroup]); // eslint-disable-line

  async function loadBets() {
    try {
      setLoadingBets(true);
      setError(null);
      const data = await listBets(selectedGroup);
      setBets(data);
      setLastRefreshed(Date.now());
    } catch (e: any) {
      const msg = e?.response?.data || 'Could not load bets';
      setError(msg); pushToast(msg, 'error');
    } finally {
      setLoadingBets(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSportsLoading(true);
      setSportsError(null);
      try {
        const res = await fetch(`${API_BASE}/sports?days=${DAYS_WINDOW}`, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(await res.text());
        const list: string[] = await res.json();
        if (!cancelled) {
          setSports(list || []);
          if (list?.length) setSelectedSport(prev => (prev && list.includes(prev)) ? prev : list[0]);
          else setSelectedSport('');
        }
      } catch {
        if (!cancelled) { setSportsError('Could not load sports'); pushToast('Could not load sports', 'error'); }
      } finally { if (!cancelled) setSportsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!selectedSport) { setGames([]); setGameId(''); return; }
    let cancelled = false;
    (async () => {
      setGamesLoading(true);
      try {
        const res = await fetch(`${API_BASE}/sports/${encodeURIComponent(selectedSport)}/games?days=${DAYS_WINDOW}`, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(await res.text());
        const list: any[] = await res.json();
        const mapped: GameSummary[] = (list || []).map((g: any) => ({ id: g.id, homeTeam: g.homeTeam, awayTeam: g.awayTeam, startTime: g.startTime }));
        if (!cancelled) {
          setGames(mapped);
          if (mapped.length > 0) setGameId(prev => (prev && mapped.some(m => m.id === prev)) ? prev : mapped[0].id);
          else setGameId('');
        }
      } catch { /* silent */ }
      finally { if (!cancelled) setGamesLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedSport]);

  useEffect(() => {
    if (selectedSport) return;
    (async () => {
      try { setGames(await listGames()); } catch (e) { console.warn('Failed to load games', e); }
    })();
  }, [selectedSport]); // eslint-disable-line

  function resetMarketSpecificFields() {
    setPick('HOME');
    setSpreadPoints('');
    setTotalsLine('');
    setTotalsDirection('OVER');
  }

  function round2(n: number) { return Math.round(n * 100) / 100; }
  function prefillFromGame(game: GameSummary | undefined, market: MarketType) {
    if (!game) return;
    const o = (game as any).odds || {};
    switch (market) {
      case 'WINNER': {
        setPick('HOME'); const homeOdds = o.h2h?.home;
        if (typeof homeOdds === 'number' && homeOdds > 1) setOdds(round2(homeOdds)); break;
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
      default: break;
    }
  }
  function handlePickGame(newGameId: string) { setGameId(newGameId); prefillFromGame(games.find(x => x.id === newGameId), marketType); }
  function handleMarketChange(next: MarketType) { setMarketType(next); setMessage(null); setError(null); resetMarketSpecificFields(); if (selectedGame) prefillFromGame(selectedGame, next); }

  const stake = (parseInt(amountCents || '0', 10) || 0) / 100;
  const potentialPayout = stake > 0 && odds > 1 ? stake * odds : 0;
  const potentialWin = stake > 0 && odds > 1 ? stake * (odds - 1) : 0;

  const formError = (() => {
    if (!userId) return 'User session missing';
    if (!selectedGroup) return 'Select a group';
    if (!gameId.trim()) return 'Game ID is required';
    if (amountCents.trim() === '') return 'Amount (cents) is required';
    const amt = parseInt(amountCents, 10);
    if (Number.isNaN(amt) || amt <= 0) return 'Amount must be a positive integer (in cents)';
    if (Number.isNaN(odds) || odds <= 1.0) return 'Odds must be > 1.0';
    if (marketType === 'SPREAD') {
      const pts = Number(spreadPoints);
      if (Number.isNaN(pts)) return 'Enter a valid spread (e.g., -3.5)';
    }
    if (marketType === 'TOTALS') {
      const n = parseFloat(totalsLine);
      if (Number.isNaN(n)) return 'Totals line must be a number';
    }
    return null;
  })();
  const submitDisabled = !!formError;

  async function onPropose() {
    setMessage(null); setError(null);
    if (submitDisabled) { if (formError) { setError(formError); pushToast(formError, 'error'); } return; }

    let details: Record<string, any> | undefined;
    let submitPick = pick;
    switch (marketType) {
      case 'SPREAD':
        details = { spreadPoints: Number(spreadPoints) };
        break;
      case 'TOTALS':
        details = { totalLine: parseFloat(totalsLine) };
        submitPick = totalsDirection;
        break;
      default:
        break;
    }

    try {
      await proposeBet(selectedGroup, userId, gameId.trim(), marketType, submitPick.toUpperCase(), parseInt(amountCents, 10), odds, details);
      setMessage('Bet proposed!'); pushToast('Bet proposed!', 'success');
      resetMarketSpecificFields(); // keep amount/odds
      loadBets();
    } catch (e: any) {
      const msg = e.response?.data || 'Error proposing bet'; setError(msg); pushToast(msg, 'error');
    }
  }

  async function onAccept(betId: string) {
    setMessage(null); setError(null);
    if (!userId) { const msg = 'User session missing'; setError(msg); pushToast(msg, 'error'); return; }
    try { await acceptBet(betId, userId); setMessage('Bet accepted!'); pushToast('Bet accepted!', 'success'); loadBets(); }
    catch (e: any) { const msg = e.response?.data || 'Error accepting bet'; setError(msg); pushToast(msg, 'error'); }
  }

  async function refreshOddsAndGames() {
    try {
      setBusyRefresh(true); setMessage(null); setError(null);
      await refreshSports(selectedSport || undefined);

      setSportsLoading(true);
      const resSports = await fetch(`${API_BASE}/sports?days=${DAYS_WINDOW}`, { headers: { Accept: 'application/json' } });
      if (resSports.ok) {
        const list: string[] = await resSports.json();
        setSports(list || []); if (!selectedSport && list?.length) setSelectedSport(list[0]);
      }
      setSportsLoading(false);

      if (selectedSport) {
        setGamesLoading(true);
        const resGames = await fetch(`${API_BASE}/sports/${encodeURIComponent(selectedSport)}/games?days=${DAYS_WINDOW}`, { headers: { Accept: 'application/json' } });
        if (resGames.ok) {
          const list: any[] = await resGames.json();
          const mapped: GameSummary[] = (list || []).map((g: any) => ({ id: g.id, homeTeam: g.homeTeam, awayTeam: g.awayTeam, startTime: g.startTime }));
          setGames(mapped);
          if (mapped.length > 0) setGameId(prev => (prev && mapped.some(m => m.id === prev)) ? prev : mapped[0].id);
        }
        setGamesLoading(false);
      }

      setLastRefreshed(Date.now());
      pushToast('Sports & games refreshed.', 'success');
    } catch (e: any) {
      const data = e?.response?.data;
      const msg = (data && typeof data === 'object' && 'message' in data) ? (data as any).message : (typeof data === 'string' ? data : e?.message);
      setError(msg || 'Failed to refresh sports/games'); pushToast(msg || 'Failed to refresh sports/games', 'error');
    } finally { setBusyRefresh(false); }
  }

  async function settleAcceptedBets() {
    try {
      setBusySettle(true); setMessage(null); setError(null);
      if (!selectedGroup) throw new Error('Select a group first');
      const res = await settleAcceptedBetsApi(selectedGroup);
      await loadBets();
      pushToast(typeof (res as any)?.settled === 'number'
        ? `Settlement check complete — ${(res as any).settled} settled.`
        : 'Settlement check complete.', 'success');
    } catch (e: any) {
      const msg = e?.message || 'Failed to settle accepted bets'; setError(msg); pushToast(msg, 'error');
    } finally { setBusySettle(false); }
  }

  function SportGamePickers() {
    const sportHelper =
      sportsLoading ? 'Loading sports…'
        : (sportsError ? sportsError : (selectedSport ? `Games: ${games.length}` : 'Pick a sport to load games'));

    return (
      <>
        <FormField label="Sport" htmlFor="bet-sport" helperText={sportHelper} required>
          <Select
            id="bet-sport"
            value={selectedSport}
            onChange={e => setSelectedSport(e.target.value)}
            disabled={sportsLoading}
          >
            <option value="">
              {sportsLoading
                ? 'Loading…'
                : (sports.length ? 'Select a sport' : 'No sports available')}
            </option>
            {sports.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Pick Game"
          htmlFor="bet-game"
          helperText={gamesLoading ? 'Loading games…' : (selectedSport ? `${games.length} game${games.length === 1 ? '' : 's'}` : 'Select a sport to show games')}
          required
        >
          <Select
            id="bet-game"
            value={gameId}
            onChange={e => handlePickGame(e.target.value)}
            disabled={gamesLoading || !selectedSport}
          >
            <option value="">
              {gamesLoading
                ? 'Loading…'
                : (games.length ? 'Choose a game' : 'No games available')}
            </option>
            {games.map(g => (
              <option key={g.id} value={g.id}>
                {g.homeTeam} vs {g.awayTeam} — {new Date(g.startTime).toLocaleString()}
              </option>
            ))}
          </Select>
        </FormField>
      </>
    );
  }

  function formatPick(b: Bet): string {
    const sp = (b as any).details?.spreadPoints;
    const total = (b as any).details?.totalLine;
    if (b.marketType === 'SPREAD' && typeof sp === 'number') return `${b.pick} ${sp > 0 ? `+${sp}` : sp}`;
    if (b.marketType === 'TOTALS' && typeof total === 'number') return `${b.pick} ${total}`;
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

  const groupChips: GroupChip[] = groups.map((g) => ({
    id: g.id, name: g.name, active: g.id === selectedGroup, membersCount: 0, winRatePct: 0,
  })) as GroupChip[];

  const q = betSearch.trim().toLowerCase();
  const bySearch = (b: Bet) => !q || `${b.marketType} ${b.pick} ${b.gameId} ${b.status} ${formatPick(b)}`.toLowerCase().includes(q);
  const matchStatusTab = (b: Bet) => (
    statusTab === 'all' ||
    (statusTab === 'open' && b.status === 'OPEN') ||
    (statusTab === 'accepted' && b.status === 'ACCEPTED') ||
    (statusTab === 'resolved' && b.status === 'RESOLVED') ||
    (statusTab === 'void' && b.status === 'VOID')
  );

  const openAll = (bets || []).filter(b => b.status === 'OPEN');
  const acceptedAll = (bets || []).filter(b => b.status === 'ACCEPTED');
  const resolvedAll = (bets || []).filter(b => b.status === 'RESOLVED');
  const voidAll = (bets || []).filter(b => b.status === 'VOID');

  const openBets = useMemo(() => openAll.filter(bySearch).filter(matchStatusTab), [bets, betSearch, statusTab]);
  const acceptedBets = useMemo(() => acceptedAll.filter(bySearch).filter(matchStatusTab), [bets, betSearch, statusTab]);
  const resolvedBets = useMemo(() => resolvedAll.filter(bySearch).filter(matchStatusTab), [bets, betSearch, statusTab]);
  const voidBets = useMemo(() => voidAll.filter(bySearch).filter(matchStatusTab), [bets, betSearch, statusTab]);

  function SkeletonCard() {
    return (
      <div style={{ border: '1px solid var(--fb-border)', background: 'var(--fb-surface)', borderRadius: 16, padding: 16, display: 'grid', gap: 12 }}>
        <div className="fb-skeleton" style={{ height: 18, width: '60%' }} />
        <div className="fb-kv">
          <div className="fb-kv__row"><span className="fb-skeleton" style={{ height: 12, width: 60 }} /><span className="fb-skeleton" style={{ height: 12, width: 80 }} /></div>
          <div className="fb-kv__row"><span className="fb-skeleton" style={{ height: 12, width: 50 }} /><span className="fb-skeleton" style={{ height: 12, width: 70 }} /></div>
          <div className="fb-kv__row"><span className="fb-skeleton" style={{ height: 12, width: 64 }} /><span className="fb-skeleton" style={{ height: 12, width: 64 }} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px solid var(--fb-border)', paddingTop: 12 }}>
          <div className="fb-skeleton" style={{ height: 12, width: 120 }} />
          <div style={{ marginLeft: 'auto' }}>
            <div className="fb-skeleton" style={{ height: 34, width: 94, borderRadius: 10 }} />
          </div>
        </div>
      </div>
    );
  }

  function BetCard(b: Bet) {
    const tone = statusTone(b.status);
    const isSelected = b.id === selectedBetId;
    return (
      <button
        key={b.id}
        type="button"
        onClick={() => setSelectedBetId(isSelected ? null : b.id)}
        className="fb-fade"
        style={{
          textAlign: 'left',
          border: `1px solid ${isSelected ? 'var(--fb-accent-2)' : 'var(--fb-border)'}`,
          background: 'var(--fb-surface)', borderRadius: 16, padding: 16, display: 'grid', gap: 12, cursor: 'pointer',
        }}
        aria-pressed={isSelected}
        aria-label={`Select bet ${b.id}`}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, color: 'var(--fb-text)', fontSize: 18 }}>{b.gameId}</div>
          <span className="fb-badge" style={{ background: tone.bg, color: tone.text, borderColor: 'var(--fb-border)', fontWeight: 700 }}>{b.status}</span>
        </div>
        <div className="fb-kv">
          <div className="fb-kv__row"><span className="fb-kv__label">Market:</span><span className="fb-kv__value">{b.marketType}</span></div>
          <div className="fb-kv__row"><span className="fb-kv__label">Pick:</span><span className="fb-kv__value">{formatPick(b)}</span></div>
          <div className="fb-kv__row"><span className="fb-kv__label">Amount:</span><span className="fb-kv__value">${(b.amountCents / 100).toFixed(2)}</span></div>
          <div className="fb-kv__row"><span className="fb-kv__label">Odds:</span><span className="fb-kv__value">{b.odds}</span></div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px solid var(--fb-border)', paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--fb-muted)' }}>
            {('createdAt' in b && (b as any).createdAt) ? new Date((b as any).createdAt).toLocaleString() : 'Active'}
          </div>
          <div style={{ marginLeft: 'auto' }}>
            {b.status === 'OPEN' && (
              <button
                className="fb-btn fb-btn--primary fb-btn--md"
                onClick={(e) => { e.stopPropagation(); onAccept(b.id); }}
              >
                Accept
              </button>
            )}
          </div>
        </div>
      </button>
    );
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as any).isContentEditable);
      if (isTyping) return;
      const k = e.key.toLowerCase();
      if (k === 'r') { e.preventDefault(); refreshOddsAndGames(); }
      else if (k === 'a') { e.preventDefault(); settleAcceptedBets(); }
      else if (k === 's') { e.preventDefault(); searchRef.current?.focus(); }
      else if (k === 'o') { e.preventDefault(); openRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      else if (k === 'k') { e.preventDefault(); groupStripRef.current?.focus(); }
      else if (k === 'p') { e.preventDefault(); proposeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const main = (
    <>
      <BetHeader
        onRefreshSports={refreshOddsAndGames}
        onSettleAccepted={settleAcceptedBets}
        busyRefresh={busyRefresh}
        busySettle={busySettle}
        rightSlot={
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--fb-muted)' }}>
              Selected: <b>{selectedGroupName}</b>
            </span>
            <span className="fb-meta-row" style={{ gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--fb-muted)' }}>Last refreshed {new Date(lastRefreshed).toLocaleTimeString()}</span>
              <span style={{ fontSize: 12, color: 'var(--fb-muted)' }}>•</span>
              <span style={{ fontSize: 12, color: 'var(--fb-muted)' }}>
                Shortcuts: <kbd>R</kbd> refresh, <kbd>A</kbd> settle, <kbd>S</kbd> search, <kbd>O</kbd> open, <kbd>K</kbd> groups, <kbd>P</kbd> propose
              </span>
            </span>
          </div>
        }
      />

      <div style={{ marginBottom: 8 }}>
        <SectionCard title="Select Group">
          <div ref={groupStripRef} tabIndex={0} aria-label="Group selector" style={{ outline: 'none' }}>
            <GroupScroller groups={groupChips} onSelect={(id) => setSelectedGroup(id)} />
          </div>
          <div className="fb-meta-row" style={{ marginTop: 8 }}><span>Tip: press <kbd>K</kbd> to focus this strip.</span></div>
        </SectionCard>
      </div>

      <div className="fb-section-card" style={{ position: 'sticky', top: 64, zIndex: 5, padding: 12, border: '1px solid var(--fb-border)', borderRadius: 12, background: 'var(--fb-surface)', display: 'grid', gap: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {(['all','open','accepted','resolved','void'] as BetStatusFilter[]).map(tab => (
            <button key={tab} className={`fb-btn fb-btn--${statusTab === tab ? 'primary' : 'ghost'} fb-btn--sm`} onClick={() => setStatusTab(tab)}>
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Input
              id="bet-search"
              ref={searchRef}
              value={betSearch}
              onChange={e => setBetSearch(e.target.value)}
              placeholder="Search bets…"
              aria-label="Search bets"
              style={{ minWidth: 260 }}
            />
            <span className="fb-badge">Total: {bets.length}</span>
            <span className="fb-badge">Open: {openAll.length}</span>
            <span className="fb-badge">Accepted: {acceptedAll.length}</span>
          </div>
        </div>
      </div>

      {(statusTab === 'all' || statusTab === 'open') && (
        <div style={{ marginBottom: 8 }} ref={openRef}>
          <SectionCard title={`Proposed Bets (Open) — ${openBets.length}`}>
            {!selectedGroup ? (
              <Typography>Select a group to view bets.</Typography>
            ) : loadingBets ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                <SkeletonCard /><SkeletonCard />
              </div>
            ) : openBets.length === 0 ? (
              <EmptyState title="No open proposals" text={betSearch || statusTab !== 'all' ? 'No open bets match your view.' : 'When someone proposes a bet, it shows up here.'} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {openBets.map((b) => BetCard(b))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {(statusTab === 'all' || statusTab === 'accepted') && (
        <div style={{ marginBottom: 8 }}>
          <SectionCard title={`Accepted Bets — ${acceptedBets.length}`}>
            {!selectedGroup ? (
              <Typography>Select a group to view bets.</Typography>
            ) : loadingBets ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                <SkeletonCard /><SkeletonCard />
              </div>
            ) : acceptedBets.length === 0 ? (
              <EmptyState title="No accepted bets" text={betSearch || statusTab !== 'all' ? 'No accepted bets match your view.' : 'Accept a proposal to see it here.'} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {acceptedBets.map((b) => BetCard(b))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {statusTab === 'resolved' && (
        <div style={{ marginBottom: 8 }}>
          <SectionCard title={`Resolved Bets — ${resolvedBets.length}`}>
            {loadingBets ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}><SkeletonCard /></div>
            ) : resolvedBets.length === 0 ? (
              <EmptyState title="No resolved bets" text="Nothing to show yet." />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {resolvedBets.map((b) => BetCard(b))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {statusTab === 'void' && (
        <div style={{ marginBottom: 8 }}>
          <SectionCard title={`Void Bets — ${voidBets.length}`}>
            {loadingBets ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}><SkeletonCard /></div>
            ) : voidBets.length === 0 ? (
              <EmptyState title="No void bets" text="Nothing to show yet." />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {voidBets.map((b) => BetCard(b))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      <div className="fb-section-card" style={{ padding: 12, border: '1px solid var(--fb-border)', borderRadius: 12, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Typography variant="h6" sx={{ margin: 0, fontWeight: 700, color: 'var(--fb-text)' }}>Propose New Bet</Typography>
          <div style={{ marginLeft: 'auto' }}>
            <button className="fb-btn fb-btn--primary fb-btn--md" onClick={() => proposeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              + Propose Bet
            </button>
          </div>
        </div>
      </div>

      <SectionCard title={`Propose Bet to ${selectedGroupName}`}>
        <div ref={proposeRef} />

        {selectedGame && (
          <div className="fb-fade" style={{ border: '1px solid var(--fb-border)', background: 'var(--fb-surface)', borderRadius: 12, padding: 10, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--fb-text)' }}>{selectedGame.homeTeam} vs {selectedGame.awayTeam}</div>
            <div className="fb-badge" style={{ marginLeft: 'auto' }}>{new Date(selectedGame.startTime).toLocaleString()}</div>
          </div>
        )}

        {sportsError && (<Typography color="error" sx={{ mb: 1 }}>{sportsError}</Typography>)}
        {error && (<Typography color="error" sx={{ mb: 2 }}>{error}</Typography>)}
        {message && (<Typography color="secondary" sx={{ mb: 2 }}>{message}</Typography>)}

        {!selectedGroup ? (
          <Typography>Select a group first.</Typography>
        ) : (
          <form
            onSubmit={e => { e.preventDefault(); onPropose(); }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 20,
              columnGap: 28,
              alignItems: 'start',
              padding: '4px 8px 12px',
            }}
          >
            <FormField
              label="Your User ID"
              htmlFor="bet-user-id"
              helperText={userId ? 'Signed in' : 'Sign in again if empty'}
              required
            >
              <Input id="bet-user-id" value={userId} readOnly required />
            </FormField>

            <FormField
              label="Market Type"
              htmlFor="bet-market-type"
              helperText="Select a market for this bet"
              required
            >
              <Select
                id="bet-market-type"
                value={marketType}
                onChange={e => handleMarketChange(e.target.value as MarketType)}
              >
                <option value="WINNER">Moneyline (WINNER)</option>
                <option value="SPREAD">Spread</option>
                <option value="TOTALS">Totals (O/U)</option>
              </Select>
            </FormField>

            <SportGamePickers />

            {(() => {
              const commonEnd = (
                <>
                  <FormField
                    label="Odds (decimal)"
                    htmlFor="bet-odds"
                    helperText="Quick presets below"
                    required
                  >
                    <div style={{ display: 'grid', gap: 8 }}>
                      <Input
                        id="bet-odds"
                        type="number"
                        step="0.01"
                        min="1.01"
                        value={Number.isNaN(odds) ? '' : odds}
                        onChange={e => setOdds(e.target.value === '' ? NaN : Number(e.target.value))}
                        placeholder="e.g., 1.85"
                        required
                      />
                      <div className="fb-actions" role="group" aria-label="Quick odds">
                        {ODDS_PRESETS.map(o => (
                          <button key={o} type="button" className="fb-btn fb-btn--ghost fb-btn--sm" onClick={() => setOdds(o)}>
                            {o.toFixed(2)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </FormField>

                  <FormField
                    label="Amount (cents)"
                    htmlFor="bet-amount"
                    helperText="Set stake in cents"
                    required
                  >
                    <div style={{ display: 'grid', gap: 8 }}>
                      <Input
                        id="bet-amount"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={amountCents}
                        onChange={e => setAmountCents(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g., 2500"
                        required
                      />
                      <div className="fb-actions" role="group" aria-label="Quick amounts">
                        {AMOUNT_PRESETS.map(cents => (
                          <button
                            key={cents}
                            type="button"
                            className="fb-btn fb-btn--ghost fb-btn--sm"
                            onClick={() => setAmountCents(String(cents))}
                            title={`Set ${(cents / 100).toFixed(0)} dollars`}
                          >
                            {(cents / 100).toFixed(0)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </FormField>

                  <div className="fb-badge" style={{ gridColumn: '1 / -1', width: 'fit-content', background: '#fff' }} aria-live="polite">
                    Stake: <b>${stake.toFixed(2)}</b> • &nbsp;Potential win: <b>${potentialWin.toFixed(2)}</b> • &nbsp;Payout: <b>${potentialPayout.toFixed(2)}</b>
                  </div>
                </>
              );

              switch (marketType) {
                case 'WINNER':
                  return (
                    <>
                      <FormField label="Game ID" htmlFor="bet-game-id" helperText="Auto-set when you choose a game" required>
                        <Input id="bet-game-id" value={gameId} onChange={e => setGameId(e.target.value)} placeholder="Auto-set when you choose a game" required />
                      </FormField>
                      <FormField label="Pick" htmlFor="bet-winner-pick" helperText="Choose HOME or AWAY" required>
                        <Select id="bet-winner-pick" value={pick} onChange={e => setPick(e.target.value)}>
                          <option value="HOME">HOME</option>
                          <option value="AWAY">AWAY</option>
                        </Select>
                      </FormField>
                      {commonEnd}
                    </>
                  );
                case 'SPREAD':
                  return (
                    <>
                      <FormField label="Game ID" htmlFor="bet-spread-game" helperText="Auto-set when you choose a game" required>
                        <Input id="bet-spread-game" value={gameId} onChange={e => setGameId(e.target.value)} placeholder="Auto-set when you choose a game" required />
                      </FormField>
                      <FormField label="Team" htmlFor="bet-spread-team" helperText="Which side of the spread?" required>
                        <Select id="bet-spread-team" value={pick} onChange={e => setPick(e.target.value)}>
                          <option value="HOME">HOME</option>
                          <option value="AWAY">AWAY</option>
                        </Select>
                      </FormField>
                      <FormField label="Spread Points" htmlFor="bet-spread-points" helperText="Enter spread like -3.5" required>
                        <Input
                          id="bet-spread-points"
                          value={spreadPoints}
                          onChange={e => setSpreadPoints(e.target.value)}
                          inputMode="decimal"
                          placeholder="-3.5"
                          required
                        />
                      </FormField>
                      {commonEnd}
                    </>
                  );
                case 'TOTALS':
                  return (
                    <>
                      <FormField label="Game ID" htmlFor="bet-totals-game" helperText="Auto-set when you choose a game" required>
                        <Input id="bet-totals-game" value={gameId} onChange={e => setGameId(e.target.value)} placeholder="Auto-set when you choose a game" required />
                      </FormField>
                      <FormField label="Totals Line" htmlFor="bet-totals-line" helperText="Decimal line (e.g., 210.5)" required>
                        <Input
                          id="bet-totals-line"
                          value={totalsLine}
                          onChange={e => setTotalsLine(e.target.value)}
                          inputMode="decimal"
                          placeholder="e.g., 210.5"
                          required
                        />
                      </FormField>
                      <FormField label="Direction" htmlFor="bet-totals-direction" helperText="Over or Under the line" required>
                        <Select
                          id="bet-totals-direction"
                          value={totalsDirection}
                          onChange={e => setTotalsDirection(e.target.value as 'OVER' | 'UNDER')}
                        >
                          <option value="OVER">OVER</option>
                          <option value="UNDER">UNDER</option>
                        </Select>
                      </FormField>
                      {commonEnd}
                    </>
                  );
                default:
                  return null;
              }
            })()}

            {/* SUBMIT ROW — CHANGED TO MATCH BLACK/WHITE ROUNDED BUTTONS */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12 }}>
              <button
                type="submit"
                className="fb-btn fb-btn--primary fb-btn--md"
                disabled={submitDisabled}
                style={{
                  background: '#111', borderColor: '#111', color: '#fff',
                  borderRadius: 12, paddingLeft: 22, paddingRight: 22, opacity: submitDisabled ? 0.6 : 1,
                }}
                aria-disabled={submitDisabled}
              >
                PROPOSE BET
              </button>

              <button
                type="button"
                className="fb-btn fb-btn--primary fb-btn--md"
                onClick={() => { setAmountCents(''); setOdds(1.8); resetMarketSpecificFields(); }}
                style={{
                  background: '#111', borderColor: '#111', color: '#fff',
                  borderRadius: 12, paddingLeft: 22, paddingRight: 22,
                }}
              >
                CLEAR
              </button>

              {submitDisabled && formError && (
                <div className="fb-badge" style={{ marginLeft: 8, alignSelf: 'center' }}>
                  {formError}
                </div>
              )}
            </div>
          </form>
        )}
      </SectionCard>

      <ToastContainer items={toasts} onClose={closeToast} />
    </>
  );

  const right = (
    <RightRail>
      <SectionCard title="Bet Details">
        {!selectedBet ? (
          <div style={{ color: 'var(--fb-muted)' }}>Select a bet card to view its details.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 700, color: 'var(--fb-text)' }}>{selectedBet.gameId}</div>
            <div className="fb-kv">
              <div className="fb-kv__row"><span className="fb-kv__label">Status</span><span className="fb-kv__value">{selectedBet.status}</span></div>
              <div className="fb-kv__row"><span className="fb-kv__label">Market</span><span className="fb-kv__value">{selectedBet.marketType}</span></div>
              <div className="fb-kv__row"><span className="fb-kv__label">Pick</span><span className="fb-kv__value">{formatPick(selectedBet)}</span></div>
              <div className="fb-kv__row"><span className="fb-kv__label">Odds</span><span className="fb-kv__value">{selectedBet.odds}</span></div>
              <div className="fb-kv__row"><span className="fb-kv__label">Amount</span><span className="fb-kv__value">${(selectedBet.amountCents / 100).toFixed(2)}</span></div>
              {'createdAt' in selectedBet && (selectedBet as any).createdAt && (
                <div className="fb-kv__row"><span className="fb-kv__label">Created</span><span className="fb-kv__value">{new Date((selectedBet as any).createdAt).toLocaleString()}</span></div>
              )}
            </div>
            {selectedBet.marketType === 'SPREAD' && typeof (selectedBet as any).details?.spreadPoints === 'number' && (
              <div className="fb-badge" style={{ width: 'fit-content' }}>Spread: {(selectedBet as any).details.spreadPoints}</div>
            )}
            {selectedBet.marketType === 'TOTALS' && typeof (selectedBet as any).details?.totalLine === 'number' && (
              <div className="fb-badge" style={{ width: 'fit-content' }}>Total line: {(selectedBet as any).details.totalLine}</div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button
                className="fb-btn fb-btn--ghost fb-btn--md"
                onClick={() => { navigator.clipboard?.writeText(selectedBet.id).catch(() => {}); pushToast('Bet ID copied', 'info'); }}
              >
                Copy Bet ID
              </button>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {selectedBet.status === 'OPEN' && (
                  <button className="fb-btn fb-btn--primary fb-btn--md" onClick={() => onAccept(selectedBet.id)}>
                    Accept Bet
                  </button>
                )}
                <button className="fb-btn fb-btn--ghost fb-btn--md" onClick={() => setSelectedBetId(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </RightRail>
  );

  return <TwoColumn main={main} right={right} />;
}
