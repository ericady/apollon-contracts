// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './Dependencies/LiquityMath.sol';
import './Dependencies/UQ112x112.sol';
import './Interfaces/ISwapPair.sol';
import './Interfaces/ISwapOperations.sol';
import './Interfaces/ISwapCallee.sol';
import './SwapERC20.sol';

contract SwapPair is ISwapPair, SwapERC20 {
  using UQ112x112 for uint224;

  uint public constant MINIMUM_LIQUIDITY = 10 ** 3;
  bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));

  address public operations;
  address public token0;
  address public token1;

  uint112 private reserve0; // uses single storage slot, accessible via getReserves
  uint112 private reserve1; // uses single storage slot, accessible via getReserves
  uint32 private blockTimestampLast; // uses single storage slot, accessible via getReserves

  uint public price0CumulativeLast;
  uint public price1CumulativeLast;
  uint public kLast; // reserve0 * reserve1, as of immediately after the most recent liquidity event

  constructor() {
    operations = msg.sender;
  }

  // called once by the operations at time of deployment
  function initialize(address _token0, address _token1) external {
    if (msg.sender != operations) revert Forbidden();

    token0 = _token0;
    token1 = _token1;
  }

  uint private unlocked = 1;
  modifier lock() {
    if (unlocked == 0) revert Locked();

    unlocked = 0;
    _;
    unlocked = 1;
  }

  function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
    _reserve0 = reserve0;
    _reserve1 = reserve1;
    _blockTimestampLast = blockTimestampLast;
  }

  function _safeTransfer(address token, address to, uint value) private {
    (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));

    if (!success || (data.length > 0 && abi.decode(data, (bool)) == false)) revert TransferFailed();
  }

  // update reserves and, on the first call per block, price accumulators
  function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1) private {
    if (balance0 > type(uint112).max || balance1 > type(uint112).max) revert Overflow();

    uint32 blockTimestamp = uint32(block.timestamp % 2 ** 32);
    uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired
    if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
      // * never overflows, and + overflow is desired
      price0CumulativeLast += uint(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed;
      price1CumulativeLast += uint(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed;
    }

    reserve0 = uint112(balance0);
    reserve1 = uint112(balance1);
    blockTimestampLast = blockTimestamp;
    emit Sync(reserve0, reserve1);
  }

  // if fee is on, mint liquidity equivalent to 1/6th of the growth in sqrt(k)
  function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
    address feeTo = ISwapOperations(operations).getFeeTo();

    feeOn = feeTo != address(0);
    uint _kLast = kLast; // gas savings
    if (feeOn) {
      if (_kLast != 0) {
        uint rootK = LiquityMath._sqrt(_reserve0 * _reserve1);
        uint rootKLast = LiquityMath._sqrt(_kLast);

        if (rootK > rootKLast) {
          uint numerator = totalSupply * (rootK - rootKLast);
          uint denominator = rootK * 5 + rootKLast;
          uint liquidity = numerator / denominator;
          if (liquidity > 0) _mint(feeTo, liquidity);
        }
      }
    } else if (_kLast != 0) {
      kLast = 0;
    }
  }

  // this low-level function should be called from a contract which performs important safety checks
  function mint(address to) external lock returns (uint liquidity) {
    (uint112 _reserve0, uint112 _reserve1, ) = getReserves(); // gas savings
    uint balance0 = IERC20(token0).balanceOf(address(this));
    uint balance1 = IERC20(token1).balanceOf(address(this));
    uint amount0 = balance0 - _reserve0;
    uint amount1 = balance1 - _reserve1;

    bool feeOn = _mintFee(_reserve0, _reserve1);
    uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
    if (_totalSupply == 0) {
      liquidity = LiquityMath._sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
      _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
    } else {
      liquidity = LiquityMath._min((amount0 * _totalSupply) / _reserve0, (amount1 * _totalSupply) / _reserve1);
    }

    if (liquidity == 0) revert InsufficientLiquidityMinted();
    _mint(to, liquidity);
    _update(balance0, balance1, _reserve0, _reserve1);

    if (feeOn) kLast = reserve0 * reserve1; // reserve0 and reserve1 are up-to-date
    emit Mint(msg.sender, amount0, amount1);
  }

  // this low-level function should be called from a contract which performs important safety checks
  function burn(address to) external lock returns (uint amount0, uint amount1) {
    (uint112 _reserve0, uint112 _reserve1, ) = getReserves(); // gas savings
    address _token0 = token0; // gas savings
    address _token1 = token1; // gas savings
    uint balance0 = IERC20(_token0).balanceOf(address(this));
    uint balance1 = IERC20(_token1).balanceOf(address(this));
    uint liquidity = balanceOf[address(this)];

    bool feeOn = _mintFee(_reserve0, _reserve1);
    uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
    amount0 = (liquidity * balance0) / _totalSupply; // using balances ensures pro-rata distribution
    amount1 = (liquidity * balance1) / _totalSupply; // using balances ensures pro-rata distribution

    if (amount0 == 0 || amount1 == 0) revert InsufficientLiquidityBurned();
    _burn(address(this), liquidity);
    _safeTransfer(_token0, to, amount0);
    _safeTransfer(_token1, to, amount1);

    balance0 = IERC20(_token0).balanceOf(address(this));
    balance1 = IERC20(_token1).balanceOf(address(this));
    _update(balance0, balance1, _reserve0, _reserve1);

    if (feeOn) kLast = reserve0 * reserve1; // reserve0 and reserve1 are up-to-date
    emit Burn(msg.sender, amount0, amount1, to);
  }

  // this low-level function should be called from a contract which performs important safety checks
  function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external lock {
    if (amount0Out == 0 && amount1Out == 0) revert InsufficientOutputAmount();

    (uint112 _reserve0, uint112 _reserve1, ) = getReserves(); // gas savings
    if (amount0Out > _reserve0 || amount1Out > _reserve1) revert InsufficientLiquidity();

    uint balance0;
    uint balance1;
    {
      // scope for _token{0,1}, avoids stack too deep errors
      address _token0 = token0;
      address _token1 = token1;
      if (to == _token0 || to == _token1) revert InvalidTo();

      if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out); // optimistically transfer tokens
      if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out); // optimistically transfer tokens
      if (data.length > 0) ISwapCallee(to).swapCall(msg.sender, amount0Out, amount1Out, data);
      balance0 = IERC20(_token0).balanceOf(address(this));
      balance1 = IERC20(_token1).balanceOf(address(this));
    }

    uint amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
    uint amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
    if (amount0In == 0 && amount1In == 0) revert InsufficientInputAmount();

    {
      // scope for reserve{0,1}Adjusted, avoids stack too deep errors
      uint balance0Adjusted = balance0 * 1000 - (amount0In * 3);
      uint balance1Adjusted = balance1 * 1000 - (amount1In * 3);
      if (balance0Adjusted * balance1Adjusted < _reserve0 * _reserve1 * (1000 ** 2)) revert K();
    }

    _update(balance0, balance1, _reserve0, _reserve1);
    emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
  }

  // force balances to match reserves
  function skim(address to) external lock {
    address _token0 = token0; // gas savings
    address _token1 = token1; // gas savings
    _safeTransfer(_token0, to, IERC20(_token0).balanceOf(address(this)) - reserve0);
    _safeTransfer(_token1, to, IERC20(_token1).balanceOf(address(this)) - reserve1);
  }

  // force reserves to match balances
  function sync() external lock {
    _update(IERC20(token0).balanceOf(address(this)), IERC20(token1).balanceOf(address(this)), reserve0, reserve1);
  }
}
