// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface ISwapERC20 {
  event Transfer(address indexed from, address indexed to, uint value);

  function name() external pure returns (string memory);

  function symbol() external pure returns (string memory);

  function decimals() external pure returns (uint8);

  function totalSupply() external view returns (uint);

  function balanceOf(address owner) external view returns (uint);

  function DOMAIN_SEPARATOR() external view returns (bytes32);

  function PERMIT_TYPEHASH() external pure returns (bytes32);

  function nonces(address owner) external view returns (uint);

  function approve(address spender, uint value) external returns (bool);

  function transfer(address to, uint value) external returns (bool);

  function transferFrom(address from, address to, uint value) external returns (bool);

  function permit(address owner, address spender, uint deadline, uint value, uint8 v, bytes32 r, bytes32 s) external;
}
