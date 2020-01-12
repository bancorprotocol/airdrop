const os     = require("os");
const fs     = require("fs");
const Web3   = require("web3");
const assert = require("assert");

const SRC_FILE_NAME = process.argv[2];
const DST_FILE_NAME = process.argv[3];

function run(data) {
    return data
    .split(os.EOL)[0] + os.EOL + data
    .split(os.EOL).slice(1, -1)
    .map(line => line.split(" "))
    .sort((a, b) => Web3.utils.toBN(a[0]).cmp(Web3.utils.toBN(b[0])))
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

fs.writeFileSync(DST_FILE_NAME, run(fs.readFileSync(SRC_FILE_NAME, {encoding: "utf8"})), {encoding: "utf8"});

const srcMap = map(fs.readFileSync(SRC_FILE_NAME, {encoding: "utf8"}));
const dstMap = map(fs.readFileSync(DST_FILE_NAME, {encoding: "utf8"}));
const srcSum = sum(fs.readFileSync(SRC_FILE_NAME, {encoding: "utf8"}));
const dstSum = sum(fs.readFileSync(DST_FILE_NAME, {encoding: "utf8"}));

for (const address of Object.keys(srcMap)) {
    const expected = JSON.stringify({[address]: srcMap[address]});
    const actual   = JSON.stringify({[address]: dstMap[address]});
    assert.equal(actual, expected);
}

for (const address of Object.keys(dstMap)) {
    const expected = JSON.stringify({[address]: dstMap[address]});
    const actual   = JSON.stringify({[address]: srcMap[address]});
    assert.equal(actual, expected);
}

console.log("SRC: number of addresses = " + Object.keys(srcMap).length.toString() + ", total amount = " + srcSum);
console.log("DST: number of addresses = " + Object.keys(dstMap).length.toString() + ", total amount = " + dstSum);
