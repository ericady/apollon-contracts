// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IBBase.sol';

interface ISwapOperations is IBBase {
  error Forbidden();
  error IdenticalAddresses();
  error PairExists();
  error Expired();
  error PairDoesNotExist();
  error InsufficientAAmount();
  error InsufficientBAmount();
  error InsufficientInputAmount();
  error InsufficientOutputAmount();
  error ExcessiveInputAmount();
  error InsufficientLiquidity();
  error InsufficientAmount();
  error InvalidPath();
  error TransferFromFailed();

  event SwapOperationsInitialized(
    address borrowerOperations,
    address troveManager,
    address priceFeed,
    address debtTokenManager
  );
  event PairCreated(address indexed token0, address indexed token1, address pair, uint);

  struct RemoveLiquidtyPermitParams {
    address tokenA;
    address tokenB;
    uint liquidity;
    uint amountAMin;
    uint amountBMin;
    uint deadline;
    bool approveMax;
    address _upperHint;
    address _lowerHint;
    uint8 v;
    bytes32 r;
    bytes32 s;
  }

  // **** GETTER ****

  function allPairs(uint) external view returns (address pair);

  function allPairsLength() external view returns (uint);

  function getPair(address tokenA, address tokenB) external view returns (address pair);

  function createPair(address tokenA, address tokenB) external returns (address pair);

  function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB);

  function getAmountOut(
    uint amountIn,
    uint reserveIn,
    uint reserveOut,
    uint32 swapFee
  ) external pure returns (uint amountOut);

  function getAmountIn(
    uint amountOut,
    uint reserveIn,
    uint reserveOut,
    uint32 swapFee
  ) external pure returns (uint amountIn);

  function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);

  function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts);

  // **** OPERATIONS ****

  function addLiquidity(
    address tokenA,
    address tokenB,
    uint amountADesired,
    uint amountBDesired,
    uint amountAMin,
    uint amountBMin,
    MintMeta memory _mintMeta,
    uint deadline
  ) external returns (uint amountA, uint amountB, uint liquidity);

  function addLiquidityWithPermit(
    address tokenA,
    address tokenB,
    uint amountADesired,
    uint amountBDesired,
    uint amountAMin,
    uint amountBMin,
    MintMeta memory _mintMeta,
    uint deadline,
    uint8[] memory v,
    bytes32[] memory r,
    bytes32[] memory s
  ) external returns (uint amountA, uint amountB, uint liquidity);

  // automatically repays any related open loans from the borrower (msg.sender)
  function removeLiquidity(
    address tokenA,
    address tokenB,
    uint liquidity,
    uint amountAMin,
    uint amountBMin,
    address _upperHint,
    address _lowerHint,
    uint deadline
  ) external returns (uint amountA, uint amountB);

  function removeLiquidityWithPermit(
    RemoveLiquidtyPermitParams memory params
  ) external returns (uint amountA, uint amountB);

  function swapExactTokensForTokens(
    uint amountIn,
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline
  ) external returns (uint[] memory amounts);

  function swapTokensForExactTokens(
    uint amountOut,
    uint amountInMax,
    address[] calldata path,
    address to,
    uint deadline
  ) external returns (uint[] memory amounts);

  function swapExactTokensForTokensWithPermit(
    uint amountIn,
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external returns (uint[] memory amounts);

  function openLongPosition(
    uint stableToMintIn,
    uint debtOutMin,
    address debtTokenAddress,
    address to,
    MintMeta memory _mintMeta,
    uint deadline
  ) external returns (uint[] memory amounts);

  function openShortPosition(
    uint debtToMintIn,
    uint stableOutMin,
    address debtTokenAddress,
    address to,
    MintMeta memory _mintMeta,
    uint deadline
  ) external returns (uint[] memory amounts);
}
