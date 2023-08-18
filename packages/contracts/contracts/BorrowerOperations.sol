// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './Interfaces/IBorrowerOperations.sol';
import './Interfaces/ITroveManager.sol';
import './Dependencies/IERC20.sol';
import './Interfaces/IDebtToken.sol';
import './Dependencies/LiquityBase.sol';
import './Dependencies/Ownable.sol';
import './Dependencies/CheckContract.sol';
import './Dependencies/console.sol';
import './Interfaces/IDebtTokenManager.sol';
import './Interfaces/IStoragePool.sol';
import './Interfaces/IPriceFeed.sol';
import './Interfaces/IBBase.sol';

contract BorrowerOperations is LiquityBase, Ownable, CheckContract, IBorrowerOperations {
  using SafeMath for uint256;
  string public constant NAME = 'BorrowerOperations';

  // --- Connected contract declarations ---

  ITroveManager public troveManager;
  IDebtTokenManager public debtTokenManager;
  IStoragePool public storagePool;
  IPriceFeed public priceFeed;
  address stabilityPoolAddress;

  //    ILQTYStaking public lqtyStaking;
  //    address public lqtyStakingAddress;

  /* --- Variable container structs  ---

    Used to hold, return and assign variables inside a function, in order to avoid the error:
    "CompilerError: Stack too deep". */

  struct LocalVariables_openTrove {
    PriceTokenAmount[] colls;
    DebtTokenAmount[] debts;
    uint compositeDebtInStable;
    uint compositeCollInStable;
    uint ICR;
    uint NICR;
    uint arrayIndex;
    //
    bool isInRecoveryMode;
    uint TCR;
    uint entireSystemColl;
    uint entireSystemDebt;
  }

  struct LocalVariables_adjustTrove {
    PriceTokenAmount[] colls;
    DebtTokenAmount[] debts;
    //
    uint oldCompositeDebtInStable;
    uint oldCompositeCollInStable;
    uint oldICR;
    //
    uint newCompositeDebtInStable;
    uint newCompositeCollInStable;
    uint newICR;
    uint newNCR;
    //
    uint stake;
    bool isInRecoveryMode;
    uint TCR;
    uint newTCR;
    uint entireSystemColl;
    uint entireSystemDebt;
  }

  struct LocalVariables_closeTrove {
    bool isInRecoveryMode;
    uint newTCR;
    uint entireSystemColl;
    uint entireSystemDebt;
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
    address _debtTokenManagerAddress
  ) external onlyOwner {
    // This makes impossible to open a trove with zero withdrawn LUSD
    assert(MIN_NET_DEBT > 0);

    checkContract(_troveManagerAddress);
    checkContract(_storagePoolAddress);
    checkContract(_stabilityPoolAddress);
    checkContract(_priceFeedAddress);
    checkContract(_debtTokenManagerAddress);

    troveManager = ITroveManager(_troveManagerAddress);
    emit TroveManagerAddressChanged(_troveManagerAddress);

    storagePool = IStoragePool(_storagePoolAddress);
    emit StoragePoolAddressChanged(_storagePoolAddress);

    stabilityPoolAddress = _stabilityPoolAddress;
    emit StabilityPoolAddressChanged(_stabilityPoolAddress);

    priceFeed = IPriceFeed(_priceFeedAddress);
    emit PriceFeedAddressChanged(_priceFeedAddress);

    debtTokenManager = IDebtTokenManager(_debtTokenManagerAddress);
    emit DebtTokenManagerAddressChanged(_debtTokenManagerAddress);

    _renounceOwnership();
  }

  // --- Borrower Trove Operations ---

  function openTrove(TokenAmount[] memory _colls, address _upperHint, address _lowerHint) external override {
    ContractsCache memory contractsCache = ContractsCache(troveManager, storagePool, debtTokenManager);
    LocalVariables_openTrove memory vars;
    PriceCache memory priceCache;

    _requireTroveIsNotActive(contractsCache.troveManager, msg.sender);

    // adding gas compensation to the net debt
    DebtTokenAmount memory stableCoinAmount = DebtTokenAmount(
      contractsCache.debtTokenManager.getStableCoin(),
      contractsCache.debtTokenManager.getStableCoin().getPrice(priceCache),
      STABLE_COIN_GAS_COMPENSATION,
      0
    );
    vars.debts = new DebtTokenAmount[](1);
    vars.debts[0] = stableCoinAmount;

    vars.compositeDebtInStable = _getCompositeDebt(vars.debts); // ICR is based on the composite debt, i.e. the requested debt amount + borrowing fee + debt gas comp.

    vars.colls = _getCollTokenAmountsWithFetchedPrices(priceCache, _colls);
    vars.compositeCollInStable = _getCompositeColl(vars.colls);

    vars.ICR = LiquityMath._computeCR(vars.compositeCollInStable, vars.compositeDebtInStable);
    vars.NICR = LiquityMath._computeNominalCR(vars.compositeCollInStable, vars.compositeDebtInStable);

    // checking collateral ratios
    (vars.isInRecoveryMode, vars.TCR, vars.entireSystemColl, vars.entireSystemDebt) = contractsCache
      .storagePool
      .checkRecoveryMode(priceCache);
    if (vars.isInRecoveryMode) {
      _requireICRisAboveCCR(vars.ICR); // > 150 %
    } else {
      _requireICRisAboveMCR(vars.ICR); // > 110 %

      uint newTCR = _getNewTCRFromTroveChange(
        vars.compositeCollInStable,
        true,
        vars.compositeDebtInStable,
        true,
        vars.entireSystemColl,
        vars.entireSystemDebt
      ); // bools: coll increase, debt increase
      _requireNewTCRisAboveCCR(newTCR); // > 150 %
    }

    // Set the trove struct's properties
    contractsCache.troveManager.setTroveStatus(msg.sender, 1); // active
    contractsCache.troveManager.increaseTroveColl(msg.sender, vars.colls);
    contractsCache.troveManager.increaseTroveDebt(msg.sender, vars.debts);
    contractsCache.troveManager.updateTroveRewardSnapshots(msg.sender);
    contractsCache.troveManager.updateStakeAndTotalStakes(msg.sender);

    vars.arrayIndex = contractsCache.troveManager.addTroveOwnerToArray(msg.sender);
    emit TroveCreated(msg.sender, vars.arrayIndex);

    // Move the coll to the active pool
    for (uint i = 0; i < vars.colls.length; i++) {
      PriceTokenAmount memory collTokenAmount = vars.colls[i];
      _poolAddColl(
        msg.sender,
        contractsCache.storagePool,
        collTokenAmount.tokenAddress,
        collTokenAmount.amount,
        PoolType.Active
      );
    }

    // Move the stable coin gas compensation to the Gas Pool
    contractsCache.storagePool.addValue(
      address(stableCoinAmount.debtToken),
      false,
      PoolType.GasCompensation,
      stableCoinAmount.netDebt
    );
    stableCoinAmount.debtToken.mint(address(contractsCache.storagePool), stableCoinAmount.netDebt);

    //        emit TroveUpdated(msg.sender, vars.compositeDebtInStable, vars.compositeCollInStable, vars.stake, BorrowerOperation.openTrove);
    //    emit LUSDBorrowingFeePaid(msg.sender, borrowingFeesPaid);
  }

  // Send collateral to a trove
  function addColl(TokenAmount[] memory _colls, address _upperHint, address _lowerHint) external override {
    address borrower = msg.sender;
    (
      ContractsCache memory contractsCache,
      LocalVariables_adjustTrove memory vars,
      PriceCache memory priceCache
    ) = _prepareTroveAdjustment(borrower);

    PriceTokenAmount[] memory addedColls = _getCollTokenAmountsWithFetchedPrices(priceCache, _colls);
    vars.newCompositeCollInStable += _getCompositeColl(addedColls);

    contractsCache.troveManager.increaseTroveColl(borrower, addedColls);

    for (uint i = 0; i < addedColls.length; i++) {
      PriceTokenAmount memory collTokenAmount = addedColls[i];
      _poolAddColl(
        borrower,
        contractsCache.storagePool,
        collTokenAmount.tokenAddress,
        collTokenAmount.amount,
        PoolType.Active
      );
    }

    // todo required checks should not be needed, new collateral should be always fine...
    _finaliseTrove(false, false, contractsCache, vars, priceCache, borrower, _upperHint, _lowerHint);
  }

  // Withdraw collateral from a trove
  function withdrawColl(TokenAmount[] memory _colls, address _upperHint, address _lowerHint) external override {
    address borrower = msg.sender;
    (
      ContractsCache memory contractsCache,
      LocalVariables_adjustTrove memory vars,
      PriceCache memory priceCache
    ) = _prepareTroveAdjustment(borrower);

    PriceTokenAmount[] memory removedColls = _getCollTokenAmountsWithFetchedPrices(priceCache, _colls);
    vars.newCompositeCollInStable -= _getCompositeColl(removedColls);

    contractsCache.troveManager.decreaseTroveColl(borrower, removedColls);

    for (uint i = 0; i < removedColls.length; i++) {
      PriceTokenAmount memory collTokenAmount = removedColls[i];

      // checking is the trove has enough coll for the withdrawal
      PriceTokenAmount memory existingColl;
      for (uint ii = 0; ii < vars.colls.length; ii++) {
        if (vars.colls[ii].tokenAddress != collTokenAmount.tokenAddress) continue;
        existingColl = vars.colls[ii];
        break;
      }
      assert(existingColl.amount >= collTokenAmount.amount);

      _poolSubtractColl(
        borrower,
        contractsCache.storagePool,
        collTokenAmount.tokenAddress,
        collTokenAmount.amount,
        PoolType.Active
      );
    }

    _finaliseTrove(true, false, contractsCache, vars, priceCache, borrower, _upperHint, _lowerHint);
  }

  // todo will be wrapped into the long/short farms
  // increasing debt of a trove
  function increaseDebt(
    TokenAmount[] memory _debts,
    address _upperHint,
    address _lowerHint,
    uint _maxFeePercentage
  ) external {
    (
      ContractsCache memory contractsCache,
      LocalVariables_adjustTrove memory vars,
      PriceCache memory priceCache
    ) = _prepareTroveAdjustment(msg.sender);

    _requireValidMaxFeePercentage(_maxFeePercentage, vars.isInRecoveryMode);

    DebtTokenAmount[] memory addedDebts;
    DebtTokenAmount memory stableCoinAmount;
    (addedDebts, stableCoinAmount) = _getDebtTokenAmountsWithFetchedPrices(
      contractsCache.debtTokenManager,
      priceCache,
      _debts
    );

    // checking if new debt is above the minimum
    for (uint i = 0; i < addedDebts.length; i++) _requireAtLeastMinNetDebt(addedDebts[i].netDebt);

    // adding the borrowing fee to the net debt
    uint borrowingFeesPaid = 0; // todo only used for an event emit
    if (!vars.isInRecoveryMode)
      borrowingFeesPaid = _addBorrowingFees(
        contractsCache.troveManager,
        addedDebts,
        stableCoinAmount,
        _maxFeePercentage
      );

    vars.newCompositeDebtInStable += _getCompositeDebt(addedDebts);

    contractsCache.troveManager.increaseTroveDebt(msg.sender, addedDebts);

    for (uint i = 0; i < addedDebts.length; i++) {
      DebtTokenAmount memory debtTokenAmount = addedDebts[i];
      _poolAddDebt(
        msg.sender,
        contractsCache.storagePool,
        debtTokenAmount.debtToken,
        debtTokenAmount.netDebt,
        debtTokenAmount.netDebt.sub(debtTokenAmount.borrowingFee)
      );
    }

    _finaliseTrove(false, true, contractsCache, vars, priceCache, msg.sender, _upperHint, _lowerHint);
  }

  // todo will be wrapped into the long/short farms
  // repay debt of a trove
  function repayDebt(
    TokenAmount[] memory _debts,
    address _upperHint,
    address _lowerHint,
    uint _maxFeePercentage
  ) external {
    address borrower = msg.sender;
    (
      ContractsCache memory contractsCache,
      LocalVariables_adjustTrove memory vars,
      PriceCache memory priceCache
    ) = _prepareTroveAdjustment(borrower);

    DebtTokenAmount memory stableCoinAmount;
    DebtTokenAmount[] memory removedDebts;
    (removedDebts, stableCoinAmount) = _getDebtTokenAmountsWithFetchedPrices(
      contractsCache.debtTokenManager,
      priceCache,
      _debts
    );
    vars.newCompositeDebtInStable -= _getCompositeDebt(removedDebts);

    contractsCache.troveManager.decreaseTroveDebt(borrower, removedDebts);

    for (uint i = 0; i < removedDebts.length; i++) {
      DebtTokenAmount memory debtTokenAmount = removedDebts[i];
      address debtTokenAddress = address(debtTokenAmount.debtToken);

      // checking if the trove has enough debt for the repayment (gas comp needs to remain)
      DebtTokenAmount memory existingDebt;
      for (uint ii = 0; ii < vars.debts.length; ii++) {
        if (address(vars.debts[ii].debtToken) != debtTokenAddress) continue;
        existingDebt = vars.debts[ii];
        break;
      }
      _requireAtLeastMinNetDebt(existingDebt.netDebt.sub(debtTokenAmount.netDebt));
      if (debtTokenAmount.debtToken.isStableCoin())
        _requireValidStableCoinRepayment(existingDebt.netDebt, debtTokenAmount.netDebt);

      _poolRepayDebt(
        borrower,
        contractsCache.storagePool,
        debtTokenAmount.debtToken,
        debtTokenAmount.netDebt // it is not possible to repay the gasComp, this happens only when the trove is closed
      );
    }

    _finaliseTrove(false, false, contractsCache, vars, priceCache, borrower, _upperHint, _lowerHint);
  }

  function _prepareTroveAdjustment(
    address _borrower
  )
    internal
    returns (ContractsCache memory contractsCache, LocalVariables_adjustTrove memory vars, PriceCache memory priceCache)
  {
    contractsCache = ContractsCache(troveManager, storagePool, debtTokenManager);

    (vars.isInRecoveryMode, vars.TCR, vars.entireSystemColl, vars.entireSystemDebt) = contractsCache
      .storagePool
      .checkRecoveryMode(priceCache);

    _requireTroveisActive(contractsCache.troveManager, _borrower);
    contractsCache.troveManager.applyPendingRewards(priceFeed, priceCache, _borrower); // from redistributions

    // fetching old/current debts and colls including prices + calc ICR
    (vars.debts, ) = _getDebtTokenAmountsWithFetchedPrices(
      contractsCache.debtTokenManager,
      priceCache,
      contractsCache.troveManager.getTroveDebt(_borrower)
    );
    vars.oldCompositeDebtInStable = _getCompositeDebt(vars.debts);
    vars.newCompositeDebtInStable = vars.oldCompositeDebtInStable;

    vars.colls = _getCollTokenAmountsWithFetchedPrices(priceCache, contractsCache.troveManager.getTroveColl(_borrower));
    vars.oldCompositeCollInStable = _getCompositeColl(vars.colls);
    vars.newCompositeCollInStable = vars.oldCompositeCollInStable;

    vars.oldICR = LiquityMath._computeCR(vars.oldCompositeCollInStable, vars.oldCompositeDebtInStable);

    return (contractsCache, vars, priceCache);
  }

  function _finaliseTrove(
    bool _isCollWithdrawal,
    bool _isDebtIncrease,
    ContractsCache memory contractsCache,
    LocalVariables_adjustTrove memory vars,
    PriceCache memory priceCache,
    address _borrower,
    address _upperHint,
    address _lowerHint
  ) internal {
    // calculate the new ICR
    vars.newICR = LiquityMath._computeCR(vars.newCompositeCollInStable, vars.newCompositeDebtInStable);
    vars.newNCR = LiquityMath._computeNominalCR(vars.newCompositeCollInStable, vars.newCompositeDebtInStable);

    // Check the adjustment satisfies all conditions for the current system mode
    _requireValidAdjustmentInCurrentMode(_isCollWithdrawal, _isDebtIncrease, vars);

    // update troves stake
    contractsCache.troveManager.updateStakeAndTotalStakes(_borrower);

    // todo...
    //    emit TroveUpdated(
    //      _borrower,
    //      vars.newDebt,
    //      vars.newColl,
    //      vars.stake,
    //      BorrowerOperation.adjustTrove
    //    );
    //    emit LUSDBorrowingFeePaid(msg.sender, vars.LUSDFee);
  }

  function closeTrove() external override {
    (
      ContractsCache memory contractsCache,
      LocalVariables_adjustTrove memory vars,
      PriceCache memory priceCache
    ) = _prepareTroveAdjustment(msg.sender);

    // todo this does not work, pending rewards gets applied, for there can be more debts then only the gas compensation, even if all postions are closed
    DebtTokenAmount memory remainingStableCoinDebt = vars.debts[0]; // works because we check in the following line if only stable coin debt is left...
    require(
      vars.debts.length == 1 &&
        remainingStableCoinDebt.debtToken.isStableCoin() &&
        remainingStableCoinDebt.netDebt <= STABLE_COIN_GAS_COMPENSATION,
      'TroveManager: Trove must have only gas compensation debt'
    ); // works because there are no borrowing fees for the gas compensation

    uint newTCR = _getNewTCRFromTroveChange(
      vars.oldCompositeCollInStable,
      false,
      vars.oldCompositeDebtInStable,
      false,
      vars.entireSystemColl,
      vars.entireSystemDebt
    );
    _requireNewTCRisAboveCCR(newTCR);

    contractsCache.troveManager.removeStake(msg.sender);
    contractsCache.troveManager.closeTrove(msg.sender);

    // todo
    // emit TroveUpdated(msg.sender, 0, 0, 0, BorrowerOperation.closeTrove);

    // burn the gas compensation
    contractsCache.storagePool.subtractValue(
      address(remainingStableCoinDebt.debtToken),
      false,
      PoolType.GasCompensation,
      remainingStableCoinDebt.netDebt
    );
    remainingStableCoinDebt.debtToken.burn(address(contractsCache.storagePool), remainingStableCoinDebt.netDebt);

    // Send the collateral back to the user
    for (uint i = 0; i < vars.colls.length; i++) {
      PriceTokenAmount memory collTokenAmount = vars.colls[i];

      _poolSubtractColl(
        msg.sender,
        contractsCache.storagePool,
        collTokenAmount.tokenAddress,
        collTokenAmount.amount,
        PoolType.Active
      );
    }

    // todo the trove still needs to be updated?!
  }

  // --- Helper functions ---

  function _getNewTCRFromTroveChange(
    uint _collChange,
    bool _isCollIncrease,
    uint _debtChange,
    bool _isDebtIncrease,
    uint entireSystemColl,
    uint entireSystemDebt
  ) internal view returns (uint) {
    uint totalColl = _isCollIncrease ? entireSystemColl.add(_collChange) : entireSystemColl.sub(_collChange);
    uint totalDebt = _isDebtIncrease ? entireSystemDebt.add(_debtChange) : entireSystemDebt.sub(_debtChange);

    uint newTCR = LiquityMath._computeCR(totalColl, totalDebt);
    return newTCR;
  }

  function _addBorrowingFees(
    ITroveManager _troveManager,
    DebtTokenAmount[] memory _debts,
    DebtTokenAmount memory _stableCoinAmount,
    uint _maxFeePercentage
  ) internal returns (uint borrowingFee) {
    uint compositeDebtInStable = _getCompositeDebt(_debts);

    _troveManager.decayBaseRateFromBorrowing(); // decay the baseRate state variable
    borrowingFee = _troveManager.getBorrowingFee(compositeDebtInStable);
    _requireUserAcceptsFee(borrowingFee, compositeDebtInStable, _maxFeePercentage);

    // todo...
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

  function _poolAddColl(
    address _borrower,
    IStoragePool _pool,
    address _collAddress,
    uint _amount,
    PoolType _poolType
  ) internal {
    _pool.addValue(_collAddress, true, _poolType, _amount);
    IERC20(_collAddress).transferFrom(_borrower, address(_pool), _amount);
  }

  function _poolSubtractColl(
    address _borrower,
    IStoragePool _pool,
    address _collAddress,
    uint _amount,
    PoolType _poolType
  ) internal {
    _pool.subtractValue(_collAddress, true, _poolType, _amount);
    IERC20(_collAddress).transferFrom(address(_pool), _borrower, _amount);
  }

  function _poolAddDebt(
    address _borrower,
    IStoragePool _storagePool,
    IDebtToken _debtToken,
    uint _netDebtIncrease,
    uint _mintAmount
  ) internal {
    _storagePool.addValue(address(_debtToken), false, PoolType.Active, _netDebtIncrease);
    if (_mintAmount > 0) _debtToken.mint(_borrower, _mintAmount);
  }

  function _poolRepayDebt(
    address _borrower,
    IStoragePool _storagePool,
    IDebtToken _debtToken,
    uint _repayAmount
  ) internal {
    _storagePool.subtractValue(address(_debtToken), false, PoolType.Active, _repayAmount);
    _debtToken.burn(_borrower, _repayAmount);
  }

  // --- 'Require' wrapper functions ---

  function _requireCallerIsBorrower(address _borrower) internal view {
    require(msg.sender == _borrower, 'BorrowerOps: Caller must be the borrower for a withdrawal');
  }

  function _requireTroveisActive(ITroveManager _troveManager, address _borrower) internal view {
    uint status = _troveManager.getTroveStatus(_borrower);
    require(status == 1, 'BorrowerOps: Trove does not exist or is closed');
  }

  function _requireNotInRecoveryMode(bool _isInRecoveryMode) internal pure {
    require(!_isInRecoveryMode, 'BorrowerOps: Operation not allowed during Recovery Mode');
  }

  function _requireTroveIsNotActive(ITroveManager _troveManager, address _borrower) internal view {
    uint status = _troveManager.getTroveStatus(_borrower);
    require(status != 1, 'BorrowerOps: Trove is active');
  }

  // adds stableCoin debt including gas compensation if not already included
  function _getDebtTokenAmountsWithFetchedPrices(
    IDebtTokenManager _dTokenManager,
    PriceCache memory _priceCache,
    TokenAmount[] memory _debts
  ) internal returns (DebtTokenAmount[] memory debtTokenAmounts, DebtTokenAmount memory stableCoinEntry) {
    address stableCoinAddress = address(_dTokenManager.getStableCoin());

    bool stableCoinIncluded = false;
    for (uint i = 0; i < _debts.length; i++) {
      if (_debts[i].tokenAddress != stableCoinAddress) continue;

      stableCoinIncluded = true;
      break;
    }

    if (stableCoinIncluded) debtTokenAmounts = new DebtTokenAmount[](_debts.length);
    else debtTokenAmounts = new DebtTokenAmount[](_debts.length + 1);

    for (uint i = 0; i < _debts.length; i++) {
      debtTokenAmounts[i].debtToken = _dTokenManager.getDebtToken(_debts[i].tokenAddress);
      debtTokenAmounts[i].netDebt = _debts[i].amount;
      debtTokenAmounts[i].price = debtTokenAmounts[i].debtToken.getPrice(_priceCache);

      if (stableCoinIncluded && _debts[i].tokenAddress == stableCoinAddress) stableCoinEntry = debtTokenAmounts[i];
    }

    if (!stableCoinIncluded) {
      debtTokenAmounts[_debts.length].debtToken = _dTokenManager.getStableCoin();
      debtTokenAmounts[_debts.length].netDebt = 0;
      debtTokenAmounts[_debts.length].price = debtTokenAmounts[_debts.length].debtToken.getPrice(_priceCache);
      stableCoinEntry = debtTokenAmounts[_debts.length];
    }

    return (debtTokenAmounts, stableCoinEntry);
  }

  function _getCollTokenAmountsWithFetchedPrices(
    PriceCache memory _priceCache,
    TokenAmount[] memory _colls
  ) internal returns (PriceTokenAmount[] memory collTokenAmounts) {
    IPriceFeed _priceFeedCached = priceFeed;

    collTokenAmounts = new PriceTokenAmount[](_colls.length);
    for (uint i = 0; i < _colls.length; i++) {
      collTokenAmounts[i].tokenAddress = _colls[i].tokenAddress;
      collTokenAmounts[i].amount = _colls[i].amount;
      collTokenAmounts[i].price = _priceFeedCached.getPrice(_priceCache, _colls[i].tokenAddress);
    }
    return collTokenAmounts;
  }

  function _requireNonZeroDebtChange(uint _LUSDChange) internal pure {
    require(_LUSDChange > 0, 'BorrowerOps: Debt increase requires non-zero debtChange');
  }

  //  function _requireNotInRecoveryMode(PriceCache memory _priceCache) internal {
  //    require(
  //      !storagePool.checkRecoveryMode(_priceCache),
  //      'BorrowerOps: Operation not permitted during Recovery Mode'
  //    );
  //  }

  function _requireValidAdjustmentInCurrentMode(
    bool _isCollWithdrawal,
    bool _isDebtIncrease,
    LocalVariables_adjustTrove memory _vars
  ) internal view {
    /*
     *In Recovery Mode, only allow:
     *
     * - Pure collateral top-up
     * - Pure debt repayment
     * - Collateral top-up with debt repayment
     * - A debt increase combined with a collateral top-up which makes the ICR >= 150% and improves the ICR (and by extension improves the TCR).
     *
     * In Normal Mode, ensure:
     *
     * - The new ICR is above MCR
     * - The adjustment won't pull the TCR below CCR
     */
    if (_vars.isInRecoveryMode) {
      _requireNoCollWithdrawal(!_isCollWithdrawal);
      if (_isDebtIncrease) _requireICRisAboveCCR(_vars.newICR);
    } else {
      // if Normal Mode
      _requireICRisAboveMCR(_vars.newICR);

      _vars.newTCR = _getNewTCRFromTroveChange(
        _vars.newCompositeCollInStable.sub(_vars.oldCompositeCollInStable), // todo needs to be positiy every time -> add / sub change...
        !_isCollWithdrawal,
        _vars.newCompositeDebtInStable.sub(_vars.oldCompositeDebtInStable), // todo needs to be positiy every time -> add / sub change...
        _isDebtIncrease,
        _vars.entireSystemColl,
        _vars.entireSystemDebt
      );
      _requireNewTCRisAboveCCR(_vars.newTCR);
    }
  }

  function _requireNoCollWithdrawal(bool _isCollWithdrawal) internal pure {
    require(!_isCollWithdrawal, 'BorrowerOps: Collateral withdrawal not permitted Recovery Mode');
  }

  function _requireICRisAboveMCR(uint _newICR) internal pure {
    require(_newICR >= MCR, 'BorrowerOps: An operation that would result in ICR < MCR is not permitted');
  }

  function _requireICRisAboveCCR(uint _newICR) internal pure {
    require(_newICR >= CCR, 'BorrowerOps: Operation must leave trove with ICR >= CCR');
  }

  function _requireNewICRisAboveOldICR(uint _newICR, uint _oldICR) internal pure {
    require(_newICR >= _oldICR, "BorrowerOps: Cannot decrease your Trove's ICR in Recovery Mode");
  }

  function _requireNewTCRisAboveCCR(uint _newTCR) internal pure {
    require(_newTCR >= CCR, 'BorrowerOps: An operation that would result in TCR < CCR is not permitted');
  }

  function _requireAtLeastMinNetDebt(uint _netDebt) internal pure {
    require(_netDebt >= 0, "BorrowerOps: Trove's net debt must be greater than minimum");
  }

  function _requireValidStableCoinRepayment(uint _currentDebt, uint _debtRepayment) internal pure {
    require(
      _debtRepayment <= _currentDebt.sub(STABLE_COIN_GAS_COMPENSATION),
      "BorrowerOps: Amount repaid must not be larger than the Trove's debt"
    );
  }

  function _requireCallerIsStabilityPool() internal view {
    require(msg.sender == stabilityPoolAddress, 'BorrowerOps: Caller is not Stability Pool');
  }

  function _requireValidMaxFeePercentage(uint _maxFeePercentage, bool _isInRecoveryMode) internal pure {
    if (_isInRecoveryMode) {
      require(_maxFeePercentage <= DECIMAL_PRECISION, 'Max fee percentage must less than or equal to 100%');
    } else {
      require(
        _maxFeePercentage >= BORROWING_FEE_FLOOR && _maxFeePercentage <= DECIMAL_PRECISION,
        'Max fee percentage must be between 0.5% and 100%'
      );
    }
  }

  // --- ICR and TCR getters ---

  function getCompositeDebt(DebtTokenAmount[] memory _debts) external pure override returns (uint) {
    return _getCompositeDebt(_debts);
  }

  // Returns the composite debt (drawn debt + gas compensation) of a trove, for the purpose of ICR calculation
  function _getCompositeDebt(DebtTokenAmount[] memory _debts) internal pure returns (uint debtInStable) {
    for (uint i = 0; i < _debts.length; i++) {
      debtInStable.add(_debts[i].netDebt.mul(_debts[i].price));
    }
    return debtInStable;
  }

  function _getCompositeColl(PriceTokenAmount[] memory _colls) internal pure returns (uint collInStable) {
    for (uint i = 0; i < _colls.length; i++) {
      collInStable.add(_colls[i].amount.mul(_colls[i].price));
    }
    return collInStable;
  }

  function _getNetDebt(DebtTokenAmount[] memory _newDebts) internal pure returns (uint debtInStable) {
    for (uint i = 0; i < _newDebts.length; i++) {
      DebtTokenAmount memory debtTokenAmount = _newDebts[i];
      debtInStable.add(debtTokenAmount.netDebt.mul(debtTokenAmount.price));
    }
    return debtInStable.sub(STABLE_COIN_GAS_COMPENSATION);
  }
}
