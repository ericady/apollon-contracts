// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './Interfaces/IBorrowerOperations.sol';
import './Interfaces/IStabilityPool.sol';
import './Interfaces/IBorrowerOperations.sol';
import './Interfaces/ITroveManager.sol';
import './Interfaces/IDebtToken.sol';
import './Dependencies/LiquityBase.sol';
import './Dependencies/SafeMath.sol';
import './Dependencies/LiquitySafeMath128.sol';
import './Dependencies/Ownable.sol';
import './Dependencies/CheckContract.sol';
import './Dependencies/console.sol';
import './Interfaces/IPriceFeed.sol';
import './Interfaces/IStoragePool.sol';

/*
 * The Stability Pool holds debt tokens deposited by Stability Pool depositors.
 *
 * When a trove is liquidated, then depending on system conditions, some of its debt gets offset with
 * token in the Stability Pool:  that is, the offset debt evaporates, and an equal amount of debt tokens in the Stability Pool is burned.
 *
 * Thus, a liquidation causes each depositor to receive a debt token loss, in proportion to their deposit as a share of total deposits.
 * Calculated separately by debt token groups.
 * They also receive a coll token gain, as the collateral of the liquidated trove is distributed among Stability depositors,
 * in the same proportion.
 *
 * When a liquidation occurs, it depletes every deposit by the same fraction: for example, a liquidation that depletes 40%
 * of the total debt token in the Stability Pool, depletes 40% of each deposit (of the same token).
 *
 * A deposit that has experienced a series of liquidations is termed a "compounded deposit": each liquidation depletes the deposit,
 * multiplying it by some factor in range ]0,1[
 *
 *
 * --- IMPLEMENTATION ---
 *
 * We use a highly scalable method of tracking deposits and coll gains that has O(1) complexity.
 *
 * When a liquidation occurs, rather than updating each depositor's deposit and gains, we simply update two state variables:
 * a product P, and a sum S.
 *
 * A mathematical manipulation allows us to factor out the initial deposit, and accurately track all depositors' compounded deposits
 * and accumulated gains over time, as liquidations occur, using just these two variables P and S. When depositors join the
 * Stability Pool, they get a snapshot of the latest P and S: P_t and S_t, respectively.
 *
 * The formula for a depositor's accumulated gain is derived here:
 * https://github.com/liquity/dev/blob/main/papers/Scalable_Reward_Distribution_with_Compounding_Stakes.pdf
 *
 * For a given deposit d_t, the ratio P/P_t tells us the factor by which a deposit has decreased since it joined the Stability Pool,
 * and the term d_t * (S - S_t)/P_t gives us the deposit's total accumulated gain.
 *
 * Each liquidation updates the product P and sum S. After a series of liquidations, a compounded deposit and corresponding gain
 * can be calculated using the initial deposit, the depositor’s snapshots of P and S, and the latest values of P and S.
 *
 * Any time a depositor updates their deposit (withdrawal, top-up) their accumulated gain is paid out, their new deposit is recorded
 * (based on their latest compounded deposit and modified by the withdrawal/top-up), and they receive new snapshots of the latest P and S.
 * Essentially, they make a fresh deposit that overwrites the old one.
 *
 *
 * --- SCALE FACTOR ---
 *
 * Since P is a running product in range ]0,1] that is always-decreasing, it should never reach 0 when multiplied by a number in range ]0,1[.
 * Unfortunately, Solidity floor division always reaches 0, sooner or later.
 *
 * A series of liquidations that nearly empty the Pool (and thus each multiply P by a very small number in range ]0,1[ ) may push P
 * to its 18 digit decimal limit, and round it to 0, when in fact the Pool hasn't been emptied: this would break deposit tracking.
 *
 * So, to track P accurately, we use a scale factor: if a liquidation would cause P to decrease to <1e-9 (and be rounded to 0 by Solidity),
 * we first multiply P by 1e9, and increment a currentScale factor by 1.
 *
 * The added benefit of using 1e9 for the scale factor (rather than 1e18) is that it ensures negligible precision loss close to the
 * scale boundary: when P is at its minimum value of 1e9, the relative precision loss in P due to floor division is only on the
 * order of 1e-9.
 *
 * --- EPOCHS ---
 *
 * Whenever a liquidation fully empties the Stability Pool, all deposits should become 0. However, setting P to 0 would make P be 0
 * forever, and break all future reward calculations.
 *
 * So, every time the Stability Pool is emptied by a liquidation, we reset P = 1 and currentScale = 0, and increment the currentEpoch by 1.
 *
 * --- TRACKING DEPOSIT OVER SCALE CHANGES AND EPOCHS ---
 *
 * When a deposit is made, it gets snapshots of the currentEpoch and the currentScale.
 *
 * When calculating a compounded deposit, we compare the current epoch to the deposit's epoch snapshot. If the current epoch is newer,
 * then the deposit was present during a pool-emptying liquidation, and necessarily has been depleted to 0.
 *
 * Otherwise, we then compare the current scale to the deposit's scale snapshot. If they're equal, the compounded deposit is given by d_t * P/P_t.
 * If it spans one scale change, it is given by d_t * P/(P_t * 1e9). If it spans more than one scale change, we define the compounded deposit
 * as 0, since it is now less than 1e-9'th of its initial value (e.g. a deposit of 1 billion LUSD has depleted to < 1 LUSD).
 *
 *
 *  --- TRACKING DEPOSITOR'S GAINS OVER SCALE CHANGES AND EPOCHS ---
 *
 * In the current epoch, the latest value of S is stored upon each scale change, and the mapping (scale -> S) is stored for each epoch.
 *
 * This allows us to calculate a deposit's accumulated gain, during the epoch in which the deposit was non-zero and earned gains.
 *
 * We calculate the depositor's accumulated gains for the scale at which they made the deposit, using the gain formula:
 * e_1 = d_t * (S - S_t) / P_t
 *
 * and also for scale after, taking care to divide the latter by a factor of 1e9:
 * e_2 = d_t * S / (P_t * 1e9)
 *
 * The gain in the second scale will be full, as the starting point was in the previous scale, thus no need to subtract anything.
 * The deposit therefore was present for reward events from the beginning of that second scale.
 *
 *        S_i-S_t + S_{i+1}
 *      .<--------.------------>
 *      .         .
 *      . S_i     .   S_{i+1}
 *   <--.-------->.<----------->
 *   S_t.         .
 *   <->.         .
 *      t         .
 *  |---+---------|-------------|-----...
 *         i            i+1
 *
 * The sum of (e_1 + e_2) captures the depositor's total accumulated gains, handling the case where their
 * deposit spanned one scale change. We only care about gains across one scale change, since the compounded
 * deposit is defined as being 0 once it has spanned more than one scale change.
 *
 *
 * --- UPDATING P WHEN A LIQUIDATION OCCURS ---
 *
 * Please see the implementation spec in the proof document, which closely follows on from the compounded deposit / ETH gain derivations:
 * https://github.com/liquity/liquity/blob/master/papers/Scalable_Reward_Distribution_with_Compounding_Stakes.pdf
 *
 *
 * --- LQTY ISSUANCE TO STABILITY POOL DEPOSITORS ---
 *
 * An LQTY issuance event occurs at every deposit operation, and every liquidation.
 *
 * Each deposit is tagged with the address of the front end through which it was made.
 *
 * All deposits earn a share of the issued LQTY in proportion to the deposit as a share of total deposits. The LQTY earned
 * by a given deposit, is split between the depositor and the front end through which the deposit was made, based on the front end's kickbackRate.
 *
 * Please see the system Readme for an overview:
 * https://github.com/liquity/dev/blob/main/README.md#lqty-issuance-to-stability-providers
 *
 * We use the same mathematical product-sum approach to track LQTY gains for depositors, where 'G' is the sum corresponding to LQTY gains.
 * The product P (and snapshot P_t) is re-used, as the ratio P/P_t tracks a deposit's depletion due to liquidations.
 *
 */
contract StabilityPool is LiquityBase, Ownable, CheckContract, IStabilityPool {
  using SafeMath for uint256;
  using LiquitySafeMath128 for uint128;

  string public constant NAME = 'StabilityPool';

  ITroveManager public troveManager;
  IPriceFeed public priceFeed;
  IStoragePool public storagePool;
  address public stabilityPoolManagerAddress;

  // --- Data structures ---

  IDebtToken public depositToken;
  uint256 public totalDeposits;

  struct Snapshots {
    mapping(address => uint) sums; // [coll token address] -> snapshot of S(um)
    uint P;
    // uint G; todo gov
    uint128 scale;
    uint128 epoch;
  }
  mapping(address => Snapshots) public depositSnapshots; // [depositor address] -> snapshots struct
  mapping(address => uint) public deposits; // [depositor address] -> deposit amount

  /*  Product 'P': Running product by which to multiply an initial deposit, in order to find the current compounded deposit,
   * after a series of liquidations have occurred, each of which cancel some debt with the deposit.
   *
   * During its lifetime, a deposit's value evolves from d_t to d_t * P / P_t , where P_t
   * is the snapshot of P taken at the instant the deposit was made. 18-digit decimal.
   */
  uint public P = DECIMAL_PRECISION;

  uint public constant SCALE_FACTOR = 1e9;
  uint128 public currentScale; // Each time the scale of P shifts by SCALE_FACTOR, the scale is incremented by 1
  uint128 public currentEpoch; // With each offset that fully empties the Pool, the epoch is incremented by 1

  /*Gains sum 'S': During its lifetime, each deposit d_t earns an ETH gain of ( d_t * [S - S_t] )/P_t, where S_t
   * is the depositor's snapshot of S taken at the time t when the deposit was made.
   *
   * The 'S' sums are stored in a nested mapping (epoch => scale => sum):
   *
   * - The inner mapping records the sum S at different scales
   * - The outer mapping records the (scale => sum) mappings, for different epochs.
   */

  address[] public usedCollTokens;
  mapping(address => uint) public totalGainedColl; // [token address] -> total gained collateral
  mapping(uint128 => mapping(uint128 => mapping(address => uint))) public epochToScaleToCollTokenToSum; // [epoch][scale][collTokenAddress] => sum

  /*
   * Similarly, the sum 'G' is used to calculate GOV gains. During it's lifetime, each deposit d_t earns a GOV gain of
   *  ( d_t * [G - G_t] )/P_t, where G_t is the depositor's snapshot of G taken at time t when  the deposit was made.
   *
   *  GOV reward events occur are triggered by depositor operations (new deposit, topup, withdrawal), and liquidations.
   *  In each case, the GOV reward is issued (i.e. G is updated), before other state changes are made.
   */
  //    mapping (uint128 => mapping(uint128 => uint)) public epochToScaleToG; todo gov

  // Error tracker for the error correction in the LQTY issuance calculation
  //    uint public lastLQTYError; todo gov

  mapping(address => uint) public lastErrorOffset; // [tokenAddress] value, Error trackers for the error correction in the offset calculation

  constructor(
    address _stabilityPoolManagerAddress,
    address _troveManagerAddress,
    address _priceFeedAddress,
    address _storagePoolAddress,
    address _depositTokenAddress
  ) {
    checkContract(_stabilityPoolManagerAddress);
    checkContract(_troveManagerAddress);
    checkContract(_priceFeedAddress);
    checkContract(_storagePoolAddress);
    checkContract(_depositTokenAddress);

    stabilityPoolManagerAddress = _stabilityPoolManagerAddress;
    emit StabilityPoolManagerAddressChanged(_stabilityPoolManagerAddress);

    troveManager = ITroveManager(_troveManagerAddress);
    emit TroveManagerAddressChanged(_troveManagerAddress);

    priceFeed = IPriceFeed(_priceFeedAddress);
    emit PriceFeedAddressChanged(_priceFeedAddress);

    storagePool = IStoragePool(_storagePoolAddress);
    emit StoragePoolAddressChanged(_storagePoolAddress);

    depositToken = IDebtToken(_depositTokenAddress);
    emit DepositTokenAddressChanged(_depositTokenAddress);

    _renounceOwnership();
  }

  // --- Getters for public variables. Required by IPool interface ---

  function getTotalGainedColl() external view override returns (TokenAmount[] memory coll) {
    coll = new TokenAmount[](usedCollTokens.length);
    for (uint i = 0; i < usedCollTokens.length; i++) {
      coll[i].tokenAddress = usedCollTokens[i];
      coll[i].amount = totalGainedColl[usedCollTokens[i]];
    }
    return coll;
  }

  function getTotalDeposit() external view override returns (uint) {
    return totalDeposits;
  }

  function getDepositToken() external view override returns (IDebtToken) {
    return depositToken;
  }

  // --- External Depositor Functions ---

  /*  provideToSP():
   * - Triggers a GOV issuance, based on time passed since the last issuance. The GOV issuance is shared between *all* depositors
   * - Sends depositor's accumulated gains to depositor
   * - Increases deposit stake, and takes new snapshots.
   */
  function provideToSP(address depositor, uint _amount) external override {
    _requireNonZeroAmount(_amount);

    uint initialDeposit = deposits[depositor];
    uint remainingDeposit = this.getCompoundedDebtDeposit(depositor);
    uint depositLoss = initialDeposit.sub(remainingDeposit); // Needed only for event log
    //        emit DepositLoss(depositor, depositLoss); todo

    _payoutCollGains(depositor);

    // update deposit snapshots
    _sendDepositToStabilityPool(depositor, _amount);
    uint newDeposit = remainingDeposit.add(_amount);
    _updateDepositAndSnapshots(depositor, newDeposit);
    //        emit UserDepositChanged(user, newDeposit); todo

    // todo gov token...
    // ICommunityIssuance communityIssuanceCached = communityIssuance;
    // _triggerLQTYIssuance(communityIssuanceCached);
  }

  /*  withdrawFromSP():
   * - Triggers a GOV issuance, based on time passed since the last issuance. The GOV issuance is shared between *all* depositors
   * - Sends all depositor's accumulated gains to depositor
   * - Decreases deposit and takes new snapshots.
   * - If _amount > userDeposit, the user withdraws all of their compounded deposit.
   */
  function withdrawFromSP(uint debtToWithdrawal) external override {
    // todo will be called from the manager -> user instead of msg.sender

    // todo removed this check, because we do not know about potential under collateralized loans
    // (sorted troves is not anymore sorted by runtime cr, its the cr on creation time)
    // this check is not required for any security reasons
    // but it prevented users from withdrawing their deposit out of the stability pool in case of an <100% CR trove (to avoid the loss)
    //    if (debtToWithdrawal != 0) _requireNoUnderCollateralizedTroves();

    uint initialDeposit = deposits[msg.sender];
    _requireUserHasDeposit(initialDeposit);

    uint remainingDeposit = this.getCompoundedDebtDeposit(msg.sender);
    uint depositLoss = initialDeposit.sub(remainingDeposit); // Needed only for event log
    //        emit DepositLoss(msg.sender, depositLoss); todo
    debtToWithdrawal = LiquityMath._min(debtToWithdrawal, remainingDeposit);

    _payoutCollGains(msg.sender);

    // update deposit snapshots
    _sendDepositToDepositor(msg.sender, debtToWithdrawal);
    uint newDeposit = remainingDeposit.sub(debtToWithdrawal);
    _updateDepositAndSnapshots(msg.sender, newDeposit);
    //        emit UserDepositChanged(msg.sender, newDeposit); todo

    // todo gov token...
    // ICommunityIssuance communityIssuanceCached = communityIssuance;
    // _triggerLQTYIssuance(communityIssuanceCached);
  }

  /* withdrawGains:
   * - Triggers a GOV issuance, based on time passed since the last issuance. The GOV issuance is shared between *all* depositors
   * - Sends all depositor's GOV gain to depositor
   * - Transfers the depositor's entire gains to its wallet
   * - Leaves their compounded deposit in the Stability Pool
   * - Updates snapshots for deposit stake */
  function withdrawGains() external override {
    _requireUserHasTrove(msg.sender);

    uint initialDeposit = deposits[msg.sender];
    _requireUserHasDeposit(initialDeposit);

    uint remainingDeposit = this.getCompoundedDebtDeposit(msg.sender);
    uint depositLoss = initialDeposit.sub(remainingDeposit); // Needed only for event log
    //        emit DepositLoss(msg.sender, depositLoss); todo

    _payoutCollGains(msg.sender);

    // update deposit snapshots
    _updateDepositAndSnapshots(msg.sender, remainingDeposit);
    //        emit UserDepositChanged(msg.sender, remainingDeposit); todo

    // todo gov token...
    // ICommunityIssuance communityIssuanceCached = communityIssuance;
    // _triggerLQTYIssuance(communityIssuanceCached);
  }

  //    // --- GOV issuance functions ---
  //
  //    function _triggerLQTYIssuance(ICommunityIssuance _communityIssuance) internal {
  //        uint LQTYIssuance = _communityIssuance.issueLQTY();
  //       _updateG(LQTYIssuance);
  //    }
  //
  //    function _updateG(uint _LQTYIssuance) internal {
  //        uint totalLUSD = totalLUSDDeposits; // cached to save an SLOAD
  //        /*
  //        * When total deposits is 0, G is not updated. In this case, the LQTY issued can not be obtained by later
  //        * depositors - it is missed out on, and remains in the balanceof the CommunityIssuance contract.
  //        *
  //        */
  //        if (totalLUSD == 0 || _LQTYIssuance == 0) {return;}
  //
  //        uint LQTYPerUnitStaked;
  //        LQTYPerUnitStaked =_computeLQTYPerUnitStaked(_LQTYIssuance, totalLUSD);
  //
  //        uint marginalLQTYGain = LQTYPerUnitStaked.mul(P);
  //        epochToScaleToG[currentEpoch][currentScale] = epochToScaleToG[currentEpoch][currentScale].add(marginalLQTYGain);
  //
  //        emit G_Updated(epochToScaleToG[currentEpoch][currentScale], currentEpoch, currentScale);
  //    }
  //
  //    function _computeLQTYPerUnitStaked(uint _LQTYIssuance, uint _totalLUSDDeposits) internal returns (uint) {
  //        /*
  //        * Calculate the LQTY-per-unit staked.  Division uses a "feedback" error correction, to keep the
  //        * cumulative error low in the running total G:
  //        *
  //        * 1) Form a numerator which compensates for the floor division error that occurred the last time this
  //        * function was called.
  //        * 2) Calculate "per-unit-staked" ratio.
  //        * 3) Multiply the ratio back by its denominator, to reveal the current floor division error.
  //        * 4) Store this error for use in the next correction when this function is called.
  //        * 5) Note: static analysis tools complain about this "division before multiplication", however, it is intended.
  //        */
  //        uint LQTYNumerator = _LQTYIssuance.mul(DECIMAL_PRECISION).add(lastLQTYError);
  //
  //        uint LQTYPerUnitStaked = LQTYNumerator.div(_totalLUSDDeposits);
  //        lastLQTYError = LQTYNumerator.sub(LQTYPerUnitStaked.mul(_totalLUSDDeposits));
  //
  //        return LQTYPerUnitStaked;
  //    }
  //
  //    function _payOutLQTYGains(ICommunityIssuance _communityIssuance, address _depositor) internal {
  //        // Pay out depositor's LQTY gain
  //        uint depositorLQTYGain = getDepositorLQTYGain(_depositor);
  //        _communityIssuance.sendLQTY(_depositor, depositorLQTYGain);
  //        emit LQTYPaidToDepositor(_depositor, depositorLQTYGain);
  //    }
  //
  //    /*
  //* Calculate the LQTY gain earned by a deposit since its last snapshots were taken.
  //* Given by the formula:  LQTY = d0 * (G - G(0))/P(0)
  //* where G(0) and P(0) are the depositor's snapshots of the sum G and product P, respectively.
  //* d0 is the last recorded deposit value.
  //*/
  //    function getDepositorLQTYGain(address _depositor) public view override returns (uint) {
  //        uint initialDeposit = deposits[_depositor].initialValue;
  //        if (initialDeposit == 0) {return 0;}
  //
  //        Snapshots storage snapshots = depositSnapshots[_depositor];
  //        uint LQTYGain = _getLQTYGainFromSnapshots(initialDeposit, snapshots);
  //        return LQTYGain;
  //    }
  //
  //    function _getLQTYGainFromSnapshots(uint initialStake, Snapshots storage snapshots) internal view returns (uint) {
  //        /*
  //         * Grab the sum 'G' from the epoch at which the stake was made. The LQTY gain may span up to one scale change.
  //         * If it does, the second portion of the LQTY gain is scaled by 1e9.
  //         * If the gain spans no scale change, the second portion will be 0.
  //         */
  //        uint128 epochSnapshot = snapshots.epoch;
  //        uint128 scaleSnapshot = snapshots.scale;
  //        uint G_Snapshot = snapshots.G;
  //        uint P_Snapshot = snapshots.P;
  //
  //        uint firstPortion = epochToScaleToG[epochSnapshot][scaleSnapshot].sub(G_Snapshot);
  //        uint secondPortion = epochToScaleToG[epochSnapshot][scaleSnapshot.add(1)].div(SCALE_FACTOR);
  //
  //        uint LQTYGain = initialStake.mul(firstPortion.add(secondPortion)).div(P_Snapshot).div(DECIMAL_PRECISION);
  //
  //        return LQTYGain;
  //    }

  // --- Liquidation functions ---

  /*
   * Cancels out the specified debt against the tokens contained in the Stability Pool (as far as possible)
   * and transfers the Trove's collateral from ActivePool to StabilityPool.
   * Only called by liquidation functions in the TroveManager.
   */
  function offset(uint _debtToOffset, TokenAmount[] memory _collToAdd) external override {
    _requireCallerIsStabilityPoolManager();

    uint _totalDeposits = totalDeposits;
    if (_totalDeposits == 0 || _debtToOffset == 0) return;

    // adding coll token address into the usedCollTokens array, if they are not already there
    for (uint i = 0; i < _collToAdd.length; i++) {
      bool found = false;
      for (uint ii = 0; ii < usedCollTokens.length; ii++) {
        if (usedCollTokens[ii] != _collToAdd[i].tokenAddress) continue;
        found = true;
        break;
      }
      if (!found) usedCollTokens.push(_collToAdd[i].tokenAddress);
    }

    // todo gov...
    // _triggerLQTYIssuance(communityIssuance);

    (TokenAmount[] memory collGainPerUnitStaked, uint depositLossPerUnitStaked) = _computeRewardsPerUnitStaked(
      _collToAdd,
      _debtToOffset,
      _totalDeposits
    );

    _updateRewardSumAndProduct(collGainPerUnitStaked, depositLossPerUnitStaked); // updates S and P

    uint newTotalDeposit = totalDeposits.sub(_debtToOffset);
    totalDeposits = newTotalDeposit;
    // todo
    //    emit StabilityPoolDepositBalanceUpdated(newTotalDeposit);
  }

  function _computeRewardsPerUnitStaked(
    TokenAmount[] memory _collToAdd,
    uint _depositToOffset,
    uint _totalDeposits
  ) internal returns (TokenAmount[] memory collGainPerUnitStaked, uint depositLossPerUnitStaked) {
    /*
     * Compute the rewards. Uses a "feedback" error correction, to keep
     * the cumulative error in the P and S state variables low:
     *
     * 1) Form numerators which compensate for the floor division errors that occurred the last time this
     * function was called.
     * 2) Calculate "per-unit-staked" ratios.
     * 3) Multiply each ratio back by its denominator, to reveal the current floor division error.
     * 4) Store these errors for use in the next correction when this function is called.
     * 5) Note: static analysis tools complain about this "division before multiplication", however, it is intended.
     */

    assert(_depositToOffset <= _totalDeposits);

    collGainPerUnitStaked = new TokenAmount[](_collToAdd.length);
    for (uint i = 0; i < _collToAdd.length; i++) {
      address tokenAddress = _collToAdd[i].tokenAddress;
      collGainPerUnitStaked[i].tokenAddress = tokenAddress;

      uint collNumerator = _collToAdd[i].amount.mul(DECIMAL_PRECISION).add(lastErrorOffset[tokenAddress]);
      collGainPerUnitStaked[i].amount = collNumerator.div(_totalDeposits);
      lastErrorOffset[tokenAddress] = collNumerator.sub(collGainPerUnitStaked[i].amount.mul(_totalDeposits));

      totalGainedColl[tokenAddress] = totalGainedColl[tokenAddress].add(_collToAdd[i].amount);
    }

    if (_depositToOffset == _totalDeposits) {
      depositLossPerUnitStaked = DECIMAL_PRECISION; // When the Pool depletes to 0, so does each deposit
      lastErrorOffset[address(depositToken)] = 0;
    } else {
      uint depositLossNumerator = _depositToOffset.mul(DECIMAL_PRECISION).sub(lastErrorOffset[address(depositToken)]);
      /*
       * Add 1 to make error in quotient positive. We want "slightly too much" deposit loss,
       * which ensures the error in any given compoundedLUSDDeposit favors the Stability Pool.
       */
      depositLossPerUnitStaked = (depositLossNumerator.div(_totalDeposits)).add(1);
      lastErrorOffset[address(depositToken)] = (depositLossPerUnitStaked.mul(_totalDeposits)).sub(depositLossNumerator);
    }

    return (collGainPerUnitStaked, depositLossPerUnitStaked);
  }

  // Update the Stability Pool reward sum S and product P
  function _updateRewardSumAndProduct(
    TokenAmount[] memory collGainPerUnitStaked,
    uint depositLossPerUnitStaked
  ) internal {
    assert(depositLossPerUnitStaked <= DECIMAL_PRECISION);

    /*
     * The newProductFactor is the factor by which to change all deposits, due to the depletion of Stability Pool deposit in the liquidation.
     * We make the product factor 0 if there was a pool-emptying. Otherwise, it is (1 - depositLossPerUnitStaked)
     */

    uint currentP = P;

    uint newP;
    uint128 currentScaleCached = currentScale;
    uint128 currentEpochCached = currentEpoch;

    /*
     * Calculate the new S first, before we update P.
     * The coll gain for any given depositor from a liquidation depends on the value of their deposit
     * (and the value of totalDeposits) prior to the Stability being depleted by the debt in the liquidation.
     *
     * Since S corresponds to coll gain, and P to deposit loss, we update S first.
     */
    for (uint i = 0; i < collGainPerUnitStaked.length; i++) {
      address tokenAddress = collGainPerUnitStaked[i].tokenAddress;
      uint currentS = epochToScaleToCollTokenToSum[currentEpochCached][currentScaleCached][tokenAddress];
      uint marginalCollGain = collGainPerUnitStaked[i].amount.mul(currentP);
      uint newS = currentS.add(marginalCollGain);
      epochToScaleToCollTokenToSum[currentEpochCached][currentScaleCached][tokenAddress] = newS;
      emit S_Updated(tokenAddress, newS, currentEpochCached, currentScaleCached);
    }

    // If the Stability Pool was emptied, increment the epoch, and reset the scale and product P
    uint newProductFactor = uint(DECIMAL_PRECISION).sub(depositLossPerUnitStaked);
    if (newProductFactor == 0) {
      currentEpoch = currentEpochCached.add(1);
      emit EpochUpdated(currentEpoch);
      currentScale = 0;
      emit ScaleUpdated(currentScale);
      newP = DECIMAL_PRECISION;

      // If multiplying P by a non-zero product factor would reduce P below the scale boundary, increment the scale
    } else if (currentP.mul(newProductFactor).div(DECIMAL_PRECISION) < SCALE_FACTOR) {
      newP = currentP.mul(newProductFactor).mul(SCALE_FACTOR).div(DECIMAL_PRECISION);
      currentScale = currentScaleCached.add(1);
      emit ScaleUpdated(currentScale);
    } else {
      newP = currentP.mul(newProductFactor).div(DECIMAL_PRECISION);
    }

    assert(newP > 0);
    P = newP;
    emit P_Updated(newP);
  }

  // --- Reward calculator functions ---

  function _payoutCollGains(address _depositor) internal {
    for (uint i = 0; i < usedCollTokens.length; i++) {
      uint collGain = this.getDepositorCollGain(_depositor, usedCollTokens[i]);
      _sendCollGainToDepositor(usedCollTokens[i], collGain);
      //            emit CollateralGainWithdrawn(_depositor, usedCollTokens[i], collGain); todo
    }
  }

  /* Calculates the gains earned by the deposit since its last snapshots were taken.
   * Given by the formula:  E = d0 * (S - S(0))/P(0)
   * where S(0) and P(0) are the depositor's snapshots of the sum S and product P, respectively.
   * d0 is the last recorded deposit value.
   */
  function getDepositorCollGain(address _depositor, address _collToken) external view override returns (uint collGain) {
    uint initialDeposit = deposits[_depositor];
    if (initialDeposit == 0) return 0;

    Snapshots storage snapshots = depositSnapshots[_depositor];
    collGain = _getCollGainFromSnapshots(initialDeposit, _collToken, snapshots);
    return collGain;
  }

  function _getCollGainFromSnapshots(
    uint initialDeposit,
    address collToken,
    Snapshots storage snapshots
  ) internal view returns (uint) {
    /*
     * Grab the sum 'S' from the epoch at which the stake was made. The coll gain may span up to one scale change.
     * If it does, the second portion of the gain is scaled by 1e9.
     * If the gain spans no scale change, the second portion will be 0.
     */
    uint128 epochSnapshot = snapshots.epoch;
    uint128 scaleSnapshot = snapshots.scale;
    uint firstPortion = epochToScaleToCollTokenToSum[epochSnapshot][scaleSnapshot][collToken].sub(
      snapshots.sums[collToken]
    );
    uint secondPortion = epochToScaleToCollTokenToSum[epochSnapshot][scaleSnapshot.add(1)][collToken].div(SCALE_FACTOR);

    uint collGain = initialDeposit.mul(firstPortion.add(secondPortion)).div(snapshots.P).div(DECIMAL_PRECISION);
    return collGain;
  }

  // --- Compounded deposit ---

  /*
   * Return the user's compounded deposit. Given by the formula:  d = d0 * P/P(0)
   * where P(0) is the depositor's snapshot of the product P, taken when they last updated their deposit.
   */
  function getCompoundedDebtDeposit(address _depositor) external view override returns (uint) {
    uint initialDeposit = deposits[_depositor];
    if (initialDeposit == 0) return 0;

    Snapshots storage snapshots = depositSnapshots[_depositor];
    uint compoundedDeposit = _getCompoundedStakeFromSnapshots(initialDeposit, snapshots);
    return compoundedDeposit;
  }

  // Internal function, used to calculcate compounded deposits.
  function _getCompoundedStakeFromSnapshots(
    uint _initialStake,
    Snapshots storage _snapshots
  ) internal view returns (uint) {
    // If stake was made before a pool-emptying event, then it has been fully cancelled with debt -- so, return 0
    if (_snapshots.epoch < currentEpoch) {
      return 0;
    }

    uint compoundedStake;
    uint128 scaleDiff = currentScale.sub(_snapshots.scale);

    /* Compute the compounded stake. If a scale change in P was made during the stake's lifetime,
     * account for it. If more than one scale change was made, then the stake has decreased by a factor of
     * at least 1e-9 -- so return 0.
     */
    if (scaleDiff == 0) {
      compoundedStake = _initialStake.mul(P).div(_snapshots.P);
    } else if (scaleDiff == 1) {
      compoundedStake = _initialStake.mul(P).div(_snapshots.P).div(SCALE_FACTOR);
    } else {
      // if scaleDiff >= 2
      compoundedStake = 0;
    }

    /*
     * If compounded deposit is less than a billionth of the initial deposit, return 0.
     *
     * NOTE: originally, this line was in place to stop rounding errors making the deposit too large. However, the error
     * corrections should ensure the error in P "favors the Pool", i.e. any given compounded deposit should slightly less
     * than it's theoretical value.
     *
     * Thus it's unclear whether this line is still really needed.
     */
    if (compoundedStake < _initialStake.div(1e9)) {
      return 0;
    }

    return compoundedStake;
  }

  // --- Sender functions ---

  // Transfer the debt tokens from the user to the Stability Pool's address, and update its records
  function _sendDepositToStabilityPool(address _address, uint _amount) internal {
    depositToken.sendToPool(_address, address(this), _amount);
    uint newTotalTokenDeposit = totalDeposits.add(_amount);
    totalDeposits = newTotalTokenDeposit;
    emit StabilityPoolDepositBalanceUpdated(newTotalTokenDeposit);
  }

  function _sendDepositToDepositor(address _depositor, uint _amount) internal {
    if (_amount == 0) return;

    depositToken.returnFromPool(address(this), _depositor, _amount);
    uint newTotalDeposits = totalDeposits.sub(_amount);
    totalDeposits = newTotalDeposits;
    emit StabilityPoolDepositBalanceUpdated(newTotalDeposits);
  }

  function _sendCollGainToDepositor(address _collToken, uint _amount) internal {
    if (_amount == 0) return;

    uint newColl = totalGainedColl[_collToken].sub(_amount);
    totalGainedColl[_collToken] = newColl;
    emit StabilityPoolCollBalanceUpdates(_collToken, newColl);

    IERC20(_collToken).transfer(address(msg.sender), _amount);
  }

  // --- Stability Pool Deposit Functionality ---

  function _updateDepositAndSnapshots(address _depositor, uint _newValue) internal {
    deposits[_depositor] = _newValue;

    if (_newValue == 0) {
      delete depositSnapshots[_depositor];
      emit DepositSnapshotUpdated(_depositor, 0, 0);
      return;
    }

    uint128 currentScaleCached = currentScale;
    depositSnapshots[_depositor].scale = currentScaleCached;

    uint128 currentEpochCached = currentEpoch;
    depositSnapshots[_depositor].epoch = currentEpochCached;

    uint currentP = P;
    depositSnapshots[_depositor].P = currentP;

    for (uint i = 0; i < usedCollTokens.length; i++) {
      depositSnapshots[_depositor].sums[usedCollTokens[i]] = epochToScaleToCollTokenToSum[currentEpochCached][
        currentScaleCached
      ][usedCollTokens[i]];
    }

    // uint currentG = epochToScaleToG[currentEpochCached][currentScaleCached];
    // depositSnapshots[_depositor].G = currentG; todo gov

    //        emit DepositSnapshotUpdated(_depositor, currentP, currentSums); todo...
  }

  // --- 'require' functions ---

  function _requireCallerIsStabilityPoolManager() internal view {
    require(msg.sender == stabilityPoolManagerAddress, 'StabilityPool: Caller is not StabilityPoolManager');
  }

  function _requireUserHasDeposit(uint _initialDeposit) internal pure {
    require(_initialDeposit > 0, 'StabilityPool: User must have a non-zero deposit');
  }

  function _requireNonZeroAmount(uint _amount) internal pure {
    require(_amount > 0, 'StabilityPool: Amount must be non-zero');
  }

  function _requireUserHasTrove(address _depositor) internal view {
    require(
      troveManager.getTroveStatus(_depositor) == 1,
      'StabilityPool: caller must have an active trove to withdraw ETHGain to'
    );
  }
}
