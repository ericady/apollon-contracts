// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './Interfaces/IDebtToken.sol';
import './Dependencies/SafeMath.sol';
import './Dependencies/CheckContract.sol';
import './Dependencies/console.sol';
import './Interfaces/IPriceFeed.sol';

/*
 *
 * Based upon OpenZeppelin's ERC20 contract:
 * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol
 *
 * and their EIP2612 (ERC20Permit / ERC712) functionality:
 * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/53516bc555a454862470e7860a9b5254db4d00f5/contracts/token/ERC20/ERC20Permit.sol
 *
 *
 * --- Functionality added specific to the DToken ---
 *
 * 1) Transfer protection: blacklist of addresses that are invalid recipients (i.e. core Liquity contracts) in external
 * transfer() and transferFrom() calls. The purpose is to protect users from losing tokens by mistakenly sending dToken directly to a Liquity
 * core contract, when they should rather call the right function.
 *
 * 2) sendToPool() and returnFromPool(): functions callable only Liquity core contracts, which move dTokens between Liquity <-> user.
 */

contract DebtToken is CheckContract, IDebtToken {
  using SafeMath for uint256;

  uint256 private _totalSupply;
  string internal _NAME;
  string internal _SYMBOL;
  string internal _VERSION;
  uint8 internal constant _DECIMALS = 18;
  bool internal immutable _IS_STABLE_COIN;

  // --- Data for EIP2612 ---

  // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
  bytes32 private constant _PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
  // keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
  bytes32 private constant _TYPE_HASH = 0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f;

  // Cache the domain separator as an immutable value, but also store the chain id that it corresponds to, in order to
  // invalidate the cached domain separator if the chain id changes.
  bytes32 private immutable _CACHED_DOMAIN_SEPARATOR;
  uint256 private immutable _CACHED_CHAIN_ID;

  bytes32 private immutable _HASHED_NAME;
  bytes32 private immutable _HASHED_VERSION;

  mapping(address => uint256) private _nonces;

  // User data for dToken
  mapping(address => uint256) private _balances;
  mapping(address => mapping(address => uint256)) private _allowances;

  // --- Addresses ---
  address public immutable troveManagerAddress;
  address public immutable borrowerOperationsAddress;
  address public immutable stabilityPoolManagerAddress;
  IPriceFeed public immutable priceFeed;

  constructor(
    address _troveManagerAddress,
    address _borrowerOperationsAddress,
    address _stabilityPoolManagerAddress,
    address _priceFeedAddress,
    string memory _symbol,
    string memory _name,
    string memory _version,
    bool _isStableCoin
  ) {
    checkContract(_troveManagerAddress);
    checkContract(_borrowerOperationsAddress);
    checkContract(_stabilityPoolManagerAddress);
    checkContract(_priceFeedAddress);

    troveManagerAddress = _troveManagerAddress;
    emit TroveManagerAddressChanged(_troveManagerAddress);

    borrowerOperationsAddress = _borrowerOperationsAddress;
    emit BorrowerOperationsAddressChanged(_borrowerOperationsAddress);

    stabilityPoolManagerAddress = _stabilityPoolManagerAddress;
    emit StabilityPoolManagerAddressChanged(_stabilityPoolManagerAddress);

    priceFeed = IPriceFeed(_priceFeedAddress);
    emit PriceFeedAddressChanged(_priceFeedAddress);

    _NAME = _name;
    _SYMBOL = _symbol;
    _VERSION = _version;
    _IS_STABLE_COIN = _isStableCoin;

    bytes32 hashedName = keccak256(bytes(_NAME));
    bytes32 hashedVersion = keccak256(bytes(_VERSION));

    _HASHED_NAME = hashedName;
    _HASHED_VERSION = hashedVersion;
    _CACHED_CHAIN_ID = _chainID();
    _CACHED_DOMAIN_SEPARATOR = _buildDomainSeparator(_TYPE_HASH, hashedName, hashedVersion);
  }

  // --- Functions for intra-Liquity calls ---

  function isStableCoin() external view override returns (bool) {
    return _IS_STABLE_COIN;
  }

  function getPrice(PriceCache memory _priceCache) external view override returns (uint) {
    return priceFeed.getPrice(_priceCache, address(this));
  }

  function mint(address _account, uint256 _amount) external override {
    _requireCallerIsBorrowerOperations();
    _mint(_account, _amount);
  }

  function burn(address _account, uint256 _amount) external override {
    _requireCallerIsBOorTroveMorSP();
    _burn(_account, _amount);
  }

  function sendToPool(address _sender, address _poolAddress, uint256 _amount) external override {
    //TODO:    _requireCallerIsStabilityPoolManager(); todo! needs to be called from the manager, not the pool itself...
    _transfer(_sender, _poolAddress, _amount);
  }

  function returnFromPool(address _poolAddress, address _receiver, uint256 _amount) external override {
    _requireCallerIsTroveMorSP();
    _transfer(_poolAddress, _receiver, _amount);
  }

  // --- External functions ---

  function totalSupply() external view override returns (uint256) {
    return _totalSupply;
  }

  function balanceOf(address account) external view override returns (uint256) {
    return _balances[account];
  }

  function transfer(address recipient, uint256 amount) external override returns (bool) {
    _requireValidRecipient(recipient);
    _transfer(msg.sender, recipient, amount);
    return true;
  }

  function allowance(address owner, address spender) external view override returns (uint256) {
    return _allowances[owner][spender];
  }

  function approve(address spender, uint256 amount) external override returns (bool) {
    _approve(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool) {
    _requireValidRecipient(recipient);
    _transfer(sender, recipient, amount);
    _approve(
      sender,
      msg.sender,
      _allowances[sender][msg.sender].sub(amount, 'ERC20: transfer amount exceeds allowance')
    );
    return true;
  }

  function increaseAllowance(address spender, uint256 addedValue) external override returns (bool) {
    _approve(msg.sender, spender, _allowances[msg.sender][spender].add(addedValue));
    return true;
  }

  function decreaseAllowance(address spender, uint256 subtractedValue) external override returns (bool) {
    _approve(
      msg.sender,
      spender,
      _allowances[msg.sender][spender].sub(subtractedValue, 'ERC20: decreased allowance below zero')
    );
    return true;
  }

  // --- EIP 2612 Functionality ---

  function domainSeparator() external view override returns (bytes32) {
    if (_chainID() == _CACHED_CHAIN_ID) {
      return _CACHED_DOMAIN_SEPARATOR;
    } else {
      return _buildDomainSeparator(_TYPE_HASH, _HASHED_NAME, _HASHED_VERSION);
    }
  }

  function permit(
    address owner,
    address spender,
    uint amount,
    uint deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override {
    require(deadline >= block.timestamp, 'dToken: expired deadline');
    bytes32 digest = keccak256(
      abi.encodePacked(
        '\x19\x01',
        this.domainSeparator(),
        keccak256(abi.encode(_PERMIT_TYPEHASH, owner, spender, amount, _nonces[owner]++, deadline))
      )
    );
    address recoveredAddress = ecrecover(digest, v, r, s);
    require(recoveredAddress == owner, 'dToken: invalid signature');
    _approve(owner, spender, amount);
  }

  function nonces(address owner) external view override returns (uint256) {
    // FOR EIP 2612
    return _nonces[owner];
  }

  // --- Internal operations ---

  function _chainID() private view returns (uint256 chainID) {
    assembly {
      chainID := chainid()
    }
  }

  function _buildDomainSeparator(bytes32 typeHash, bytes32 newName, bytes32 newVersion) private view returns (bytes32) {
    return keccak256(abi.encode(typeHash, newName, newVersion, _chainID(), address(this)));
  }

  // --- Internal operations ---
  // Warning: sanity checks (for sender and recipient) should have been done before calling these internal functions

  function _transfer(address sender, address recipient, uint256 amount) internal {
    assert(sender != address(0));
    assert(recipient != address(0));

    _balances[sender] = _balances[sender].sub(amount, 'ERC20: transfer amount exceeds balance');
    _balances[recipient] = _balances[recipient].add(amount);
    emit Transfer(sender, recipient, amount);
  }

  function _mint(address account, uint256 amount) internal {
    assert(account != address(0));

    _totalSupply = _totalSupply.add(amount);
    _balances[account] = _balances[account].add(amount);
    emit Transfer(address(0), account, amount);
  }

  function _burn(address account, uint256 amount) internal {
    assert(account != address(0));

    _balances[account] = _balances[account].sub(amount, 'ERC20: burn amount exceeds balance');
    _totalSupply = _totalSupply.sub(amount);
    emit Transfer(account, address(0), amount);
  }

  function _approve(address owner, address spender, uint256 amount) internal {
    assert(owner != address(0));
    assert(spender != address(0));

    _allowances[owner][spender] = amount;
    emit Approval(owner, spender, amount);
  }

  // --- 'require' functions ---

  function _requireValidRecipient(address _recipient) internal view {
    require(
      _recipient != address(0) && _recipient != address(this),
      'dToken: Cannot transfer tokens directly to the dToken token contract or the zero address'
    );
    require(
      _recipient != stabilityPoolManagerAddress &&
        _recipient != troveManagerAddress &&
        _recipient != borrowerOperationsAddress,
      'dToken: Cannot transfer tokens directly to the StabilityPool, TroveManager or BorrowerOps'
    );
  }

  function _requireCallerIsBorrowerOperations() internal view {
    require(msg.sender == borrowerOperationsAddress, 'dToken: Caller is not BorrowerOperations');
  }

  function _requireCallerIsBOorTroveMorSP() internal view {
    require(
      msg.sender == borrowerOperationsAddress ||
        msg.sender == troveManagerAddress ||
        msg.sender == stabilityPoolManagerAddress,
      'dToken: Caller is neither BorrowerOperations nor TroveManager nor StabilityPoolManager'
    );
  }

  function _requireCallerIsStabilityPoolManager() internal view {
    require(msg.sender == stabilityPoolManagerAddress, 'dToken: Caller is not the StabilityPoolManager');
  }

  function _requireCallerIsTroveMorSP() internal view {
    require(
      msg.sender == troveManagerAddress || msg.sender == stabilityPoolManagerAddress,
      'dToken: Caller is neither TroveManager nor StabilityPoolManager'
    );
  }

  // --- Optional functions ---

  function name() external view override returns (string memory) {
    return _NAME;
  }

  function symbol() external view override returns (string memory) {
    return _SYMBOL;
  }

  function decimals() external pure override returns (uint8) {
    return _DECIMALS;
  }

  function version() external view override returns (string memory) {
    return _VERSION;
  }

  function permitTypeHash() external pure override returns (bytes32) {
    return _PERMIT_TYPEHASH;
  }
}
