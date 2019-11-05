pragma solidity 0.4.26;

// `truffle compile` subsequently creates these artifacts
import 'bancor-contracts/solidity/contracts/token/ERC20Token.sol';
import 'bancor-contracts/solidity/contracts/token/EtherToken.sol';
import 'bancor-contracts/solidity/contracts/token/SmartToken.sol';
import 'bancor-contracts/solidity/contracts/utility/ContractRegistry.sol';
import 'bancor-contracts/solidity/contracts/converter/BancorConverter.sol';

// `solidity-coverage` fails if no contract is provided
contract Importer {}