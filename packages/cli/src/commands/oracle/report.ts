import { CeloContract } from '@celo/contractkit'
import { flags } from '@oclif/command'
import BigNumber from 'bignumber.js'
import { BaseCommand } from '../../base'
import { displaySendTx } from '../../utils/cli'
import { Flags } from '../../utils/command'

export default class ReportPrice extends BaseCommand {
  static description =
    'Report the price of Celo Gold in a specified token (currently just Celo Dollar, aka: "StableToken")'

  static args = [
    {
      name: 'token',
      required: true,
      description: 'Token to report on',
      options: [CeloContract.StableToken],
    },
  ]
  static flags = {
    ...BaseCommand.flags,
    from: Flags.address({ required: true, description: 'Address of the oracle account' }),
    numerator: flags.string({
      required: true,
      description: 'Amount of the specified token equal to the amount of cGLD in the denominator',
    }),
    denominator: flags.string({
      required: false,
      description: 'Amount of cGLD equal to the numerator. Defaults to 1 if left blank',
    }),
  }

  static example = [
    'report --token StableToken --numerator 1.02 --from 0x8c349AAc7065a35B7166f2659d6C35D75A3893C1',
    'report --token StableToken --numerator 102 --denominator 100 --from 0x8c349AAc7065a35B7166f2659d6C35D75A3893C1',
  ]

  async run() {
    const res = this.parse(ReportPrice)
    const sortedOracles = await this.kit.contracts.getSortedOracles()
    let numerator = new BigNumber(res.flags.numerator)
    let denominator = new BigNumber(res.flags.denominator || 1)
    if (numerator.decimalPlaces() > 0) {
      const multiplier = new BigNumber(10).pow(numerator.decimalPlaces()).toNumber()
      numerator = numerator.multipliedBy(multiplier)
      denominator = denominator.multipliedBy(multiplier)
    }

    await displaySendTx(
      'sortedOracles.report',
      await sortedOracles.report(
        res.args.token,
        numerator.toNumber(),
        denominator.toNumber(),
        res.flags.from
      )
    )
    this.log(
      `Reported oracle value of ${numerator.div(denominator).toNumber()} ${
        res.args.token
      } for 1 CeloGold`
    )
  }
}
