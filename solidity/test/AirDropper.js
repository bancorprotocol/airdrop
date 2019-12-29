contract("AirDropper", function(accounts) {
    let relayToken;
    let airDropper;

    const storeEnabled    = 0;
    const storeDisabled   = 1;
    const transferEnabled = 2;

    const owner = accounts[1];
    const agent = accounts[2];
    const other = accounts[3];
    const users = accounts.slice(4);

    const values = users.map((x, i) => i + 1);
    const supply = values.reduce((a, b) => a + b, 0);

    const catchRevert = require("bancor-contracts/solidity/test/helpers/Utils.js").catchRevert;

    beforeEach(async function() {
        relayToken = await artifacts.require("SmartToken").new("name", "symbol", 0, {from: owner});
        airDropper = await artifacts.require("AirDropper").new({from: owner});
        await relayToken.issue(airDropper.address, supply, {from: owner});
    });

    describe("negative assertion:", function() {
        it("function setAgent should abort with an error if called by a non-owner", async function() {
            await catchRevert(airDropper.setAgent(agent, {from: other}));
        });

        it("function setState should abort with an error if called by a non-owner", async function() {
            await catchRevert(airDropper.setState(storeEnabled, {from: other}));
        });

        it("function storeBatch should abort with an error if called by a non-agent", async function() {
            await airDropper.setAgent(agent, {from: owner});
            await airDropper.setState(storeEnabled, {from: owner});
            await catchRevert(airDropper.storeBatch(users, values, {from: other}));
        });

        it("function storeBatch should abort with an error if called under storeDisabled", async function() {
            await airDropper.setAgent(agent, {from: owner});
            await airDropper.setState(storeDisabled, {from: owner});
            await catchRevert(airDropper.storeBatch(users, values, {from: agent}));
        });

        it("function storeBatch should abort with an error if called under transferEnabled", async function() {
            await airDropper.setAgent(agent, {from: owner});
            await airDropper.setState(transferEnabled, {from: owner});
            await catchRevert(airDropper.storeBatch(users, values, {from: agent}));
        });

        it("function storeBatch should abort with an error if there are more users than values", async function() {
            await airDropper.setAgent(agent, {from: owner});
            await airDropper.setState(storeEnabled, {from: owner});
            await catchRevert(airDropper.storeBatch(users, values.slice(1), {from: agent}));
        });

        it("function storeBatch should abort with an error if there are less users than values", async function() {
            await airDropper.setAgent(agent, {from: owner});
            await airDropper.setState(storeEnabled, {from: owner});
            await catchRevert(airDropper.storeBatch(users.slice(1), values, {from: agent}));
        });

        it("function storeBatch should abort with an error if called twice for the same user", async function() {
            await airDropper.setAgent(agent, {from: owner});
            await airDropper.setState(storeEnabled, {from: owner});
            await airDropper.storeBatch(users, values, {from: agent});
            await catchRevert(airDropper.storeBatch([users[0]], [values[0]], {from: agent}));
        });

        it("function transferEth should abort with an error if called by a non-agent", async function() {
            await airDropper.setAgent(agent, {from: owner});
            await airDropper.setState(storeEnabled, {from: owner});
            await airDropper.storeBatch(users, values, {from: agent});
            await airDropper.setState(transferEnabled, {from: owner});
            await catchRevert(airDropper.transferEth(relayToken.address, users, values, {from: other}));
        });

        it("function transferEth should abort with an error if called under storeEnabled", async function() {
            await airDropper.setAgent(agent, {from: owner});
            await airDropper.setState(storeEnabled, {from: owner});
            await airDropper.storeBatch(users, values, {from: agent});
            await catchRevert(airDropper.transferEth(relayToken.address, users, values, {from: agent}));
        });

        it("function transferEth should abort with an error if called under storeDisabled", async function() {
            await airDropper.setAgent(agent, {from: owner});
            await airDropper.setState(storeEnabled, {from: owner});
            await airDropper.storeBatch(users, values, {from: agent});
            await airDropper.setState(storeDisabled, {from: owner});
            await catchRevert(airDropper.transferEth(relayToken.address, users, values, {from: agent}));
        });

        it("function transferEth should abort with an error if there are more users than values", async function() {
            await airDropper.setAgent(agent, {from: owner});
            await airDropper.setState(storeEnabled, {from: owner});
            await airDropper.storeBatch(users, values, {from: agent});
            await airDropper.setState(transferEnabled, {from: owner});
            await catchRevert(airDropper.transferEth(relayToken.address, users, values.slice(1), {from: agent}));
        });

        it("function transferEth should abort with an error if there are less users than values", async function() {
            await airDropper.setAgent(agent, {from: owner});
            await airDropper.setState(storeEnabled, {from: owner});
            await airDropper.storeBatch(users, values, {from: agent});
            await airDropper.setState(transferEnabled, {from: owner});
            await catchRevert(airDropper.transferEth(relayToken.address, users.slice(1), values, {from: agent}));
        });

        it("function transferEth should abort with an error if called with an incorrcet value", async function() {
            await airDropper.setAgent(agent, {from: owner});
            await airDropper.setState(storeEnabled, {from: owner});
            await airDropper.storeBatch(users, values, {from: agent});
            await airDropper.setState(transferEnabled, {from: owner});
            await catchRevert(airDropper.transferEth(relayToken.address, [users[0]], [values[0] + 1], {from: agent}));
        });

        it("function transferEth should abort with an error if called twice for the same user", async function() {
            await airDropper.setAgent(agent, {from: owner});
            await airDropper.setState(storeEnabled, {from: owner});
            await airDropper.storeBatch(users, values, {from: agent});
            await airDropper.setState(transferEnabled, {from: owner});
            await airDropper.transferEth(relayToken.address, users, values, {from: agent});
            await catchRevert(airDropper.transferEth(relayToken.address, [users[0]], [values[0]], {from: agent}));
        });
    });

    describe("positive assertion:", function() {
        it("function storeBatch should complete successfully", async function() {
            await airDropper.setAgent(agent, {from: owner});
            await airDropper.setState(storeEnabled, {from: owner});
            assert.equal(await getBalances(users, airDropper.storedBalances), values.map(value => 0));
            await airDropper.storeBatch(users, values, {from: agent});
            assert.equal(await getBalances(users, airDropper.storedBalances), values);
        });

        it("function transferEth should complete successfully", async function() {
            await airDropper.setAgent(agent, {from: owner});
            await airDropper.setState(storeEnabled, {from: owner});
            await airDropper.storeBatch(users, values, {from: agent});
            await airDropper.setState(transferEnabled, {from: owner});
            assert.equal(await getBalances(users, airDropper.transferredBalances), values.map(value => 0));
            assert.equal(await getBalances(users, relayToken.balanceOf), values.map(value => 0));
            await airDropper.transferEth(relayToken.address, users, values, {from: agent});
            assert.equal(await getBalances(users, airDropper.transferredBalances), values);
            assert.equal(await getBalances(users, relayToken.balanceOf), values);
        });
    });
});

async function getBalances(addresses, getBalance) {
    return (await Promise.all(addresses.map(address => getBalance(address)))).toString();
}
