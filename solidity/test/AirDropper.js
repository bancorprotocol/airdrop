contract("AirDropper", function(accounts) {
    let relayToken;
    let airDropper;

    const users     = accounts;
    const owner     = accounts[1];
    const sender    = accounts[2];
    const nonOwner  = accounts[3];
    const nonSender = accounts[4];

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
            await catchRevert(airDropper.set(sender, {from: nonOwner}));
        });

        it("function disableSave should abort with an error if called by a non-owner", async function() {
            await catchRevert(airDropper.disableSave({from: nonOwner}));
        });

        it("function disableSave should abort with an error if called after disableSave", async function() {
            await airDropper.disableSave({from: owner});
            await catchRevert(airDropper.disableSave({from: owner}));
        });

        it("function disableSave should abort with an error if called after enableSend", async function() {
            await airDropper.disableSave({from: owner});
            await airDropper.enableSend({from: owner});
            await catchRevert(airDropper.disableSave({from: owner}));
        });

        it("function enableSend should abort with an error if called by a non-owner", async function() {
            await catchRevert(airDropper.enableSend({from: nonOwner}));
        });

        it("function enableSend should abort with an error if called before disableSave", async function() {
            await catchRevert(airDropper.enableSend({from: owner}));
        });

        it("function enableSend should abort with an error if called after enableSend", async function() {
            await airDropper.disableSave({from: owner});
            await airDropper.enableSend({from: owner});
            await catchRevert(airDropper.enableSend({from: owner}));
        });

        it("function saveAll should abort with an error if called by a non-sender", async function() {
            await airDropper.set(sender, {from: owner});
            await catchRevert(airDropper.saveAll(users, values, {from: nonSender}));
        });

        it("function saveAll should abort with an error if called after disableSave", async function() {
            await airDropper.set(sender, {from: owner});
            await airDropper.disableSave({from: owner});
            await catchRevert(airDropper.saveAll(users, values, {from: sender}));
        });

        it("function saveAll should abort with an error if called after enableSend", async function() {
            await airDropper.set(sender, {from: owner});
            await airDropper.disableSave({from: owner});
            await airDropper.enableSend({from: owner});
            await catchRevert(airDropper.saveAll(users, values, {from: sender}));
        });

        it("function saveAll should abort with an error if there are more users than values", async function() {
            await airDropper.set(sender, {from: owner});
            await catchRevert(airDropper.saveAll(users, values.slice(1), {from: sender}));
        });

        it("function saveAll should abort with an error if there are less users than values", async function() {
            await airDropper.set(sender, {from: owner});
            await catchRevert(airDropper.saveAll(users.slice(1), values, {from: sender}));
        });

        it("function saveAll should abort with an error if called twice for the same target", async function() {
            await airDropper.set(sender, {from: owner});
            await airDropper.saveAll(users, values, {from: sender});
            await catchRevert(airDropper.saveAll([users[0]], [values[0]], {from: sender}));
        });

        it("function sendEth should abort with an error if called by a non-sender", async function() {
            await airDropper.set(sender, {from: owner});
            await airDropper.saveAll(users, values, {from: sender});
            await airDropper.disableSave({from: owner});
            await airDropper.enableSend({from: owner});
            await catchRevert(airDropper.sendEth(relayToken.address, users, values, {from: nonSender}));
        });

        it("function sendEth should abort with an error if called before disableSave", async function() {
            await airDropper.set(sender, {from: owner});
            await airDropper.saveAll(users, values, {from: sender});
            await catchRevert(airDropper.sendEth(relayToken.address, users, values, {from: sender}));
        });

        it("function sendEth should abort with an error if called before enableSend", async function() {
            await airDropper.set(sender, {from: owner});
            await airDropper.saveAll(users, values, {from: sender});
            await airDropper.disableSave({from: owner});
            await catchRevert(airDropper.sendEth(relayToken.address, users, values, {from: sender}));
        });

        it("function sendEth should abort with an error if there are more users than values", async function() {
            await airDropper.set(sender, {from: owner});
            await airDropper.saveAll(users, values, {from: sender});
            await airDropper.disableSave({from: owner});
            await airDropper.enableSend({from: owner});
            await catchRevert(airDropper.sendEth(relayToken.address, users, values.slice(1), {from: sender}));
        });

        it("function sendEth should abort with an error if there are less users than values", async function() {
            await airDropper.set(sender, {from: owner});
            await airDropper.saveAll(users, values, {from: sender});
            await airDropper.disableSave({from: owner});
            await airDropper.enableSend({from: owner});
            await catchRevert(airDropper.sendEth(relayToken.address, users.slice(1), values, {from: sender}));
        });

        it("function sendEth should abort with an error if called twice for the same target", async function() {
            await airDropper.set(sender, {from: owner});
            await airDropper.saveAll(users, values, {from: sender});
            await airDropper.disableSave({from: owner});
            await airDropper.enableSend({from: owner});
            await airDropper.sendEth(relayToken.address, users, values, {from: sender});
            await catchRevert(airDropper.sendEth(relayToken.address, [users[0]], [values[0]], {from: sender}));
        });
    });

    describe("positive assertion:", function() {
        it("function set should complete successfully", async function() {
            assert.equal(await airDropper.sender(), zeroAddress);
            await airDropper.set(sender, {from: owner});
            assert.equal(await airDropper.sender(), sender);
        });

        it("function saveAll should complete successfully", async function() {
            await airDropper.set(sender, {from: owner});
            assert.equal(await getBalances(users, airDropper.saveBalances), values.map(value => 0));
            await airDropper.saveAll(users, values, {from: sender});
            assert.equal(await getBalances(users, airDropper.saveBalances), values);
        });

        it("function disableSave should complete successfully", async function() {
            await airDropper.set(sender, {from: owner});
            await airDropper.saveAll(users, values, {from: sender});
            assert.equal(await airDropper.state(), 0);
            await airDropper.disableSave({from: owner});
            assert.equal(await airDropper.state(), 1);
        });

        it("function enableSend should complete successfully", async function() {
            await airDropper.set(sender, {from: owner});
            await airDropper.saveAll(users, values, {from: sender});
            await airDropper.disableSave({from: owner});
            assert.equal(await airDropper.state(), 1);
            await airDropper.enableSend({from: owner});
            assert.equal(await airDropper.state(), 2);
        });

        it("function sendEth should complete successfully", async function() {
            await airDropper.set(sender, {from: owner});
            await airDropper.saveAll(users, values, {from: sender});
            await airDropper.disableSave({from: owner});
            await airDropper.enableSend({from: owner});
            assert.equal(await getBalances(users, airDropper.sendBalances), values.map(value => 0));
            assert.equal(await getBalances(users, relayToken.balanceOf), values.map(value => 0));
            await airDropper.sendEth(relayToken.address, users, values, {from: sender});
            assert.equal(await getBalances(users, airDropper.sendBalances), values);
            assert.equal(await getBalances(users, relayToken.balanceOf), values);
        });
    });
});

async function getBalances(addresses, getBalance) {
    return (await Promise.all(addresses.map(address => getBalance(address)))).toString();
}
