// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './Interfaces/ISwapERC20.sol';

contract SwapERC20 is ISwapERC20 {
  string public constant name = 'Swap';
  string public constant symbol = 'SWAP';
  uint8 public constant decimals = 18;
  uint public totalSupply;
  mapping(address => uint) public balanceOf;

  function _mint(address to, uint value) internal {
    totalSupply += value;
    balanceOf[to] += value;
    emit Transfer(address(0), to, value);
  }

  function _burn(address from, uint value) internal {
    balanceOf[from] -= value;
    totalSupply -= value;
    emit Transfer(from, address(0), value);
  }

  function _approve(address owner, address spender, uint value) private {
    allowance[owner][spender] = value;
    emit Approval(owner, spender, value);
  }

  function _transfer(address from, address to, uint value) private {
    balanceOf[from] -= value;
    balanceOf[to] += value;
    emit Transfer(from, to, value);
  }

  function approve(address spender, uint value) external returns (bool) {
    _approve(msg.sender, spender, value);
    return true;
  }

  function transfer(address to, uint value) external returns (bool) {
    _transfer(msg.sender, to, value);
    return true;
  }

  function transferFrom(address from, address to, uint value) external returns (bool) {
    if (allowance[from][msg.sender] != type(uint).max) {
      allowance[from][msg.sender] -= value;
    }
    _transfer(from, to, value);
    return true;
  }

  function permit(address owner, address spender, uint deadline, uint value, uint8 v, bytes32 r, bytes32 s) external {
    if (deadline < block.timestamp) revert PermitExpired();
    bytes32 digest = keccak256(
      abi.encodePacked(
        '\x19\x01',
        DOMAIN_SEPARATOR,
        keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline))
      )
    );
    address recoveredAddress = ecrecover(digest, v, r, s);
    if (recoveredAddress == address(0) || recoveredAddress != owner) revert InvalidSignature();
    _approve(owner, spender, value);
  }
}
