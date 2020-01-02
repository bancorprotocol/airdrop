const os     = require("os");
const fs     = require("fs");
const Web3   = require("web3");
const assert = require("assert");

const SRC_FILE_NAME = process.argv[2];
const DST_FILE_NAME = process.argv[3];
const CONTRACT_ADDR = process.argv[4];
const ACCOUNT_ADDR  = process.argv[5];

function repair(data) {
    const amount = data
    .split(os.EOL).slice(0, -1)
    .map(line => line.split(" "))
    .filter(words => words[0] == CONTRACT_ADDR || words[0] == ACCOUNT_ADDR)
    .reduce((a, b) => a.add(Web3.utils.toBN(b[1])), Web3.utils.toBN(0)).toString();
    return data
    .split(os.EOL).slice(0, -1)
    .map(line => line.split(" "))
    .map(words => [words[0], words[0] == ACCOUNT_ADDR ? amount : words[1], ...words.slice(2)])
    .filter(words => words[0] != CONTRACT_ADDR)
    .map(words => words.join(" "))
    .join(os.EOL) + os.EOL;
}

function map(data) {
    return data
    .split(os.EOL).slice(0, -1)
    .map(line => line.split(" "))
    .reduce((a, b) => ({...a, [b[0]]: b[1]}), {});
}

function sum(data) {
    return data
    .split(os.EOL).slice(0, -1)
    .map(line => line.split(" "))
    .reduce((a, b) => a.add(Web3.utils.toBN(b[1])), Web3.utils.toBN(0)).toString();
}

fs.writeFileSync(DST_FILE_NAME, repair(fs.readFileSync(SRC_FILE_NAME, {encoding: "utf8"})), {encoding: "utf8"});

const srcMap = map(fs.readFileSync(SRC_FILE_NAME, {encoding: "utf8"}));
const dstMap = map(fs.readFileSync(DST_FILE_NAME, {encoding: "utf8"}));
const srcSum = sum(fs.readFileSync(SRC_FILE_NAME, {encoding: "utf8"}));
const dstSum = sum(fs.readFileSync(DST_FILE_NAME, {encoding: "utf8"}));

for (const address of Object.keys(srcMap)) {
    const getVal = address => {
        switch (address) {
            case CONTRACT_ADDR: return undefined;
            case ACCOUNT_ADDR: return Web3.utils.toBN(srcMap[CONTRACT_ADDR]).add(Web3.utils.toBN(srcMap[ACCOUNT_ADDR])).toString();
            default: return srcMap[address];
        }
    };
    const expected = JSON.stringify({[address]: getVal(address)});
    const actual   = JSON.stringify({[address]: dstMap[address]});
    assert.equal(actual, expected);
}

for (const address of Object.keys(dstMap)) {
    const getVal = address => {
        switch (address) {
            case ACCOUNT_ADDR: return Web3.utils.toBN(srcMap[CONTRACT_ADDR]).add(Web3.utils.toBN(srcMap[ACCOUNT_ADDR])).toString();
            default: return srcMap[address];
        }
    };
    const expected = JSON.stringify({[address]: dstMap[address]});
    const actual   = JSON.stringify({[address]: getVal(address)});
    assert.equal(actual, expected);
}

console.log("SRC: number of addresses = " + Object.keys(srcMap).length.toString() + ", total amount = " + srcSum);
console.log("DST: number of addresses = " + Object.keys(dstMap).length.toString() + ", total amount = " + dstSum);
