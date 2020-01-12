const os     = require("os");
const fs     = require("fs");
const Web3   = require("web3");
const assert = require("assert");

const SRC_FILE_NAME = process.argv[2];
const DST_FILE_NAME = process.argv[3];
const OLD_BANCOR_X  = process.argv[4];
const NEW_BANCOR_X  = process.argv[5];

function run(data) {
    const lines = data.split(os.EOL).slice(0, -1);
    lines.unshift(lines.splice(lines.findIndex(line => line.split(" ")[0] == OLD_BANCOR_X), 1)[0]);
    lines[0] = NEW_BANCOR_X + " " + lines[0].split(" ")[1] + " " + Web3.utils.asciiToHex("airdropsdac1");
    return lines.join(os.EOL) + os.EOL;
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

fs.writeFileSync(DST_FILE_NAME, run(fs.readFileSync(SRC_FILE_NAME, {encoding: "utf8"})), {encoding: "utf8"});

const srcMap = map(fs.readFileSync(SRC_FILE_NAME, {encoding: "utf8"}));
const dstMap = map(fs.readFileSync(DST_FILE_NAME, {encoding: "utf8"}));
const srcSum = sum(fs.readFileSync(SRC_FILE_NAME, {encoding: "utf8"}));
const dstSum = sum(fs.readFileSync(DST_FILE_NAME, {encoding: "utf8"}));

for (const address of Object.keys(srcMap)) {
    const getVal = address => {
        switch (address) {
            case OLD_BANCOR_X: return undefined;
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
            case NEW_BANCOR_X: return srcMap[OLD_BANCOR_X];
            default: return srcMap[address];
        }
    };
    const expected = JSON.stringify({[address]: dstMap[address]});
    const actual   = JSON.stringify({[address]: getVal(address)});
    assert.equal(actual, expected);
}

console.log("SRC: number of addresses = " + Object.keys(srcMap).length.toString() + ", total amount = " + srcSum);
console.log("DST: number of addresses = " + Object.keys(dstMap).length.toString() + ", total amount = " + dstSum);
