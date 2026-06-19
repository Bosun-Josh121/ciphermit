export const NETWORK = import.meta.env.VITE_NETWORK ?? 'testnet'
export const VAULT_CONTRACT_ID = import.meta.env.VITE_VAULT_CONTRACT_ID ?? ''
export const PROVER_URL = import.meta.env.VITE_PROVER_URL ?? 'http://localhost:3001'
export const USDC_CONTRACT_ID = import.meta.env.VITE_USDC_CONTRACT_ID ?? ''

export const HORIZON_URL =
  NETWORK === 'mainnet'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org'

export const SOROBAN_RPC =
  NETWORK === 'mainnet'
    ? 'https://mainnet.sorobanrpc.com'
    : 'https://soroban-testnet.stellar.org'
