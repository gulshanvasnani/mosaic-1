'use strict';

const Web3 = require('web3');

const Config = require('./config/config');
const Utils = require('./utils');

class ProxyDeployer {
  constructor(configPath) {
    this.config = new Config(configPath);

    this.web3Origin = new Web3(this.config.originEndpoint());
    this.web3Auxiliary = new Web3(this.config.auxiliaryEndpoint());

    this.originDeployer = this.config.originDeployer();
    this.auxiliaryDeployer = this.config.auxiliaryDeployer();

    this.metachainId = this.getMetachainId();
  }

  async isGasAvailableForDeploymentOnOrigin() {
    console.info(`\n  • Verifying balance of ${this.originDeployer} on origin chain.`);

    let isGasAvailable = false;

    try {
      const erc20GatewayDeploymentRawTx = await this.getERC20GatewayDeploymentRawTx();

      const gasForERC20GatewayProxyDeployment = await Utils.estimateGas(
        erc20GatewayDeploymentRawTx,
        this.originDeployer,
      );

      const deployerBalance = await this
        .web3Origin
        .eth
        .getBalance(
          this.originDeployer,
        );

      isGasAvailable = deployerBalance >= gasForERC20GatewayProxyDeployment;
      if (!isGasAvailable) {
        console.log(`    ❌ Insufficient gas for deployment, please fund ${this.originDeployer} address with ${gasForERC20GatewayProxyDeployment} on origin chain.`);
      } else {
        console.log(`    ✓ ${this.originDeployer} has sufficient balance on origin chain.`);
      }
    } catch (error) {
      console.log('    ❌ Failed while estimating the gas usage.');
      console.log(`    ${error}`);
    }

    return isGasAvailable;
  }

  async isGasAvailableForDeploymentOnAuxiliary() {
    console.info(`\n  • Verifying balance of ${this.auxiliaryDeployer} on auxiliary chain.`);

    let isGasAvailable = false;

    try {
      const gen0ERC20CogatewayProxyRawTx = await this.getGen0ERC20CogatewayDeploymentRawTx();

      const gasForGen0ERC20CogatewayProxyDeployment = await Utils.estimateGas(
        gen0ERC20CogatewayProxyRawTx,
        this.auxiliaryDeployer,
      );

      /*
      const activateGen0ERC20CogatewayRawTx = await this.getActivateGen0ERC20CogatewayRawTx();

      const gasForActivateGen0ERC20Cogateway = await Utils.estimateGas(
        activateGen0ERC20CogatewayRawTx,
        this.auxiliaryDeployer,
      );
      */
      const totalGasRequired = gasForGen0ERC20CogatewayProxyDeployment;
      // + gasForActivateGen0ERC20Cogateway;

      const deployerBalance = await this
        .web3Auxiliary
        .eth
        .getBalance(
          this.auxiliaryDeployer,
        );

      isGasAvailable = deployerBalance >= totalGasRequired;
      if (!isGasAvailable) {
        console.log(`    ❌ Insufficient gas for deployment, please fund ${this.auxiliaryDeployer} address with ${totalGasRequired} on auxiliary chain`);
      } else {
        console.log(`    ✓ ${this.auxiliaryDeployer} has sufficient balance on auxiliary chain.`);
      }
    } catch (error) {
      console.log('    ❌ Failed while estimating the gas usage.');
      console.log(`    ${error}`);
    }
    return isGasAvailable;
  }

  async isGasAvailableForDeployment() {
    console.info('\n‣ Verifying account balances.');
    const isGasAvailableForOriginDeployment = await this.isGasAvailableForDeploymentOnOrigin();
    const isGasAvailableForAuxiliaryDeployment = await this.isGasAvailableForDeploymentOnAuxiliary();
    return isGasAvailableForOriginDeployment && isGasAvailableForAuxiliaryDeployment;
  }

  unlockAccount() {
    console.info('\n‣ Unlocking accounts.');
    console.info(`\n  • Unlocking ${this.originDeployer} account on origin chain.`);
    if (!Utils.isAccountUnlocked(this.web3Origin, this.originDeployer)) {
      try {
        Utils.unlockAccount(
          this.web3Origin,
          this.config.keyStorePath(this.originDeployer),
          this.config.keyStorePasswordPath(this.originDeployer),
        );
      } catch (error) {
        console.log(`    ❌ failed to unlock ${this.originDeployer}`);
        console.log(`    ${error}`);
        return false;
      }
    }
    console.log(`    ✓ ${this.originDeployer} account unlocked on origin chain.`);

    console.info(`\n  • Unlocking ${this.auxiliaryDeployer} account on auxiliary chain.`);
    if (!Utils.isAccountUnlocked(this.web3Auxiliary, this.auxiliaryDeployer)) {
      try {
        Utils.unlockAccount(
          this.web3Auxiliary,
          this.config.keyStorePath(this.auxiliaryDeployer),
          this.config.keyStorePasswordPath(this.auxiliaryDeployer),
        );
      } catch (error) {
        console.log(`    ❌ failed to unlock ${this.auxiliaryDeployer}`);
        console.log(`    ${error}`);
        return false;
      }
    }
    console.log(`    ✓ ${this.auxiliaryDeployer} account unlocked on auxiliary chain.`);
    return true;
  }

  getDomainSeparator() {
    const web3 = new Web3(null);

    const MOSAIC_DOMAIN_SEPARATOR_NAME = 'Mosaic1-gen0-gateways';
    const DOMAIN_SEPARATOR_VERSION = '0';
    const MOSAIC_DOMAIN_SEPARATOR_TYPEHASH = web3.utils.soliditySha3(
      'MosaicDomain(string name,string version,uint256 originChainId,address consensus)',
    );

    const domainSeparator = web3.utils.keccak256(
      web3.eth.abi.encodeParameters(
        [
          'bytes32',
          'string',
          'string',
          'uint256',
          'address',
        ],
        [
          MOSAIC_DOMAIN_SEPARATOR_TYPEHASH,
          MOSAIC_DOMAIN_SEPARATOR_NAME,
          DOMAIN_SEPARATOR_VERSION,
          this.config.originChainId(),
          '0x0000000000000000000000000000000000000000',
        ],
      ),
    );
    return domainSeparator;
  }

  getMetachainId() {
    const web3 = new Web3(null);

    const METACHAIN_ID_TYPEHASH = web3.utils.soliditySha3(
      'MetachainId(address anchor)',
    );

    const domainSeparator = this.getDomainSeparator();

    const metachainIdHash = web3.utils.sha3(
      web3.eth.abi.encodeParameters(
        ['bytes32', 'address'],
        [METACHAIN_ID_TYPEHASH, this.config.originAnchorAddress()],
      ),
    );

    return web3.utils.soliditySha3(
      { t: 'bytes1', v: '0x19' },
      { t: 'bytes1', v: '0x4d' },
      { t: 'bytes32', v: domainSeparator },
      { t: 'bytes32', v: metachainIdHash },
    );
  }

  async getGen0ERC20CogatewayDeploymentRawTx() {
    const gen0ERC20CogatewaySetupData = this
      .web3Auxiliary
      .eth
      .abi
      .encodeFunctionSignature('setup()');

    const proxyFactoryAuxiliary = new this
      .web3Auxiliary
      .eth
      .Contract(
        Utils.getABI('ProxyDeployer'),
        this.config.auxiliaryProxyDeployer(),
      );

    const gen0ERC20CogatewayProxyRawTx = await proxyFactoryAuxiliary
      .methods
      .deployProxy(
        this.config.erc20CogatewayMasterCopyAddress(),
        gen0ERC20CogatewaySetupData,
      );

    return gen0ERC20CogatewayProxyRawTx;
  }

  async getERC20GatewayDeploymentRawTx() {
    const gen0erc20C0gateway = new this
      .web3Auxiliary
      .eth
      .Contract(
        Utils.getABI('Gen0ERC20Cogateway'),
        this.config.erc20CogatewayMasterCopyAddress(),
      );

    // const outboxStorageIndex = 4;

    const outboxStorageIndex = await gen0erc20C0gateway
      .methods
      .OUTBOX_OFFSET()
      .call();

    const erc20GatewaySetupParamTypes = 'bytes32,address,address,uint256,uint8';

    const erc20GatewaySetupCallPrefix = this
      .web3Origin
      .eth
      .abi
      .encodeFunctionSignature(`setup(${erc20GatewaySetupParamTypes})`);

    console.log("ProxyDeployer -> getERC20GatewayDeploymentRawTx -> this.config.maxStorageRootItems()", this.config.maxStorageRootItems());
    const erc20GatewaySetupCallData = this
      .web3Origin
      .eth
      .abi
      .encodeParameters(
        erc20GatewaySetupParamTypes.split(','),
        [
          this.metachainId,
          this.config.erc20CogatewayMasterCopyAddress(),
          this.config.originAnchorAddress(),
          this.config.maxStorageRootItems(),
          outboxStorageIndex,
        ],
      );

    const erc20GatewaySetupData = `${erc20GatewaySetupCallPrefix}${erc20GatewaySetupCallData.substring(2)}`;

    const proxyDeployerOrigin = new this
      .web3Origin
      .eth
      .Contract(
        Utils.getABI('ProxyDeployer'),
        this.config.originProxyDeployer(),
      );

    const erc20GatewayProxyRawTx = await proxyDeployerOrigin
      .methods
      .deployProxy(
        this.config.erc20GatewayMasterCopyAddress(),
        erc20GatewaySetupData,
      );

    return erc20GatewayProxyRawTx;
  }

  async getActivateGen0ERC20CogatewayRawTx() {
    const erc20Gateway = new this
      .web3Origin
      .eth
      .Contract(
        Utils.getABI('ERC20Gateway'),
        this.config.erc20GatewayProxyContractAddress(),
      );

    // const outboxStorageIndex = 4;
    const outboxStorageIndex = await erc20Gateway.methods.OUTBOX_OFFSET().call();

    const gen0ERC20Cogateway = new this
      .web3Auxiliary
      .eth
      .Contract(
        Utils.getABI('Gen0ERC20Cogateway'),
        this.config.erc20CogatewayProxyContractAddress(),
      );

    const cogatewayActivateRawTx = gen0ERC20Cogateway
      .methods
      .activate(
        this.metachainId,
        this.config.erc20GatewayProxyContractAddress(),
        this.config.auxiliaryAnchorAddress(),
        this.config.maxStorageRootItems(),
        outboxStorageIndex,
        this.config.utilityTokenMasterCopyAddress(),
      );

    return cogatewayActivateRawTx;
  }

  async deployGen0ERC20CogatewayProxy() {
    console.info('\n  • Deploying Gen0ERC20Cogateway proxy contract.');
    let gen0ERC20CogatewayProxyAddress = null;
    try {
      const gen0ERC20CogatewayProxyRawTx = await this.getGen0ERC20CogatewayDeploymentRawTx();
      gen0ERC20CogatewayProxyAddress = await Utils
        .deployProxy(
          gen0ERC20CogatewayProxyRawTx,
          this.auxiliaryDeployer,
        );
      console.log('    ✓ Gen0ERC20Cogateway contract is deployed at: ', gen0ERC20CogatewayProxyAddress);
    } catch (error) {
      console.log('    ❌ Failed to deploy Gen0ERC20Cogateway contract');
      console.log(`    ${error}`);
    }
    return gen0ERC20CogatewayProxyAddress;
  }

  async deployERC20GatewayProxy() {
    console.info('\n  • Deploying ERC20Gateway proxy contract.');
    let erc20GatewayProxyAddress = null;
    try {
      const erc20GatewayProxyRawTx = await this.getERC20GatewayDeploymentRawTx();
      erc20GatewayProxyAddress = await Utils
        .deployProxy(
          erc20GatewayProxyRawTx,
          this.originDeployer,
        );
      console.log('    ✓ ERC20Gateway contract is deployed at: ', erc20GatewayProxyAddress);
    } catch (error) {
      console.log('    ❌ Failed to deploy ERC20Gateway contract.');
      console.log(`    ${error}`);
    }
    return erc20GatewayProxyAddress;
  }

  async activateGen0ERC20Cogateway() {
    console.info('\n  • Activating Gen0ERC20Cogateway.');
    try {
      const cogatewayActivateRawTx = await this.getActivateGen0ERC20CogatewayRawTx();
      await Utils.sendTransaction(cogatewayActivateRawTx, this.auxiliaryDeployer);
      console.log('    ✓ Gen0ERC20Cogateway contract is activated.');
    } catch (error) {
      console.log('    ❌ Failed to activate Gen0ERC20Cogateway contract.');
      console.log(`    ${error}`);
    }
  }

  async deploy() {
    if (!await this.isGasAvailableForDeployment()) {
      return;
    }

    if (!await this.unlockAccount()) {
      return;
    }

    console.info('\n‣ Deploying proxy contract on auxiliary chain.');

    const gen0ERC20CogatewayProxyAddress = await this.deployGen0ERC20CogatewayProxy();
    if (gen0ERC20CogatewayProxyAddress !== null) {
      this.config.updateERC20CogatewayProxyContractAddress(gen0ERC20CogatewayProxyAddress);
    }

    console.info('\n‣ Deploying proxy contract on origin chain.');

    const erc20GatewayProxyAddress = await this.deployERC20GatewayProxy();
    if (erc20GatewayProxyAddress !== null) {
      this.config.updateERC20GatewayProxyContractAddress(erc20GatewayProxyAddress);
    }

    console.info('\n‣ Updating the manifest file with deployed contract addresses.');
    try {
      const path = this.config.save();
      console.log('  ✓ Manifest file updated with deployed contract address: ');
      console.log(`  ${path}\n`);
    } catch (error) {
      console.log('  ❌ Failed to update manifest fileUnlocking');
      console.log(`  ${error}`);
    }

    console.info('\n‣ Activating.');
    await this.activateGen0ERC20Cogateway();
  }
}

module.exports = ProxyDeployer;
