// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './ISwapERC20.sol';

interface ISwapPair is ISwapERC20 {
  error Locked();
  error TransferFailed();
  error Forbidden();
  error Overflow();
  error InsufficientLiquidityMinted();
  error InsufficientLiquidityBurned();
  error InsufficientInputAmount();
  error InsufficientOutputAmount();
  error InsufficientLiquidity();
  error InvalidTo();
  error K();

  event Mint(address indexed sender, uint amount0, uint amount1);
  event Burn(address indexed sender, uint amount0, uint amount1, address indexed to);
  event Swap(
    address indexed sender,
    uint amount0In,
    uint amount1In,
    uint amount0Out,
    uint amount1Out,
    address indexed to
  );
  event Sync(uint112 reserve0, uint112 reserve1);

  function MINIMUM_LIQUIDITY() external pure returns (uint);

  function token0() external view returns (address);

  function token1() external view returns (address);

  function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);

  function price0CumulativeLast() external view returns (uint);

  function price1CumulativeLast() external view returns (uint);

  function kLast() external view returns (uint);

  function mint(address to) external returns (uint liquidity);

  function burn(address to) external returns (uint amount0, uint amount1);

  function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;

  function skim(address to) external;

  function sync() external;

  function initialize(address, address) external;
}