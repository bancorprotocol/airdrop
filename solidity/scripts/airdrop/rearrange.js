const os   = require("os");
const fs   = require("fs");
const Web3 = require("web3");

const SRC_FILE_NAME = process.argv[2];
const DST_FILE_NAME = process.argv[3];
const NUMERATOR     = process.argv[4];
const DENOMINATOR   = process.argv[5];

function rearrange(data) {
    return data
    .split(os.EOL).slice(0, -1)
    .map(line => line.split(" "))
    .sort((a, b) => a[0] < b[0])
    .map(words => Object.assign([], words, {[1]: Web3.utils.toBN(words[1]).muln(Number(NUMERATOR)).divn(Number(DENOMINATOR)).toString()}))
    .filter(words => words[1] != "0")
    .map(words => words.join(" "))
    .join(os.EOL) + os.EOL;
}

function sum(data) {
    return data
    .split(os.EOL).slice(0, -1)
    .map(line => line.split(" "))
    .reduce((a, b) => a.add(Web3.utils.toBN(b[1])), Web3.utils.toBN(0)).toString();
}

fs.writeFileSync(DST_FILE_NAME, rearrange(fs.readFileSync(SRC_FILE_NAME, {encoding: "utf8"})), {encoding: "utf8"});
console.log("Source total supply = " + sum(fs.readFileSync(SRC_FILE_NAME, {encoding: "utf8"})));
console.log("Target total supply = " + sum(fs.readFileSync(DST_FILE_NAME, {encoding: "utf8"})));
