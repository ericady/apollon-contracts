import { useQuery } from '@apollo/client';
import Chip from '@mui/material/Chip';
import { GetSystemInfoQuery, GetSystemInfoQueryVariables } from '../../generated/gql-types';
import { GET_SYSTEMINFO } from '../../queries';
import { displayPercentage } from '../../utils/math';

function TCRChip() {
  const { data } = useQuery<GetSystemInfoQuery, GetSystemInfoQueryVariables>(GET_SYSTEMINFO);

  if (!data) return <Chip label="TCR ---%" color="info" />;

  return (
    <Chip
      title={`TCR ${displayPercentage(data.getSystemInfo.totalCollateralRatio)}`}
      color={data.getSystemInfo.recoveryModeActive ? 'warning' : 'info'}
    />
  );
}

export default TCRChip;
