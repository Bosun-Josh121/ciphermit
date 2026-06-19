# Ciphermit Brand Token System

The design thesis: **"a vault you can see through but never break."**
Precise, engineered, quietly futuristic. The aesthetic of a precision instrument — a safe dial, a cipher lock — rendered in software. Not crypto-bro neon; not sterile fintech blue.

---

## Palette

```css
:root {
  --void:  #0A0B0F;  /* near-black base, very slightly blue-cool */
  --panel: #14161D;  /* raised surface for cards/sheets */
  --line:  #232733;  /* hairline borders, dividers */
  --mute:  #6B7280;  /* secondary text, captions, technical metadata */
  --ink:   #E8EAF0;  /* primary text, near-white */
  --seal:  #B8FF4F;  /* THE accent: electric lime/acid green — reserved for
                        verified/authorized state and primary actions ONLY.
                        Never as a fill for large areas. One bold place only. */
  --breach:#FF5C5C;  /* rejected/invalid proof state */
}
```

### Usage rules

| Token | Use | Never |
|---|---|---|
| `--void` | Page background | Text color |
| `--panel` | Cards, sheets, modals | Borders |
| `--line` | Borders, dividers only | Background fills |
| `--mute` | Captions, labels, metadata | Primary text |
| `--ink` | All body copy, primary text | Decorative use |
| `--seal` | Primary action button, ✓ AUTHORIZED state, active step indicator | Large fills, decorative accents, hover states |
| `--breach` | Error states, proof rejection | Warning-level issues |

---

## Typography

Three roles. Deliberate pairing. NOT the default system stack.

| Role | Face | Usage |
|---|---|---|
| **Display** | Space Grotesk (or Clash Display / General Sans) | Headlines, wordmark. Tight, negative letter-spacing. Large only. |
| **Body** | Inter (or Geist Sans) | Paragraphs, UI labels, prose |
| **Mono** | Geist Mono (or JetBrains Mono / IBM Plex Mono) | ALL technical data: addresses, hashes, amounts, proof values, nullifiers |

### The mono split rule (core identity)

> **Money and proofs render in mono. Prose renders in sans. Always.**

Every address, amount, hash, nullifier, and proof value uses the mono face.
This split is the product's identity — apply it everywhere, without exception.

---

## Layout

- Dark canvas (`--void`), content in a focused column
- Raised `--panel` cards with hairline `--line` borders, radius 6–8px (not pill-round)
- Asymmetric where it earns it; never center-everything by default
- Technical data right-aligned in mono

---

## The Signature Element: Proof Authorization Moment

When a user authorizes a spend, the UI shows the proof being built:

1. A block of scrambled monospace cipher characters fills the proof area
2. Characters animate/resolve into clean `✓ AUTHORIZED` state in `--seal` green
3. The on-chain tx hash types out in mono beneath

**This single animated moment — secret becoming verified permission — is what the product is about.**
All boldness is spent here. Everything else stays quiet and disciplined around it.

Animation drives off the REAL prover lifecycle:
- Scrambling = pending while `/prove` runs (covers real latency honestly)
- Resolve = on-chain verify passed
- Final state = tx confirmed

Must respect `prefers-reduced-motion`: fall back to a simple state transition.

---

## Logo Concept

A lowercase wordmark `ciphermit` in Display face, paired with a mark suggesting a sealed/keyed cipher:
a square "permit stamp" shape with an interlocking keyhole glyph, or a lock-form from monospace brackets.
The mark should read as both a seal and a cipher mechanism.

---

## Anti-Slop Checklist

Before shipping any screen, verify:

- [ ] Page background is `--void` not white or gradient
- [ ] All technical data (amounts, addresses, hashes) is in mono face
- [ ] `--seal` appears in at most 2–3 small places per screen
- [ ] Card borders use `--line` hairlines, not heavy strokes
- [ ] No pill-shaped cards; radius is 6–8px
- [ ] No centered-everything layout
- [ ] Copy is sentence case, active voice ("Set an allowance", not "Generate ZK proof")
- [ ] The proof animation is the only place with high visual energy
