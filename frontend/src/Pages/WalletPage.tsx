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

/* right-rail info cards */


/* real data hooks in scope already */
import { useAuth } from '../context/AuthContext';
import { useGroup } from '../context/GroupContext';
import { listMyGroups, GroupResponse } from '../api/group';
import { getMyBalance, deposit as depositFunds, getTransactions, getPendingBets, WalletTransactionResponse } from '../api/wallet';

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
      let mine: GroupResponse[] = [];
      try {
        setGroupsLoading(true);
        mine = await listMyGroups(currentUserId);

        const mapped: GroupChip[] = mine.map((g) => ({
          id: g.id,
          name: g.name ?? 'Untitled Group',
          sportTag: undefined,
          membersCount: undefined,
          winRatePct: undefined,
          balanceCents: undefined,
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

      if (cancelled || mine.length === 0) return;

      try {
        const balanceEntries = await Promise.all(
          mine.map(async (g: GroupResponse) => {
            try {
              const cents = await getMyBalance(g.id, currentUserId);
              return [g.id, cents] as const;
            } catch (err) {
              console.error('Failed to load balance for group', g.id, err);
              return [g.id, null] as const;
            }
          })
        );

        if (cancelled) return;

        const balanceMap = new Map<string, number>();
        balanceEntries.forEach(([id, cents]) => {
          if (typeof cents === 'number') balanceMap.set(id, cents);
        });

        if (!cancelled) {
          setGroups((prev) =>
            prev.map((chip) =>
              balanceMap.has(chip.id)
                ? { ...chip, balanceCents: balanceMap.get(chip.id)! }
                : chip
            )
          );
        }
      } catch (err) {
        console.error('Failed to load group balances:', err);
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
  }

  // === Wallet summary + txns (UI-only placeholders for now) ===
  const [loadingSummary, setLoadingSummary] = React.useState<boolean>(false);
  const [loadingTxns, setLoadingTxns] = React.useState<boolean>(false);

  const [summary, setSummary] = React.useState({
    current: 0,
    available: 0,
    pending: 0,
  });

  const [txns, setTxns] = React.useState<TxnItem[]>([]);

  // last refreshed + shortcuts
  const [lastRefreshed, setLastRefreshed] = React.useState<number>(Date.now());
  const groupStripRef = React.useRef<HTMLDivElement | null>(null);

  // Confirmation modals + editable amounts with validation
  const [depositOpen, setDepositOpen] = React.useState(false);
  const [amount, setAmount] = React.useState<string>('25'); // editable field
  const [depositSubmitting, setDepositSubmitting] = React.useState(false);
  const parsedAmount = Number(amount) || 0;
  const parsedAmountCents = Math.round(parsedAmount * 100);
  const depositInvalid = parsedAmount <= 0 || parsedAmountCents <= 0 || !selectedId || !currentUserId;
  const depositDisabledReason = !selectedId
    ? 'Select a group before depositing'
    : !currentUserId
    ? 'Sign in to deposit funds'
    : parsedAmount <= 0 || parsedAmountCents <= 0
    ? 'Enter an amount greater than $0'
    : undefined;

  // Withdrawal modal state (mirrors deposit)
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  const [withdrawAmount, setWithdrawAmount] = React.useState<string>('25');
  const [withdrawSubmitting, setWithdrawSubmitting] = React.useState(false);
  const parsedWithdraw = Number(withdrawAmount) || 0;
  const parsedWithdrawCents = Math.round(parsedWithdraw * 100);
  const withdrawInvalid = parsedWithdraw <= 0 || parsedWithdrawCents <= 0 || !selectedId || !currentUserId || parsedWithdraw > summary.current;
  const withdrawDisabledReason = !selectedId
    ? 'Select a group first'
    : !currentUserId
    ? 'Sign in to withdraw funds'
    : parsedWithdraw <= 0
    ? 'Enter an amount greater than $0'
    : parsedWithdraw > summary.current
    ? 'Insufficient balance'
    : undefined;

  function handleWithdraw(amountCents: number) {
    if (amountCents <= 0) return;
    setWithdrawAmount((amountCents / 100).toString());
    setWithdrawOpen(true);
  }

  async function confirmWithdraw() {
    if (withdrawInvalid || withdrawSubmitting || !selectedId || !currentUserId) return;
    try {
      setWithdrawSubmitting(true);
      const amountCents = Math.max(0, parsedWithdrawCents);
      if (amountCents <= 0) return;
      const resp = await depositFunds(selectedId, currentUserId, -amountCents);
      const updatedBalance = resp.balanceCents / 100;
      setSummary((prev) => ({ current: updatedBalance, available: updatedBalance, pending: prev.pending }));
      setGroups((prev) =>
        prev.map((chip) =>
          chip.id === selectedId ? { ...chip, balanceCents: resp.balanceCents } : chip
        )
      );
      setLastRefreshed(Date.now());
      void fetchTransactions();
      setWithdrawOpen(false);
      setWithdrawAmount('');
    } catch (err) {
      console.error('Failed to withdraw funds:', err);
    } finally {
      setWithdrawSubmitting(false);
    }
  }

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

  const txnLabelMap: Record<string, string> = {
    DEPOSIT: 'Deposit',
    WITHDRAWAL: 'Withdrawal',
    BET_PROPOSE: 'Bet placed',
    BET_ACCEPT: 'Bet accepted',
    BET_WIN: 'Winnings',
    BET_REFUND: 'Bet refund',
  };

  function mapTxn(tx: WalletTransactionResponse): TxnItem {
    return {
      id: tx.id,
      ts: new Date(tx.createdAt).getTime(),
      label: txnLabelMap[tx.transactionType] ?? tx.transactionType,
      amount: tx.amountCents / 100,
    };
  }

  const fetchTransactions = React.useCallback(async () => {
    if (!selectedId) return;
    setLoadingTxns(true);
    try {
      const rawTxns = await getTransactions(selectedId);
      setTxns(rawTxns.map(mapTxn));
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoadingTxns(false);
    }
  }, [selectedId]);

  const fetchSummary = React.useCallback(async () => {
    if (!selectedId || !currentUserId) return false;

    setLoadingSummary(true);
    try {
      const [balanceCents, pendingCents] = await Promise.all([
        getMyBalance(selectedId, currentUserId),
        getPendingBets(selectedId),
      ]);
      const balanceDollars = balanceCents / 100;
      const pendingDollars = pendingCents / 100;
      setSummary({
        current: balanceDollars,
        available: balanceDollars,
        pending: pendingDollars,
      });
      setGroups((prev) =>
        prev.map((chip) =>
          chip.id === selectedId ? { ...chip, balanceCents } : chip
        )
      );
      setLastRefreshed(Date.now());
      return true;
    } catch (err) {
      console.error('Failed to load wallet summary:', err);
      return false;
    } finally {
      setLoadingSummary(false);
    }
  }, [selectedId, currentUserId]);

  React.useEffect(() => {
    if (!selectedId || !currentUserId) return;
    void fetchSummary();
    void fetchTransactions();
  }, [fetchSummary, fetchTransactions, selectedId, currentUserId]);

  const handleRefresh = React.useCallback(() => {
    if (!selectedId || !currentUserId) return;
    void fetchSummary();
  }, [currentUserId, fetchSummary, selectedId]);

  function handleDeposit(amountCents: number) {
    if (amountCents <= 0) return;
    setAmount((amountCents / 100).toString());
    setDepositOpen(true);
  }
  async function confirmDeposit() {
    if (depositInvalid || depositSubmitting || !selectedId || !currentUserId) return;

    try {
      setDepositSubmitting(true);
      const amountCents = Math.max(0, parsedAmountCents);
      const amountDollars = amountCents / 100;
      if (amountCents <= 0) {
        return;
      }
      const resp = await depositFunds(selectedId, currentUserId, amountCents);
      const updatedBalance = resp.balanceCents / 100;

      setSummary((prev) => ({ current: updatedBalance, available: updatedBalance, pending: prev.pending }));
      setGroups((prev) =>
        prev.map((chip) =>
          chip.id === selectedId ? { ...chip, balanceCents: resp.balanceCents } : chip
        )
      );
      setLastRefreshed(Date.now());
      void fetchTransactions();

      setDepositOpen(false);
      setAmount('');
    } catch (err) {
      console.error('Failed to deposit funds:', err);
    } finally {
      setDepositSubmitting(false);
    }
  }



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
              helper={`Withdraw money from ${selectedName}`}
              balanceHint={`Available: $${summary.current.toFixed(2)}`}
              presets={[25, 50, 100]}
              ctaLabel="- Withdraw $0"
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

            <div className="fb-wallet-txn-tools">
              <div className="fb-wallet-txn-search">
                <Input
                  className="fb-wallet-txn-search__input"
                  placeholder="Search transactions…"
                  value={txnSearch}
                  onChange={(e) => setTxnSearch(e.target.value)}
                  aria-label="Search transactions"
                />
                {(txnSearch || txnFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTxnSearch('');
                      setTxnFilter('all');
                    }}
                    className="fb-btn--field fb-wallet-txn-search__reset"
                    aria-label="Reset filters"
                    title="Reset filters"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>

          {loadingTxns ? (
            <TxnListSkeleton rows={4} />
          ) : filteredTxns.length === 0 ? (
            <EmptyState
              title="No matching transactions"
              text="Try clearing filters or search."
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
              disabled={depositInvalid || depositSubmitting}
              aria-busy={depositSubmitting}
              title={
                depositInvalid
                  ? depositDisabledReason
                  : depositSubmitting
                  ? 'Processing deposit'
                  : undefined
              }
            >
              {depositSubmitting ? 'Processing…' : 'Confirm'}
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

      {/* Withdraw Modal */}
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
              disabled={withdrawInvalid || withdrawSubmitting}
              aria-busy={withdrawSubmitting}
              title={
                withdrawInvalid
                  ? withdrawDisabledReason
                  : withdrawSubmitting
                  ? 'Processing withdrawal'
                  : undefined
              }
            >
              {withdrawSubmitting ? 'Processing…' : 'Confirm'}
            </button>
          </>
        }
      >
        <div className="fb-ff">
          <div className="fb-ff__helper">
            You're about to withdraw funds from <b>{selectedName}</b>.
          </div>

          <label className="fb-ff__label" htmlFor="withdraw-amt">Amount</label>
          <Input
            id="withdraw-amt"
            type="number"
            min={0}
            max={summary.current}
            step="0.01"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            aria-invalid={withdrawInvalid}
          />
          {parsedWithdraw > summary.current && (
            <div className="fb-ff__error">Exceeds available balance of ${summary.current.toFixed(2)}.</div>
          )}
          {parsedWithdraw <= 0 && withdrawAmount !== '' && (
            <div className="fb-ff__error">Please enter an amount greater than $0.00.</div>
          )}

          <div className="fb-kv" style={{ marginTop: 8 }}>
            <div className="fb-kv__row">
              <span className="fb-kv__label">New balance</span>
              <span className="fb-kv__value">
                ${(summary.current - Math.max(0, parsedWithdraw)).toFixed(2)} (preview)
              </span>
            </div>
          </div>
        </div>
      </Modal>
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
