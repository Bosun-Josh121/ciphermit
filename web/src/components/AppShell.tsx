import {
  createContext, useContext, useEffect, useState,
  type ReactNode,
} from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutGrid, Wallet, Zap, Users, ScanEye, Activity as ActivityIcon,
  LogOut, Lock, ShieldCheck, ChevronRight, Menu, X, Loader2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '../lib/walletContext'
import { WALLET_IDS } from '../lib/wallet'
import { NETWORK } from '../lib/config'
import { Button } from './ui/Button'

function truncate(a: string) { return `${a.slice(0, 5)}…${a.slice(-4)}` }

/* ── chrome context: pages register their top-bar primary action ── */
export interface HeaderAction { label: string; icon?: ReactNode; onClick: () => void }
const ChromeCtx = createContext<{ setAction: (a: HeaderAction | null) => void }>({ setAction: () => {} })

export function useHeaderAction(action: HeaderAction | null, deps: unknown[]) {
  const { setAction } = useContext(ChromeCtx)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setAction(action); return () => setAction(null) }, deps)
}

/* ── nav model ── */
const NAV = [
  { to: '/app',           label: 'Overview',  icon: LayoutGrid,    end: true  },
  { to: '/app/vaults',    label: 'Vaults',    icon: Wallet,        end: false },
  { to: '/app/authorize', label: 'Authorize', icon: Zap,           end: false },
  { to: '/app/delegates', label: 'Delegates', icon: Users,         end: false },
  { to: '/app/audit',     label: 'Audit',     icon: ScanEye,       end: false },
  { to: '/app/activity',  label: 'Activity',  icon: ActivityIcon,  end: false },
]

const META: Record<string, { title: string; subtitle: string }> = {
  '/app':           { title: 'Overview',  subtitle: 'Your private spending vaults at a glance.' },
  '/app/vaults':    { title: 'Vaults',    subtitle: 'Open, fund, and authorize spends from policy vaults.' },
  '/app/authorize': { title: 'Authorize', subtitle: 'Prove a spend is within your private rule, then release funds.' },
  '/app/delegates': { title: 'Delegates', subtitle: 'Grant revocable, capped spending authority — caps stay private.' },
  '/app/audit':     { title: 'Audit',     subtitle: 'Selectively disclose a single transaction with a view key.' },
  '/app/activity':  { title: 'Activity',  subtitle: 'Every spend, deposit, and grant from this session.' },
}
function metaFor(path: string) {
  if (path.startsWith('/app/vaults/')) return { title: 'Vault', subtitle: 'Manage this vault, its spends, and settings.' }
  return META[path] ?? META['/app']
}

/* ── sidebar ── */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { publicKey, disconnect } = useWallet()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full">
      {/* brand */}
      <Link to="/" className="flex items-center gap-2.5 px-6 h-16 shrink-0 group">
        <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/25
                        flex items-center justify-center group-hover:bg-accent/20 transition-colors">
          <Lock size={14} className="text-accent" />
        </div>
        <span className="text-[15px] font-extrabold text-tx tracking-tight group-hover:text-accent transition-colors">
          ciphermit
        </span>
      </Link>

      {/* nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(item => (
          <NavLink
            key={item.to} to={item.to} end={item.end} onClick={onNavigate}
            className={({ isActive }) => `relative flex items-center gap-3 px-3 py-2.5 rounded-xl
              text-[14px] font-medium transition-colors group
              ${isActive
                ? 'text-accent bg-accent/8'
                : 'text-tx2 hover:text-tx hover:bg-surface-2'}`}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span layoutId="nav-indicator"
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-accent" />
                )}
                <item.icon size={17} className="shrink-0" />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* identity block */}
      <div className="p-4 border-t border-border/60 shrink-0 space-y-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="mono text-[11px] text-tx3 uppercase tracking-wide">{NETWORK}</span>
        </div>
        {publicKey && (
          <div className="flex items-center gap-2.5 bg-surface-2 border border-border rounded-xl px-3 py-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
              <span className="mono text-[11px] font-extrabold text-accent">{publicKey.slice(0, 1)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="mono text-[11px] text-tx2 truncate">{truncate(publicKey)}</p>
              <p className="text-[10px] text-tx3">Connected</p>
            </div>
            <button
              onClick={async () => { await disconnect(); navigate('/') }}
              title="Disconnect"
              className="text-tx3 hover:text-reject transition-colors p-1"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── app shell ── */
export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [action, setAction] = useState<HeaderAction | null>(null)
  const [drawer, setDrawer] = useState(false)
  const meta = metaFor(location.pathname)

  // close mobile drawer on route change
  useEffect(() => { setDrawer(false) }, [location.pathname])

  return (
    <ChromeCtx.Provider value={{ setAction }}>
      <div className="min-h-dvh bg-bg text-tx flex">

        {/* ── desktop sidebar ── */}
        <aside className="hidden lg:flex w-[240px] shrink-0 flex-col
                          bg-surface/60 border-r border-border/70 sticky top-0 h-dvh">
          <SidebarContent />
        </aside>

        {/* ── mobile drawer ── */}
        <AnimatePresence>
          {drawer && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setDrawer(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              />
              <motion.aside
                initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
                transition={{ type: 'tween', duration: 0.22 }}
                className="fixed left-0 top-0 z-50 w-[260px] h-dvh bg-surface
                           border-r border-border lg:hidden shadow-[var(--shadow-float)]"
              >
                <button onClick={() => setDrawer(false)}
                  className="absolute top-5 right-4 text-tx3 hover:text-tx p-1">
                  <X size={18} />
                </button>
                <SidebarContent onNavigate={() => setDrawer(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ── main column ── */}
        <div className="flex-1 min-w-0 flex flex-col relative overflow-x-hidden">

          {/* page background depth — never a flat black void */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-40 right-[-10%] w-[600px] h-[600px] rounded-full blur-[8px]"
              style={{ background: 'radial-gradient(circle, rgba(46,230,197,0.06) 0%, transparent 65%)' }} />
            <div className="absolute bottom-[-20%] left-[-5%] w-[420px] h-[420px] rounded-full blur-[8px]"
              style={{ background: 'radial-gradient(circle, rgba(46,230,197,0.035) 0%, transparent 70%)' }} />
          </div>

          {/* top bar — inner constrained to the SAME column as content so the
              primary action always sits above content, never at a clipped edge */}
          <header className="relative z-10 shrink-0 px-6 sm:px-8 lg:px-10">
            <div className="w-full max-w-[1160px] mx-auto">
              <div className="flex items-center gap-4 h-16">
                <button onClick={() => setDrawer(true)}
                  className="lg:hidden text-tx2 hover:text-tx p-1 -ml-1">
                  <Menu size={20} />
                </button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-[19px] sm:text-[21px] font-extrabold text-tx tracking-tight leading-tight truncate">
                    {meta.title}
                  </h1>
                  <p className="text-[12px] sm:text-[13px] text-tx2 truncate hidden sm:block">{meta.subtitle}</p>
                </div>
                {action && (
                  <Button size="sm" icon={action.icon} onClick={action.onClick} className="shrink-0">
                    {action.label}
                  </Button>
                )}
              </div>
              <div className="h-px bg-border/70" />
            </div>
          </header>

          {/* content */}
          <main className="relative z-10 flex-1 px-6 sm:px-8 lg:px-10 py-8 lg:py-10">
            <div className="w-full max-w-[1160px] mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ChromeCtx.Provider>
  )
}

/* ── connect gate (kept — two-column premium) ───────────────── */
const FEATURES = [
  { icon: Lock,        title: 'Private rules',  desc: 'Limits and allowlists committed as hashes — never on-chain.' },
  { icon: Zap,         title: 'ZK proofs',      desc: 'Your device proves the spend is valid without revealing the rule.' },
  { icon: ShieldCheck, title: 'Stellar native', desc: 'Vault verification happens on Stellar Soroban, fully on-chain.' },
]
const WALLETS: { id: string; name: string; desc: string; initial: string; tag?: string }[] = [
  { id: WALLET_IDS.freighter, name: 'Freighter', desc: 'Browser extension',        initial: 'F' },
  { id: WALLET_IDS.xbull,     name: 'xBull',     desc: 'Extension or web app',      initial: 'x' },
  { id: WALLET_IDS.albedo,    name: 'Albedo',    desc: 'Web-based, no extension',   initial: 'A' },
]

export function ConnectGate({ children }: { children: ReactNode }) {
  const { publicKey, connecting, connectingId, error, connect, clearError } = useWallet()
  if (publicKey) return <>{children}</>

  return (
    <div className="min-h-dvh bg-bg text-tx grid lg:grid-cols-2">

      {/* LEFT — brand */}
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-border/60 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 20% 70%, rgba(46,230,197,0.07) 0%, transparent 60%)' }} />
        <div className="relative">
          <Link to="/" className="text-[16px] font-extrabold text-tx tracking-tight hover:text-accent transition-colors">ciphermit</Link>
        </div>
        <div className="relative space-y-8">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shadow-[var(--shadow-glow)]">
            <Lock size={24} className="text-accent" />
          </div>
          <div className="space-y-4">
            <h2 className="text-[40px] font-extrabold text-tx leading-[1.0] tracking-[-0.03em]">
              Spend by<br />permission.<br /><span className="text-accent">Reveal nothing.</span>
            </h2>
            <p className="text-[14px] text-tx2 leading-relaxed max-w-[320px]">
              A zero-knowledge vault on Stellar. Your limits, delegates, and allowlists never touch the chain.
            </p>
          </div>
          <div className="space-y-4 pt-4 border-t border-border/60">
            {FEATURES.map(f => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/15 flex items-center justify-center shrink-0 mt-0.5">
                  <f.icon size={14} className="text-accent" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-tx">{f.title}</p>
                  <p className="text-[12px] text-tx2 leading-snug mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <p className="mono text-[11px] text-tx3">Stellar testnet · hackathon prototype · Nethermind verifier</p>
        </div>
      </div>

      {/* RIGHT — connect */}
      <div className="flex items-center justify-center p-8 sm:p-12 relative"
        style={{ background: 'radial-gradient(ellipse 80% 55% at 60% 30%, rgba(46,230,197,0.05) 0%, transparent 60%)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[380px] space-y-8">
          <div className="lg:hidden space-y-1.5">
            <Link to="/" className="text-[16px] font-extrabold text-tx tracking-tight">ciphermit</Link>
            <p className="text-[13px] text-tx3">ZK spending vaults on Stellar</p>
          </div>
          <div className="space-y-2">
            <h1 className="text-[28px] font-extrabold text-tx tracking-tight">Connect wallet</h1>
            <p className="text-[14px] text-tx2 leading-relaxed">Pick a wallet to get started. Your keys stay in your browser.</p>
          </div>
          <div className="space-y-2.5">
            {WALLETS.map((w, i) => {
              const busy = connectingId === w.id
              return (
                <motion.button key={w.id} type="button" disabled={connecting} onClick={() => connect(w.id)}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                  className="w-full flex items-center gap-4 bg-surface-2 border border-border rounded-2xl px-5 py-4 text-left
                             hover:border-accent/40 hover:bg-surface-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/15 flex items-center justify-center shrink-0">
                    <span className="text-[16px] font-extrabold text-accent">{w.initial}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-bold text-tx">{w.name}</p>
                      {w.tag && <span className="text-[10px] font-bold text-accent bg-accent/10 border border-accent/20 rounded-full px-2 py-0.5">{w.tag}</span>}
                    </div>
                    <p className="text-[12px] text-tx3">{w.desc}</p>
                  </div>
                  {busy
                    ? <Loader2 size={16} className="text-accent animate-spin shrink-0" />
                    : <ChevronRight size={16} className="text-border-s shrink-0" />}
                </motion.button>
              )
            })}
          </div>
          <div className="space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 bg-reject/8 border border-reject/25 rounded-xl px-4 py-3">
                <p className="text-[12px] text-reject leading-snug flex-1">{error}</p>
                <button onClick={clearError} className="text-reject/60 hover:text-reject shrink-0 -mt-0.5"><X size={13} /></button>
              </div>
            )}
            <button onClick={() => connect()} disabled={connecting}
              className="w-full text-center text-[12px] text-tx3 hover:text-tx transition-colors disabled:opacity-50">
              Or choose from all wallets →
            </button>
            <p className="text-center text-[12px] text-tx3 leading-relaxed">
              Your keys never leave your browser.{' '}
              <Link to="/" className="text-accent hover:underline">← Back to overview</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
