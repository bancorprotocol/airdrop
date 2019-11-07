contract("AirDropperTransferX", function(accounts) {
    let registry;
    let smartToken;
    let erc20Token;
    let converter;
    let bancorX;
    let dropper;

    const owner     = accounts[0];
    const nonOwner  = accounts[1];
    const receiver  = accounts[2];
    const reporters = accounts.slice(3);

    const catchRevert = require("bancor-contracts/solidity/test/helpers/Utils.js").catchRevert;

    const NETWORK_NAME = web3.fromAscii("NETWORK_NAME");
    const NETWORK_ADDR = web3.fromAscii("NETWORK_ADDR");

    const MAX_LOCK_LIMIT      = web3.toBigNumber("40000000000000000000000");
    const MAX_RELEASE_LIMIT   = web3.toBigNumber("80000000000000000000000");
    const MIN_LIMIT           = web3.toBigNumber("00001000000000000000000");
    const LIMIT_INC_PER_BLOCK = web3.toBigNumber("00030000000000000000000");
    const BANCOR_X_PARAMS     = [MAX_LOCK_LIMIT, MAX_RELEASE_LIMIT, MIN_LIMIT, LIMIT_INC_PER_BLOCK];

    const TEST_AMOUNT    = MIN_LIMIT;
    const X_TRANSFER_ID  = "12345678";
    const TRANSACTION_ID = "87654321";

    before(async function() {
        registry   = await artifacts.require("ContractRegistry").new({from: owner});
        smartToken = await artifacts.require("SmartToken"      ).new("smartTokenName", "smartTokenSymbol", 0, {from: owner});
        erc20Token = await artifacts.require("ERC20Token"      ).new("erc20TokenName", "erc20TokenSymbol", 0, 0, {from: owner});
        converter  = await artifacts.require("BancorConverter" ).new(smartToken.address, registry.address, 0, erc20Token.address, 1000000, {from: owner});
        bancorX    = await artifacts.require("BancorX"         ).new(...BANCOR_X_PARAMS, reporters.length, registry.address, smartToken.address, true, {from: owner});
        dropper    = await artifacts.require("AirDropper"      ).new(smartToken.address, {from: owner});

        await registry.registerAddress(web3.fromAscii("BancorX"), bancorX.address);
        await converter.setBancorX(bancorX.address, {from: owner});

        await smartToken.issue(owner, TEST_AMOUNT, {from: owner});
        await smartToken.transfer(dropper.address, TEST_AMOUNT, {from: owner});
        await smartToken.transferOwnership(converter.address, {from: owner});
        await converter.acceptTokenOwnership({from: owner});

        for (const reporter of reporters)
            await bancorX.setReporter(reporter, true)
    });

    it("function executeOnce should abort with an error if called by a non-owner", async function() {
        await catchRevert(dropper.executeOnce(bancorX.address, NETWORK_NAME, NETWORK_ADDR, TEST_AMOUNT, X_TRANSFER_ID, {from: nonOwner}));
    });

    it("function executeOnce should complete successfully if called by an owner", async function() {
        await dropper.executeOnce(bancorX.address, NETWORK_NAME, NETWORK_ADDR, TEST_AMOUNT, X_TRANSFER_ID, {from: owner});
    });

    it("function executeOnce should abort with an error if called more than once", async function() {
        await catchRevert(dropper.executeOnce(bancorX.address, NETWORK_NAME, NETWORK_ADDR, TEST_AMOUNT, X_TRANSFER_ID, {from: owner}));
    });

    for (let i = 0; i < reporters.length; i++) {
        it(`balance before report #${i + 1} should be 0`, async function() {
            assert.equal((await smartToken.balanceOf(receiver)).toFixed(), "0");
            await bancorX.reportTx(NETWORK_NAME, TRANSACTION_ID, receiver, TEST_AMOUNT, X_TRANSFER_ID, {from: reporters[i]})
        });
    }

    it(`balance after ${reporters.length} reports should be ${TEST_AMOUNT}`, async function() {
        assert.equal((await smartToken.balanceOf(receiver)).toFixed(), TEST_AMOUNT.toFixed());
    });
});
