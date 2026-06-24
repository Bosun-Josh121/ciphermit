import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { DocumentCard } from './ui/DocumentCard'
import { Seal } from './seal/Seal'
import { Guilloche } from './seal/Guilloche'
import type { ProofStage } from '../types/vault'

const CIPHER_CHARS = '0123456789abcdef⌬◇△▽○●'

function randomChar() {
  return CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)]
}
function scramble(length: number) {
  return Array.from({ length }, randomChar).join('')
}

function truncMiddle(v: string, head = 6, tail = 6) {
  if (v.length <= head + tail + 1) return v
  return `${v.slice(0, head)}…${v.slice(-tail)}`
}

interface Props {
  stage: ProofStage
  recipient: string
  amount: string // display string e.g. "12.50"
  txHash?: string
  explorerUrl?: string
  errorReason?: string
}

const EYEBROW: Record<ProofStage, string> = {
  idle: '',
  building: 'Building proof',
  verifying: 'Verifying on Stellar',
  authorized: 'Authorized',
  failed: 'Not authorized',
}

function useScramble(active: boolean, length: number, prefersReduced: boolean) {
  const [text, setText] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (prefersReduced) {
      setText(active ? '░'.repeat(length) : '')
      return
    }
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => setText(scramble(length)), 1000 / 24)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [active, length, prefersReduced])
  return text
}

export function AuthorizeReceipt({ stage, recipient, amount, txHash, explorerUrl, errorReason }: Props) {
  const prefersReduced = useReducedMotion() ?? false
  const isVeiled = stage === 'building' || stage === 'verifying'
  const isAuthorized = stage === 'authorized'
  const isFailed = stage === 'failed'

  const recipientCipher = useScramble(isVeiled, 14, prefersReduced)
  const amountCipher = useScramble(isVeiled, 8, prefersReduced)

  const [typedHash, setTypedHash] = useState('')
  useEffect(() => {
    if (!isAuthorized || !txHash) { setTypedHash(''); return }
    if (prefersReduced) { setTypedHash(txHash); return }
    let i = 0
    const interval = setInterval(() => {
      i++
      setTypedHash(txHash.slice(0, i))
      if (i >= txHash.length) clearInterval(interval)
    }, 18)
    return () => clearInterval(interval)
  }, [isAuthorized, txHash, prefersReduced])

  const recipientDisplay = isVeiled ? recipientCipher : truncMiddle(recipient || '—')
  const amountDisplay = isVeiled ? amountCipher : (amount || '0.00')

  return (
    <DocumentCard
      className={`relative overflow-hidden transition-shadow duration-300 ${isFailed ? 'ring-2 ring-reject/60' : ''}`}
      microprint={txHash ? `AUTHORIZED ON STELLAR · ${txHash} ·` : undefined}
    >
      {/* Guilloché watermark, faint, behind content */}
      <div
        className={`absolute inset-0 pointer-events-none text-ink ${isVeiled && !prefersReduced ? 'animate-guilloche-spin' : ''}`}
        style={{ opacity: 0.08 }}
      >
        <Guilloche stroke="var(--paper-ink)" />
      </div>

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            <motion.p
              key={stage}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`eyebrow text-xs ${
                isAuthorized ? 'text-seal-deep' : isFailed ? 'text-reject' : 'text-verify'
              }`}
            >
              {EYEBROW[stage]}
            </motion.p>
          </AnimatePresence>

          {/* Seal stamp */}
          <AnimatePresence>
            {isAuthorized && (
              <motion.div
                initial={prefersReduced ? { opacity: 0 } : { scale: 2.4, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: -6 }}
                transition={prefersReduced ? { duration: 0.2 } : { type: 'spring', duration: 0.6, bounce: 0.5 }}
              >
                <Seal size={48} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-paper-ink/60">Recipient</span>
            <span className="mono text-xs text-paper-ink">{recipientDisplay}</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-paper-line/60">
            <span className="text-xs text-paper-ink/60">Amount</span>
            <span className="mono text-lg text-paper-ink">{amountDisplay} <span className="text-xs text-paper-ink/50">XLM</span></span>
          </div>
        </div>

        {isFailed && errorReason && (
          <p className="text-xs text-reject pt-2 border-t border-paper-line/60">{errorReason}</p>
        )}

        {isAuthorized && txHash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="pt-3 border-t border-paper-line/60 space-y-1"
          >
            <p className="text-xs text-paper-ink/60">Transaction</p>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mono text-xs text-verify hover:text-seal-deep transition-colors break-all flex items-center gap-1"
            >
              {typedHash || txHash}
              <ExternalLink size={10} className="shrink-0" />
            </a>
          </motion.div>
        )}
      </div>
    </DocumentCard>
  )
}
