// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Minimal {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title StylusTestToken
 * @notice Minimal ERC-20 used for real on-chain multi-asset swaps on Arbitrum Sepolia.
 */
contract StylusTestToken {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory name_, string memory symbol_, uint8 decimals_, uint256 initialSupply) {
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        return _transfer(msg.sender, to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "Insufficient allowance");
            allowance[from][msg.sender] = allowed - amount;
        }
        return _transfer(from, to, amount);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal returns (bool) {
        require(to != address(0), "Zero recipient");
        uint256 bal = balanceOf[from];
        require(bal >= amount, "Insufficient balance");
        balanceOf[from] = bal - amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "Zero mint");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}

/**
 * @title StylusSafeSwapPool
 * @notice On-chain Arbitrum Sepolia multi-token swap pool settling real ERC-20 transfers.
 *         Called via StylusSafeAccount.executeBatch([approve, swap]).
 */
contract StylusSafeSwapPool {
    address public owner;

    mapping(address => uint256) public priceUsdE6;
    mapping(address => uint8) public tokenDecimals;

    event TokenConfigured(address indexed token, uint8 decimals, uint256 priceUsdE6);
    event Swapped(
        address indexed sender,
        address indexed recipient,
        address indexed tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function configureToken(address token, uint8 decimals_, uint256 priceUsdE6_) external onlyOwner {
        require(token != address(0) && priceUsdE6_ > 0, "Invalid config");
        tokenDecimals[token] = decimals_;
        priceUsdE6[token] = priceUsdE6_;
        emit TokenConfigured(token, decimals_, priceUsdE6_);
    }

    function setPrices(address[] calldata tokens, uint256[] calldata pricesE6) external onlyOwner {
        require(tokens.length == pricesE6.length, "Length mismatch");
        for (uint256 i = 0; i < tokens.length; i++) {
            require(pricesE6[i] > 0 && tokenDecimals[tokens[i]] > 0, "Unknown token");
            priceUsdE6[tokens[i]] = pricesE6[i];
        }
    }

    function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) public view returns (uint256) {
        uint256 pIn = priceUsdE6[tokenIn];
        uint256 pOut = priceUsdE6[tokenOut];
        uint8 dIn = tokenDecimals[tokenIn];
        uint8 dOut = tokenDecimals[tokenOut];
        require(pIn > 0 && pOut > 0 && dIn > 0 && dOut > 0, "Unsupported pair");
        require(tokenIn != tokenOut, "Identical tokens");
        return (amountIn * pIn * (10 ** dOut)) / (pOut * (10 ** dIn));
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut) {
        require(amountIn > 0 && recipient != address(0), "Invalid params");
        amountOut = getAmountOut(tokenIn, tokenOut, amountIn);
        require(amountOut >= minAmountOut && amountOut > 0, "Slippage exceeded");

        require(IERC20Minimal(tokenIn).transferFrom(msg.sender, address(this), amountIn), "TransferIn failed");
        require(IERC20Minimal(tokenOut).balanceOf(address(this)) >= amountOut, "Insufficient pool liquidity");
        require(IERC20Minimal(tokenOut).transfer(recipient, amountOut), "TransferOut failed");

        emit Swapped(msg.sender, recipient, tokenIn, tokenOut, amountIn, amountOut);
    }
}

