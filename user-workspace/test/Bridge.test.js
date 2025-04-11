const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Bridge", function () {
    let bridge;
    let owner;
    let addr1;
    let addr2;
    let mockToken;

    beforeEach(async function () {
        // Get signers
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy mock token
        const MockToken = await ethers.getContractFactory("MockERC20");
        mockToken = await MockToken.deploy("Mock Token", "MT1");

        // Deploy bridge
        const Bridge = await ethers.getContractFactory("Bridge");
        bridge = await Bridge.deploy();

        // Mint some tokens to addr1 for testing
        const mintAmount = ethers.utils.parseEther("1000");
        await mockToken.mint(addr1.address, mintAmount);
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await bridge.owner()).to.equal(owner.address);
        });
    });

    describe("ETH Operations", function () {
        const depositAmount = ethers.utils.parseEther("1");

        it("Should accept ETH deposits", async function () {
            await expect(bridge.connect(addr1).deposit({ value: depositAmount }))
                .to.emit(bridge, "Deposited")
                .withArgs(addr1.address, depositAmount);

            expect(await bridge.getBalance(addr1.address)).to.equal(depositAmount);
        });

        it("Should accept ETH via receive function", async function () {
            await addr1.sendTransaction({
                to: bridge.address,
                value: depositAmount
            });

            expect(await bridge.getBalance(addr1.address)).to.equal(depositAmount);
        });

        it("Should allow ETH withdrawals", async function () {
            // First deposit
            await bridge.connect(addr1).deposit({ value: depositAmount });

            // Then withdraw
            await expect(
                bridge.connect(addr1).withdraw(addr2.address, depositAmount)
            ).to.changeEtherBalances(
                [addr1, addr2],
                [0, depositAmount]
            );
        });

        it("Should fail to withdraw with insufficient balance", async function () {
            await expect(
                bridge.connect(addr1).withdraw(addr2.address, depositAmount)
            ).to.be.revertedWith("Insufficient balance");
        });

        it("Should fail to withdraw to zero address", async function () {
            await bridge.connect(addr1).deposit({ value: depositAmount });
            await expect(
                bridge.connect(addr1).withdraw(ethers.constants.AddressZero, depositAmount)
            ).to.be.revertedWith("Invalid address");
        });
    });

    describe("Token Operations", function () {
        const tokenAmount = ethers.utils.parseEther("100");

        beforeEach(async function () {
            // Approve bridge to spend tokens
            await mockToken.connect(addr1).approve(bridge.address, tokenAmount);
        });

        it("Should lock tokens", async function () {
            await expect(bridge.connect(addr1).lockTokens(mockToken.address, tokenAmount))
                .to.emit(bridge, "TokensLocked")
                .withArgs(mockToken.address, addr1.address, tokenAmount);

            expect(await bridge.getTokenBalance(mockToken.address, addr1.address))
                .to.equal(tokenAmount);
        });

        it("Should unlock tokens", async function () {
            // First lock tokens
            await bridge.connect(addr1).lockTokens(mockToken.address, tokenAmount);

            // Then unlock
            await expect(
                bridge.connect(addr1).unlockTokens(mockToken.address, addr2.address, tokenAmount)
            ).to.emit(bridge, "TokensUnlocked")
            .withArgs(mockToken.address, addr2.address, tokenAmount);

            expect(await mockToken.balanceOf(addr2.address)).to.equal(tokenAmount);
        });

        it("Should fail to lock zero tokens", async function () {
            await expect(
                bridge.connect(addr1).lockTokens(mockToken.address, 0)
            ).to.be.revertedWith("Must lock some tokens");
        });

        it("Should fail to unlock more than locked", async function () {
            await bridge.connect(addr1).lockTokens(mockToken.address, tokenAmount);
            await expect(
                bridge.connect(addr1).unlockTokens(mockToken.address, addr2.address, tokenAmount.mul(2))
            ).to.be.revertedWith("Insufficient balance");
        });

        it("Should fail to unlock to zero address", async function () {
            await bridge.connect(addr1).lockTokens(mockToken.address, tokenAmount);
            await expect(
                bridge.connect(addr1).unlockTokens(mockToken.address, ethers.constants.AddressZero, tokenAmount)
            ).to.be.revertedWith("Invalid address");
        });
    });

    describe("Balance Queries", function () {
        it("Should return correct ETH balance", async function () {
            const depositAmount = ethers.utils.parseEther("1");
            await bridge.connect(addr1).deposit({ value: depositAmount });
            expect(await bridge.getBalance(addr1.address)).to.equal(depositAmount);
        });

        it("Should return correct token balance", async function () {
            const tokenAmount = ethers.utils.parseEther("100");
            await mockToken.connect(addr1).approve(bridge.address, tokenAmount);
            await bridge.connect(addr1).lockTokens(mockToken.address, tokenAmount);
            expect(await bridge.getTokenBalance(mockToken.address, addr1.address))
                .to.equal(tokenAmount);
        });
    });

    describe("Security", function () {
        it("Should prevent reentrancy in withdrawals", async function () {
            // Deploy malicious contract that attempts reentrancy
            const AttackerFactory = await ethers.getContractFactory("BridgeAttacker");
            const attacker = await AttackerFactory.deploy(bridge.address);

            // Fund the attacker
            const attackAmount = ethers.utils.parseEther("1");
            await bridge.connect(addr1).deposit({ value: attackAmount });

            // Attempt attack
            await expect(
                attacker.connect(addr1).attack({ value: attackAmount })
            ).to.be.reverted;
        });
    });
});
