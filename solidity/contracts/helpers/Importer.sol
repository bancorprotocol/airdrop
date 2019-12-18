pragma solidity 0.4.26;

// `truffle compile` subsequently creates these artifacts
import 'bancor-contracts/solidity/contracts/BancorNetwork.sol';
import 'bancor-contracts/solidity/contracts/BancorNetworkPathFinder.sol';
import 'bancor-contracts/solidity/contracts/bancorx/BancorX.sol';
import 'bancor-contracts/solidity/contracts/converter/BancorConverter.sol';
import 'bancor-contracts/solidity/contracts/converter/BancorConverterRegistry.sol';
import 'bancor-contracts/solidity/contracts/converter/BancorConverterRegistryData.sol';
import 'bancor-contracts/solidity/contracts/converter/BancorConverterUpgrader.sol';
import 'bancor-contracts/solidity/contracts/converter/BancorFormula.sol';
import 'bancor-contracts/solidity/contracts/converter/BancorGasPriceLimit.sol';
import 'bancor-contracts/solidity/contracts/token/ERC20Token.sol';
import 'bancor-contracts/solidity/contracts/token/EtherToken.sol';
import 'bancor-contracts/solidity/contracts/token/SmartToken.sol';
import 'bancor-contracts/solidity/contracts/utility/ContractFeatures.sol';
import 'bancor-contracts/solidity/contracts/utility/ContractRegistry.sol';
import 'bancor-contracts/solidity/contracts/utility/NonStandardTokenRegistry.sol';
