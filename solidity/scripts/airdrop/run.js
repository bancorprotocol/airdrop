const os     = require("os");
const fs     = require("fs");
const Web3   = require("web3");
const assert = require("assert");

const SRC_FILE_NAME = process.argv[2];
const CFG_FILE_NAME = process.argv[3];
const NODE_ADDRESS  = process.argv[4];
const PRIVATE_KEY   = process.argv[5];
const S_BATCH_SIZE  = process.argv[6];
const T_BATCH_SIZE  = process.argv[7];
const TEST_MODE     = process.argv[8];

const ARTIFACTS_DIR = __dirname + "/../../build/";

const BANCOR_X_DEST = "airdropsdac1";

const MIN_GAS_LIMIT = 0;

function get() {
    return JSON.parse(fs.readFileSync(CFG_FILE_NAME, {encoding: "utf8"}));
}

function set(record) {
    fs.writeFileSync(CFG_FILE_NAME, JSON.stringify({...get(), ...record}, null, 4));
}

async function scan(message) {
    process.stdout.write(message);
    return await new Promise(function(resolve, reject) {
        process.stdin.resume();
        process.stdin.once("data", function(data) {
            process.stdin.pause();
            resolve(data.toString().trim());
        });
    });
}

async function getGasPrice(web3) {
    while (true) {
        const nodeGasPrice = await web3.eth.getGasPrice();
        const userGasPrice = await scan(`Enter gas-price or leave empty to use ${nodeGasPrice}: `);
        if (/^\d+$/.test(userGasPrice))
            return userGasPrice;
        if (userGasPrice == "")
            return nodeGasPrice;
        console.log("Illegal gas-price");
    }
}

async function getTransactionReceipt(web3) {
    while (true) {
        const hash = await scan("Enter transaction-hash or leave empty to retry: ");
        if (/^0x([0-9A-Fa-f]{64})$/.test(hash)) {
            const receipt = await web3.eth.getTransactionReceipt(hash);
            if (receipt)
                return receipt;
            console.log("Invalid transaction-hash");
        }
        else if (hash) {
            console.log("Illegal transaction-hash");
        }
        else {
            return null;
        }
    }
}

async function send(web3, account, gasPrice, transaction, value = 0, retry = true) {
    while (true) {
        try {
            const options = {
                to      : transaction._parent._address,
                data    : transaction.encodeABI(),
                gas     : Math.max(await transaction.estimateGas({from: account.address}), MIN_GAS_LIMIT),
                gasPrice: gasPrice ? gasPrice : await getGasPrice(web3),
                value   : value,
            };
            const signed  = await web3.eth.accounts.signTransaction(options, account.privateKey);
            const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
            return receipt;
        }
        catch (error) {
            console.log(error.message);
            if (retry) {
                const receipt = await getTransactionReceipt(web3);
                if (receipt)
                    return receipt;
            }
            else {
                return {};
            }
        }
    }
}

async function deploy(web3, account, gasPrice, contractId, contractName, contractArgs) {
    if (get()[contractId] == undefined) {
        const abi = fs.readFileSync(ARTIFACTS_DIR + contractName + ".abi", {encoding: "utf8"});
        const bin = fs.readFileSync(ARTIFACTS_DIR + contractName + ".bin", {encoding: "utf8"});
        const contract = new web3.eth.Contract(JSON.parse(abi));
        const options = {data: "0x" + bin, arguments: contractArgs};
        const transaction = contract.deploy(options);
        const receipt = await send(web3, account, gasPrice, transaction);
        const args = transaction.encodeABI().slice(options.data.length);
        console.log(`${contractId} deployed at ${receipt.contractAddress}`);
        set({[contractId]: {name: contractName, addr: receipt.contractAddress, args: args}});
    }
    return deployed(web3, contractName, get()[contractId].addr);
}

function deployed(web3, contractName, contractAddr) {
    const abi = fs.readFileSync(ARTIFACTS_DIR + contractName + ".abi", {encoding: "utf8"});
    return new web3.eth.Contract(JSON.parse(abi), contractAddr);
}

async function rpc(func) {
    while (true) {
        try {
            return await func.call();
        }
        catch (error) {
            if (!error.message.startsWith("Invalid JSON RPC response"))
                throw error;
        }
    }
}

async function updateAgent(airDropper, setAgent, newAgent) {
    while (await rpc(airDropper.methods.agent()) != newAgent)
        await setAgent(newAgent);
}

async function updateState(airDropper, expectedCRC, setState, newState) {
    assert.equal(await rpc(airDropper.methods.storedBalancesCRC()), expectedCRC);
    while (await rpc(airDropper.methods.state()) != newState)
        await setState(newState);
}

async function printStatus(relayToken, airDropper) {
    const balance = await rpc(relayToken.methods.balanceOf(airDropper._address));
    const supply  = await rpc(relayToken.methods.totalSupply());
    console.log(`${balance} out of ${supply} tokens remaining`);
}

async function execute(web3, web3Func, keyName, batchSize, getBalance, setBalance, lines) {
    const targets = lines.map(line => line.split(" ")[0]);
    const amounts = lines.map(line => line.split(" ")[1]);

    if (get()[keyName] == undefined)
        set({[keyName]: Array(Math.ceil(lines.length / batchSize)).fill({})});

    const transactions = get()[keyName];
    while (transactions.some(x => !x.done)) {
        for (let i = 0; i < transactions.length; i++) {
            if (!transactions[i].blockNumber) {
                const bgn = i * batchSize;
                const balance = await rpc(getBalance(targets[bgn]));
                if (balance == "0") {
                    const end = (i + 1) * batchSize;
                    const receipt = await web3Func(send, setBalance(targets.slice(bgn, end), amounts.slice(bgn, end)), 0, false);
                    transactions[i] = {blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed};
                    console.log(`${keyName} ${i} submitted: ${JSON.stringify(transactions[i])}`);
                    set({[keyName]: transactions});
                }
                else {
                    transactions[i].blockNumber = await web3.eth.getBlockNumber();
                    console.log(`${keyName} ${i} confirmed: ${JSON.stringify(transactions[i])}`);
                    set({[keyName]: transactions});
                }
            }
            else if (!transactions[i].done) {
                const bgn = i * batchSize;
                const balance = await rpc(getBalance(targets[bgn]));
                if (balance == "0") {
                    const end = (i + 1) * batchSize;
                    const receipt = await web3Func(send, setBalance(targets.slice(bgn, end), amounts.slice(bgn, end)), 0, false);
                    transactions[i] = {blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed};
                    console.log(`${keyName} ${i} resubmitted: ${JSON.stringify(transactions[i])}`);
                    set({[keyName]: transactions});
                }
                else if (transactions[i].blockNumber + 12 <= await web3.eth.getBlockNumber()) {
                    transactions[i].done = true;
                    console.log(`${keyName} ${i} concluded: ${JSON.stringify(transactions[i])}`);
                    set({[keyName]: transactions});
                }
                else {
                    web3.currentProvider.send({method: "evm_mine"}, () => {});
                }
            }
        }
    }
}

async function run() {
    const web3 = new Web3(NODE_ADDRESS);

    const gasPrice = await getGasPrice(web3);
    const account  = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
    const web3Func = (func, ...args) => func(web3, account, gasPrice, ...args);
    const lines    = fs.readFileSync(SRC_FILE_NAME, {encoding: "utf8"}).split(os.EOL).slice(0, -1);
    const iterator = (f, g) => lines.map(line => line.split(" ")).reduce((a, b) => f(a, Web3.utils.toBN(g(b))), Web3.utils.toBN(0));

    if (TEST_MODE) {
        const total = iterator((a, b) => a.add(b), b => b[1]).toString();

        const registry   = await web3Func(deploy, "registry"  , "ContractRegistry", []);
        const airDropper = await web3Func(deploy, "airDropper", "AirDropper"      , []);
        const relayToken = await web3Func(deploy, "relayToken", "SmartToken"      , ["name", "symbol", 0]);
        const dummyToken = await web3Func(deploy, "dummyToken", "ERC20Token"      , ["name", "symbol", 0, 0]);
        const converter  = await web3Func(deploy, "converter" , "BancorConverter" , [relayToken._address, registry._address, 0, dummyToken._address, 1000000]);
        const bancorX    = await web3Func(deploy, "bancorX"   , "BancorX"         , [total, total, 0, total, 0, registry._address, relayToken._address, true]);

        let phase = 0;
        if (get().phase == undefined)
            set({phase});

        const executePhase = async (transaction, ...args) => {
            if (get().phase == phase++) {
                await web3Func(send, transaction, ...args);
                console.log(`phase ${phase} executed`);
                set({phase});
            }
        };

        await executePhase(relayToken.methods.issue(airDropper._address, total));
        await executePhase(relayToken.methods.transferOwnership(converter._address));
        await executePhase(converter .methods.acceptTokenOwnership());
        await executePhase(converter .methods.setBancorX(bancorX._address));

        lines[0] = bancorX._address + " " + lines[0].split(" ")[1] + " " + Web3.utils.asciiToHex(TEST_MODE);
    }

    const airDropper = deployed(web3, "AirDropper", get().airDropper.addr);
    const relayToken = deployed(web3, "SmartToken", get().relayToken.addr);
    const bancorX    = deployed(web3, "BancorX"   , get().bancorX   .addr);

    const initialCRC = "0x" + Web3.utils.toBN(0).toString(16, 64);
    const updatedCRC = "0x" + iterator((a, b) => a.xor(b), b => Web3.utils.soliditySha3(b[0], b[1])).toString(16, 64);

    const setAgent    = TEST_MODE ? (input) => web3Func(send, airDropper.methods.setAgent(input)) : (input) => scan(`Press enter after executing transaction 'setAgent(${input})'...`);
    const setState    = TEST_MODE ? (input) => web3Func(send, airDropper.methods.setState(input)) : (input) => scan(`Press enter after executing transaction 'setState(${input})'...`);
    const storeBatch  = () => execute(web3, web3Func, "storeBatch" , S_BATCH_SIZE, airDropper.methods.storedBalances     , (targets, amounts) => airDropper.methods.storeBatch (targets, amounts), lines);
    const transferEos = () => execute(web3, web3Func, "transferEos", T_BATCH_SIZE, airDropper.methods.transferredBalances, (targets, amounts) => airDropper.methods.transferEos(bancorX._address, targets[0], amounts[0]), [lines[0]]);
    const transferEth = () => execute(web3, web3Func, "transferEth", T_BATCH_SIZE, airDropper.methods.transferredBalances, (targets, amounts) => airDropper.methods.transferEth(relayToken._address, targets, amounts), lines.slice(1));

    assert.equal(lines[0].split(" ")[0], bancorX._address);

    await updateAgent(airDropper, setAgent, account.address);
    await updateState(airDropper, initialCRC, setState, 0);
    await storeBatch();
    await printStatus(relayToken, airDropper);
    await updateState(airDropper, updatedCRC, setState, 1);
    await updateState(airDropper, updatedCRC, setState, 2);
    await transferEos();
    await printStatus(relayToken, airDropper);
    await transferEth();
    await printStatus(relayToken, airDropper);

    if (web3.currentProvider.constructor.name == "WebsocketProvider")
        web3.currentProvider.connection.close();
}

require("../fix")(fs);
run();