const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AtomicFlashSwapV2", function () {
    let atomicFlashSwap;
    let owner;
    let addr1;
    let addr2;
    let mockToken1;
    let mockToken2;
    let mockAavePool;

    beforeEach(async function () {
        // Get signers
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy mock tokens
        const MockToken = await ethers.getContractFactory("MockERC20");
        mockToken1 = await MockToken.deploy("Mock Token 1", "MT1");
        mockToken2 = await MockToken.deploy("Mock Token 2", "MT2");

        // Deploy mock Aave pool
        const MockAavePool = await ethers.getContractFactory("MockAavePool");
        mockAavePool = await MockAavePool.deploy();

        // Deploy AtomicFlashSwapV2
        const AtomicFlashSwapV2 = await ethers.getContractFactory("AtomicFlashSwapV2");
        atomicFlashSwap = await AtomicFlashSwapV2.deploy(owner.address, mockAavePool.address);

        // Whitelist tokens
        await atomicFlashSwap.setTokenWhitelist(mockToken1.address, true);
        await atomicFlashSwap.setTokenWhitelist(mockToken2.address, true);
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await atomicFlashSwap.owner()).to.equal(owner.address);
        });

        it("Should set the correct Aave pool address", async function () {
            expect(await atomicFlashSwap.AAVE_POOL()).to.equal(mockAavePool.address);
        });
    });

    describe("Token Whitelist", function () {
        it("Should whitelist tokens correctly", async function () {
            expect(await atomicFlashSwap.whitelistedTokens(mockToken1.address)).to.be.true;
            expect(await atomicFlashSwap.whitelistedTokens(mockToken2.address)).to.be.true;
        });

        it("Should fail when non-owner tries to whitelist", async function () {
            await expect(
                atomicFlashSwap.connect(addr1).setTokenWhitelist(mockToken1.address, true)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should fail when trying to whitelist zero address", async function () {
            await expect(
                atomicFlashSwap.setTokenWhitelist(ethers.ZeroAddress, true)
            ).to.be.revertedWithCustomError(atomicFlashSwap, "InvalidToken");
        });
    });

    describe("Slippage Protection", function () {
        it("Should set slippage tolerance correctly", async function () {
            const newTolerance = 100; // 1%
            await atomicFlashSwap.setSlippageTolerance(newTolerance);
            expect(await atomicFlashSwap.slippageTolerance()).to.equal(newTolerance);
        });

        it("Should fail when setting excessive slippage tolerance", async function () {
            await expect(
                atomicFlashSwap.setSlippageTolerance(1001) // > 10%
            ).to.be.revertedWithCustomError(atomicFlashSwap, "InvalidAmount");
        });
    });

    describe("Flash Swap", function () {
        beforeEach(async function () {
            // Mint some tokens to the contract for testing
            await mockToken2.mint(atomicFlashSwap.address, ethers.parseEther("1"));
        });

        it("Should execute flash swap with valid parameters", async function () {
            const amountIn = ethers.parseEther("1");
            const amountOut = ethers.parseEther("0.9");
            const deployData = "0x";

            await expect(
                atomicFlashSwap.flashSwap(
                    mockToken1.address,
                    mockToken2.address,
                    amountIn,
                    amountOut,
                    deployData
                )
            ).to.emit(atomicFlashSwap, "FlashSwapExecuted");
        });

        it("Should fail with non-whitelisted tokens", async function () {
            const amountIn = ethers.parseEther("1");
            const amountOut = ethers.parseEther("0.9");
            const deployData = "0x";

            await expect(
                atomicFlashSwap.flashSwap(
                    addr1.address,
                    addr2.address,
                    amountIn,
                    amountOut,
                    deployData
                )
            ).to.be.revertedWithCustomError(atomicFlashSwap, "InvalidToken");
        });

        it("Should fail when paused", async function () {
            await atomicFlashSwap.pause();
            
            const amountIn = ethers.parseEther("1");
            const amountOut = ethers.parseEther("0.9");
            const deployData = "0x";

            await expect(
                atomicFlashSwap.flashSwap(
                    mockToken1.address,
                    mockToken2.address,
                    amountIn,
                    amountOut,
                    deployData
                )
            ).to.be.revertedWith("Pausable: paused");
        });
    });

    describe("Emergency Functions", function () {
        it("Should pause and unpause correctly", async function () {
            await atomicFlashSwap.pause();
            expect(await atomicFlashSwap.paused()).to.be.true;

            await atomicFlashSwap.unpause();
            expect(await atomicFlashSwap.paused()).to.be.false;
        });

        it("Should fail when non-owner tries to pause", async function () {
            await expect(
                atomicFlashSwap.connect(addr1).pause()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should rescue tokens correctly", async function () {
            const amount = ethers.parseEther("1");
            await mockToken1.mint(atomicFlashSwap.address, amount);

            await expect(
                atomicFlashSwap.rescue(mockToken1.address)
            ).to.changeTokenBalance(mockToken1, owner, amount);
        });

        it("Should fail when trying to rescue zero tokens", async function () {
            await expect(
                atomicFlashSwap.rescue(mockToken1.address)
            ).to.be.revertedWithCustomError(atomicFlashSwap, "InvalidAmount");
        });
    });
});
