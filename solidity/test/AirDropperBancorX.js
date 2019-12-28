contract("AirDropperBancorX", function(accounts) {
    let registry;
    let airDropper;
    let relayToken;
    let dummyToken;
    let converter;
    let bancorX;

    const owner     = accounts[1];
    const executor  = accounts[2];
    const stranger  = accounts[3];
    const receiver  = accounts[4];
    const reporters = accounts.slice(5);

    const catchRevert = require("bancor-contracts/solidity/test/helpers/Utils.js").catchRevert;

    const DESTINATION_ADDRESS = web3.fromAscii("DESTINATION_ADDRESS");
    const MAX_LOCK_LIMIT      = web3.toBigNumber("40000000000000000000000");
    const MAX_RELEASE_LIMIT   = web3.toBigNumber("80000000000000000000000");
    const MIN_LIMIT           = web3.toBigNumber("00001000000000000000000");
    const LIMIT_INC_PER_BLOCK = web3.toBigNumber("00030000000000000000000");
    const BANCOR_X_PARAMS     = [MAX_LOCK_LIMIT, MAX_RELEASE_LIMIT, MIN_LIMIT, LIMIT_INC_PER_BLOCK];

    const TEST_AMOUNT    = MIN_LIMIT.plus(1);
    const TRANSACTION_ID = "0x123456789ABCD";

    beforeEach(async function() {
        registry   = await artifacts.require("ContractRegistry").new({from: owner});
        airDropper = await artifacts.require("AirDropper"      ).new({from: owner});
        relayToken = await artifacts.require("SmartToken"      ).new("name", "symbol", 0, {from: owner});
        dummyToken = await artifacts.require("ERC20Token"      ).new("name", "symbol", 0, 0, {from: owner});
        converter  = await artifacts.require("BancorConverter" ).new(relayToken.address, registry.address, 0, dummyToken.address, 1000000, {from: owner});
        bancorX    = await artifacts.require("BancorX"         ).new(...BANCOR_X_PARAMS, reporters.length, registry.address, relayToken.address, true, {from: owner});

        await relayToken.issue(airDropper.address, TEST_AMOUNT, {from: owner});
        await relayToken.transferOwnership(converter.address, {from: owner});
        await converter.acceptTokenOwnership({from: owner});
        await converter.setBancorX(bancorX.address, {from: owner});

        for (const reporter of reporters)
            await bancorX.setReporter(reporter, true, {from: owner});
    });

    describe("negative assertion:", function() {
        it("function transferEos should abort with an error if called by a non-executor", async function() {
            await airDropper.set(executor, {from: owner});
            await airDropper.storeAll([bancorX.address], [TEST_AMOUNT], {from: executor});
            await airDropper.disableStore({from: owner});
            await airDropper.enableTransfer({from: owner});
            await catchRevert(airDropper.transferEos(bancorX.address, DESTINATION_ADDRESS, TEST_AMOUNT, {from: stranger}));
        });

        it("function transferEos should abort with an error if called before disableStore", async function() {
            await airDropper.set(executor, {from: owner});
            await airDropper.storeAll([bancorX.address], [TEST_AMOUNT], {from: executor});
            await catchRevert(airDropper.transferEos(bancorX.address, DESTINATION_ADDRESS, TEST_AMOUNT, {from: executor}));
        });

        it("function transferEos should abort with an error if called before enableTransfer", async function() {
            await airDropper.set(executor, {from: owner});
            await airDropper.storeAll([bancorX.address], [TEST_AMOUNT], {from: executor});
            await airDropper.disableStore({from: owner});
            await catchRevert(airDropper.transferEos(bancorX.address, DESTINATION_ADDRESS, TEST_AMOUNT, {from: executor}));
        });

        it("function transferEos should abort with an error if called twice", async function() {
            await airDropper.set(executor, {from: owner});
            await airDropper.storeAll([bancorX.address], [TEST_AMOUNT], {from: executor});
            await airDropper.disableStore({from: owner});
            await airDropper.enableTransfer({from: owner});
            await airDropper.transferEos(bancorX.address, DESTINATION_ADDRESS, TEST_AMOUNT, {from: executor});
            await catchRevert(airDropper.transferEos(bancorX.address, DESTINATION_ADDRESS, TEST_AMOUNT, {from: executor}));
        });
    });

    describe("positive assertion:", function() {
        it("function transferEos should complete successfully", async function() {
            await airDropper.set(executor, {from: owner});
            await airDropper.storeAll([bancorX.address], [TEST_AMOUNT], {from: executor});
            await airDropper.disableStore({from: owner});
            await airDropper.enableTransfer({from: owner});
            assert.equal((await airDropper.transferredBalances(bancorX.address)).toString(), 0);
            await airDropper.transferEos(bancorX.address, DESTINATION_ADDRESS, TEST_AMOUNT, {from: executor});
            assert.equal((await airDropper.transferredBalances(bancorX.address)).toString(), TEST_AMOUNT);
            for (const reporter of reporters) {
                assert.equal((await relayToken.balanceOf(receiver)).toString(), 0);
                await bancorX.reportTx("eos", TRANSACTION_ID, receiver, TEST_AMOUNT, 0, {from: reporter});
            }
            assert.equal((await relayToken.balanceOf(receiver)).toString(), TEST_AMOUNT);
        });
    });
});
