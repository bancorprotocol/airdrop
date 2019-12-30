# airdrop

**Prerequisites:**
- node 10.16.0
- npm 6.9.0

**NodeJS Infrastructure:**
- Use `npm install` in order to install all required packages
- Use `npm test` in order to run truffle-test or solidity-coverage
- You can use `npm run build` in order to generate all artifacts (`abi` and `bin` files)
- All required artifacts are already stored in this repository (under `/solidity/build`)

**System Verification:**
- Use `npm test 1` (quick testing)
- Use `npm test 2` (full coverage)

**Upgrade Execution:**
```bash
# initiate the upgrade process
node ./solidity/scripts/upgrade/run.js
    Configuration file name
    Ethereum node address
    Deployer's private key
    BNT wallet private key
```

**Snapshot Execution:**
```bash
# initiate the snapshot process
node ./solidity/scripts/snapshot/run.js
    Output file name (e.g. airdrop.txt)
    Token contract address (e.g. 0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C)
    Vault contract address (e.g. 0xf1A5C3EDA198BD3eE097Ac4b8340E4d47C9D4679)
    Etherscan developer key
    Infura developer key
    Last block number
```

**Airdrop Execution:**
```bash
# rearrange by alphabetic order of the addresses, and rescale each amount
node ./solidity/scripts/airdrop/rearrange.js
    Input file name (e.g. airdrop.txt)
    Output file name (e.g. airdrop_10p.txt)
    Scale-factor numerator (e.g. 1)
    Scale-factor denominator (e.g. 10)
```

```bash
# initiate the airdrop process
node ./solidity/scripts/airdrop/run.js
    Input file name (e.g. airdrop_10p.txt)
    Configuration file name
    Ethereum node address
    Executing agent's private key
    Number of accounts per batch
    Test mode (any non-empty string)
```

## Testing Mode:

In this mode you can execute each process separately and independently of the others, with the order of execution being insignificant.

**Upgrade Configuration File Example:**
```json
{
    "relayTokenParams": [
        "BNT/ETH Token",
        "BET",
        18
    ]
}
```

**Airdrop Configuration File Example:**
```json
{
}
```

## Operational Mode:

In this mode you should execute the `upgrade` process and the `snapshot` process before you execute the `airdrop` process, because:
The input for the `airdrop` process partially derives from the output of the `upgrade` process and the output of the `snapshot` process.

**Upgrade Configuration File Example:**
```json
{
    "relayTokenParams": [
        "BNT/ETH Token",
        "BET",
        18
    ],
    "oldConverter": {
        "addr": "0x..."
    }
}
```

**Airdrop Configuration File Example:**
```json
{
    "airDropper": {
        "addr": "0x..."
    },
    "relayToken": {
        "addr": "0x..."
    },
    "bancorX": {
        "addr": "0x..."
    }
}
```
