/* tslint:disable no-console */
import { newKit } from '@celo/contractkit'
import { BigNumber } from 'bignumber.js'
import { portForwardAnd } from 'src/lib/port_forward'
import { Argv } from 'yargs'
import { AccountArgv } from '../account'

export const command = 'invite'

export const describe = 'command for sending an invite code to a phone number'

interface InviteArgv extends AccountArgv {
  phone: string
  fast: boolean
}

export const builder = (yargs: Argv) => {
  return yargs
    .option('phone', {
      type: 'string',
      description: 'Phone number to send invite code,',
      demand: 'Please specify phone number to send invite code',
    })
    .option('fast', {
      type: 'boolean',
      default: false,
      description: "Don't download artifacts, use this for repeated invocations",
      demand: 'Please specify phone number to send invite code',
    })
}

export const handler = async (argv: InviteArgv) => {
  console.log(`Sending invitation code to ${argv.phone}`)
  const cb = async () => {
    const kit = newKit('http://localhost:8545')
    const account = (await kit.web3.eth.getAccounts())[0]
    console.log(`Using account: ${account}`)
    kit.defaultAccount = account

    // TODO(asa): This number was made up
    const verificationGasAmount = new BigNumber(10000000)
    // TODO: this default gas price might not be accurate
    const gasPrice = 100000000000

    const temporaryWalletAccount = await kit.web3.eth.accounts.create()
    const temporaryAddress = temporaryWalletAccount.address
    // Buffer.from doesn't expect a 0x for hex input
    const privateKeyHex = temporaryWalletAccount.privateKey.substring(2)
    const inviteCode = Buffer.from(privateKeyHex, 'hex').toString('base64')

    const [goldToken, stableToken, attestations] = await Promise.all([
      kit.contracts.getGoldToken(),
      kit.contracts.getStableToken(),
      kit.contracts.getAttestations(),
    ])
    const verificationFee = new BigNumber(
      await attestations.attestationRequestFees(stableToken.address)
    )
    const goldAmount = verificationGasAmount.times(gasPrice).toString()
    const stableTokenAmount = verificationFee.times(10).toString()

    console.log(`Transferring ${goldAmount} Gold and ${stableTokenAmount} StableToken`)
    await Promise.all([
      goldToken.transfer(temporaryAddress, goldAmount).sendAndWaitForReceipt(),
      stableToken.transfer(temporaryAddress, stableTokenAmount).sendAndWaitForReceipt(),
    ])
    console.log(`Temp address: ${temporaryAddress}`)
    console.log(`Invite code: ${inviteCode}`)

    return [temporaryAddress, inviteCode]
  }
  try {
    await portForwardAnd(argv.celoEnv, cb)
  } catch (error) {
    console.error(`Unable to send invitation code to ${argv.phone}`)
    console.error(error)
    process.exit(1)
  }
}
