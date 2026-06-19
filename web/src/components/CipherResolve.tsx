import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { ProofStage } from '../types/vault'

const CHARS = '0123456789abcdef!@#$%^&*[]{}|<>?/'
const SCRAMBLE_FPS = 30

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)]
}

function scramble(length: number) {
  return Array.from({ length }, randomChar).join('')
}

interface Props {
  stage: ProofStage
  txHash?: string
  explorerUrl?: string
}

const STAGE_LABELS: Record<ProofStage, string> = {
  idle: '',
  building: 'Building proof...',
  verifying: 'Verifying on Stellar...',
  authorized: '✓ AUTHORIZED',
  failed: '✗ REJECTED',
}

export function CipherResolve({ stage, txHash, explorerUrl }: Props) {
  const prefersReduced = useReducedMotion()
  const [display, setDisplay] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const target = stage === 'authorized' ? '✓ AUTHORIZED' : stage === 'failed' ? '✗ REJECTED' : ''
  const isActive = stage === 'building' || stage === 'verifying'
  const isResolved = stage === 'authorized' || stage === 'failed'

  // Clear interval helper
  const clearScrambel = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(isResolved ? target : isActive ? '░░░░░░░░░░░░░░░░' : '')
      return
    }

    clearScrambel()


    if (!isActive && !isResolved) {
      setDisplay('')
      return
    }

    if (isActive) {
      // Scramble: continuous random characters
      intervalRef.current = setInterval(() => {
        setDisplay(scramble(24))
      }, 1000 / SCRAMBLE_FPS)
      return clearScrambel
    }

    if (isResolved) {
      // Resolve: characters lock in left-to-right
      let resolved = 0
      intervalRef.current = setInterval(() => {
        resolved++
        if (resolved >= target.length) {
          clearScrambel()
          setDisplay(target)
        } else {
          const locked = target.slice(0, resolved)
          const rest = scramble(target.length - resolved)
          setDisplay(locked + rest)
        }
      }, 40)
      return clearScrambel
    }
  }, [stage, prefersReduced])

  if (stage === 'idle') return null

  const color = stage === 'authorized' ? 'text-seal' : stage === 'failed' ? 'text-breach' : 'text-mute'

  return (
    <div className="rounded-[6px] border border-line bg-panel p-5 space-y-4">
      {/* Cipher display */}
      <div
        className={`mono text-sm tracking-wider min-h-[1.4em] transition-colors duration-300 ${color}`}
        aria-live="polite"
        aria-label={STAGE_LABELS[stage]}
      >
        {prefersReduced ? STAGE_LABELS[stage] : (display || STAGE_LABELS[stage])}
      </div>

      {/* Stage label */}
      <motion.p
        key={stage}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs text-mute"
      >
        {STAGE_LABELS[stage]}
      </motion.p>

      {/* Step indicators */}
      <div className="flex gap-3 items-center">
        {(['building', 'verifying', 'authorized'] as ProofStage[]).map((s) => {
          const done = stage === 'authorized' || (s === 'building' && stage === 'verifying')
          const active = stage === s
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                  done ? 'bg-seal' : active ? 'bg-seal/60 animate-pulse' : 'bg-line'
                }`}
              />
              <span className={`text-xs mono ${active ? 'text-ink' : done ? 'text-seal' : 'text-mute'}`}>
                {s === 'building' ? 'prove' : s === 'verifying' ? 'verify' : 'done'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Tx hash (appears when authorized) */}
      {stage === 'authorized' && txHash && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pt-2 border-t border-line"
        >
          <p className="text-xs text-mute mb-1">Transaction</p>
          {explorerUrl ? (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mono text-xs text-seal/80 hover:text-seal break-all transition-colors"
            >
              {txHash}
            </a>
          ) : (
            <p className="mono text-xs text-seal/80 break-all">{txHash}</p>
          )}
        </motion.div>
      )}
    </div>
  )
}
