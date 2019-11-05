// See <https://www.npmjs.com/package/solidity-coverage#options>
module.exports = {
    port:           7555,
    norpc:          true,
    testCommand:    "node ../../node_modules/truffle/build/cli.bundled.js test --network=coverage",
    compileCommand: "node ../../node_modules/truffle/build/cli.bundled.js compile --network=coverage",
    copyPackages:   ["bancor-contracts"],
    skipFiles:      ["IConverter.sol", "IVault.sol", "helpers/Importer.sol", "helpers/Migrations.sol"]
};
