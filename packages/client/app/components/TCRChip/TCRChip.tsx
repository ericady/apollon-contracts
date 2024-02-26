import { useQuery } from '@apollo/client';
import { Tooltip, Typography } from '@mui/material';
import Chip from '@mui/material/Chip';
import { GetSystemInfoQuery, GetSystemInfoQueryVariables } from '../../generated/gql-types';
import { GET_SYSTEMINFO } from '../../queries';
import { dangerouslyConvertBigIntToNumber, displayPercentage } from '../../utils/math';

function TCRChip() {
  const { data } = useQuery<GetSystemInfoQuery, GetSystemInfoQueryVariables>(GET_SYSTEMINFO);

  if (!data) return <Chip label="TCR ---%" color="default" />;

  return (
    <Tooltip title="Protocol enters the recovery mode if the TCR falls below 150%, which disables any new token minting and collateral withdrawal.">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '18px' }}>
        {data.getSystemInfo.recoveryModeActive ? (
          <img
            src="assets/svgs/Star24_warning.svg"
            alt="Red colored diamond shape"
            height="11"
            typeof="image/svg+xml"
          />
        ) : (
          <img
            src="assets/svgs/Star24_green.svg"
            alt="Green colored diamond shape"
            height="11"
            typeof="image/svg+xml"
          />
        )}

        <Typography variant="titleAlternate">
          {`TCR ${displayPercentage(dangerouslyConvertBigIntToNumber(data.getSystemInfo.totalCollateralRatio, 9, 9))}`}
        </Typography>
      </div>
    </Tooltip>
  );
}

export default TCRChip;
