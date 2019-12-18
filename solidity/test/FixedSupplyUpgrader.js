contract("FixedSupplyUpgrader", function(accounts) {
    let registry;
    let ethToken;
    let bntToken;
    let relayToken;
    let oldConverter;
    let newConverter;
    let oldUpgrader;
    let newUpgrader;

    const ETH_SUPPLY = 111;
    const BNT_SUPPLY = 222;
    const BNT_AMOUNT = Math.floor(BNT_SUPPLY / 10);

    const owner      = accounts[1];
    const nonOwner   = accounts[2];
    const bntWallet  = accounts[3];
    const airDropper = accounts[4];

    const identifier  = web3.fromAscii("BancorConverterUpgrader");
    const catchRevert = require("bancor-contracts/solidity/test/helpers/Utils.js").catchRevert;

    before(async function() {
        registry     = await artifacts.require("ContractRegistry"       ).new({from: owner});
        ethToken     = await artifacts.require("EtherToken"             ).new({from: owner});
        bntToken     = await artifacts.require("SmartToken"             ).new("Bancor Network Token", "BNT", 18, {from: owner});
        relayToken   = await artifacts.require("SmartToken"             ).new("BNT/ETH Relay Token" , "BRT", 18, {from: owner});
        oldConverter = await artifacts.require("BancorConverter"        ).new(bntToken.address  , registry.address, 0, ethToken.address, 100000, {from: owner});
        newConverter = await artifacts.require("BancorConverter"        ).new(relayToken.address, registry.address, 0, ethToken.address, 500000, {from: owner});
        oldUpgrader  = await artifacts.require("BancorConverterUpgrader").new(registry.address, {from: owner});
        newUpgrader  = await artifacts.require("FixedSupplyUpgrader"    ).new({from: owner});
        await registry.registerAddress(identifier, newUpgrader.address, {from: owner});
        await newConverter.addReserve(bntToken.address, 500000, {from: owner});
        await relayToken  .transferOwnership(newUpgrader.address, {from: owner});
        await oldConverter.transferOwnership(newUpgrader.address, {from: owner});
        await newConverter.transferOwnership(newUpgrader.address, {from: owner});
        await ethToken.deposit({from: owner, value: ETH_SUPPLY});
        await ethToken.transfer(oldConverter.address, ETH_SUPPLY, {from: owner});
        await bntToken.issue(bntWallet, BNT_SUPPLY, {from: owner});
        await bntToken.approve(newUpgrader.address, BNT_SUPPLY, {from: bntWallet});
        await bntToken.transferOwnership(oldConverter.address, {from: owner});
        await oldConverter.acceptTokenOwnership({from: owner});
    });

    it("function execute should abort with an error if called by a non-owner", async function() {
        await catchRevert(newUpgrader.execute(oldConverter.address, newConverter.address, bntWallet, airDropper, {from: nonOwner}));
        await assertBalance(ethToken    , oldConverter.address, ETH_SUPPLY);
        await assertBalance(ethToken    , newConverter.address, 0);
        await assertBalance(bntToken    , bntWallet           , BNT_SUPPLY);
        await assertBalance(bntToken    , newConverter.address, 0);
        await assertBalance(relayToken  , bntWallet           , 0);
        await assertBalance(relayToken  , airDropper          , 0);
        await assertOwner  (relayToken  , owner);
        await assertOwner  (oldConverter, owner);
        await assertOwner  (newConverter, owner);
    });

    it("function execute should complete successfully if called by the owner", async function() {
        await newUpgrader.execute(oldConverter.address, newConverter.address, bntWallet, airDropper, {from: owner});
        await assertBalance(ethToken    , oldConverter.address, 0);
        await assertBalance(ethToken    , newConverter.address, ETH_SUPPLY);
        await assertBalance(bntToken    , bntWallet           , BNT_SUPPLY - BNT_AMOUNT);
        await assertBalance(bntToken    , newConverter.address, BNT_AMOUNT);
        await assertBalance(relayToken  , bntWallet           , BNT_AMOUNT);
        await assertBalance(relayToken  , airDropper          , BNT_AMOUNT);
        await assertOwner  (relayToken  , newConverter.address);
        await assertOwner  (oldConverter, newUpgrader .address);
        await assertOwner  (newConverter, newUpgrader .address);
    });

    it("accepting ownership should abort with an error if called by a non-owner", async function() {
        await catchRevert(oldConverter.acceptOwnership({from: nonOwner}));
        await catchRevert(newConverter.acceptOwnership({from: nonOwner}));
        await assertOwner(oldConverter, newUpgrader.address);
        await assertOwner(newConverter, newUpgrader.address);
    });

    it("accepting ownership should complete successfully if called by the owner", async function() {
        await oldConverter.acceptOwnership({from: owner});
        await newConverter.acceptOwnership({from: owner});
        await assertOwner(oldConverter, owner);
        await assertOwner(newConverter, owner);
    });

    it("reinstating upgrader should abort with an error if called by a non-owner", async function() {
        await catchRevert(registry.registerAddress(identifier, oldUpgrader.address, {from: nonOwner}));
        await assertAddress(registry, newUpgrader.address);
    });

    it("reinstating upgrader should complete successfully if called by the owner", async function() {
        await registry.registerAddress(identifier, oldUpgrader.address, {from: owner});
        await assertAddress(registry, oldUpgrader.address);
    });

    async function assertBalance(token, address, expected) {
        const actual = await token.balanceOf(address);
        assert.equal(`${actual}`, `${expected}`);
    }

    async function assertAddress(registry, expected) {
        const actual = await registry.addressOf(identifier);
        assert.equal(`${actual}`, `${expected}`);
    }

    async function assertOwner(instance, expected) {
        const actual = await instance.owner();
        assert.equal(`${actual}`, `${expected}`);
    }
});
