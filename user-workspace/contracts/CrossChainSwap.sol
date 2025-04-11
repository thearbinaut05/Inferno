// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@layerzerolabs/solidity-examples/contracts/lzApp/NonblockingLzApp.sol";
import "./AtomicFlashSwap.sol";

contract CrossChainSwap is Ownable, NonblockingLzApp {
    AtomicFlashSwap public flashSwap;
    mapping(uint16 => bytes) public trustedRemoteLookup;
    
    event MessageSent(uint16 dstChainId, bytes payload);
    event MessageReceived(uint16 srcChainId, bytes payload);
    event SwapInitiated(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    
    constructor(
        address _endpoint,
        address _flashSwap,
        address initialOwner
    ) Ownable(initialOwner) NonblockingLzApp(_endpoint) {
        flashSwap = AtomicFlashSwap(_flashSwap);
    }

    function setTrustedRemote(uint16 _remoteChainId, bytes calldata _path) external onlyOwner {
        trustedRemoteLookup[_remoteChainId] = _path;
    }

    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal override {
        require(trustedRemoteLookup[_srcChainId].length != 0, "CrossChainSwap: invalid source chain");
        
        // Decode the payload
        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOut,
            bytes memory deployData
        ) = abi.decode(_payload, (address, address, uint256, uint256, bytes));

        // Execute the flash swap
        flashSwap.flashSwap(tokenIn, tokenOut, amountIn, amountOut, deployData);
        
        emit MessageReceived(_srcChainId, _payload);
    }

    function initiateSwap(
        uint16 _dstChainId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        bytes memory deployData
    ) external payable onlyOwner {
        require(trustedRemoteLookup[_dstChainId].length != 0, "CrossChainSwap: invalid destination chain");
        
        bytes memory payload = abi.encode(tokenIn, tokenOut, amountIn, amountOut, deployData);
        
        // Get the fees for the cross-chain message
        (uint256 nativeFee,) = lzEndpoint.estimateFees(
            _dstChainId,
            address(this),
            payload,
            false,
            bytes("")
        );
        
        require(msg.value >= nativeFee, "CrossChainSwap: insufficient native fee");
        
        // Send the cross-chain message
        _lzSend(
            _dstChainId,
            payload,
            payable(msg.sender),
            address(0x0),
            bytes(""),
            msg.value
        );
        
        emit SwapInitiated(tokenIn, tokenOut, amountIn, amountOut);
        emit MessageSent(_dstChainId, payload);
    }

    // Function to handle incoming native tokens
    receive() external payable {}
}
