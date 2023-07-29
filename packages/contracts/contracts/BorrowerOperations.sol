// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './Interfaces/IBorrowerOperations.sol';
import './Interfaces/ITroveManager.sol';
import './Dependencies/IERC20.sol';
import './Interfaces/IDebtToken.sol';
import './Interfaces/ISortedTroves.sol';
import './Dependencies/LiquityBase.sol';
import './Dependencies/Ownable.sol';
import './Dependencies/CheckContract.sol';
import './Dependencies/console.sol';
import './Interfaces/IDebtTokenManager.sol';
import './Interfaces/IStoragePool.sol';
import './Interfaces/IPriceFeed.sol';
import './Interfaces/IBBase.sol';

contract BorrowerOperations is
  LiquityBase,
  Ownable,
  CheckContract,
  IBorrowerOperations
{
  using SafeMath for uint256;
  string public constant NAME = 'BorrowerOperations';

  // --- Connected contract declarations ---

  ITroveManager public troveManager;
  IDebtTokenManager public debtTokenManager;
  ISortedTroves public sortedTroves; // A doubly linked list of Troves, sorted by their collateral ratios
  IStoragePool public storagePool;
  IPriceFeed public priceFeed;
  address stabilityPoolAddress;

  //    ILQTYStaking public lqtyStaking;
  //    address public lqtyStakingAddress;

  /* --- Variable container structs  ---

    Used to hold, return and assign variables inside a function, in order to avoid the error:
    "CompilerError: Stack too deep". */

  struct LocalVariables_adjustTrove {
    uint price;
    uint collChange;
    uint netDebtChange;
    bool isCollIncrease;
    uint debt;
    uint coll;
    uint oldICR;
    uint newICR;
    uint newTCR;
    uint LUSDFee;
    uint newDebt;
    uint newColl;
    uint stake;
  }

  struct LocalVariables_openTrove {
    CollTokenAmount[] colls;
    DebtTokenAmount[] debts;
    uint compositeDebtInStable;
    uint compositeCollInStable;
    uint ICR;
    uint NICR;
    uint arrayIndex;
  }

  struct ContractsCache {
    ITroveManager troveManager;
    IStoragePool storagePool;
    IDebtTokenManager debtTokenManager;
  }

  enum BorrowerOperation {
    openTrove,
    closeTrove,
    adjustTrove
  }

  // --- Dependency setters ---

  function setAddresses(
    address _troveManagerAddress,
    address _storagePoolAddress,
    address _stabilityPoolAddress,
    address _priceFeedAddress,
    address _sortedTrovesAddress,
    address _debtTokenManagerAddress
  ) external onlyOwner {
    // This makes impossible to open a trove with zero withdrawn LUSD
    assert(MIN_NET_DEBT > 0);

    checkContract(_troveManagerAddress);
    checkContract(_storagePoolAddress);
    checkContract(_stabilityPoolAddress);
    checkContract(_priceFeedAddress);
    checkContract(_sortedTrovesAddress);
    checkContract(_debtTokenManagerAddress);

    troveManager = ITroveManager(_troveManagerAddress);
    emit TroveManagerAddressChanged(_troveManagerAddress);

    storagePool = IStoragePool(_storagePoolAddress);
    emit StoragePoolAddressChanged(_storagePoolAddress);

    stabilityPoolAddress = _stabilityPoolAddress;
    emit StabilityPoolAddressChanged(_stabilityPoolAddress);

    priceFeed = IPriceFeed(_priceFeedAddress);
    emit PriceFeedAddressChanged(_priceFeedAddress);

    sortedTroves = ISortedTroves(_sortedTrovesAddress);
    emit SortedTrovesAddressChanged(_sortedTrovesAddress);

    debtTokenManager = IDebtTokenManager(_debtTokenManagerAddress);
    emit DebtTokenManagerAddressChanged(_debtTokenManagerAddress);

    _renounceOwnership();
  }

  // --- Borrower Trove Operations ---

  function openTrove(
    uint _maxFeePercentage,
    TokenAmount[] memory _colls,
    TokenAmount[] memory _debts,
    address _upperHint,
    address _lowerHint
  ) external payable override {
    ContractsCache memory contractsCache = ContractsCache(
      troveManager,
      storagePool,
      debtTokenManager
    );
    LocalVariables_openTrove memory vars;
    PriceCache memory priceCache;

    _requireTroveIsNotActive(contractsCache.troveManager, msg.sender);

    bool isRecoveryMode = contractsCache.storagePool.checkRecoveryMode(
      priceCache
    );
    _requireValidMaxFeePercentage(_maxFeePercentage, isRecoveryMode);

    DebtTokenAmount memory stableCoinAmount;
    (vars.debts, stableCoinAmount) = _getDebtTokenAmountsWithFetchedPrices(
      contractsCache.debtTokenManager,
      priceCache,
      _debts
    );

    // checking if new debt is above the minimum
    for (uint i = 0; i < vars.debts.length; i++) {
      _requireAtLeastMinNetDebt(vars.debts[i].netDebt);
    }

    // adding the borrowing fee to the net debt (+ gas compensation)
    uint borrowingFeesPaid = 0;
    if (!isRecoveryMode)
      borrowingFeesPaid = _addBorrowingFees(
        contractsCache.troveManager,
        vars.debts,
        stableCoinAmount,
        _maxFeePercentage
      );

    // adding gas compensation to the net debt
    stableCoinAmount.netDebt = stableCoinAmount.netDebt.add(
      STABLE_COIN_GAS_COMPENSATION
    );
    vars.compositeDebtInStable = _getCompositeDebt(vars.debts); // ICR is based on the composite debt, i.e. the requested debt amount + borrowing fee + debt gas comp.

    vars.colls = _getCollTokenAmountsWithFetchedPrices(priceCache, _colls);
    vars.compositeCollInStable = _getCompositeColl(vars.colls);

    vars.ICR = LiquityMath._computeCR(
      vars.compositeCollInStable,
      vars.compositeDebtInStable
    );
    vars.NICR = LiquityMath._computeNominalCR(
      vars.compositeCollInStable,
      vars.compositeDebtInStable
    );

    // checking collateral ratios
    if (isRecoveryMode) {
      _requireICRisAboveCCR(vars.ICR); // > 150 %
    } else {
      _requireICRisAboveMCR(vars.ICR); // > 110 %

      // todo (flat) inefficent because we are calculating the new TCR twice
      uint newTCR = _getNewTCRFromTroveChange(
        vars.compositeCollInStable,
        true,
        vars.compositeDebtInStable,
        true
      ); // bools: coll increase, debt increase
      _requireNewTCRisAboveCCR(newTCR); // > 150 %
    }

    // Set the trove struct's properties
    contractsCache.troveManager.setTroveStatus(msg.sender, 1); // active
    contractsCache.troveManager.increaseTroveColl(msg.sender, vars.colls);
    contractsCache.troveManager.increaseTroveDebt(msg.sender, vars.debts);

    // todo das beides muss noch nachgezogen werden
    contractsCache.troveManager.updateTroveRewardSnapshots(msg.sender);
    contractsCache.troveManager.updateStakeAndTotalStakes(msg.sender);

    sortedTroves.insert(
      priceCache,
      msg.sender,
      vars.NICR,
      _upperHint,
      _lowerHint
    );
    vars.arrayIndex = contractsCache.troveManager.addTroveOwnerToArray(
      msg.sender
    );
    emit TroveCreated(msg.sender, vars.arrayIndex);

    // Move the coll to the active pool, and mint the debt to the borrower
    for (uint i = 0; i < vars.colls.length; i++) {
      CollTokenAmount memory collTokenAmount = vars.colls[i];
      _poolAddColl(
        contractsCache.storagePool,
        collTokenAmount.tokenAddress,
        collTokenAmount.coll,
        PoolType.Active
      );
    }
    for (uint i = 0; i < vars.debts.length; i++) {
      DebtTokenAmount memory debtTokenAmount = vars.debts[i];
      _withdrawalDebt(
        contractsCache.storagePool,
        msg.sender,
        debtTokenAmount.debtToken,
        debtTokenAmount.netDebt,
        debtTokenAmount.netDebt.sub(debtTokenAmount.borrowingFee)
      );
    }

    // Move the stable coin gas compensation to the Gas Pool
    contractsCache.storagePool.addValue(
      address(stableCoinAmount.debtToken),
      false,
      PoolType.GasCompensation,
      STABLE_COIN_GAS_COMPENSATION
    );
    stableCoinAmount.debtToken.mint(
      address(contractsCache.storagePool),
      STABLE_COIN_GAS_COMPENSATION
    );

    //        emit TroveUpdated(msg.sender, vars.compositeDebtInStable, vars.compositeCollInStable, vars.stake, BorrowerOperation.openTrove);
    emit LUSDBorrowingFeePaid(msg.sender, borrowingFeesPaid);
  }

  // todo
  //    // Send ETH as collateral to a trove
  //    function addColl(address _upperHint, address _lowerHint) external payable override {
  //        _adjustTrove(msg.sender, 0, 0, false, _upperHint, _lowerHint, 0);
  //    }
  //
  //    // Withdraw ETH collateral from a trove
  //    function withdrawColl(uint _collWithdrawal, address _upperHint, address _lowerHint) external override {
  //        _adjustTrove(msg.sender, _collWithdrawal, 0, false, _upperHint, _lowerHint, 0);
  //    }
  //
  //    // Withdraw LUSD tokens from a trove: mint new LUSD tokens to the owner, and increase the trove's debt accordingly
  //    function withdrawLUSD(uint _maxFeePercentage, uint _LUSDAmount, address _upperHint, address _lowerHint) external {
  //        _adjustTrove(msg.sender, 0, _LUSDAmount, true, _upperHint, _lowerHint, _maxFeePercentage);
  //    }
  //
  //    // Repay LUSD tokens to a Trove: Burn the repaid LUSD tokens, and reduce the trove's debt accordingly
  //    function repayLUSD(uint _LUSDAmount, address _upperHint, address _lowerHint) external {
  //        _adjustTrove(msg.sender, 0, _LUSDAmount, false, _upperHint, _lowerHint, 0);
  //    }
  //
  //    function adjustTrove(uint _maxFeePercentage, uint _collWithdrawal, uint _LUSDChange, bool _isDebtIncrease, address _upperHint, address _lowerHint) external payable {
  //        _adjustTrove(msg.sender, _collWithdrawal, _LUSDChange, _isDebtIncrease, _upperHint, _lowerHint, _maxFeePercentage);
  //    }

  /*
   * _adjustTrove(): Alongside a debt change, this function can perform either a collateral top-up or a collateral withdrawal.
   *
   * It therefore expects either a positive msg.value, or a positive _collWithdrawal argument.
   *
   * If both are positive, it will revert.
   */
  function _adjustTrove(
    address _borrower,
    uint _collWithdrawal,
    uint _LUSDChange,
    bool _isDebtIncrease,
    address _upperHint,
    address _lowerHint,
    uint _maxFeePercentage
  ) internal {
    ContractsCache memory contractsCache = ContractsCache(
      troveManager,
      storagePool,
      debtTokenManager
    );
    LocalVariables_adjustTrove memory vars;

    //        vars.price = priceFeed.fetchPrice();
    //        bool isRecoveryMode = contractsCache.storagePool.checkRecoveryMode(vars.price);
    //
    //        if (_isDebtIncrease) {
    //            _requireValidMaxFeePercentage(_maxFeePercentage, isRecoveryMode);
    //            _requireNonZeroDebtChange(_LUSDChange);
    //        }
    //        _requireSingularCollChange(_collWithdrawal);
    //        _requireNonZeroAdjustment(_collWithdrawal, _LUSDChange);
    //        _requireTroveisActive(contractsCache.troveManager, _borrower);
    //
    //        // Confirm the operation is either a borrower adjusting their own trove, or a pure ETH transfer from the Stability Pool to a trove
    //        assert(msg.sender == _borrower || (msg.sender == stabilityPoolAddress && msg.value > 0 && _LUSDChange == 0));
    //
    //        contractsCache.troveManager.applyPendingRewards(_borrower);
    //
    //        // Get the collChange based on whether or not ETH was sent in the transaction
    //        (vars.collChange, vars.isCollIncrease) = _getCollChange(msg.value, _collWithdrawal);
    //
    //        vars.netDebtChange = _LUSDChange;
    //
    //        // If the adjustment incorporates a debt increase and system is in Normal Mode, then trigger a borrowing fee
    //        if (_isDebtIncrease && !isRecoveryMode) {
    ////            vars.LUSDFee = _triggerBorrowingFee(contractsCache.troveManager, contractsCache.lusdToken, _LUSDChange, _maxFeePercentage);
    //            vars.netDebtChange = vars.netDebtChange.add(vars.LUSDFee); // The raw debt change includes the fee
    //        }
    //
    //        vars.debt = contractsCache.troveManager.getTroveDebt(_borrower);
    //        vars.coll = contractsCache.troveManager.getTroveColl(_borrower);
    //
    //        // Get the trove's old ICR before the adjustment, and what its new ICR will be after the adjustment
    //        vars.oldICR = LiquityMath._computeCR(vars.coll, vars.debt, vars.price);
    //        vars.newICR = _getNewICRFromTroveChange(vars.coll, vars.debt, vars.collChange, vars.isCollIncrease, vars.netDebtChange, _isDebtIncrease, vars.price);
    //        assert(_collWithdrawal <= vars.coll);
    //
    //        // Check the adjustment satisfies all conditions for the current system mode
    //        _requireValidAdjustmentInCurrentMode(isRecoveryMode, _collWithdrawal, _isDebtIncrease, vars);
    //
    //        // When the adjustment is a debt repayment, check it's a valid amount and that the caller has enough LUSD
    //        if (!_isDebtIncrease && _LUSDChange > 0) {
    //            _requireAtLeastMinNetDebt(_getNetDebt(vars.debt).sub(vars.netDebtChange));
    //            _requireValidLUSDRepayment(vars.debt, vars.netDebtChange);
    ////            _requireSufficientLUSDBalance(contractsCache.lusdToken, _borrower, vars.netDebtChange);
    //        }
    //
    //        (vars.newColl, vars.newDebt) = _updateTroveFromAdjustment(contractsCache.troveManager, _borrower, vars.collChange, vars.isCollIncrease, vars.netDebtChange, _isDebtIncrease);
    //        vars.stake = contractsCache.troveManager.updateStakeAndTotalStakes(_borrower);
    //
    //        // Re-insert trove in to the sorted list
    //        uint newNICR = _getNewNominalICRFromTroveChange(vars.coll, vars.debt, vars.collChange, vars.isCollIncrease, vars.netDebtChange, _isDebtIncrease);
    //        sortedTroves.reInsert(_borrower, newNICR, _upperHint, _lowerHint);
    //
    //        emit TroveUpdated(_borrower, vars.newDebt, vars.newColl, vars.stake, BorrowerOperation.adjustTrove);
    //        emit LUSDBorrowingFeePaid(msg.sender,  vars.LUSDFee);
    //
    //        // Use the unmodified _LUSDChange here, as we don't send the fee to the user
    //        _moveTokensAndETHfromAdjustment(
    //            contractsCache.activePool,
    //            contractsCache.lusdToken,
    //            msg.sender,
    //            vars.collChange,
    //            vars.isCollIncrease,
    //            _LUSDChange,
    //            _isDebtIncrease,
    //            vars.netDebtChange
    //        );
  }

  function closeTrove() external override {
    //        ITroveManager troveManagerCached = troveManager;
    //        IStoragePool activePoolCached = storagePool;
    ////        ILUSDToken lusdTokenCached = lusdToken;
    //
    //        _requireTroveisActive(troveManagerCached, msg.sender);
    //        uint price = priceFeed.fetchPrice();
    //        _requireNotInRecoveryMode(price);
    //
    //        troveManagerCached.applyPendingRewards(msg.sender);
    //
    //        uint coll = troveManagerCached.getTroveColl(msg.sender);
    //        uint debt = troveManagerCached.getTroveDebt(msg.sender);
    //
    ////        _requireSufficientLUSDBalance(lusdTokenCached, msg.sender, debt.sub(STABLE_COIN_GAS_COMPENSATION));
    //
    //        uint newTCR = _getNewTCRFromTroveChange(coll, false, debt, false, price);
    //        _requireNewTCRisAboveCCR(newTCR);
    //
    //        troveManagerCached.removeStake(msg.sender);
    //        troveManagerCached.closeTrove(msg.sender);
    //
    //        emit TroveUpdated(msg.sender, 0, 0, 0, BorrowerOperation.closeTrove);
    //
    //        // todo
    ////        // Burn the repaid LUSD from the user's balance and the gas compensation from the Gas Pool
    ////        _repayLUSD(activePoolCached, lusdTokenCached, msg.sender, debt.sub(STABLE_COIN_GAS_COMPENSATION));
    ////        _repayLUSD(activePoolCached, lusdTokenCached, gasPoolAddress, STABLE_COIN_GAS_COMPENSATION);
    //
    //        // Send the collateral back to the user
    //        activePoolCached.sendETH(msg.sender, coll);
  }

  /**
   * Claim remaining collateral from a redemption or from a liquidation with ICR > MCR in Recovery Mode
   */
  function claimCollateral() external override {
    // send ETH from CollSurplus Pool to owner
    // todo...
    //        collSurplusPool.claimColl(msg.sender);
  }

  // --- Helper functions ---

  function _addBorrowingFees(
    ITroveManager _troveManager,
    DebtTokenAmount[] memory _debts,
    DebtTokenAmount memory _stableCoinAmount,
    uint _maxFeePercentage
  ) internal returns (uint borrowingFee) {
    uint compositeDebtInStable = _getCompositeDebt(_debts);

    _troveManager.decayBaseRateFromBorrowing(); // decay the baseRate state variable
    borrowingFee = _troveManager.getBorrowingFee(compositeDebtInStable);
    _requireUserAcceptsFee(
      borrowingFee,
      compositeDebtInStable,
      _maxFeePercentage
    );

    // Send fee to staking contract
    //        lqtyStaking.increaseF_LUSD(borrowingFee);
    //        stableCoinAmount.debtToken.mint(address(lqtyStaking), borrowingFee);

    // update troves debts
    _stableCoinAmount.netDebt.add(borrowingFee);
    _stableCoinAmount.borrowingFee.add(borrowingFee);

    return borrowingFee;
  }

  function _getUSDValue(uint _coll, uint _price) internal pure returns (uint) {
    uint usdValue = _price.mul(_coll).div(DECIMAL_PRECISION);

    return usdValue;
  }

  function _getCollChange(
    uint _collReceived,
    uint _requestedCollWithdrawal
  ) internal pure returns (uint collChange, bool isCollIncrease) {
    if (_collReceived != 0) {
      collChange = _collReceived;
      isCollIncrease = true;
    } else {
      collChange = _requestedCollWithdrawal;
    }
  }

  // Update trove's coll and debt based on whether they increase or decrease
  function _updateTroveFromAdjustment(
    ITroveManager _troveManager,
    address _borrower,
    uint _collChange,
    bool _isCollIncrease,
    uint _debtChange,
    bool _isDebtIncrease
  ) internal returns (uint, uint) {
    // todo
    //        uint newColl = (_isCollIncrease) ? _troveManager.increaseTroveColl(_borrower, _collChange)
    //                                        : _troveManager.decreaseTroveColl(_borrower, _collChange);
    //        uint newDebt = (_isDebtIncrease) ? _troveManager.increaseTroveDebt(_borrower, _debtChange)
    //                                        : _troveManager.decreaseTroveDebt(_borrower, _debtChange);
    //        return (newColl, newDebt);

    return (1, 1);
  }

  //    function _moveTokensAndETHfromAdjustment
  //    (
  //        IStoragePool _activePool,
  //        ILUSDToken _lusdToken,
  //        address _borrower,
  //        uint _collChange,
  //        bool _isCollIncrease,
  //        uint _LUSDChange,
  //        bool _isDebtIncrease,
  //        uint _netDebtChange
  //    )
  //        internal
  //    {
  //        if (_isDebtIncrease) {
  //            _withdrawLUSD(_activePool, _lusdToken, _borrower, _LUSDChange, _netDebtChange);
  //        } else {
  //            _repayLUSD(_activePool, _lusdToken, _borrower, _LUSDChange);
  //        }
  //
  //        if (_isCollIncrease) {
  //            _poolAddColl(_activePool, _collChange);
  //        } else {
  //            _activePool.sendETH(_borrower, _collChange);
  //        }
  //    }

  function _poolAddColl(
    IStoragePool _pool,
    address _collAddress,
    uint _amount,
    PoolType _poolType
  ) internal {
    _pool.addValue(_collAddress, true, _poolType, _amount);
    IERC20(_collAddress).transferFrom(msg.sender, address(_pool), _amount);
  }

  function _withdrawalDebt(
    IStoragePool _storagePool,
    address _borrower,
    IDebtToken _debtToken,
    uint _netDebtIncrease,
    uint _mintAmount
  ) internal {
    _storagePool.addValue(
      address(_debtToken),
      false,
      PoolType.Active,
      _netDebtIncrease
    );
    if (_mintAmount > 0) _debtToken.mint(_borrower, _mintAmount);
  }

  //    // Burn the specified amount of LUSD from _account and decreases the total active debt
  //    function _repayLUSD(IStoragePool _activePool, ILUSDToken _lusdToken, address _account, uint _LUSD) internal {
  //        _activePool.decreaseLUSDDebt(_LUSD);
  //        _lusdToken.burn(_account, _LUSD);
  //    }

  // --- 'Require' wrapper functions ---

  function _requireSingularCollChange(uint _collWithdrawal) internal view {
    require(
      msg.value == 0 || _collWithdrawal == 0,
      'BorrowerOperations: Cannot withdraw and add coll'
    );
  }

  function _requireCallerIsBorrower(address _borrower) internal view {
    require(
      msg.sender == _borrower,
      'BorrowerOps: Caller must be the borrower for a withdrawal'
    );
  }

  function _requireNonZeroAdjustment(
    uint _collWithdrawal,
    uint _LUSDChange
  ) internal view {
    require(
      msg.value != 0 || _collWithdrawal != 0 || _LUSDChange != 0,
      'BorrowerOps: There must be either a collateral change or a debt change'
    );
  }

  function _requireTroveisActive(
    ITroveManager _troveManager,
    address _borrower
  ) internal view {
    uint status = _troveManager.getTroveStatus(_borrower);
    require(status == 1, 'BorrowerOps: Trove does not exist or is closed');
  }

  function _requireTroveIsNotActive(
    ITroveManager _troveManager,
    address _borrower
  ) internal view {
    uint status = _troveManager.getTroveStatus(_borrower);
    require(status != 1, 'BorrowerOps: Trove is active');
  }

  // adds stableCoin debt including gas compensation if not already included
  function _getDebtTokenAmountsWithFetchedPrices(
    IDebtTokenManager _dTokenManager,
    PriceCache memory _priceCache,
    TokenAmount[] memory _debts
  )
    internal
    returns (
      DebtTokenAmount[] memory debtTokenAmounts,
      DebtTokenAmount memory stableCoinEntry
    )
  {
    address stableCoinAddress = address(_dTokenManager.getStableCoin());

    bool stableCoinIncluded = false;
    for (uint i = 0; i < _debts.length; i++) {
      if (_debts[i].tokenAddress != stableCoinAddress) continue;

      stableCoinIncluded = true;
      break;
    }

    if (stableCoinIncluded)
      debtTokenAmounts = new DebtTokenAmount[](_debts.length);
    else debtTokenAmounts = new DebtTokenAmount[](_debts.length + 1);

    for (uint i = 0; i < _debts.length; i++) {
      debtTokenAmounts[i].debtToken = _dTokenManager.getDebtToken(
        _debts[i].tokenAddress
      );
      debtTokenAmounts[i].netDebt = _debts[i].amount;
      debtTokenAmounts[i].price = debtTokenAmounts[i].debtToken.getPrice(
        _priceCache
      );

      if (stableCoinIncluded && _debts[i].tokenAddress == stableCoinAddress)
        stableCoinEntry = debtTokenAmounts[i];
    }

    if (!stableCoinIncluded) {
      debtTokenAmounts[_debts.length].debtToken = _dTokenManager
        .getStableCoin();
      debtTokenAmounts[_debts.length].netDebt = 0;
      debtTokenAmounts[_debts.length].price = debtTokenAmounts[_debts.length]
        .debtToken
        .getPrice(_priceCache);
      stableCoinEntry = debtTokenAmounts[_debts.length];
    }

    return (debtTokenAmounts, stableCoinEntry);
  }

  function _getCollTokenAmountsWithFetchedPrices(
    PriceCache memory _priceCache,
    TokenAmount[] memory _colls
  ) internal returns (CollTokenAmount[] memory collTokenAmounts) {
    collTokenAmounts = new CollTokenAmount[](_colls.length);
    for (uint i = 0; i < _colls.length; i++) {
      collTokenAmounts[i].tokenAddress = _colls[i].tokenAddress;
      collTokenAmounts[i].coll = _colls[i].amount;
      collTokenAmounts[i].price = priceFeed.getPrice(
        _priceCache,
        _colls[i].tokenAddress
      );
    }
    return collTokenAmounts;
  }

  function _requireNonZeroDebtChange(uint _LUSDChange) internal pure {
    require(
      _LUSDChange > 0,
      'BorrowerOps: Debt increase requires non-zero debtChange'
    );
  }

  function _requireNotInRecoveryMode(PriceCache memory _priceCache) internal {
    require(
      !storagePool.checkRecoveryMode(_priceCache),
      'BorrowerOps: Operation not permitted during Recovery Mode'
    );
  }

  function _requireNoCollWithdrawal(uint _collWithdrawal) internal pure {
    require(
      _collWithdrawal == 0,
      'BorrowerOps: Collateral withdrawal not permitted Recovery Mode'
    );
  }

  function _requireValidAdjustmentInCurrentMode(
    bool _isRecoveryMode,
    uint _collWithdrawal,
    bool _isDebtIncrease,
    LocalVariables_adjustTrove memory _vars
  ) internal view {
    // todo
    //        /*
    //        *In Recovery Mode, only allow:
    //        *
    //        * - Pure collateral top-up
    //        * - Pure debt repayment
    //        * - Collateral top-up with debt repayment
    //        * - A debt increase combined with a collateral top-up which makes the ICR >= 150% and improves the ICR (and by extension improves the TCR).
    //        *
    //        * In Normal Mode, ensure:
    //        *
    //        * - The new ICR is above MCR
    //        * - The adjustment won't pull the TCR below CCR
    //        */
    //        if (_isRecoveryMode) {
    //            _requireNoCollWithdrawal(_collWithdrawal);
    //            if (_isDebtIncrease) {
    //                _requireICRisAboveCCR(_vars.newICR);
    //                _requireNewICRisAboveOldICR(_vars.newICR, _vars.oldICR);
    //            }
    //        } else { // if Normal Mode
    //            _requireICRisAboveMCR(_vars.newICR);
    //            _vars.newTCR = _getNewTCRFromTroveChange(_vars.collChange, _vars.isCollIncrease, _vars.netDebtChange, _isDebtIncrease, _vars.price);
    //            _requireNewTCRisAboveCCR(_vars.newTCR);
    //        }
  }

  function _requireICRisAboveMCR(uint _newICR) internal pure {
    require(
      _newICR >= MCR,
      'BorrowerOps: An operation that would result in ICR < MCR is not permitted'
    );
  }

  function _requireICRisAboveCCR(uint _newICR) internal pure {
    require(
      _newICR >= CCR,
      'BorrowerOps: Operation must leave trove with ICR >= CCR'
    );
  }

  function _requireNewICRisAboveOldICR(
    uint _newICR,
    uint _oldICR
  ) internal pure {
    require(
      _newICR >= _oldICR,
      "BorrowerOps: Cannot decrease your Trove's ICR in Recovery Mode"
    );
  }

  function _requireNewTCRisAboveCCR(uint _newTCR) internal pure {
    require(
      _newTCR >= CCR,
      'BorrowerOps: An operation that would result in TCR < CCR is not permitted'
    );
  }

  function _requireAtLeastMinNetDebt(uint _netDebt) internal pure {
    require(
      _netDebt >= MIN_NET_DEBT,
      "BorrowerOps: Trove's net debt must be greater than minimum"
    );
  }

  function _requireValidLUSDRepayment(
    uint _currentDebt,
    uint _debtRepayment
  ) internal pure {
    require(
      _debtRepayment <= _currentDebt.sub(STABLE_COIN_GAS_COMPENSATION),
      "BorrowerOps: Amount repaid must not be larger than the Trove's debt"
    );
  }

  function _requireCallerIsStabilityPool() internal view {
    require(
      msg.sender == stabilityPoolAddress,
      'BorrowerOps: Caller is not Stability Pool'
    );
  }

  //     function _requireSufficientLUSDBalance(ILUSDToken _lusdToken, address _borrower, uint _debtRepayment) internal view {
  //        require(_lusdToken.balanceOf(_borrower) >= _debtRepayment, "BorrowerOps: Caller doesnt have enough LUSD to make repayment");
  //    }

  function _requireValidMaxFeePercentage(
    uint _maxFeePercentage,
    bool _isRecoveryMode
  ) internal pure {
    if (_isRecoveryMode) {
      require(
        _maxFeePercentage <= DECIMAL_PRECISION,
        'Max fee percentage must less than or equal to 100%'
      );
    } else {
      require(
        _maxFeePercentage >= BORROWING_FEE_FLOOR &&
          _maxFeePercentage <= DECIMAL_PRECISION,
        'Max fee percentage must be between 0.5% and 100%'
      );
    }
  }

  // --- ICR and TCR getters ---

  // Compute the new collateral ratio, considering the change in coll and debt. Assumes 0 pending rewards.
  function _getNewNominalICRFromTroveChange(
    uint _coll,
    uint _debt,
    uint _collChange,
    bool _isCollIncrease,
    uint _debtChange,
    bool _isDebtIncrease
  ) internal pure returns (uint) {
    (uint newColl, uint newDebt) = _getNewTroveAmounts(
      _coll,
      _debt,
      _collChange,
      _isCollIncrease,
      _debtChange,
      _isDebtIncrease
    );

    uint newNICR = LiquityMath._computeNominalCR(newColl, newDebt);
    return newNICR;
  }

  // Compute the new collateral ratio, considering the change in coll and debt. Assumes 0 pending rewards.
  function _getNewICRFromTroveChange(
    uint _coll,
    uint _debt,
    uint _collChange,
    bool _isCollIncrease,
    uint _debtChange,
    bool _isDebtIncrease,
    uint _price
  ) internal pure returns (uint) {
    // todo
    (uint newColl, uint newDebt) = _getNewTroveAmounts(
      _coll,
      _debt,
      _collChange,
      _isCollIncrease,
      _debtChange,
      _isDebtIncrease
    );
    uint newICR = LiquityMath._computeCR(newColl, newDebt);
    return newICR;
  }

  function _getNewTroveAmounts(
    uint _coll,
    uint _debt,
    uint _collChange,
    bool _isCollIncrease,
    uint _debtChange,
    bool _isDebtIncrease
  ) internal pure returns (uint, uint) {
    uint newColl = _coll;
    uint newDebt = _debt;

    newColl = _isCollIncrease ? _coll.add(_collChange) : _coll.sub(_collChange);
    newDebt = _isDebtIncrease ? _debt.add(_debtChange) : _debt.sub(_debtChange);

    return (newColl, newDebt);
  }

  function _getNewTCRFromTroveChange(
    uint _collChange,
    bool _isCollIncrease,
    uint _debtChange,
    bool _isDebtIncrease
  ) internal view returns (uint) {
    //        IStoragePool _storagePoolCached = storagePool;
    //        uint totalColl = _storagePoolCached.getEntireSystemColl();
    //        uint totalDebt = _storagePoolCached.getEntireSystemDebt();
    //
    //        totalColl = _isCollIncrease ? totalColl.add(_collChange) : totalColl.sub(_collChange);
    //        totalDebt = _isDebtIncrease ? totalDebt.add(_debtChange) : totalDebt.sub(_debtChange);
    //
    //        uint newTCR = LiquityMath._computeCR(totalColl, totalDebt);
    //        return newTCR;

    // todo
    return 1;
  }

  function getCompositeDebt(
    DebtTokenAmount[] memory _debts
  ) external pure override returns (uint) {
    return _getCompositeDebt(_debts);
  }

  // Returns the composite debt (drawn debt + gas compensation) of a trove, for the purpose of ICR calculation
  function _getCompositeDebt(
    DebtTokenAmount[] memory _debts
  ) internal pure returns (uint debtInStable) {
    for (uint i = 0; i < _debts.length; i++) {
      debtInStable.add(_debts[i].netDebt.mul(_debts[i].price));
    }
    return debtInStable;
  }

  function _getCompositeColl(
    CollTokenAmount[] memory _colls
  ) internal pure returns (uint collInStable) {
    for (uint i = 0; i < _colls.length; i++) {
      collInStable.add(_colls[i].coll.mul(_colls[i].price));
    }
    return collInStable;
  }

  function _getNetDebt(
    DebtTokenAmount[] memory _newDebts
  ) internal pure returns (uint debtInStable) {
    for (uint i = 0; i < _newDebts.length; i++) {
      DebtTokenAmount memory debtTokenAmount = _newDebts[i];
      debtInStable.add(debtTokenAmount.netDebt.mul(debtTokenAmount.price));
    }
    return debtInStable.sub(STABLE_COIN_GAS_COMPENSATION);
  }
}
