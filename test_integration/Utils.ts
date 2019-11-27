import {TransactionObject} from "../interacts/types";


export default class Utils {

  public static ZERO_BYTES32:string = '0x0000000000000000000000000000000000000000000000000000000000000000';

  public static NULL_ADDRESS: string = '0x0000000000000000000000000000000000000000';

  /**
   * Fund address for gas with ETH
   * @param beneficiary Beneficiary Address.
   * @param funder Funder Address.
   * @param web3 Web3 instance.
   * @param value Amount in wei.
   */
  static fundAddressForGas(beneficiary: string, funder:string, web3, value: string) {
    return web3.eth.sendTransaction(
      {
        from: funder,
        to: beneficiary,
        value,
      },
    );
  }

  /**
   * Send Transaction.
   * @param rawTx Raw Transaction object.
   * @param txOptions Transaction Options.
   */
  static async sendTransaction(
    rawTx: any,
    txOptions: {
      gas?: string,
      from: string
    }) {
    txOptions.gas = txOptions.gas
      ? txOptions.gas
      : (await rawTx.estimateGas()).toString();

    return rawTx.send(txOptions);
  }
}

