contract("AirDropper", function(accounts) {
    let relayToken;
    let airDropper;

    const users    = accounts;
    const owner    = accounts[1];
    const executor = accounts[2];
    const stranger = accounts[3];

    const values = users.map((x, i) => i + 1);
    const supply = values.reduce((a, b) => a + b, 0);

    const catchRevert = require("bancor-contracts/solidity/test/helpers/Utils.js").catchRevert;
    const zeroAddress = require("bancor-contracts/solidity/test/helpers/Utils.js").zeroAddress;

    beforeEach(async function() {
        relayToken = await artifacts.require("SmartToken").new("name", "symbol", 0, {from: owner});
        airDropper = await artifacts.require("AirDropper").new({from: owner});
        await relayToken.issue(airDropper.address, supply, {from: owner});
    });

    describe("negative assertion:", function() {
        it("function set should abort with an error if called by a non-owner", async function() {
            await catchRevert(airDropper.set(executor, {from: stranger}));
        });

        it("function disableStore should abort with an error if called by a non-owner", async function() {
            await catchRevert(airDropper.disableStore({from: stranger}));
        });

        it("function disableStore should abort with an error if called after disableStore", async function() {
            await airDropper.disableStore({from: owner});
            await catchRevert(airDropper.disableStore({from: owner}));
        });

        it("function disableStore should abort with an error if called after enableTransfer", async function() {
            await airDropper.disableStore({from: owner});
            await airDropper.enableTransfer({from: owner});
            await catchRevert(airDropper.disableStore({from: owner}));
        });

        it("function enableTransfer should abort with an error if called by a non-owner", async function() {
            await catchRevert(airDropper.enableTransfer({from: stranger}));
        });

        it("function enableTransfer should abort with an error if called before disableStore", async function() {
            await catchRevert(airDropper.enableTransfer({from: owner}));
        });

        it("function enableTransfer should abort with an error if called after enableTransfer", async function() {
            await airDropper.disableStore({from: owner});
            await airDropper.enableTransfer({from: owner});
            await catchRevert(airDropper.enableTransfer({from: owner}));
        });

        it("function storeBatch should abort with an error if called by a non-executor", async function() {
            await airDropper.set(executor, {from: owner});
            await catchRevert(airDropper.storeBatch(users, values, {from: stranger}));
        });

        it("function storeBatch should abort with an error if called after disableStore", async function() {
            await airDropper.set(executor, {from: owner});
            await airDropper.disableStore({from: owner});
            await catchRevert(airDropper.storeBatch(users, values, {from: executor}));
        });

        it("function storeBatch should abort with an error if called after enableTransfer", async function() {
            await airDropper.set(executor, {from: owner});
            await airDropper.disableStore({from: owner});
            await airDropper.enableTransfer({from: owner});
            await catchRevert(airDropper.storeBatch(users, values, {from: executor}));
        });

        it("function storeBatch should abort with an error if there are more users than values", async function() {
            await airDropper.set(executor, {from: owner});
            await catchRevert(airDropper.storeBatch(users, values.slice(1), {from: executor}));
        });

        it("function storeBatch should abort with an error if there are less users than values", async function() {
            await airDropper.set(executor, {from: owner});
            await catchRevert(airDropper.storeBatch(users.slice(1), values, {from: executor}));
        });

        it("function storeBatch should abort with an error if called twice for the same user", async function() {
            await airDropper.set(executor, {from: owner});
            await airDropper.storeBatch(users, values, {from: executor});
            await catchRevert(airDropper.storeBatch([users[0]], [values[0]], {from: executor}));
        });

        it("function transferEth should abort with an error if called by a non-executor", async function() {
            await airDropper.set(executor, {from: owner});
            await airDropper.storeBatch(users, values, {from: executor});
            await airDropper.disableStore({from: owner});
            await airDropper.enableTransfer({from: owner});
            await catchRevert(airDropper.transferEth(relayToken.address, users, values, {from: stranger}));
        });

        it("function transferEth should abort with an error if called before disableStore", async function() {
            await airDropper.set(executor, {from: owner});
            await airDropper.storeBatch(users, values, {from: executor});
            await catchRevert(airDropper.transferEth(relayToken.address, users, values, {from: executor}));
        });

        it("function transferEth should abort with an error if called before enableTransfer", async function() {
            await airDropper.set(executor, {from: owner});
            await airDropper.storeBatch(users, values, {from: executor});
            await airDropper.disableStore({from: owner});
            await catchRevert(airDropper.transferEth(relayToken.address, users, values, {from: executor}));
        });

        it("function transferEth should abort with an error if there are more users than values", async function() {
            await airDropper.set(executor, {from: owner});
            await airDropper.storeBatch(users, values, {from: executor});
            await airDropper.disableStore({from: owner});
            await airDropper.enableTransfer({from: owner});
            await catchRevert(airDropper.transferEth(relayToken.address, users, values.slice(1), {from: executor}));
        });

        it("function transferEth should abort with an error if there are less users than values", async function() {
            await airDropper.set(executor, {from: owner});
            await airDropper.storeBatch(users, values, {from: executor});
            await airDropper.disableStore({from: owner});
            await airDropper.enableTransfer({from: owner});
            await catchRevert(airDropper.transferEth(relayToken.address, users.slice(1), values, {from: executor}));
        });

        it("function transferEth should abort with an error if called with an incorrcet value", async function() {
            await airDropper.set(executor, {from: owner});
            await airDropper.storeBatch(users, values, {from: executor});
            await airDropper.disableStore({from: owner});
            await airDropper.enableTransfer({from: owner});
            await catchRevert(airDropper.transferEth(relayToken.address, [users[0]], [values[0] + 1], {from: executor}));
        });

        it("function transferEth should abort with an error if called twice for the same user", async function() {
            await airDropper.set(executor, {from: owner});
            await airDropper.storeBatch(users, values, {from: executor});
            await airDropper.disableStore({from: owner});
            await airDropper.enableTransfer({from: owner});
            await airDropper.transferEth(relayToken.address, users, values, {from: executor});
            await catchRevert(airDropper.transferEth(relayToken.address, [users[0]], [values[0]], {from: executor}));
        });
    });

    describe("positive assertion:", function() {
        it("function set should complete successfully", async function() {
            assert.equal(await airDropper.executor(), zeroAddress);
            await airDropper.set(executor, {from: owner});
            assert.equal(await airDropper.executor(), executor);
        });

        it("function storeBatch should complete successfully", async function() {
            await airDropper.set(executor, {from: owner});
            assert.equal(await getBalances(users, airDropper.storedBalances), values.map(value => 0));
            await airDropper.storeBatch(users, values, {from: executor});
            assert.equal(await getBalances(users, airDropper.storedBalances), values);
        });

        it("function disableStore should complete successfully", async function() {
            await airDropper.set(executor, {from: owner});
            await airDropper.storeBatch(users, values, {from: executor});
            assert.equal(await airDropper.state(), 0);
            await airDropper.disableStore({from: owner});
            assert.equal(await airDropper.state(), 1);
        });

        it("function enableTransfer should complete successfully", async function() {
            await airDropper.set(executor, {from: owner});
            await airDropper.storeBatch(users, values, {from: executor});
            await airDropper.disableStore({from: owner});
            assert.equal(await airDropper.state(), 1);
            await airDropper.enableTransfer({from: owner});
            assert.equal(await airDropper.state(), 2);
        });

        it("function transferEth should complete successfully", async function() {
            await airDropper.set(executor, {from: owner});
            await airDropper.storeBatch(users, values, {from: executor});
            await airDropper.disableStore({from: owner});
            await airDropper.enableTransfer({from: owner});
            assert.equal(await getBalances(users, airDropper.transferredBalances), values.map(value => 0));
            assert.equal(await getBalances(users, relayToken.balanceOf), values.map(value => 0));
            await airDropper.transferEth(relayToken.address, users, values, {from: executor});
            assert.equal(await getBalances(users, airDropper.transferredBalances), values);
            assert.equal(await getBalances(users, relayToken.balanceOf), values);
        });
    });
});

async function getBalances(addresses, getBalance) {
    return (await Promise.all(addresses.map(address => getBalance(address)))).toString();
}
