import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, ChevronDown } from 'lucide-react'
import { Panel } from './ui/Panel'
import { truncHash } from '../lib/format'
import { NETWORK } from '../lib/config'

// The deployed RISC Zero verifier router the vault calls to check every proof.
const VERIFIER_ROUTER = 'CBI2UZ3K4HZW2Y3JK5DAXN2BVGCNFZTLUIOQV7JRGAOEMNA4DUZFF4O2'

/** The actual cryptographic artifacts of a spend — real, in-app ZK evidence. */
export interface ProofArtifacts {
  seal: string
  image_id: string
  journal_digest: string
  nullifier: string
  policy_commitment: string
}

export function ProofDetails({ proof, txHash, defaultOpen = true }: {
  proof: ProofArtifacts; txHash?: string; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const rows = [
    { label: 'Groth16 seal', value: proof.seal, note: `the zero-knowledge proof itself (${proof.seal.length / 2} bytes)` },
    { label: 'Image ID', value: proof.image_id, note: 'cryptographic id of the exact guest program proven — pinned in the vault contract' },
    { label: 'Journal digest', value: proof.journal_digest, note: 'hash of the proof’s public outputs' },
    { label: 'Nullifier', value: proof.nullifier, note: 'one-time anti-replay token' },
    { label: 'Policy commitment', value: proof.policy_commitment, note: 'your private rule’s fingerprint — the rule stays hidden' },
  ]
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <Panel className="overflow-hidden">
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface-2 transition-colors">
          <span className="flex items-center gap-2 text-[13px] font-bold text-tx">
            <ShieldCheck size={14} className="text-accent" /> Zero-knowledge proof
          </span>
          <ChevronDown size={15} className={`text-tx3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="px-5 pb-4 space-y-3 border-t border-border pt-3">
            {rows.map(r => (
              <div key={r.label}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold text-tx2 uppercase tracking-wide">{r.label}</span>
                  <span className="mono text-[11px] text-accent/80 shrink-0">{truncHash(r.value, 8, 6)}</span>
                </div>
                <p className="text-[11px] text-tx3 leading-snug mt-0.5">{r.note}</p>
              </div>
            ))}
            <p className="pt-3 border-t border-border text-[11px] text-tx2 leading-relaxed">
              Verified on-chain by the{' '}
              <a href={`https://stellar.expert/explorer/${NETWORK}/contract/${VERIFIER_ROUTER}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">RISC Zero Groth16 verifier</a>
              {txHash && <> · <a href={`https://stellar.expert/explorer/${NETWORK}/tx/${txHash}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">view spend tx</a></>}
            </p>
          </div>
        )}
      </Panel>
    </motion.div>
  )
}
