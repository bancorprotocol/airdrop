const os      = require("os");
const fs      = require("fs");
const Web3    = require("web3");
const request = require("request");

const DST_FILE_NAME = process.argv[2];
const TOKEN_ADDRESS = process.argv[3];
const ETHERSCAN_KEY = process.argv[4];
const LAST_BLOCK    = process.argv[5];

const POSITIVE_EVENT = Web3.utils.keccak256("Deposit(address,uint256)");
const NEGATIVE_EVENT = Web3.utils.keccak256("Withdraw(address,address,uint256)");
const AUCT_BGN_EVENT = Web3.utils.keccak256("AuctionStarted(address)");
const AUCT_END_EVENT = Web3.utils.keccak256("AuctionEnded(address,address,uint256)");

const PADDED_ADDRESS = "0x" + "0".repeat(66 - TOKEN_ADDRESS.length) + TOKEN_ADDRESS.slice(2);
const BASE_URL_1     = "http://api.etherscan.io/api?module=account&action=txlist&address=" + TOKEN_ADDRESS + "&apikey=" + ETHERSCAN_KEY;
const BASE_URL_2     = "http://api.etherscan.io/api?module=logs&action=getLogs&address="   + TOKEN_ADDRESS + "&apikey=" + ETHERSCAN_KEY;
const MAX_RESULTS    = 1000;

function init() {
    request(BASE_URL_1, {timeout: 10000}, function(error, response, body) {
        const parsed = parse(body);
        if (parsed.result && parsed.result.length > 0) {
            if (parsed.result[0].to == "") {
                console.log(`error = ${error}, status = ${response.statusCode}, message = ${parsed.message}, block = ${parsed.result[0].blockNumber}`);
                scan(Number(parsed.result[0].blockNumber), Number(LAST_BLOCK) - Number(parsed.result[0].blockNumber) + 1);
            }
            else {
                console.log(`error = ${error}, status = ${response.statusCode}, message = ${parsed.message}, block = 0`);
                scan(0, Number(LAST_BLOCK) + 1);
            }
        }
        else {
            console.log(`error = ${error}; retrying...`);
            init();
        }
    });
}

function scan(fromBlock, numOfBlocks) {
    const toBlock = Math.min(fromBlock + numOfBlocks - 1, LAST_BLOCK);
    if (fromBlock <= toBlock) {
        request(`${BASE_URL_2}&fromBlock=${fromBlock}&toBlock=${toBlock}`, {timeout: 10000}, function(error, response, body) {
            const parsed = parse(body);
            if (parsed.result) {
                if (parsed.result.length < MAX_RESULTS) {
                    console.log(`blocks ${fromBlock} + ${numOfBlocks}: error = ${error}, status = ${response.statusCode}, message = ${parsed.message}, events = ${parsed.result.length}`);
                    for (const entry of parsed.result) {
                        switch (entry.topics[0]) {
                            case POSITIVE_EVENT: fs.appendFileSync(DST_FILE_NAME, `Transfer ${PADDED_ADDRESS} ${entry.topics[1]} ${entry.data}` + os.EOL, {encoding: "utf8"}); break;
                            case NEGATIVE_EVENT: fs.appendFileSync(DST_FILE_NAME, `Transfer ${entry.topics[1]} ${PADDED_ADDRESS} ${entry.data}` + os.EOL, {encoding: "utf8"}); break;
                            case AUCT_BGN_EVENT: fs.appendFileSync(DST_FILE_NAME, `AuctBgn ${entry.topics[1]} ${entry.blockNumber}`             + os.EOL, {encoding: "utf8"}); break;
                            case AUCT_END_EVENT: fs.appendFileSync(DST_FILE_NAME, `AuctEnd ${entry.topics[1]} ${entry.topics[2]} ${entry.data}` + os.EOL, {encoding: "utf8"}); break;
                        }
                    }
                    scan(toBlock + 1, numOfBlocks + 1);
                }
                else {
                    console.log(`blocks ${fromBlock} + ${numOfBlocks}: error = ${error}, status = ${response.statusCode}, message = ${parsed.message}, events = ${parsed.result.length}; retrying...`);
                    scan(fromBlock, numOfBlocks >> 1);
                }
            }
            else {
                console.log(`blocks ${fromBlock} + ${numOfBlocks}: error = ${error}; retrying...`);
                scan(fromBlock, numOfBlocks);
            }
        });
    }
}

function parse(str) {
    try {
        return JSON.parse(str);
    }
    catch (error) {
        return {};
    }
}

function run() {
    fs.writeFileSync(DST_FILE_NAME, "", {encoding: "utf8"});
    init();
}

require("../fix")(fs);
run();