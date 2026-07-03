import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Check, ExternalLink } from 'lucide-react'
import { StatusChip } from './ui/StatusChip'
import { DataRow } from './ui/DataRow'
import type { ProofStage } from '../types/vault'

interface Props {
  stage: ProofStage
  recipient: string
  amount: string
  txHash?: string
  explorerUrl?: string
  errorReason?: string
}

const LABEL: Record<ProofStage, string> = {
  idle:       '',
  building:   'Proving privately…',
  verifying:  'Verifying on Stellar…',
  authorized: 'Authorized',
  failed:     'Not authorized',
}

export function AuthorizeReceipt({ stage, recipient, amount, txHash, explorerUrl, errorReason }: Props) {
  const prefersReduced = useReducedMotion() ?? false
  const isVeiled    = stage === 'building' || stage === 'verifying'
  const isAuthorized = stage === 'authorized'
  const isFailed     = stage === 'failed'

  // elapsed timer during proving/verifying, for anticipation
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!isVeiled) { setElapsed(0); return }
    const start = Date.now()
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [isVeiled])
  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`

  const [typedHash, setTypedHash] = useState('')
  useEffect(() => {
    if (!isAuthorized || !txHash) { setTypedHash(''); return }
    if (prefersReduced) { setTypedHash(txHash); return }
    let i = 0
    const iv = setInterval(() => { i++; setTypedHash(txHash.slice(0, i)); if (i >= txHash.length) clearInterval(iv) }, 18)
    return () => clearInterval(iv)
  }, [isAuthorized, txHash, prefersReduced])

  return (
    <div className="relative">
      {/* Subtle glow orb behind the receipt when authorized */}
      <AnimatePresence>
        {isAuthorized && !prefersReduced && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute -inset-12 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, rgba(46,230,197,0.10) 0%, transparent 70%)' }}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="relative rounded-2xl border bg-surface overflow-hidden shadow-[var(--shadow-float)]"
        animate={{
          borderColor: isFailed
            ? ['rgba(244,121,107,0)', 'rgba(244,121,107,0.6)', 'rgba(244,121,107,0)']
            : isAuthorized
            ? 'rgba(46,230,197,0.30)'
            : 'rgba(35,41,56,1)',
        }}
        transition={{ duration: isFailed ? 0.6 : 0.4 }}
      >
        {/* Slim accent progress line at top */}
        {(stage === 'building' || stage === 'verifying') && (
          <motion.div
            className="absolute top-0 left-0 h-[2px] bg-accent rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: stage === 'verifying' ? '85%' : '45%' }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          />
        )}

        <div className="p-8">
          {/* Header row */}
          <div className="flex items-center justify-between mb-6">
            <AnimatePresence mode="wait">
              <motion.p
                key={stage}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-[13px] font-medium ${
                  isAuthorized ? 'text-accent' : isFailed ? 'text-reject' : 'text-tx2'
                }`}
              >
                {LABEL[stage]}
              </motion.p>
            </AnimatePresence>

            <AnimatePresence>
              {isAuthorized && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                >
                  <StatusChip tone="accent" dot={false}>
                    <Check size={11} className="mr-0.5" /> Authorized
                  </StatusChip>
                </motion.div>
              )}
              {isFailed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <StatusChip tone="reject" dot={false}>Not authorized</StatusChip>
                </motion.div>
              )}
            </AnimatePresence>

            {isVeiled && (
              <span className="mono text-[11px] text-tx3 shrink-0 tabular-nums">{mmss} · est. ~6 min</span>
            )}
          </div>

          {/* Values — blurred when veiled */}
          <motion.div
            animate={{
              filter: isVeiled && !prefersReduced ? 'blur(7px)' : 'blur(0px)',
              opacity: isVeiled ? 0.45 : 1,
            }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-0"
          >
            <DataRow label="Recipient" value={recipient || '—'} truncateMiddle />
            <DataRow label="Amount" value={`${amount || '0.00'} XLM`} />
            {txHash && (
              <DataRow label="Transaction" value={typedHash || txHash} copyable truncateMiddle />
            )}
          </motion.div>

          {/* Shimmer overlay while veiled */}
          {isVeiled && !prefersReduced && (
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(46,230,197,0.06) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.8s ease-in-out infinite',
              }}
            />
          )}

          {/* Error reason */}
          {isFailed && errorReason && (
            <p className="text-[13px] text-reject mt-4 pt-4 border-t border-border">{errorReason}</p>
          )}

          {/* Explorer link */}
          {isAuthorized && explorerUrl && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="mt-4 pt-4 border-t border-border">
              <a href={explorerUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline">
                View on Stellar <ExternalLink size={12} />
              </a>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
