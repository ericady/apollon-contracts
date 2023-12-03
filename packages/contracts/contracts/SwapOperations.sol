// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './SwapPair.sol';
import './Interfaces/ISwapOperations.sol';
import './Interfaces/IBorrowerOperations.sol';
import './Interfaces/IPriceFeed.sol';
import './Dependencies/CheckContract.sol';

contract SwapOperations is ISwapOperations, Ownable, CheckContract {
  IBorrowerOperations public borrowerOperations;
  IPriceFeed public priceFeed;

  mapping(address => mapping(address => address)) public getPair;
  address[] public allPairs;

  // todo reward flow, where should the swap fees flow to...
  address public feeTo; // gets used by the pairs itself

  constructor(address _borrowerOperationsAddress, address _priceFeedAddress) {
    checkContract(_borrowerOperationsAddress);
    checkContract(_priceFeedAddress);

    borrowerOperations = IBorrowerOperations(_borrowerOperationsAddress);
    priceFeed = IPriceFeed(_priceFeedAddress);

    emit SwapOperationsInitialized(_borrowerOperationsAddress, _priceFeedAddress);
  }

  modifier ensure(uint deadline) {
    if (deadline < block.timestamp) revert Expired();
    _;
  }

  // **** PAIR MANAGEMENT ****

  function getFeeTo() external view override returns (address) {
    return feeTo;
  }

  function allPairsLength() external view returns (uint) {
    return allPairs.length;
  }

  function createPair(address tokenA, address tokenB) external onlyOwner returns (address pair) {
    if (tokenA == tokenB) revert IdenticalAddresses();

    (address token0, address token1) = sortTokens(tokenA, tokenB);
    if (token0 == address(0)) revert ZeroAddress();
    if (getPair[token0][token1] != address(0)) revert PairExists(); // single check is sufficient

    bytes memory bytecode = type(SwapPair).creationCode;
    bytes32 salt = keccak256(abi.encodePacked(token0, token1));
    assembly {
      pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
    }

    ISwapPair(pair).initialize(token0, token1);
    getPair[token0][token1] = pair;
    getPair[token1][token0] = pair; // populate mapping in the reverse direction
    allPairs.push(pair);

    emit PairCreated(token0, token1, pair, allPairs.length);
  }

  // **** GETTER FUNCTIONS ****

  function quote(uint amountA, uint reserveA, uint reserveB) public pure virtual override returns (uint amountB) {
    if (amountA == 0) revert InsufficientAmount();
    if (reserveA == 0 || reserveB == 0) revert InsufficientLiquidity();

    amountB = (amountA * reserveB) / reserveA;
  }

  function getAmountOut(
    uint amountIn,
    uint reserveIn,
    uint reserveOut
  ) public pure virtual override returns (uint amountOut) {
    if (amountIn == 0) revert InsufficientInputAmount();
    if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();

    uint amountInWithFee = amountIn * 997;
    uint numerator = amountInWithFee * reserveOut;
    uint denominator = reserveIn * 1000 + amountInWithFee;
    amountOut = numerator / denominator;
  }

  function getAmountIn(
    uint amountOut,
    uint reserveIn,
    uint reserveOut
  ) public pure virtual override returns (uint amountIn) {
    if (amountOut == 0) revert InsufficientOutputAmount();
    if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();

    uint numerator = reserveIn * amountOut * 1000;
    uint denominator = (reserveOut - amountOut) * 997;
    amountIn = (numerator / denominator) + 1;
  }

  function getAmountsOut(
    uint amountIn,
    address[] memory path
  ) public view virtual override returns (uint[] memory amounts) {
    if (path.length < 2) revert InvalidPath();

    amounts = new uint[](path.length);
    amounts[0] = amountIn;
    for (uint i; i < path.length - 1; i++) {
      (uint reserveIn, uint reserveOut) = getReserves(path[i], path[i + 1]);
      amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
    }
  }

  function getAmountsIn(
    uint amountOut,
    address[] memory path
  ) public view virtual override returns (uint[] memory amounts) {
    if (path.length < 2) revert InvalidPath();

    amounts = new uint[](path.length);
    amounts[amounts.length - 1] = amountOut;
    for (uint i = path.length - 1; i > 0; i--) {
      (uint reserveIn, uint reserveOut) = getReserves(path[i - 1], path[i]);
      amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
    }
  }

  // **** LIQUIDITY FUNCTIONS ****

  function addLiquidity(
    address tokenA,
    address tokenB,
    uint amountADesired,
    uint amountBDesired,
    uint amountAMin,
    uint amountBMin,
    address to,
    uint deadline
  ) external virtual override ensure(deadline) returns (uint amountA, uint amountB, uint liquidity) {
    if (getPair[tokenA][tokenB] == address(0)) revert PairDoesNotExist();

    {
      (uint reserveA, uint reserveB) = getReserves(tokenA, tokenB);
      if (reserveA == 0 && reserveB == 0) {
        (amountA, amountB) = (amountADesired, amountBDesired);
      } else {
        uint amountBOptimal = quote(amountADesired, reserveA, reserveB);
        if (amountBOptimal <= amountBDesired) {
          if (amountBOptimal < amountBMin) revert InsufficientBAmount();
          (amountA, amountB) = (amountADesired, amountBOptimal);
        } else {
          uint amountAOptimal = quote(amountBDesired, reserveB, reserveA);
          assert(amountAOptimal <= amountADesired);
          if (amountAOptimal < amountAMin) revert InsufficientAAmount();
          (amountA, amountB) = (amountAOptimal, amountBDesired);
        }
      }
    }

    address pair = getPair[tokenA][tokenB];
    safeTransferFrom(tokenA, msg.sender, pair, amountA);
    safeTransferFrom(tokenB, msg.sender, pair, amountB);
    liquidity = ISwapPair(pair).mint(to);
  }

  function removeLiquidity(
    address tokenA,
    address tokenB,
    uint liquidity,
    uint amountAMin,
    uint amountBMin,
    address to,
    uint deadline
  ) public virtual override ensure(deadline) returns (uint amountA, uint amountB) {
    address pair = getPair[tokenA][tokenB];
    ISwapPair(pair).transferFrom(msg.sender, pair, liquidity); // send liquidity to pair
    (uint amount0, uint amount1) = ISwapPair(pair).burn(to);
    (address token0, ) = sortTokens(tokenA, tokenB);
    (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);

    if (amountA < amountAMin) revert InsufficientAAmount();
    if (amountB < amountBMin) revert InsufficientBAmount();
  }

  // **** SWAP ****
  // requires the initial amount to have already been sent to the first pair

  function _swap(uint[] memory amounts, address[] memory path, address _to) internal virtual {
    for (uint i; i < path.length - 1; i++) {
      (address input, address output) = (path[i], path[i + 1]);
      (address token0, ) = sortTokens(input, output);
      uint amountOut = amounts[i + 1];
      (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
      address to = i < path.length - 2 ? getPair[output][path[i + 2]] : _to;
      ISwapPair(getPair[input][output]).swap(amount0Out, amount1Out, to, new bytes(0));
    }
  }

  function swapExactTokensForTokens(
    uint amountIn,
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline
  ) external virtual override ensure(deadline) returns (uint[] memory amounts) {
    amounts = getAmountsOut(amountIn, path);
    if (amounts[amounts.length - 1] < amountOutMin) revert InsufficientOutputAmount();
    safeTransferFrom(path[0], msg.sender, getPair[path[0]][path[1]], amounts[0]);
    _swap(amounts, path, to);
  }

  function swapTokensForExactTokens(
    uint amountOut,
    uint amountInMax,
    address[] calldata path,
    address to,
    uint deadline
  ) external virtual override ensure(deadline) returns (uint[] memory amounts) {
    amounts = getAmountsIn(amountOut, path);
    if (amounts[0] > amountInMax) revert ExcessiveInputAmount();
    safeTransferFrom(path[0], msg.sender, getPair[path[0]][path[1]], amounts[0]);
    _swap(amounts, path, to);
  }

  // **** HELPER FUNCTIONS ****

  function getReserves(address tokenA, address tokenB) internal view returns (uint reserveA, uint reserveB) {
    (uint reserve0, uint reserve1, ) = ISwapPair(getPair[tokenA][tokenB]).getReserves();
    (address token0, ) = sortTokens(tokenA, tokenB);
    (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
  }

  function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
    if (tokenA == tokenB) revert IdenticalAddresses();
    (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    if (token0 == address(0)) revert ZeroAddress();
  }

  function safeTransferFrom(address token, address from, address to, uint256 value) internal {
    // bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));
    (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));
    if (!success || (data.length > 0 && abi.decode(data, (bool)) == false)) revert TransferFromFailed();
  }
}
