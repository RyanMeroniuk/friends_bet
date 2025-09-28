// frontend/src/Pages/WalletPage.tsx
import React from 'react';

/* layout + shared UI */
import TwoColumn from '../components/TwoColumn';
import RightRail from '../components/RightRail';
import SectionCard from '../components/SectionCard';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Input from '../components/Input';

/* wallet UI bits (UI-only) */
import WalletHeader from '../components/WalletHeader';
import GroupScroller, { GroupChip } from '../components/GroupScroller';
import StatCard from '../components/StatCard';
import ActionPanel from '../components/ActionPanel';

/* skeleton loaders */
import WalletStatsSkeleton from '../components/WalletStatsSkeleton';
import ActionPanelSkeleton from '../components/ActionPanelSkeleton';
import TxnListSkeleton from '../components/TxnListSkeleton';

/* toasts */
import { ToastContainer, ToastItem } from '../components/Toast';

/* right-rail info cards */
import FundingTipsCard from '../components/FundingTipsCard';
import WalletSecurityCard from '../components/WalletSecurityCard';

/* real data hooks in scope already */
import { useAuth } from '../context/AuthContext';
import { useGroup } from '../context/GroupContext';
import { listMyGroups, GroupResponse } from '../api/group';

type TxnItem = {
  id: string;
  ts: number;
  label: string;   // "Deposit" | "Withdraw" | "Bet placed" | "Winnings" | etc
  amount: number;  // +credit / -debit
};

type TxnFilter = 'all' | 'deposits' | 'withdrawals' | 'bets';

const LS_SELECTED_GROUP = 'wallet_selected_group';

export default function WalletPage() {
  const { user } = useAuth();
  const { groupId, setGroupId } = useGroup();
  const currentUserId = user?.id ?? '';

  // === Groups: real list + selection persistence ===
  const [groups, setGroups] = React.useState<GroupChip[]>([]);
  const [groupsLoading, setGroupsLoading] = React.useState<boolean>(false);

  // remember last selection locally (without changing global context if not needed yet)
  React.useEffect(() => {
    const saved = localStorage.getItem(LS_SELECTED_GROUP);
    if (saved && !groupId) {
      // defer to context once groups load; we’ll use this as a hint
      // (we don’t setGroupId yet because groups may not include it)
    }
  }, [groupId]);

  React.useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;

    (async () => {
      try {
        setGroupsLoading(true);
        const mine: GroupResponse[] = await listMyGroups(currentUserId);

        const mapped: GroupChip[] = mine.map((g) => ({
          id: g.id,
          name: g.name ?? 'Untitled Group',
          sportTag: undefined,
          membersCount: undefined,
          winRatePct: undefined,
          active: false,
        }));

        // choose active group: 1) context, 2) last saved, 3) first
        const saved = localStorage.getItem(LS_SELECTED_GROUP);
        const preferId = groupId || saved || mine[0]?.id || '';

        if (!cancelled) {
          setGroups(
            mapped.map((x) => ({ ...x, active: x.id === preferId }))
          );
          if (preferId && preferId !== groupId) setGroupId(preferId);
        }
      } catch (err) {
        console.error('Failed to load groups for wallet page:', err);
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, groupId, setGroupId]);

  const selectedId = groupId ?? (groups.find((g) => g.active)?.id ?? '');
  const selectedName = groups.find((g) => g.id === selectedId)?.name ?? '—';

  function selectGroup(id: string) {
    setGroups((prev) => prev.map((x) => ({ ...x, active: x.id === id })));
    setGroupId(id);
    localStorage.setItem(LS_SELECTED_GROUP, id);
    pushToast(`Switched to "${groups.find((g) => g.id === id)?.name ?? 'group'}"`, 'info');
  }

  // === Wallet summary + txns (UI-only placeholders for now) ===
  const [loadingSummary, setLoadingSummary] = React.useState<boolean>(false);
  const [loadingTxns, setLoadingTxns] = React.useState<boolean>(false);

  const [summary, setSummary] = React.useState({
    current: 75,
    available: 50,
    pending: 25,
  });

  const [txns, setTxns] = React.useState<TxnItem[]>([
    { id: 't1', ts: Date.now() - 1000 * 60 * 40, label: 'Deposit',    amount: +50.0 },
    { id: 't2', ts: Date.now() - 1000 * 60 * 160, label: 'Bet placed', amount: -20.0 },
    { id: 't3', ts: Date.now() - 1000 * 60 * 60 * 28, label: 'Winnings', amount: +15.0 },
    { id: 't4', ts: Date.now() - 1000 * 60 * 10, label: 'Withdraw',   amount: -5.0 },
  ]);

  // Toasts
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  function pushToast(text: string, tone: ToastItem['tone'] = 'info') {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2400);
  }
  function closeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // last refreshed + shortcuts
  const [lastRefreshed, setLastRefreshed] = React.useState<number>(Date.now());
  const groupStripRef = React.useRef<HTMLDivElement | null>(null);

  // Confirmation modals + editable amounts with validation
  const [depositOpen, setDepositOpen] = React.useState(false);
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  const [amount, setAmount] = React.useState<string>('25'); // editable field
  const parsedAmount = Number(amount) || 0;
  const withdrawInvalid = parsedAmount <= 0 || parsedAmount > summary.available;
  const depositInvalid = parsedAmount <= 0;

  // Filters + search
  const [txnFilter, setTxnFilter] = React.useState<TxnFilter>('all');
  const [txnSearch, setTxnSearch] = React.useState<string>('');

  const filteredTxns = React.useMemo(() => {
    let arr = [...txns];

    if (txnFilter === 'deposits') {
      arr = arr.filter((t) => t.label.toLowerCase().includes('deposit') || t.amount > 0);
    } else if (txnFilter === 'withdrawals') {
      arr = arr.filter(
        (t) => t.label.toLowerCase().includes('withdraw') || (t.amount < 0 && !t.label.toLowerCase().includes('bet')),
      );
    } else if (txnFilter === 'bets') {
      arr = arr.filter((t) => t.label.toLowerCase().includes('bet'));
    }

    const q = txnSearch.trim().toLowerCase();
    if (q) arr = arr.filter((t) => t.label.toLowerCase().includes(q));

    arr.sort((a, b) => b.ts - a.ts);
    return arr;
  }, [txns, txnFilter, txnSearch]);

  // Simulated refresh on group change (until wallet endpoints are available)
  React.useEffect(() => {
    if (!selectedId) return;

    setLoadingSummary(true);
    setLoadingTxns(true);

    const t1 = setTimeout(() => {
      setSummary({ current: 75, available: 50, pending: 25 });
      setLoadingSummary(false);
      setLastRefreshed(Date.now());
    }, 700);

    const t2 = setTimeout(() => {
      setTxns((prev) => prev);
      setLoadingTxns(false);
    }, 900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [selectedId]);

  function handleRefresh() {
    setLoadingSummary(true);
    setLoadingTxns(true);
    setTimeout(() => {
      setLoadingSummary(false);
      setLastRefreshed(Date.now());
    }, 600);
    setTimeout(() => setLoadingTxns(false), 800);
    pushToast('Wallet refreshed', 'success');
  }

  function handleDeposit() {
    setAmount('25');
    setDepositOpen(true);
  }
  function handleWithdraw() {
    setAmount('20');
    setWithdrawOpen(true);
  }

  function confirmDeposit() {
    if (depositInvalid) return;
    setDepositOpen(false);
    pushToast(`Deposited $${parsedAmount.toFixed(2)} to ${selectedName}`, 'success');
    // Future: call deposit API then refresh
  }
  function confirmWithdraw() {
    if (withdrawInvalid) return;
    setWithdrawOpen(false);
    pushToast(`Withdrew $${parsedAmount.toFixed(2)} from ${selectedName}`, 'info');
    // Future: call withdraw API then refresh
  }

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          (target as any).isContentEditable);
      if (isTyping) return;

      const k = e.key.toLowerCase();
      if (k === 'r') {
        e.preventDefault();
        handleRefresh();
      } else if (k === 'g') {
        e.preventDefault();
        groupStripRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const main = (
    <>
      <WalletHeader
        onRefresh={handleRefresh}
        rightSlot={
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--fb-muted)' }}>
              Selected: <b>{selectedName}</b>
            </span>
            <span className="fb-meta-row" style={{ gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--fb-muted)' }}>
                Last refreshed {new Date(lastRefreshed).toLocaleTimeString()}
              </span>
              <span style={{ fontSize: 12, color: 'var(--fb-muted)' }}>•</span>
              <span style={{ fontSize: 12, color: 'var(--fb-muted)' }}>
                Shortcuts: <kbd>R</kbd> refresh, <kbd>G</kbd> groups
              </span>
            </span>
          </div>
        }
      />

      {/* Select Group strip */}
      <div style={{ marginBottom: 8 }}>
        <SectionCard title="Select Group">
          <div
            ref={groupStripRef}
            tabIndex={0}
            aria-label="Group selector"
            style={{ outline: 'none' }}
          >
            {groupsLoading ? (
              <div style={{ color: 'var(--fb-muted)' }}>Loading your groups…</div>
            ) : groups.length === 0 ? (
              <EmptyState
                title="No groups yet"
                text="Create or join a group from the Groups page."
              />
            ) : (
              <GroupScroller groups={groups} onSelect={selectGroup} />
            )}
          </div>

          {/* tiny meta helper row */}
          <div className="fb-meta-row" style={{ marginTop: 8 }}>
            <span>Tip: press <kbd>G</kbd> to jump here.</span>
          </div>
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
              helper={`Deposit money to ${selectedName}`}
              presets={[25, 50, 100]}
              ctaLabel="+ Deposit $0"
              onSubmit={handleDeposit}
            />
            <ActionPanel
              title="Withdraw Funds"
              helper={`Transfer money out of ${selectedName}`}
              balanceHint={`Available: $${summary.available.toFixed(2)}`}
              ctaLabel="— Withdraw $0"
              ctaTone="ghost"
              onSubmit={handleWithdraw}
            />
          </>
        )}
      </div>

      {/* Transactions */}
      <div style={{ marginTop: 8 }}>
        <SectionCard title="Transactions">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              <Button
                variant={txnFilter === 'all' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTxnFilter('all')}
                className="fb-btn--field"
                aria-pressed={txnFilter === 'all'}
              >
                All
              </Button>
              <Button
                variant={txnFilter === 'deposits' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTxnFilter('deposits')}
                className="fb-btn--field"
                aria-pressed={txnFilter === 'deposits'}
              >
                Deposits
              </Button>
              <Button
                variant={txnFilter === 'withdrawals' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTxnFilter('withdrawals')}
                className="fb-btn--field"
                aria-pressed={txnFilter === 'withdrawals'}
              >
                Withdrawals
              </Button>
              <Button
                variant={txnFilter === 'bets' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTxnFilter('bets')}
                className="fb-btn--field"
                aria-pressed={txnFilter === 'bets'}
              >
                Bets
              </Button>
            </div>

            <div style={{ flex: 1 }} />

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 240, minWidth: 180 }}>
                <Input
                  placeholder="Search transactions…"
                  value={txnSearch}
                  onChange={(e) => setTxnSearch(e.target.value)}
                  aria-label="Search transactions"
                />
              </div>
              {(txnSearch || txnFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTxnSearch('');
                    setTxnFilter('all');
                  }}
                  className="fb-btn--field"
                  aria-label="Reset filters"
                  title="Reset filters"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {loadingTxns ? (
            <TxnListSkeleton rows={4} />
          ) : filteredTxns.length === 0 ? (
            <EmptyState
              title="No matching transactions"
              text="Try clearing filters or search."
              actionText={txnSearch || txnFilter !== 'all' ? 'Reset' : undefined}
              onAction={
                txnSearch || txnFilter !== 'all'
                  ? () => {
                      setTxnSearch('');
                      setTxnFilter('all');
                    }
                  : undefined
              }
            />
          ) : (
            <>
              <div className="fb-meta-row" style={{ marginBottom: 8 }}>
                <span>
                  Showing {filteredTxns.length} of {txns.length} • Most recent first.
                </span>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {filteredTxns.map((t) => {
                  const isCredit = t.amount >= 0;
                  return (
                    <div
                      key={t.id}
                      role="listitem"
                      aria-label={`${t.label} ${isCredit ? 'credit' : 'debit'} ${Math.abs(t.amount).toFixed(2)}`}
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
            </>
          )}
        </SectionCard>
      </div>

      {/* Deposit Modal (editable amount + inline validation) */}
      <Modal
        open={depositOpen}
        title="Confirm Deposit"
        onClose={() => setDepositOpen(false)}
        footer={
          <>
            <button
              className="fb-btn fb-btn--ghost fb-btn--md"
              onClick={() => setDepositOpen(false)}
            >
              Cancel
            </button>
            <button
              className="fb-btn fb-btn--primary fb-btn--md"
              onClick={confirmDeposit}
              disabled={depositInvalid}
              title={depositInvalid ? 'Enter an amount greater than $0' : undefined}
            >
              Confirm
            </button>
          </>
        }
      >
        <div className="fb-ff">
          <div className="fb-ff__helper">
            You’re about to deposit funds into <b>{selectedName}</b>.
          </div>

          <label className="fb-ff__label" htmlFor="deposit-amt">Amount</label>
          <Input
            id="deposit-amt"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={depositInvalid}
          />
          {depositInvalid && (
            <div className="fb-ff__error">Please enter an amount greater than $0.00.</div>
          )}

          <div className="fb-kv" style={{ marginTop: 8 }}>
            <div className="fb-kv__row">
              <span className="fb-kv__label">New current balance</span>
              <span className="fb-kv__value">
                ${(summary.current + Math.max(0, parsedAmount)).toFixed(2)} (preview)
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Withdraw Modal (editable amount + inline validation) */}
      <Modal
        open={withdrawOpen}
        title="Confirm Withdrawal"
        onClose={() => setWithdrawOpen(false)}
        footer={
          <>
            <button
              className="fb-btn fb-btn--ghost fb-btn--md"
              onClick={() => setWithdrawOpen(false)}
            >
              Cancel
            </button>
            <button
              className="fb-btn fb-btn--primary fb-btn--md"
              onClick={confirmWithdraw}
              disabled={withdrawInvalid}
              title={
                withdrawInvalid
                  ? parsedAmount <= 0
                    ? 'Enter an amount greater than $0'
                    : 'Amount exceeds available balance'
                  : undefined
              }
            >
              Confirm
            </button>
          </>
        }
      >
        <div className="fb-ff">
          <div className="fb-ff__helper">
            You’re about to withdraw from <b>{selectedName}</b>.
          </div>

          <label className="fb-ff__label" htmlFor="withdraw-amt">Amount</label>
          <Input
            id="withdraw-amt"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={withdrawInvalid}
          />
          {withdrawInvalid && (
            <div className="fb-ff__error">
              {parsedAmount <= 0
                ? 'Please enter an amount greater than $0.00.'
                : 'Amount exceeds available balance.'}
            </div>
          )}

          <div className="fb-kv" style={{ marginTop: 8 }}>
            <div className="fb-kv__row">
              <span className="fb-kv__label">Available after</span>
              <span className="fb-kv__value">
                ${(Math.max(0, summary.available - Math.max(0, parsedAmount))).toFixed(2)} (preview)
              </span>
            </div>
          </div>
        </div>
      </Modal>

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

      <FundingTipsCard />
      <WalletSecurityCard />
    </RightRail>
  );

  return <TwoColumn main={main} right={right} />;
}
