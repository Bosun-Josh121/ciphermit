import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit'
import { FreighterModule, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit/modules/freighter'
import { xBullModule, XBULL_ID } from '@creit.tech/stellar-wallets-kit/modules/xbull'
import { AlbedoModule, ALBEDO_ID } from '@creit.tech/stellar-wallets-kit/modules/albedo'
import { NETWORK } from './config'

const walletNetwork = NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET

export const WALLET_IDS = {
  freighter: FREIGHTER_ID,
  xbull: XBULL_ID,
  albedo: ALBEDO_ID,
} as const

let initialized = false

function ensureInit() {
  if (initialized) return
  StellarWalletsKit.init({
    network: walletNetwork,
    selectedWalletId: FREIGHTER_ID,
    // Albedo is web-based (no extension) — a reliable fallback when a browser
    // extension won't connect.
    modules: [new FreighterModule(), new xBullModule(), new AlbedoModule()],
  })
  initialized = true
}

/** Opens the kit's wallet-picker modal and returns the connected address. */
export async function connectWallet(): Promise<string> {
  ensureInit()
  const { address } = await StellarWalletsKit.authModal()
  return address
}

/** Connects to a specific wallet directly (used by the connect cards). */
export async function connectWith(walletId: string): Promise<string> {
  ensureInit()
  StellarWalletsKit.setWallet(walletId)
  const { address } = await StellarWalletsKit.getAddress()
  if (!address) throw new Error('No address returned by the wallet.')
  return address
}

/** Signs an unsigned transaction XDR. Returns the signed XDR. */
export async function signTransaction(xdrEnvelope: string, address: string): Promise<string> {
  ensureInit()
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdrEnvelope, {
    address,
    networkPassphrase: walletNetwork,
  })
  return signedTxXdr
}

export async function disconnectWallet(): Promise<void> {
  await StellarWalletsKit.disconnect().catch(() => {})
}
