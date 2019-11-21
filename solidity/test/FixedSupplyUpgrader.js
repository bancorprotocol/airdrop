contract("FixedSupplyUpgrader", function(accounts) {
    let registry;
    let ethToken;
    let bntToken;
    let relayToken;
    let oldConverter;
    let newConverter;
    let oldUpgrader;
    let newUpgrader;

    const ETH_TOKEN_AMOUNT = 111;
    const BNT_TOKEN_AMOUNT = 222;
    const BNT_TOKEN_BUFFER = 333;
    const BNT_TOKEN_REMAIN = 444;

    const deployer   = accounts[1];
    const upgrader   = accounts[2];
    const airDropper = accounts[3];

    const identifier  = web3.fromAscii("BancorConverterUpgrader");
    const catchRevert = require("bancor-contracts/solidity/test/helpers/Utils.js").catchRevert;

    before(async function() {
        registry     = await artifacts.require("ContractRegistry"       ).new({from: deployer});
        ethToken     = await artifacts.require("EtherToken"             ).new({from: deployer});
        bntToken     = await artifacts.require("SmartToken"             ).new("Bancor Network Token", "BNT", 18, {from: deployer});
        relayToken   = await artifacts.require("SmartToken"             ).new("BNT/ETH Relay Token" , "BRT", 18, {from: deployer});
        oldConverter = await artifacts.require("BancorConverter"        ).new(bntToken.address  , registry.address, 0, ethToken.address, 100000, {from: deployer});
        newConverter = await artifacts.require("BancorConverter"        ).new(relayToken.address, registry.address, 0, ethToken.address, 500000, {from: deployer});
        oldUpgrader  = await artifacts.require("BancorConverterUpgrader").new(registry.address, {from: upgrader});
        newUpgrader  = await artifacts.require("FixedSupplyUpgrader"    ).new({from: upgrader});
        await registry.registerAddress(identifier, newUpgrader.address, {from: deployer});
        await newConverter.addConnector(bntToken.address, 500000, false, {from: deployer});
        await relayToken  .transferOwnership(newUpgrader.address, {from: deployer});
        await oldConverter.transferOwnership(newUpgrader.address, {from: deployer});
        await newConverter.transferOwnership(newUpgrader.address, {from: deployer});
        await ethToken.deposit({from: deployer, value: ETH_TOKEN_AMOUNT});
        await ethToken.transfer(oldConverter.address, ETH_TOKEN_AMOUNT, {from: deployer});
        await bntToken.issue(upgrader, BNT_TOKEN_AMOUNT + BNT_TOKEN_BUFFER + BNT_TOKEN_REMAIN, {from: deployer});
        await bntToken.transfer(newUpgrader.address, BNT_TOKEN_AMOUNT + BNT_TOKEN_BUFFER, {from: upgrader});
        await bntToken.transferOwnership(oldConverter.address, {from: deployer});
        await oldConverter.acceptTokenOwnership({from: deployer});
    });

    it("function execute should abort with an error if called by a non-owner", async function() {
        await catchRevert(newUpgrader.execute(oldConverter.address, newConverter.address, airDropper, BNT_TOKEN_AMOUNT, {from: deployer}));
        await assertBalance(bntToken  , newUpgrader .address, BNT_TOKEN_AMOUNT + BNT_TOKEN_BUFFER);
        await assertBalance(bntToken  , newConverter.address, 0);
        await assertBalance(bntToken  , upgrader            , BNT_TOKEN_REMAIN);
        await assertBalance(ethToken  , oldConverter.address, ETH_TOKEN_AMOUNT);
        await assertBalance(ethToken  , newConverter.address, 0);
        await assertBalance(relayToken, airDropper          , 0);
        await assertBalance(relayToken, upgrader            , 0);
        await assertOwner(relayToken  , deployer);
        await assertOwner(oldConverter, deployer);
        await assertOwner(newConverter, deployer);
    });

    it("function execute should complete successfully if called by the owner", async function() {
        await newUpgrader.execute(oldConverter.address, newConverter.address, airDropper, BNT_TOKEN_AMOUNT, {from: upgrader});
        await assertBalance(bntToken  , newUpgrader .address, 0);
        await assertBalance(bntToken  , newConverter.address, BNT_TOKEN_AMOUNT);
        await assertBalance(bntToken  , upgrader            , BNT_TOKEN_REMAIN + BNT_TOKEN_BUFFER);
        await assertBalance(ethToken  , oldConverter.address, 0);
        await assertBalance(ethToken  , newConverter.address, ETH_TOKEN_AMOUNT);
        await assertBalance(relayToken, airDropper          , BNT_TOKEN_AMOUNT);
        await assertBalance(relayToken, upgrader            , BNT_TOKEN_AMOUNT);
        await assertOwner(relayToken  , newConverter.address);
        await assertOwner(oldConverter, newUpgrader.address);
        await assertOwner(newConverter, newUpgrader.address);
    });

    it("accepting ownership should abort with an error if called by a non-owner", async function() {
        await catchRevert(oldConverter.acceptOwnership({from: deployer}));
        await catchRevert(newConverter.acceptOwnership({from: deployer}));
        await assertOwner(oldConverter, newUpgrader.address);
        await assertOwner(newConverter, newUpgrader.address);
    });

    it("accepting ownership should complete successfully if called by the owner", async function() {
        await oldConverter.acceptOwnership({from: upgrader});
        await newConverter.acceptOwnership({from: upgrader});
        await assertOwner(oldConverter, upgrader);
        await assertOwner(newConverter, upgrader);
    });

    it("reinstating upgrader should abort with an error if called by a non-owner", async function() {
        await catchRevert(registry.registerAddress(identifier, oldUpgrader.address, {from: upgrader}));
        assert.equal(await registry.addressOf(identifier), newUpgrader.address);
    });

    it("reinstating upgrader should complete successfully if called by the owner", async function() {
        await registry.registerAddress(identifier, oldUpgrader.address, {from: deployer});
        assert.equal(await registry.addressOf(identifier), oldUpgrader.address);
    });
});

async function assertBalance(token, address, expected) {
    const actual = await token.balanceOf(address);
    assert.equal(`${actual}`, `${expected}`);
}

async function assertOwner(instance, expected) {
    const actual = await instance.owner();
    assert.equal(`${actual}`, `${expected}`);
}
