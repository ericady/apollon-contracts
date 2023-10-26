// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './Interfaces/IBorrowerOperations.sol';
import './Interfaces/ITroveManager.sol';
import './Interfaces/IDebtToken.sol';
import './Dependencies/LiquityBase.sol';
import './Dependencies/CheckContract.sol';
import './Interfaces/IDebtTokenManager.sol';
import './Interfaces/IStoragePool.sol';
import './Interfaces/IPriceFeed.sol';
import './Interfaces/IBBase.sol';
import './Interfaces/ICollTokenManager.sol';

contract BorrowerOperations is LiquityBase, Ownable, CheckContract, IBorrowerOperations {
  string public constant NAME = 'BorrowerOperations';

  // --- Connected contract declarations ---

  ITroveManager public troveManager;
  IDebtTokenManager public debtTokenManager;
  ICollTokenManager public collTokenManager;
  IStoragePool public storagePool;
  IPriceFeed public priceFeed;
  address stabilityPoolAddress;

  //    ILQTYStaking public lqtyStaking;
  //    address public lqtyStakingAddress;

  /* --- Variable container structs  ---

    Used to hold, return and assign variables inside a function, in order to avoid the error:
    "CompilerError: Stack too deep". */

  struct LocalVariables_openTrove {
    address[] collTokenAddresses;
    //
    TokenAmount[] colls;
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
    address[] collTokenAddresses;
    //
    TokenAmount[] colls;
    DebtTokenAmount[] debts;
    DebtTokenAmount stableCoinEntry;
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
    ICollTokenManager collTokenManager;
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
    address _debtTokenManagerAddress,
    address _collTokenManagerAddress
  ) external onlyOwner {
    checkContract(_troveManagerAddress);
    checkContract(_storagePoolAddress);
    checkContract(_stabilityPoolAddress);
    checkContract(_priceFeedAddress);
    checkContract(_debtTokenManagerAddress);
    checkContract(_collTokenManagerAddress);

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

    collTokenManager = ICollTokenManager(_collTokenManagerAddress);
    emit CollTokenManagerAddressChanged(_collTokenManagerAddress);

    renounceOwnership();
  }

  // --- Borrower Trove Operations ---

  function openTrove(TokenAmount[] memory _colls) external override {
    ContractsCache memory contractsCache = ContractsCache(
      troveManager,
      storagePool,
      debtTokenManager,
      collTokenManager
    );
    LocalVariables_openTrove memory vars;
    vars.collTokenAddresses = contractsCache.collTokenManager.getCollTokenAddresses();
    address borrower = msg.sender;

    _requireTroveIsNotActive(contractsCache.troveManager, borrower);

    // adding gas compensation to the net debt
    DebtTokenAmount memory stableCoinAmount = DebtTokenAmount(
      contractsCache.debtTokenManager.getStableCoin(),
      STABLE_COIN_GAS_COMPENSATION,
      0
    );
    vars.debts = new DebtTokenAmount[](1);
    vars.debts[0] = stableCoinAmount;
    // ICR is based on the composite debt, i.e. the requested debt amount + borrowing fee + debt gas comp.
    vars.compositeDebtInStable = _getCompositeDebt(vars.debts);

    vars.colls = _colls;
    vars.compositeCollInStable = _getCompositeColl(vars.colls);

    vars.ICR = LiquityMath._computeCR(vars.compositeCollInStable, vars.compositeDebtInStable);
    vars.NICR = LiquityMath._computeNominalCR(vars.compositeCollInStable, vars.compositeDebtInStable);

    (
      // checking collateral ratios
      vars.isInRecoveryMode,
      vars.TCR,
      vars.entireSystemColl,
      vars.entireSystemDebt
    ) = contractsCache.storagePool.checkRecoveryMode();
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
    contractsCache.troveManager.setTroveStatus(borrower, 1); // active
    contractsCache.troveManager.increaseTroveColl(borrower, vars.colls);
    contractsCache.troveManager.increaseTroveDebt(borrower, vars.debts);
    contractsCache.troveManager.updateTroveRewardSnapshots(borrower);
    contractsCache.troveManager.updateStakeAndTotalStakes(vars.collTokenAddresses, borrower);

    vars.arrayIndex = contractsCache.troveManager.addTroveOwnerToArray(borrower);
    emit TroveCreated(borrower, vars.arrayIndex);

    // Move the coll to the active pool
    for (uint i = 0; i < vars.colls.length; i++) {
      TokenAmount memory collTokenAmount = vars.colls[i];
      _poolAddColl(
        borrower,
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
  function addColl(TokenAmount[] memory _colls) external override {
    address borrower = msg.sender;
    (ContractsCache memory contractsCache, LocalVariables_adjustTrove memory vars) = _prepareTroveAdjustment(borrower);

    vars.newCompositeCollInStable += _getCompositeColl(_colls);

    contractsCache.troveManager.increaseTroveColl(borrower, _colls);

    for (uint i = 0; i < _colls.length; i++) {
      TokenAmount memory collTokenAmount = _colls[i];
      _poolAddColl(
        borrower,
        contractsCache.storagePool,
        collTokenAmount.tokenAddress,
        collTokenAmount.amount,
        PoolType.Active
      );
    }

    _finaliseTrove(false, false, contractsCache, vars, borrower);
  }

  // Withdraw collateral from a trove
  function withdrawColl(TokenAmount[] memory _colls) external override {
    address borrower = msg.sender;
    (ContractsCache memory contractsCache, LocalVariables_adjustTrove memory vars) = _prepareTroveAdjustment(borrower);

    uint withdrawCompositeInStable = _getCompositeColl(_colls);
    if (withdrawCompositeInStable > vars.newCompositeCollInStable) revert WithdrawAmount_gt_Coll();
    vars.newCompositeCollInStable -= withdrawCompositeInStable;

    contractsCache.troveManager.decreaseTroveColl(borrower, _colls);

    for (uint i = 0; i < _colls.length; i++) {
      TokenAmount memory collTokenAmount = _colls[i];

      // checking is the trove has enough coll for the withdrawal
      TokenAmount memory existingColl;
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

    _finaliseTrove(true, false, contractsCache, vars, borrower);
  }

  // increasing debt of a trove
  function increaseDebt(TokenAmount[] memory _debts, uint _maxFeePercentage) external override {
    (ContractsCache memory contractsCache, LocalVariables_adjustTrove memory vars) = _prepareTroveAdjustment(
      msg.sender
    );

    _requireValidMaxFeePercentage(_maxFeePercentage, vars.isInRecoveryMode);

    (
      DebtTokenAmount[] memory addedDebts,
      DebtTokenAmount memory stableCoinAmount
    ) = _getDebtTokenAmountsWithFetchedPrices(contractsCache.debtTokenManager, _debts);

    // checking if new debt is above the minimum
    for (uint i = 0; i < addedDebts.length; i++) {
      _requireNonZeroDebtChange(_debts[i].amount);
      _requireAtLeastMinNetDebt(addedDebts[i].netDebt);
    }

    // adding the borrowing fee to the net debt
    uint borrowingFeesPaid = 0;
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
        debtTokenAmount.netDebt - debtTokenAmount.borrowingFee
      );
    }

    _finaliseTrove(false, true, contractsCache, vars, msg.sender);
  }

  // repay debt of a trove
  function repayDebt(TokenAmount[] memory _debts) external override {
    address borrower = msg.sender;
    (ContractsCache memory contractsCache, LocalVariables_adjustTrove memory vars) = _prepareTroveAdjustment(borrower);

    (DebtTokenAmount[] memory removedDebts, ) = _getDebtTokenAmountsWithFetchedPrices(
      contractsCache.debtTokenManager,
      _debts
    );
    vars.newCompositeDebtInStable -= _getCompositeDebt(removedDebts);
    contractsCache.troveManager.decreaseTroveDebt(borrower, vars.debts);

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
      _requireAtLeastMinNetDebt(existingDebt.netDebt - debtTokenAmount.netDebt);
      if (debtTokenAmount.debtToken.isStableCoin())
        _requireValidStableCoinRepayment(existingDebt.netDebt, debtTokenAmount.netDebt);

      _poolRepayDebt(
        borrower,
        contractsCache.storagePool,
        debtTokenAmount.debtToken,
        debtTokenAmount.netDebt // it is not possible to repay the gasComp, this happens only when the trove is closed
      );
    }

    _finaliseTrove(false, false, contractsCache, vars, borrower);
  }

  function closeTrove() external override {
    address borrower = msg.sender;
    (ContractsCache memory contractsCache, LocalVariables_adjustTrove memory vars) = _prepareTroveAdjustment(borrower);

    uint newTCR = _getNewTCRFromTroveChange(
      vars.oldCompositeCollInStable,
      false,
      vars.oldCompositeDebtInStable,
      false,
      vars.entireSystemColl,
      vars.entireSystemDebt
    );
    _requireNewTCRisAboveCCR(newTCR);

    // repay any open debts
    for (uint i = 0; i < vars.debts.length; i++) {
      DebtTokenAmount memory debtTokenAmount = vars.debts[i];

      uint toRepay;
      if (debtTokenAmount.debtToken.isStableCoin()) toRepay = debtTokenAmount.netDebt - STABLE_COIN_GAS_COMPENSATION;
      else toRepay = debtTokenAmount.netDebt;
      if (toRepay == 0) continue;

      _poolRepayDebt(borrower, contractsCache.storagePool, debtTokenAmount.debtToken, toRepay);
    }

    // burn the gas compensation
    _poolBurnGasComp(contractsCache.storagePool, vars.stableCoinEntry.debtToken);

    // Send the collateral back to the user
    for (uint i = 0; i < vars.colls.length; i++) {
      TokenAmount memory collTokenAmount = vars.colls[i];

      _poolSubtractColl(
        borrower,
        contractsCache.storagePool,
        collTokenAmount.tokenAddress,
        collTokenAmount.amount,
        PoolType.Active
      );
    }

    contractsCache.troveManager.removeStake(vars.collTokenAddresses, borrower);
    contractsCache.troveManager.closeTrove(vars.collTokenAddresses, borrower);

    // todo
    // emit TroveUpdated(msg.sender, 0, 0, 0, BorrowerOperation.closeTrove);
  }

  // --- Helper functions ---

  function _prepareTroveAdjustment(
    address _borrower
  ) internal returns (ContractsCache memory contractsCache, LocalVariables_adjustTrove memory vars) {
    contractsCache = ContractsCache(troveManager, storagePool, debtTokenManager, collTokenManager);
    vars.collTokenAddresses = contractsCache.collTokenManager.getCollTokenAddresses();

    (vars.isInRecoveryMode, vars.TCR, vars.entireSystemColl, vars.entireSystemDebt) = contractsCache
      .storagePool
      .checkRecoveryMode();

    _requireTroveisActive(contractsCache.troveManager, _borrower);
    contractsCache.troveManager.applyPendingRewards(_borrower); // from redistributions

    // fetching old/current debts and colls including prices + calc ICR
    (vars.debts, vars.stableCoinEntry) = _getDebtTokenAmountsWithFetchedPrices(
      contractsCache.debtTokenManager,
      contractsCache.troveManager.getTroveDebt(_borrower)
    );
    vars.oldCompositeDebtInStable = _getCompositeDebt(vars.debts);
    vars.newCompositeDebtInStable = vars.oldCompositeDebtInStable;

    vars.colls = contractsCache.troveManager.getTroveColl(_borrower);
    vars.oldCompositeCollInStable = _getCompositeColl(vars.colls);
    vars.newCompositeCollInStable = vars.oldCompositeCollInStable;

    vars.oldICR = LiquityMath._computeCR(vars.oldCompositeCollInStable, vars.oldCompositeDebtInStable);

    return (contractsCache, vars);
  }

  function _finaliseTrove(
    bool _isCollWithdrawal,
    bool _isDebtIncrease,
    ContractsCache memory contractsCache,
    LocalVariables_adjustTrove memory vars,
    address _borrower
  ) internal {
    // calculate the new ICR
    vars.newICR = LiquityMath._computeCR(vars.newCompositeCollInStable, vars.newCompositeDebtInStable);
    vars.newNCR = LiquityMath._computeNominalCR(vars.newCompositeCollInStable, vars.newCompositeDebtInStable);

    // Check the adjustment satisfies all conditions for the current system mode
    _requireValidAdjustmentInCurrentMode(_isCollWithdrawal, _isDebtIncrease, vars);

    // update troves stake
    contractsCache.troveManager.updateStakeAndTotalStakes(vars.collTokenAddresses, _borrower);

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

  function _getNewTCRFromTroveChange(
    uint _collChange,
    bool _isCollIncrease,
    uint _debtChange,
    bool _isDebtIncrease,
    uint entireSystemColl,
    uint entireSystemDebt
  ) internal pure returns (uint) {
    uint totalColl = _isCollIncrease ? entireSystemColl + _collChange : entireSystemColl - _collChange;
    uint totalDebt = _isDebtIncrease ? entireSystemDebt + _debtChange : entireSystemDebt - _debtChange;

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
    borrowingFee = _troveManager.getBorrowingFee(compositeDebtInStable); // calculated in stable price
    _requireUserAcceptsFee(borrowingFee, compositeDebtInStable, _maxFeePercentage);
    uint stableCoinPrice = _stableCoinAmount.debtToken.getPrice();
    borrowingFee = (borrowingFee * DECIMAL_PRECISION) / stableCoinPrice;

    // todo...
    // Send fee to staking contract
    //        lqtyStaking.increaseF_LUSD(borrowingFee);
    //        stableCoinAmount.debtToken.mint(address(lqtyStaking), borrowingFee);

    // update troves debts
    _stableCoinAmount.netDebt += borrowingFee;
    _stableCoinAmount.borrowingFee += borrowingFee;

    return borrowingFee;
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
    _pool.refundValue(_borrower, _collAddress, _amount);
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

  function _poolBurnGasComp(IStoragePool _storagePool, IDebtToken _stableCoin) internal {
    _storagePool.subtractValue(address(_stableCoin), false, PoolType.GasCompensation, STABLE_COIN_GAS_COMPENSATION);
    _stableCoin.burn(address(_storagePool), STABLE_COIN_GAS_COMPENSATION);
  }

  // --- 'Require' wrapper functions ---

  function _requireCallerIsBorrower(address _borrower) internal view {
    if (msg.sender != _borrower) revert NotBorrower();
  }

  function _requireTroveisActive(ITroveManager _troveManager, address _borrower) internal view {
    uint status = _troveManager.getTroveStatus(_borrower);
    if (status != 1) revert TroveClosedOrNotExist();
  }

  function _requireNotInRecoveryMode(bool _isInRecoveryMode) internal pure {
    if (_isInRecoveryMode) revert NotAllowedInRecoveryMode();
  }

  function _requireTroveIsNotActive(ITroveManager _troveManager, address _borrower) internal view {
    uint status = _troveManager.getTroveStatus(_borrower);
    if (status == 1) revert ActiveTrove();
  }

  // adds stableCoin debt including gas compensation if not already included
  function _getDebtTokenAmountsWithFetchedPrices(
    IDebtTokenManager _dTokenManager,
    TokenAmount[] memory _debts
  ) internal view returns (DebtTokenAmount[] memory debtTokenAmounts, DebtTokenAmount memory stableCoinEntry) {
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
      IDebtToken debtToken = _dTokenManager.getDebtToken(_debts[i].tokenAddress);
      debtTokenAmounts[i] = DebtTokenAmount(debtToken, _debts[i].amount, 0);

      if (stableCoinIncluded && debtToken.isStableCoin()) stableCoinEntry = debtTokenAmounts[i];
    }

    if (!stableCoinIncluded) {
      IDebtToken debtToken = _dTokenManager.getStableCoin();
      debtTokenAmounts[_debts.length] = DebtTokenAmount(debtToken, 0, 0);
      stableCoinEntry = debtTokenAmounts[_debts.length];
    }

    return (debtTokenAmounts, stableCoinEntry);
  }

  function _requireNonZeroDebtChange(uint _LUSDChange) internal pure {
    if (_LUSDChange == 0) revert ZeroDebtChange();
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
  ) internal pure {
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
      // BorrowerOps: Collateral withdrawal not permitted Recovery Mode
      if (_isCollWithdrawal) revert CollWithdrawPermittedInRM();
      if (_isDebtIncrease) _requireICRisAboveCCR(_vars.newICR);
    } else {
      // if Normal Mode
      _requireICRisAboveMCR(_vars.newICR);

      uint collChange = _vars.newCompositeCollInStable > _vars.oldCompositeCollInStable
        ? _vars.newCompositeCollInStable - _vars.oldCompositeCollInStable
        : _vars.oldCompositeCollInStable - _vars.newCompositeCollInStable;
      uint debtChange = _vars.newCompositeDebtInStable > _vars.oldCompositeDebtInStable
        ? _vars.newCompositeDebtInStable - _vars.oldCompositeDebtInStable
        : _vars.oldCompositeDebtInStable - _vars.newCompositeDebtInStable;
      _vars.newTCR = _getNewTCRFromTroveChange(
        collChange,
        !_isCollWithdrawal,
        debtChange,
        _isDebtIncrease,
        _vars.entireSystemColl,
        _vars.entireSystemDebt
      );
      _requireNewTCRisAboveCCR(_vars.newTCR);
    }
  }

  function _requireICRisAboveMCR(uint _newICR) internal pure {
    // BorrowerOps: An operation that would result in ICR < MCR is not permitted
    if (_newICR < MCR) revert ICR_lt_MCR();
  }

  function _requireICRisAboveCCR(uint _newICR) internal pure {
    // BorrowerOps: Operation must leave trove with ICR >= CCR
    if (_newICR < CCR) revert ICR_lt_CCR();
  }

  function _requireNewICRisAboveOldICR(uint _newICR, uint _oldICR) internal pure {
    // BorrowerOps: Cannot decrease your Trove's ICR in Recovery Mode
    if (_newICR < _oldICR) revert ICRDecreasedInRM();
  }

  function _requireNewTCRisAboveCCR(uint _newTCR) internal pure {
    // BorrowerOps: An operation that would result in TCR < CCR is not permitted
    if (_newTCR < CCR) revert TCR_lt_CCR();
  }

  function _requireAtLeastMinNetDebt(uint _netDebt) internal pure {
    // TODO: this will never happen from solidity 8.0
    require(_netDebt >= 0, "BorrowerOps: Trove's net debt must be greater than minimum");
  }

  function _requireValidStableCoinRepayment(uint _currentDebt, uint _debtRepayment) internal pure {
    // BorrowerOps: Amount repaid must not be larger than the Trove's debt
    if (_debtRepayment > (_currentDebt - STABLE_COIN_GAS_COMPENSATION)) revert Repaid_gt_CurrentDebt();
  }

  function _requireValidMaxFeePercentage(uint _maxFeePercentage, bool _isInRecoveryMode) internal pure {
    if (_isInRecoveryMode) {
      if (_maxFeePercentage > DECIMAL_PRECISION) revert MaxFee_gt_100_InRM();
    } else {
      if (_maxFeePercentage < BORROWING_FEE_FLOOR || _maxFeePercentage > DECIMAL_PRECISION) revert MaxFee_out_Range();
    }
  }

  // --- ICR and TCR getters ---

  function getCompositeDebt(DebtTokenAmount[] memory _debts) external view override returns (uint) {
    return _getCompositeDebt(_debts);
  }

  function _getNetDebt(DebtTokenAmount[] memory _debts) internal view returns (uint) {
    return _getCompositeDebt(_debts) - STABLE_COIN_GAS_COMPENSATION;
  }

  // Returns the composite debt (drawn debt + gas compensation) of a trove, for the purpose of ICR calculation
  function _getCompositeDebt(DebtTokenAmount[] memory _debts) internal view returns (uint debtInStable) {
    for (uint i = 0; i < _debts.length; i++) {
      debtInStable += priceFeed.getUSDValue(address(_debts[i].debtToken), _debts[i].netDebt);
    }
  }

  function _getCompositeColl(TokenAmount[] memory _colls) internal view returns (uint collInStable) {
    for (uint i = 0; i < _colls.length; i++) {
      collInStable += priceFeed.getUSDValue(_colls[i].tokenAddress, _colls[i].amount);
    }
  }
}
