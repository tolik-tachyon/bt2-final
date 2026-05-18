// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {LPToken} from "./LPToken.sol";

contract AMM is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable tokenA;
    address public immutable tokenB;
    LPToken public immutable lpToken;

    uint256 public reserveA;
    uint256 public reserveB;

    event LiquidityAdded(
        address indexed provider, uint256 indexed amountA, uint256 indexed amountB, uint256 lpTokensMinted
    );
    event LiquidityRemoved(
        address indexed provider, uint256 indexed amountA, uint256 indexed amountB, uint256 lpTokensBurned
    );
    event Swap(
        address indexed trader, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut
    );
    error IdenticalTokens();
    error ZeroAddressA();
    error ZeroAddressB();
    error ZeroAmountA();
    error ZeroAmountB();
    error SlippageA();
    error SlippageB();
    error InsufficientBurnA();
    error InsufficientBurnB();

    error InsufficientLiquidity();
    error ZeroAmount();
    error Slippage();
    error InvalidToken();
    error NoLiquidity();

    error ZeroAmountIn();
    error ZeroAmountOut();
    error EmptyReserveIn();
    error EmptyReserveOut();

    constructor(address tokenA_, address tokenB_) {
        if (tokenA_ == address(0)) revert ZeroAddressA();
        if (tokenB_ == address(0)) revert ZeroAddressB();
        if (tokenA_ == tokenB_) revert IdenticalTokens();
        tokenA = tokenA_;
        tokenB = tokenB_;
        lpToken = new LPToken("AMM LP Token", "AMM-LP", address(this));
    }

    function addLiquidity(uint256 amountADesired, uint256 amountBDesired, uint256 minAmountA, uint256 minAmountB)
        external
        nonReentrant
        returns (uint256 amountA, uint256 amountB, uint256 liquidity)
    {
        if (amountADesired == 0) revert ZeroAmountA();
        if (amountBDesired == 0) revert ZeroAmountB();

        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = (amountADesired * reserveB) / reserveA;
            if (amountBOptimal > amountBDesired) {
                uint256 amountAOptimal = (amountBDesired * reserveA) / reserveB;
                amountA = amountAOptimal;
                amountB = amountBDesired;
            } else {
                amountA = amountADesired;
                amountB = amountBOptimal;
            }
        }

        if (amountA < minAmountA) revert SlippageA();
        if (amountB < minAmountB) revert SlippageB();

        uint256 supply = lpToken.totalSupply();
        if (supply == 0) {
            liquidity = _sqrt(amountA * amountB);
        } else {
            liquidity = _min((amountA * supply) / reserveA, (amountB * supply) / reserveB);
        }
        if (liquidity == 0) revert InsufficientLiquidity();

        reserveA += amountA;
        reserveB += amountB;

        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);

        lpToken.mint(msg.sender, liquidity);

        emit LiquidityAdded(msg.sender, amountA, amountB, liquidity);
    }

    function removeLiquidity(uint256 lpAmount, uint256 minAmountA, uint256 minAmountB)
        external
        nonReentrant
        returns (uint256 amountA, uint256 amountB)
    {
        if (lpAmount == 0) revert ZeroAmount();
        uint256 supply = lpToken.totalSupply();
        if (supply == 0) revert NoLiquidity();

        amountA = (reserveA * lpAmount) / supply;
        amountB = (reserveB * lpAmount) / supply;

        if (amountA < minAmountA) revert SlippageA();
        if (amountB < minAmountB) revert SlippageB();

        if (amountA == 0) revert InsufficientBurnA();
        if (amountB == 0) revert InsufficientBurnB();

        reserveA -= amountA;
        reserveB -= amountB;

        lpToken.burn(msg.sender, lpAmount);

        IERC20(tokenA).safeTransfer(msg.sender, amountA);
        IERC20(tokenB).safeTransfer(msg.sender, amountB);

        emit LiquidityRemoved(msg.sender, amountA, amountB, lpAmount);
    }

    function swap(address tokenIn, uint256 amountIn, uint256 minAmountOut)
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert ZeroAmountIn();
        if (tokenIn != tokenA && tokenIn != tokenB) revert InvalidToken();

        bool aToB = tokenIn == tokenA;
        address tokenOut = aToB ? tokenB : tokenA;
        uint256 reserveIn = aToB ? reserveA : reserveB;
        uint256 reserveOut = aToB ? reserveB : reserveA;

        amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        if (amountOut == 0) revert ZeroAmountOut();
        if (amountOut < minAmountOut) revert Slippage();
        // SOLHINT-NOTE:
        //     solhint wants here '>', but it's not applicable. changing constant
        //     or adding +/- 1 to convert it to strict one feels clunky. Furthermore,
        //     if amountOut == reserveOut, then it allows draining one side of the pool,
        //     that is incorrect
        // solhint-disable-next-line gas-strict-inequalities
        if (amountOut >= reserveOut) revert InsufficientLiquidity();

        if (aToB) {
            reserveA += amountIn;
            reserveB -= amountOut;
        } else {
            reserveB += amountIn;
            reserveA -= amountOut;
        }

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert ZeroAmountIn();
        if (reserveIn == 0) revert EmptyReserveIn();
        if (reserveOut == 0) revert EmptyReserveOut();
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /// @notice Yul assembly implementation
    /// @dev memory-safe: only operates on stack/scratch space, no memory slots touched.
    function getAmountOutYul(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256 amountOut)
    {
        assembly ("memory-safe") {
            if or(iszero(amountIn), or(iszero(reserveIn), iszero(reserveOut))) {
                revert(0, 0)
            }
            let amountInWithFee := mul(amountIn, 997)
            let numerator := mul(amountInWithFee, reserveOut)
            let denominator := add(mul(reserveIn, 1000), amountInWithFee)
            amountOut := div(numerator, denominator)
        }
    }

    function quoteAForB(uint256 amountIn) external view returns (uint256) {
        if (reserveA == 0 || reserveB == 0) return 0;
        return getAmountOut(amountIn, reserveA, reserveB);
    }

    function quoteBForA(uint256 amountIn) external view returns (uint256) {
        if (reserveA == 0 || reserveB == 0) return 0;
        return getAmountOut(amountIn, reserveB, reserveA);
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    // Implementation: https://ethereum.stackexchange.com/questions/2910/can-i-square-root-in-solidity
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = x / 2 + 1;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
