import React from 'react';

/* layout + shared UI */
import TwoColumn from '../components/TwoColumn';
import RightRail from '../components/RightRail';
import SectionCard from '../components/SectionCard';
import EmptyState from '../components/EmptyState';

/* wallet UI bits (UI-only) */
import WalletHeader from '../components/WalletHeader';
import GroupScroller, { GroupChip } from '../components/GroupScroller';
import StatCard from '../components/StatCard';
import ActionPanel from '../components/ActionPanel';

/* Step 5: skeleton loaders */
import WalletStatsSkeleton from '../components/WalletStatsSkeleton';
import ActionPanelSkeleton from '../components/ActionPanelSkeleton';
import TxnListSkeleton from '../components/TxnListSkeleton';

/* Step 6: micro-polish — toasts */
import { ToastContainer, ToastItem } from '../components/Toast';

type TxnItem = {
  id: string;
  ts: number;
  label: string;
  amount: number;
};

export default function WalletPage() {
  // --- Mock UI state (replace with real data later) ---
  const [groups, setGroups] = React.useState<GroupChip[]>([
    { id: 'g1', name: 'The Squad', sportTag: 'NBA', membersCount: 8, winRatePct: 68, active: true },
    { id: 'g2', name: 'Sunday Funday', sportTag: 'NFL', membersCount: 6, winRatePct: 74 },
    { id: 'g3', name: 'Office Heroes', sportTag: 'NBA', membersCount: 12, winRatePct: 61 },
    { id: 'g4', name: 'March Madness Crew', sportTag: 'NCAA', membersCount: 14, winRatePct: 59 },
    { id: 'g5', name: 'Hockey Night Squad', sportTag: 'NHL', membersCount: 7, winRatePct: 65 },
  ]);
  const [selectedId, setSelectedId] = React.useState('g1');
  const selected = groups.find(g => g.id === selectedId)?.name ?? '—';

  // Step 5: UI-only loading flags
  const [loadingSummary, setLoadingSummary] = React.useState<boolean>(false);
  const [loadingTxns, setLoadingTxns] = React.useState<boolean>(false);

  // Mocked wallet summary values (UI-only)
  const [summary, setSummary] = React.useState({
    current: 75,
    available: 50,
    pending: 25,
  });

  // Mocked transactions (UI-only)
  const [txns, setTxns] = React.useState<TxnItem[]>([
    { id: 't1', ts: Date.now() - 1000 * 60 * 60, label: 'Deposit', amount: +50.0 },
    { id: 't2', ts: Date.now() - 1000 * 60 * 60 * 4, label: 'Bet placed', amount: -20.0 },
    { id: 't3', ts: Date.now() - 1000 * 60 * 60 * 28, label: 'Winnings', amount: +15.0 },
  ]);

  // Step 6: Toasts (micro-polish)
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  function pushToast(text: string, tone: ToastItem['tone'] = 'info') {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, text, tone }]);
    // auto-hide
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2400);
  }
  function closeToast(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  // Simulate loading when group changes (UI-only)
  React.useEffect(() => {
    setLoadingSummary(true);
    setLoadingTxns(true);

    const t1 = setTimeout(() => {
      setSummary({ current: 75, available: 50, pending: 25 });
      setLoadingSummary(false);
    }, 700);

    const t2 = setTimeout(() => {
      setTxns(prev => prev);
      setLoadingTxns(false);
    }, 900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [selectedId]);

  function selectGroup(id: string) {
    setGroups(prev => prev.map(x => ({ ...x, active: x.id === id })));
    setSelectedId(id);
    pushToast(`Switched to "${groups.find(g => g.id === id)?.name ?? 'group'}"`, 'info');
  }

  // Keyboard shortcuts: R to refresh, G to focus group strip (UI-only hint)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (typing) return;

      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleRefresh();
      } else if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        pushToast('Tip: Click a chip to switch groups.', 'info');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function handleRefresh() {
    // UI-only refresh: show skeletons briefly
    setLoadingSummary(true);
    setLoadingTxns(true);
    setTimeout(() => setLoadingSummary(false), 600);
    setTimeout(() => setLoadingTxns(false), 800);
    pushToast('Wallet refreshed (UI-only)', 'success');
  }

  // Action handlers (UI-only): show toasts so the page feels responsive
  function handleDeposit() {
    pushToast('Deposit submitted (UI-only)', 'success');
  }
  function handleWithdraw() {
    pushToast('Withdraw submitted (UI-only)', 'info');
  }

  const main = (
    <>
      <WalletHeader
        onRefresh={handleRefresh}
        rightSlot={
          <span style={{ fontSize: 12, color: 'var(--fb-muted)' }}>
            Selected: <b>{selected}</b>
          </span>
        }
      />

      {/* Select Group strip */}
      <div style={{ marginBottom: 8 }}>
        <SectionCard title="Select Group">
          <GroupScroller groups={groups} onSelect={selectGroup} />
        </SectionCard>
      </div>

      {/* Big stats row (with skeleton) */}
      <div className="fb-wallet-stats-grid" style={{ marginBottom: 8 }}>
        {loadingSummary ? (
          <WalletStatsSkeleton />
        ) : (
          <>
            <StatCard title="Current Balance" value={`$${summary.current.toFixed(2)}`} sub="Total in wallet" />
            <StatCard title="Available Balance" value={`$${summary.available.toFixed(2)}`} sub="Ready to bet" tone="success" />
            <StatCard title="Pending Bets" value={`$${summary.pending.toFixed(2)}`} sub="In active bets" tone="warning" />
          </>
        )}
      </div>

      {/* Actions (with skeleton) */}
      <div className="fb-wallet-actions-grid">
        {loadingSummary ? (
          <ActionPanelSkeleton />
        ) : (
          <>
            <ActionPanel
              title="Add Funds"
              helper={`Deposit money to ${selected}`}
              presets={[25, 50, 100]}
              ctaLabel="+ Deposit $0"
              onSubmit={handleDeposit}
            />
            <ActionPanel
              title="Withdraw Funds"
              helper={`Transfer money out of ${selected}`}
              balanceHint={`Available: $${summary.available.toFixed(2)}`}
              ctaLabel="— Withdraw $0"
              ctaTone="ghost"
              onSubmit={handleWithdraw}
            />
          </>
        )}
      </div>

      {/* Transactions (with skeleton + empty state + simple inline list) */}
      <div style={{ marginTop: 8 }}>
        <SectionCard title="Transactions">
          {loadingTxns ? (
            <TxnListSkeleton rows={4} />
          ) : txns.length === 0 ? (
            <EmptyState
              title="No recent transactions"
              text="Your deposits, withdrawals, and bet movements will appear here."
            />
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {txns.map((t) => {
                const isCredit = t.amount >= 0;
                return (
                  <div
                    key={t.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      border: '1px solid var(--fb-border)',
                      background: 'var(--fb-surface)',
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div style={{ fontWeight: 600, color: 'var(--fb-text)' }}>{t.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--fb-muted)' }}>
                        {new Date(t.ts).toLocaleString()}
                      </div>
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: isCredit ? '#065f46' : '#7f1d1d',
                      }}
                    >
                      {isCredit ? '+' : '-'}${Math.abs(t.amount).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Toasts */}
      <ToastContainer items={toasts} onClose={closeToast} />
    </>
  );

  const right = (
    <RightRail>
      <SectionCard title="Quick Tip">
        <div style={{ color: 'var(--fb-text)' }}>
          Create your group and share the invite code with friends to get started.
        </div>
      </SectionCard>
    </RightRail>
  );

  return <TwoColumn main={main} right={right} />;
}
