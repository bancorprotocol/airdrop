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
# move the amount entitled by the airdrop contract to the foundation wallet
node ./solidity/scripts/airdrop/patch1.js
    Input file name (e.g. airdrop.txt)
    Output file name (e.g. airdrop_patch1.txt)
    Airdrop contract address (e.g. 0xbE8EA1615Bcc7007F4Ac4cDa4e4E89B20d5c9499)
    Foundation wallet address (e.g. 0x9b0D0ac3b597F77028b9Df4F90f6C228d6ba33CC)
```

```bash
# rearrange by alphabetical order of the addresses, and rescale each amount
node ./solidity/scripts/airdrop/patch2.js
    Input file name (e.g. airdrop_patch1.txt)
    Output file name (e.g. airdrop_patch2.txt)
    Scale-factor numerator (e.g. 1)
    Scale-factor denominator (e.g. 10)
```

```bash
# replace the BancorX contrcat address, and move this line to the top of the list
node ./solidity/scripts/airdrop/patch3.js
    Input file name (e.g. airdrop_patch2.txt)
    Output file name (e.g. airdrop_patch3.txt)
    Old BancorX contract address (e.g. 0xdA96eB2Fa67642C171650c428F93aBDfB8A63A2D)
    New BancorX contract address (e.g. 0xEaf3ce7b745F27835Df80B53b86B5299986069C1)
```

```bash
# initiate the airdrop process
node ./solidity/scripts/airdrop/run.js
    Input file name (e.g. airdrop_patch3.txt)
    Configuration file name
    Ethereum node address
    Executing agent's private key
    Number of store operations per batch
    Number of transfer operations per batch
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

In this mode you should execute the `upgrade` process and the `snapshot` process before you execute the `airdrop` process, because
the input for the `airdrop` process partially derives from the output of the `upgrade` process and the output of the `snapshot` process.

**Upgrade Configuration File Example:**
```json
{
    "relayTokenParams": [
        "BNT/ETH Token",
        "BET",
        18
    ],
    "oldConverter": {
        "addr": "0x9c248517b92Ae226B88a0a0C28dE02B9B7b039D3"
    }
}
```

**Airdrop Configuration File Example:**
```json
{
    "airDropper": {
        "addr": "0x69532f0B00157866933CDA7C1Bb8Bb0c373f20BF"
    },
    "relayToken": {
        "addr": "0xb1CD6e4153B2a390Cf00A6556b0fC1458C4A5533"
    },
    "bancorX": {
        "addr": "0xEaf3ce7b745F27835Df80B53b86B5299986069C1"
    }
}
```
