import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGroup } from '../context/GroupContext';
import { listMyGroups, GroupResponse } from '../api/group';
import {
  getMyBalance,
  deposit as depositFunds,
  getTransactions,
  getPendingBets,
  WalletTransactionResponse,
} from '../api/wallet';
import Modal from '../components/Modal';
import { ToastContainer, ToastItem } from '../components/Toast';
import '../styles/ui.css';

export default function WalletPage() {
  const { user } = useAuth();
  const { groupId, setGroupId } = useGroup();
  const userId = user?.id ?? '';

  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [selectedId, setSelectedId] = useState(groupId ?? '');
  const [balance, setBalance] = useState(0);
  const [pending, setPending] = useState(0);
  const [txns, setTxns] = useState<WalletTransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // deposit / withdraw modals
  const [modalType, setModalType] = useState<'deposit' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id);
        setGroupId(data[0].id);
      }
      setLoading(false);
    });
  }, [userId]);

  function selectGroup(id: string) {
    setSelectedId(id);
    setGroupId(id);
  }

  // fetch wallet data
  const fetchWallet = useCallback(async () => {
    if (!selectedId || !userId) return;
    try {
      const [bal, pend, tx] = await Promise.all([
        getMyBalance(selectedId, userId),
        getPendingBets(selectedId),
        getTransactions(selectedId),
      ]);
      setBalance(bal);
      setPending(pend);
      setTxns(tx);
    } catch {
      toast('Failed to load wallet', 'error');
    }
  }, [selectedId, userId]);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  // submit deposit or withdraw
  async function handleSubmit() {
    const cents = Math.round((Number(amount) || 0) * 100);
    if (cents <= 0 || !selectedId || !userId) return;
    const actualCents = modalType === 'withdraw' ? -cents : cents;
    try {
      setSubmitting(true);
      await depositFunds(selectedId, userId, actualCents);
      toast(modalType === 'withdraw' ? 'Withdrawal complete' : 'Deposit complete', 'success');
      setModalType(null);
      setAmount('');
      await fetchWallet();
    } catch (e: any) {
      toast(e?.response?.data || 'Transaction failed', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const parsedAmount = Number(amount) || 0;
  const isWithdraw = modalType === 'withdraw';
  const invalid = parsedAmount <= 0 || (isWithdraw && parsedAmount * 100 > balance);

  const TXN_LABELS: Record<string, string> = {
    DEPOSIT: 'Deposit',
    WITHDRAWAL: 'Withdrawal',
    BET_PROPOSE: 'Bet placed',
    BET_ACCEPT: 'Bet accepted',
    BET_WIN: 'Winnings',
    BET_REFUND: 'Refund',
  };

  if (loading) return <div style={{ color: 'var(--fb-muted)', padding: 40, textAlign: 'center' }}>Loading…</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: 'var(--fb-text)', margin: 0, fontSize: 22, fontWeight: 700 }}>Wallet</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="fb-btn fb-btn--ghost fb-btn--sm" onClick={() => { setAmount(''); setModalType('withdraw'); }}>
            Withdraw
          </button>
          <button className="fb-btn fb-btn--primary fb-btn--sm" onClick={() => { setAmount(''); setModalType('deposit'); }}>
            Deposit
          </button>
        </div>
      </div>

      {/* Group selector */}
      {groups.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {groups.map((g) => (
            <button
              key={g.id}
              className={`fb-btn fb-btn--sm ${g.id === selectedId ? 'fb-btn--primary' : 'fb-btn--ghost'}`}
              onClick={() => selectGroup(g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {!selectedId ? (
        <div className="fb-glass" style={{ padding: 40, textAlign: 'center', color: 'var(--fb-muted)' }}>
          Join a group to start using your wallet.
        </div>
      ) : (
        <>
          {/* Balance cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            <div className="fb-glass" style={{ padding: 16, borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--fb-muted)', marginBottom: 4 }}>Balance</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--fb-text)' }}>
                ${(balance / 100).toFixed(2)}
              </div>
            </div>
            <div className="fb-glass" style={{ padding: 16, borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--fb-muted)', marginBottom: 4 }}>Available</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--fb-accent)' }}>
                ${((balance - pending) / 100).toFixed(2)}
              </div>
            </div>
            <div className="fb-glass" style={{ padding: 16, borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--fb-muted)', marginBottom: 4 }}>In Bets</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>
                ${(pending / 100).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div className="fb-glass" style={{ borderRadius: 12 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 700, color: 'var(--fb-text)', fontSize: 15 }}>
              Transactions
            </div>
            {txns.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--fb-muted)', fontSize: 13 }}>
                No transactions yet
              </div>
            ) : (
              <div>
                {txns.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, color: 'var(--fb-text)' }}>
                        {TXN_LABELS[tx.transactionType] ?? tx.transactionType}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fb-muted)' }}>
                        {new Date(tx.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: tx.amountCents >= 0 ? 'var(--fb-accent)' : '#ef4444',
                    }}>
                      {tx.amountCents >= 0 ? '+' : ''}${(tx.amountCents / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Deposit / Withdraw modal */}
      <Modal
        open={modalType !== null}
        title={isWithdraw ? 'Withdraw' : 'Deposit'}
        onClose={() => setModalType(null)}
        width={380}
        footer={
          <>
            <button className="fb-btn fb-btn--ghost fb-btn--md" onClick={() => setModalType(null)}>Cancel</button>
            <button
              className="fb-btn fb-btn--primary fb-btn--md"
              onClick={handleSubmit}
              disabled={invalid || submitting}
            >
              {submitting ? 'Processing…' : 'Confirm'}
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', color: 'var(--fb-text)', fontSize: 13, marginBottom: 6 }}>
            Amount ($)
          </label>
          <input
            className="fb-input"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && !invalid && handleSubmit()}
          />
        </div>
        {isWithdraw && parsedAmount * 100 > balance && (
          <div style={{ color: '#ef4444', fontSize: 12 }}>Exceeds available balance</div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {[25, 50, 100].map((v) => (
            <button key={v} className="fb-btn fb-btn--ghost fb-btn--sm" onClick={() => setAmount(String(v))}>
              ${v}
            </button>
          ))}
        </div>
      </Modal>

      <ToastContainer items={toasts} onClose={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}
