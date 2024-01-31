import { useQuery } from '@apollo/client';
import { Tooltip } from '@mui/material';
import Chip from '@mui/material/Chip';
import { GetSystemInfoQuery, GetSystemInfoQueryVariables } from '../../generated/gql-types';
import { GET_SYSTEMINFO } from '../../queries';
import { dangerouslyConvertBigIntToNumber, displayPercentage } from '../../utils/math';

function TCRChip() {
  const { data } = useQuery<GetSystemInfoQuery, GetSystemInfoQueryVariables>(GET_SYSTEMINFO);

  if (!data) return <Chip label="TCR ---%" color="default" />;

  return (
    <Tooltip title="Protocol enters the recovery mode if the TCR falls below 150%, which disables any new token minting and collateral withdrawal.">
      <Chip
        label={`TCR ${displayPercentage(
          dangerouslyConvertBigIntToNumber(data.getSystemInfo.totalCollateralRatio, 9, 9),
        )}`}
        color={data.getSystemInfo.recoveryModeActive ? 'warning' : 'default'}
      />
    </Tooltip>
  );
}

export default TCRChip;
