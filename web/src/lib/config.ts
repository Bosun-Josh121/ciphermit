export const NETWORK = import.meta.env.VITE_NETWORK ?? 'testnet'
export const VAULT_CONTRACT_ID = import.meta.env.VITE_VAULT_CONTRACT_ID ?? ''
export const PROVER_URL = import.meta.env.VITE_PROVER_URL ?? 'http://localhost:3001'
export const TOKEN_CONTRACT_ID =
  import.meta.env.VITE_TOKEN_CONTRACT_ID ??
  'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'

export const HORIZON_URL =
  NETWORK === 'mainnet'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org'

export const SOROBAN_RPC =
  NETWORK === 'mainnet'
    ? 'https://mainnet.sorobanrpc.com'
    : 'https://soroban-testnet.stellar.org'
