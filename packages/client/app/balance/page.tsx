import CollateralBalance from '../components/Features/Collateral/CollateralBalance/CollateralBalance';
import ReservePool from '../components/Features/ReservePool/ReservePool';
import DebtBalance from '../components/Features/Stability/StabilityPool';
import PageLayout from '../components/Layout/PageLayout';

function Balance() {
  return (
    <PageLayout>
      <CollateralBalance />
      <DebtBalance />
      <ReservePool />
    </PageLayout>
  );
}

export default Balance;
