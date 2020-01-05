const os     = require("os");
const fs     = require("fs");
const Web3   = require("web3");
const assert = require("assert");

const SRC_FILE_NAME = process.argv[2];
const DST_FILE_NAME = process.argv[3];
const TOKEN_ADDRESS = process.argv[4];
const INFURA_KEY    = process.argv[5];
const LAST_BLOCK    = process.argv[6];

const ARTIFACTS_DIR = __dirname + "/../../build/";

async function rpc(method) {
    while (true) {
        try {
            return Web3.utils.toBN(await method.call(null, LAST_BLOCK));
        }
        catch (error) {
            if (!error.message.startsWith("Invalid JSON RPC response"))
                return Web3.utils.toBN(0);
        }
    }
}

async function get(method, blockNumber) {
    while (true) {
        try {
            return await method.call(null, blockNumber);
        }
        catch (error) {
            if (!error.message.startsWith("Invalid JSON RPC response"))
                return Web3.utils.toBN(0);
        }
    }
}

async function run() {
    fs.writeFileSync(DST_FILE_NAME, "", {encoding: "utf8"});

    const web3 = new Web3("https://mainnet.infura.io/v3/" + INFURA_KEY);
    const abi = fs.readFileSync(ARTIFACTS_DIR + "IVault.abi", {encoding: "utf8"});
    const contract = new web3.eth.Contract(JSON.parse(abi), TOKEN_ADDRESS);
    const balances = {[TOKEN_ADDRESS]: await rpc(contract.methods.rawTotalBalance())};
    const auctions = {};

    for (const line of fs.readFileSync(SRC_FILE_NAME, {encoding: "utf8"}).split(os.EOL).slice(0, -1)) {
        const words = line.split(" ");
        switch (words[0]) {
            case "Transfer":
                const src = Web3.utils.toChecksumAddress(words[1].slice(-40));
                const dst = Web3.utils.toChecksumAddress(words[2].slice(-40));
                const val = Web3.utils.toBN(words[3]);
                balances[src] = src in balances ? balances[src].sub(val) : val.neg();
                balances[dst] = dst in balances ? balances[dst].add(val) : val;
                break;
            case "AuctBgn":
                const borrower = Web3.utils.toChecksumAddress(words[1].slice(-40));
                auctions[borrower] = await get(contract.methods.auctions(borrower), words[2]);
                balances[auctions[borrower]] = balances[borrower];
                balances[borrower] = Web3.utils.toBN(0);
                break;
            case "AuctEnd":
                const source = Web3.utils.toChecksumAddress(words[1].slice(-40));
                const target = Web3.utils.toChecksumAddress(words[2].slice(-40));
                const amount = Web3.utils.toBN(words[3]);
                balances[target] = balances[auctions[source]].sub(amount).add(target in balances ? balances[target] : Web3.utils.toBN(0));
                balances[source] = amount.add(source in balances ? balances[source] : Web3.utils.toBN(0));
                balances[auctions[source]] = Web3.utils.toBN(0);
                break;
        }
    }

    for (const [address, balance] of Object.entries(balances)) {
        assert(balance.eq(await rpc(contract.methods.rawBalanceOf(address))));
        const line = address + " " + balance.toString() + os.EOL;
        if (balance.gtn(0))
            fs.appendFileSync(DST_FILE_NAME, line, {encoding: "utf8"});
        process.stdout.write(line);
    }
}

require("../fix")(fs);
run();