import CollateralBalance from '../components/Features/Collateral/CollateralBalance';
import DebtBalance from '../components/Features/DebtBalance/DebtBalance';
import PageLayout from '../components/Layout/PageLayout';

function Balance() {
  return (
    <PageLayout>
      <CollateralBalance />
      <DebtBalance />
    </PageLayout>
  );
}

export default Balance;
