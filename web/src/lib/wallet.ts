import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit'
import { FreighterModule, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit/modules/freighter'
import { xBullModule } from '@creit.tech/stellar-wallets-kit/modules/xbull'
import { NETWORK } from './config'

const walletNetwork = NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET

let initialized = false

function ensureInit() {
  if (initialized) return
  StellarWalletsKit.init({
    network: walletNetwork,
    selectedWalletId: FREIGHTER_ID,
    modules: [new FreighterModule(), new xBullModule()],
  })
  initialized = true
}

/** Opens the wallet selection modal and returns the connected address. */
export async function connectWallet(): Promise<string> {
  ensureInit()
  const { address } = await StellarWalletsKit.authModal()
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
  await StellarWalletsKit.disconnect()
}
