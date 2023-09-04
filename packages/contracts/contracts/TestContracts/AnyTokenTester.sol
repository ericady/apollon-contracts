// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract AnyTokenTester is ERC20 {
  constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}

    function unprotectedMint(address _account, uint256 _amount) external {
        _mint(_account, _amount);
    }
}
