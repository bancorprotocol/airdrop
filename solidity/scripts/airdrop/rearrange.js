const os     = require("os");
const fs     = require("fs");
const Web3   = require("web3");
const assert = require("assert");

const SRC_FILE_NAME = process.argv[2];
const DST_FILE_NAME = process.argv[3];
const NUMERATOR     = process.argv[4];
const DENOMINATOR   = process.argv[5];

function rearrange(data) {
    return data
    .split(os.EOL).slice(0, -1)
    .map(line => line.split(" "))
    .sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0])
    .map(words => [words[0], Web3.utils.toBN(words[1]).muln(Number(NUMERATOR)).divn(Number(DENOMINATOR)).toString(), ...words.slice(2)])
    .filter(words => words[1] != "0")
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

fs.writeFileSync(DST_FILE_NAME, rearrange(fs.readFileSync(SRC_FILE_NAME, {encoding: "utf8"})), {encoding: "utf8"});

const srcMap = map(fs.readFileSync(SRC_FILE_NAME, {encoding: "utf8"}));
const dstMap = map(fs.readFileSync(DST_FILE_NAME, {encoding: "utf8"}));
const srcSum = sum(fs.readFileSync(SRC_FILE_NAME, {encoding: "utf8"}));
const dstSum = sum(fs.readFileSync(DST_FILE_NAME, {encoding: "utf8"}));

for (const address of Object.keys(srcMap)) {
    const amount   = Web3.utils.toBN(srcMap[address]).muln(Number(NUMERATOR)).divn(Number(DENOMINATOR)).toString();
    const expected = JSON.stringify({[address]: amount != "0" ? amount : undefined});
    const actual   = JSON.stringify({[address]: dstMap[address]});
    assert.equal(actual, expected);
}

for (const address of Object.keys(dstMap)) {
    const amount   = Web3.utils.toBN(srcMap[address]).muln(Number(NUMERATOR)).divn(Number(DENOMINATOR)).toString();
    const expected = JSON.stringify({[address]: amount});
    const actual   = JSON.stringify({[address]: dstMap[address]});
    assert.equal(actual, expected);
}

console.log("SRC: number of addresses = " + Object.keys(srcMap).length.toString() + ", total amount = " + srcSum);
console.log("DST: number of addresses = " + Object.keys(dstMap).length.toString() + ", total amount = " + dstSum);
