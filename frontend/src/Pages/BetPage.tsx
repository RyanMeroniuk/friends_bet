import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { listMyGroups, GroupResponse } from '../api/group';
import {
  listBets, proposeBet, acceptBet, cancelBet, refreshSports,
  settleAcceptedBets as settleApi, Bet,
} from '../api/bet';
import { useAuth } from '../context/AuthContext';
import { useGroup } from '../context/GroupContext';
import Modal from '../components/Modal';
import { ToastContainer, ToastItem } from '../components/Toast';
import '../styles/ui.css';

const DAYS = 3;

const SPORT_LABELS: Record<string, string> = {
  americanfootball_nfl: 'NFL',
  americanfootball_ncaaf: 'College Football',
  basketball_nba: 'NBA',
  basketball_ncaab: 'College Basketball',
  baseball_mlb: 'MLB',
  icehockey_nhl: 'NHL',
  soccer_epl: 'Premier League',
  soccer_usa_mls: 'MLS',
  soccer_uefa_champs_league: 'Champions League',
  soccer_spain_la_liga: 'La Liga',
  mma_mixed_martial_arts: 'UFC / MMA',
  boxing_boxing: 'Boxing',
};
function sportLabel(key: string) {
  return SPORT_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
type StatusTab = 'all' | 'OPEN' | 'ACCEPTED' | 'RESOLVED' | 'VOID';

interface GameSummary { id: string; homeTeam: string; awayTeam: string; startTime: string; }

export default function BetPage() {
  const { user } = useAuth();
  const { groupId: ctxGroupId, setGroupId } = useGroup();
  const { groupId: paramGroupId } = useParams<{ groupId: string }>();
  const userId = user?.id ?? '';

  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [selectedGroup, setSelectedGroup] = useState(paramGroupId ?? ctxGroupId ?? '');
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  // sport / game data
  const [sports, setSports] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState('');
  const [games, setGames] = useState<GameSummary[]>([]);
  const [gameLookup, setGameLookup] = useState<Record<string, GameSummary>>({});

  // filters
  const [statusTab, setStatusTab] = useState<StatusTab>('all');

  // propose modal
  const [proposeOpen, setProposeOpen] = useState(false);
  const [gameId, setGameId] = useState('');
  const [marketType, setMarketType] = useState('WINNER');
  const [pick, setPick] = useState('');
  const [amount, setAmount] = useState('');
  const [odds, setOdds] = useState('');
  const [spreadPoints, setSpreadPoints] = useState('');
  const [totalLine, setTotalLine] = useState('');
  const [proposeSubmitting, setProposeSubmitting] = useState(false);

  // toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toast = (text: string, tone: ToastItem['tone'] = 'info') => {
    const id = crypto.randomUUID();
    setToasts((p) => [...p, { id, text, tone }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  };

  // load groups
  useEffect(() => {
    if (!userId) return;
    listMyGroups(userId).then((data) => {
      setGroups(data);
      if (!selectedGroup && data.length > 0) {
        setSelectedGroup(data[0].id);
        setGroupId(data[0].id);
      }
    });
  }, [userId]);

  function selectGroup(id: string) {
    setSelectedGroup(id);
    setGroupId(id);
  }

  // load bets
  const loadBets = useCallback(async () => {
    if (!selectedGroup) return;
    try {
      const data = await listBets(selectedGroup);
      setBets(data);
    } catch {
      toast('Failed to load bets', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedGroup]);

  useEffect(() => { setLoading(true); loadBets(); }, [loadBets]);

  // load sports on mount
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`/api/sports?days=${DAYS}`, { headers: { Accept: 'application/json' } });
        if (!resp.ok) return;
        const list: string[] = await resp.json();
        setSports(list || []);
        if (list.length > 0) setSelectedSport((prev) => prev || list[0]);
      } catch { /* network error */ }
    })();
  }, []);

  // load games when sport changes
  useEffect(() => {
    if (!selectedSport) return;
    (async () => {
      try {
        const resp = await fetch(`/api/sports/${encodeURIComponent(selectedSport)}/games?days=${DAYS}`, { headers: { Accept: 'application/json' } });
        if (!resp.ok) return;
        const list: any[] = await resp.json();
        const mapped: GameSummary[] = (list || []).map((g: any) => ({
          id: g.id, homeTeam: g.homeTeam, awayTeam: g.awayTeam, startTime: g.startTime,
        }));
        setGames(mapped);
        setGameLookup((prev) => {
          const next = { ...prev };
          mapped.forEach((g) => { next[g.id] = g; });
          return next;
        });
        if (mapped.length > 0) setGameId((prev) => (prev && mapped.some((g) => g.id === prev)) ? prev : mapped[0].id);
      } catch { /* network error */ }
    })();
  }, [selectedSport]);

  // merge bet game IDs into lookup by fetching broader window
  useEffect(() => {
    if (!bets.length || !selectedSport) return;
    const missing = bets.filter((b) => !gameLookup[b.gameId]);
    if (!missing.length) return;
    fetch(`/api/sports/${encodeURIComponent(selectedSport)}/games?days=30`, { headers: { Accept: 'application/json' } })
      .then((r) => r.ok ? r.json() : [])
      .then((list: any[]) => {
        setGameLookup((prev) => {
          const next = { ...prev };
          (list || []).forEach((g: any) => { next[g.id] = { id: g.id, homeTeam: g.homeTeam, awayTeam: g.awayTeam, startTime: g.startTime }; });
          return next;
        });
      })
      .catch(() => {});
  }, [bets, selectedSport]);

  function gameLabel(gid: string) {
    const g = gameLookup[gid];
    return g ? `${g.awayTeam} @ ${g.homeTeam}` : gid.slice(0, 8);
  }

  // filtered bets
  const filtered = statusTab === 'all' ? bets : bets.filter((b) => b.status === statusTab);

  // actions
  async function handleAccept(betId: string) {
    try {
      await acceptBet(betId, userId);
      toast('Bet accepted', 'success');
      loadBets();
    } catch (e: any) {
      toast(e?.response?.data || 'Failed to accept', 'error');
    }
  }

  async function handleCancel(betId: string) {
    try {
      await cancelBet(betId);
      toast('Bet cancelled — stake refunded', 'success');
      loadBets();
    } catch (e: any) {
      toast(e?.response?.data || 'Failed to cancel', 'error');
    }
  }

  async function handleSettle() {
    if (!selectedGroup) return;
    try {
      const res = await settleApi(selectedGroup);
      toast(`Settlement complete — ${res.settled} settled`, 'success');
      loadBets();
    } catch (e: any) {
      toast(e?.message || 'Settlement failed', 'error');
    }
  }

  async function handleRefresh() {
    if (!selectedSport) { toast('Select a sport first', 'error'); return; }
    try {
      await refreshSports(selectedSport);
      toast('Odds refreshed', 'success');
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Failed to refresh';
      toast(msg, 'error');
    }
  }

  async function handlePropose() {
    const amountCents = Math.round((Number(amount) || 0) * 100);
    const oddsNum = Number(odds) || 0;
    if (!gameId || !pick || amountCents <= 0 || oddsNum <= 1) return;

    const details: Record<string, any> = {};
    if (marketType === 'SPREAD' && spreadPoints) details.spreadPoints = Number(spreadPoints);
    if (marketType === 'TOTALS' && totalLine) details.totalLine = Number(totalLine);

    try {
      setProposeSubmitting(true);
      await proposeBet(selectedGroup, userId, gameId, marketType, pick, amountCents, oddsNum, details);
      toast('Bet proposed', 'success');
      setProposeOpen(false);
      setAmount(''); setOdds(''); setPick(''); setSpreadPoints(''); setTotalLine('');
      loadBets();
    } catch (e: any) {
      toast(e?.response?.data || 'Failed to propose', 'error');
    } finally {
      setProposeSubmitting(false);
    }
  }

  const selectedGame = games.find((g) => g.id === gameId);

  const STATUS_COLORS: Record<string, string> = {
    OPEN: '#3b82f6', ACCEPTED: '#f59e0b', RESOLVED: 'var(--fb-accent)', VOID: 'var(--fb-muted)',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: 'var(--fb-text)', margin: 0, fontSize: 22, fontWeight: 700 }}>Bets</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="fb-btn fb-btn--ghost fb-btn--sm" onClick={handleRefresh}>Refresh Odds</button>
          <button className="fb-btn fb-btn--ghost fb-btn--sm" onClick={handleSettle}>Settle</button>
          <button className="fb-btn fb-btn--primary fb-btn--sm" onClick={() => setProposeOpen(true)}>
            New Bet
          </button>
        </div>
      </div>

      {/* Group selector */}
      {groups.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {groups.map((g) => (
            <button
              key={g.id}
              className={`fb-btn fb-btn--sm ${g.id === selectedGroup ? 'fb-btn--primary' : 'fb-btn--ghost'}`}
              onClick={() => selectGroup(g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['all', 'OPEN', 'ACCEPTED', 'RESOLVED', 'VOID'] as StatusTab[]).map((tab) => (
          <button
            key={tab}
            className={`fb-btn fb-btn--sm ${statusTab === tab ? 'fb-btn--primary' : 'fb-btn--ghost'}`}
            onClick={() => setStatusTab(tab)}
          >
            {tab === 'all' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Bet list */}
      {loading ? (
        <div style={{ color: 'var(--fb-muted)', padding: 40, textAlign: 'center' }}>Loading…</div>
      ) : !selectedGroup ? (
        <div className="fb-glass" style={{ padding: 40, textAlign: 'center', color: 'var(--fb-muted)' }}>
          Select a group to view bets.
        </div>
      ) : filtered.length === 0 ? (
        <div className="fb-glass" style={{ padding: 40, textAlign: 'center', color: 'var(--fb-muted)' }}>
          No bets {statusTab !== 'all' ? `with status "${statusTab}"` : 'yet'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map((b) => (
            <div key={b.id} className="fb-glass" style={{ padding: 14, borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, color: 'var(--fb-text)', fontSize: 15 }}>
                  {gameLabel(b.gameId)}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                  background: `${STATUS_COLORS[b.status] ?? 'var(--fb-muted)'}22`,
                  color: STATUS_COLORS[b.status] ?? 'var(--fb-muted)',
                }}>
                  {b.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 13, color: 'var(--fb-muted)' }}>
                <div><span style={{ color: 'var(--fb-text)' }}>{b.marketType}</span></div>
                <div>Pick: <span style={{ color: 'var(--fb-text)' }}>{b.pick}</span></div>
                <div>Stake: <span style={{ color: 'var(--fb-text)' }}>${(b.amountCents / 100).toFixed(2)}</span></div>
                <div>Odds: <span style={{ color: 'var(--fb-text)' }}>{b.odds}</span></div>
              </div>

              {b.status === 'OPEN' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {b.proposerId === userId ? (
                    <button className="fb-btn fb-btn--ghost fb-btn--sm" onClick={() => handleCancel(b.id)}>
                      Cancel
                    </button>
                  ) : (
                    <button className="fb-btn fb-btn--primary fb-btn--sm" onClick={() => handleAccept(b.id)}>
                      Accept
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Propose modal */}
      <Modal open={proposeOpen} title="New Bet" onClose={() => setProposeOpen(false)} width={460} footer={
        <>
          <button className="fb-btn fb-btn--ghost fb-btn--md" onClick={() => setProposeOpen(false)}>Cancel</button>
          <button className="fb-btn fb-btn--primary fb-btn--md" onClick={handlePropose} disabled={proposeSubmitting}>
            {proposeSubmitting ? 'Placing…' : 'Place Bet'}
          </button>
        </>
      }>
        <div style={{ display: 'grid', gap: 14 }}>
          {/* Sport */}
          <div>
            <label style={{ display: 'block', color: 'var(--fb-text)', fontSize: 13, marginBottom: 4 }}>Sport</label>
            <select className="fb-select" value={selectedSport} onChange={(e) => setSelectedSport(e.target.value)}>
              {sports.map((s) => <option key={s} value={s}>{sportLabel(s)}</option>)}
            </select>
          </div>

          {/* Game */}
          <div>
            <label style={{ display: 'block', color: 'var(--fb-text)', fontSize: 13, marginBottom: 4 }}>Game</label>
            <select className="fb-select" value={gameId} onChange={(e) => setGameId(e.target.value)}>
              {games.map((g) => (
                <option key={g.id} value={g.id}>{g.awayTeam} @ {g.homeTeam}</option>
              ))}
            </select>
          </div>

          {/* Market */}
          <div>
            <label style={{ display: 'block', color: 'var(--fb-text)', fontSize: 13, marginBottom: 4 }}>Market</label>
            <select className="fb-select" value={marketType} onChange={(e) => { setMarketType(e.target.value); setPick(''); }}>
              <option value="WINNER">Winner</option>
              <option value="SPREAD">Spread</option>
              <option value="TOTALS">Totals</option>
            </select>
          </div>

          {/* Pick */}
          <div>
            <label style={{ display: 'block', color: 'var(--fb-text)', fontSize: 13, marginBottom: 4 }}>Pick</label>
            {marketType === 'TOTALS' ? (
              <select className="fb-select" value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Select…</option>
                <option value="OVER">Over</option>
                <option value="UNDER">Under</option>
              </select>
            ) : (
              <select className="fb-select" value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Select…</option>
                {selectedGame && <option value={selectedGame.homeTeam}>{selectedGame.homeTeam}</option>}
                {selectedGame && <option value={selectedGame.awayTeam}>{selectedGame.awayTeam}</option>}
              </select>
            )}
          </div>

          {/* Spread / Total line */}
          {marketType === 'SPREAD' && (
            <div>
              <label style={{ display: 'block', color: 'var(--fb-text)', fontSize: 13, marginBottom: 4 }}>Spread Points</label>
              <input className="fb-input" type="number" step="0.5" value={spreadPoints} onChange={(e) => setSpreadPoints(e.target.value)} />
            </div>
          )}
          {marketType === 'TOTALS' && (
            <div>
              <label style={{ display: 'block', color: 'var(--fb-text)', fontSize: 13, marginBottom: 4 }}>Total Line</label>
              <input className="fb-input" type="number" step="0.5" value={totalLine} onChange={(e) => setTotalLine(e.target.value)} />
            </div>
          )}

          {/* Amount + Odds */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', color: 'var(--fb-text)', fontSize: 13, marginBottom: 4 }}>Stake ($)</label>
              <input className="fb-input" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--fb-text)', fontSize: 13, marginBottom: 4 }}>Odds (decimal)</label>
              <input className="fb-input" type="number" min={1} step="0.01" value={odds} onChange={(e) => setOdds(e.target.value)} />
            </div>
          </div>
        </div>
      </Modal>

      <ToastContainer items={toasts} onClose={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}
