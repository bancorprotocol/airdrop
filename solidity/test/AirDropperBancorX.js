contract("AirDropperBancorX", function(accounts) {
    let registry;
    let airDropper;
    let relayToken;
    let dummyToken;
    let converter;
    let bancorX;

    const owner     = accounts[1];
    const sender    = accounts[2];
    const nonOwner  = accounts[3];
    const nonSender = accounts[4];
    const receiver  = accounts[5];
    const reporters = accounts.slice(6);

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
        relayToken = await artifacts.require("SmartToken"      ).new("smartTokenName", "smartTokenSymbol", 0, {from: owner});
        dummyToken = await artifacts.require("ERC20Token"      ).new("erc20TokenName", "erc20TokenSymbol", 0, 0, {from: owner});
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
        it("function sendEos should abort with an error if called by a non-sender", async function() {
            await airDropper.set(sender, {from: owner});
            await airDropper.saveAll([bancorX.address], [TEST_AMOUNT], {from: sender});
            await airDropper.disableSave({from: owner});
            await airDropper.enableSend({from: owner});
            await catchRevert(airDropper.sendEos(bancorX.address, DESTINATION_ADDRESS, TEST_AMOUNT, {from: nonSender}));
        });

        it("function sendEos should abort with an error if called before disableSave", async function() {
            await airDropper.set(sender, {from: owner});
            await airDropper.saveAll([bancorX.address], [TEST_AMOUNT], {from: sender});
            await catchRevert(airDropper.sendEos(bancorX.address, DESTINATION_ADDRESS, TEST_AMOUNT, {from: sender}));
        });

        it("function sendEos should abort with an error if called before enableSend", async function() {
            await airDropper.set(sender, {from: owner});
            await airDropper.saveAll([bancorX.address], [TEST_AMOUNT], {from: sender});
            await airDropper.disableSave({from: owner});
            await catchRevert(airDropper.sendEos(bancorX.address, DESTINATION_ADDRESS, TEST_AMOUNT, {from: sender}));
        });

        it("function sendEos should abort with an error if called twice", async function() {
            await airDropper.set(sender, {from: owner});
            await airDropper.saveAll([bancorX.address], [TEST_AMOUNT], {from: sender});
            await airDropper.disableSave({from: owner});
            await airDropper.enableSend({from: owner});
            await airDropper.sendEos(bancorX.address, DESTINATION_ADDRESS, TEST_AMOUNT, {from: sender});
            await catchRevert(airDropper.sendEos(bancorX.address, DESTINATION_ADDRESS, TEST_AMOUNT, {from: sender}));
        });
    });

    describe("positive assertion:", function() {
        it("function sendEos should complete successfully", async function() {
            await airDropper.set(sender, {from: owner});
            await airDropper.saveAll([bancorX.address], [TEST_AMOUNT], {from: sender});
            await airDropper.disableSave({from: owner});
            await airDropper.enableSend({from: owner});
            assert.equal((await airDropper.sendBalances(bancorX.address)).toString(), 0);
            await airDropper.sendEos(bancorX.address, DESTINATION_ADDRESS, TEST_AMOUNT, {from: sender});
            assert.equal((await airDropper.sendBalances(bancorX.address)).toString(), TEST_AMOUNT);
            for (const reporter of reporters) {
                assert.equal((await relayToken.balanceOf(receiver)).toString(), 0);
                await bancorX.reportTx("eos", TRANSACTION_ID, receiver, TEST_AMOUNT, 0, {from: reporter});
            }
            assert.equal((await relayToken.balanceOf(receiver)).toString(), TEST_AMOUNT);
        });
    });
});
