'use client';

import { useQuery } from '@apollo/client';
import CloseIcon from '@mui/icons-material/Close';
import ExpandLessSharpIcon from '@mui/icons-material/ExpandLessSharp';
import { Box, Button, Dialog, DialogContent, DialogContentProps, DialogTitle, IconButton } from '@mui/material';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useEthers } from '../../../context/EthersProvider';
import {
  BorrowerHistoryType,
  GetBorrowerStabilityHistoryQuery,
  GetBorrowerStabilityHistoryQueryVariables,
} from '../../../generated/gql-types';
import { GET_BORROWER_STABILITY_HISTORY } from '../../../queries';
import { BUTTON_BORDER } from '../../../theme';
import { formatUnixTimestamp } from '../../../utils/date';
import { roundCurrency } from '../../../utils/math';
import Label from '../../Label/Label';

const StabilityHistoryDialog = () => {
  const [open, setOpen] = useState(false);

  const { address } = useEthers();

  const { data, fetchMore } = useQuery<GetBorrowerStabilityHistoryQuery, GetBorrowerStabilityHistoryQueryVariables>(
    GET_BORROWER_STABILITY_HISTORY,
    {
      variables: {
        borrower: address,
      },
    },
  );

  const getComponentForBorrowerHistoryType = (
    history: GetBorrowerStabilityHistoryQuery['getBorrowerStabilityHistory']['history'][number],
  ) => {
    switch (history.type) {
      case BorrowerHistoryType.ClaimedRewards:
        return <StabilityClaimedRewards history={history} />;

      case BorrowerHistoryType.Deposited:
        return <StabilityDeposit history={history} />;

      case BorrowerHistoryType.Withdrawn:
        return <StabilityWithdraw history={history} />;

      default:
        const _: never = history.type;
    }
  };

  const handleScroll: DialogContentProps['onScroll'] = (event) => {
    const scrollableDiv = event.target as HTMLDivElement;
    if (scrollableDiv.scrollTop + scrollableDiv.clientHeight >= scrollableDiv.scrollHeight) {
      if (data?.getBorrowerStabilityHistory.pageInfo.hasNextPage) {
        fetchMorePositions();
      }
    }
  };

  const fetchMorePositions = () => {
    fetchMore({
      variables: {
        cursor: data?.getBorrowerStabilityHistory.pageInfo.endCursor,
      },
    });
  };

  if (!data) return null;

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="contained">
        History
      </Button>

      {data && (
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
          <DialogTitle
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'background.default',
              border: '1px solid',
              borderColor: 'background.paper',
              borderBottom: 'none',
            }}
          >
            <div className="flex">
              <img
                src="assets/svgs/Star24_white.svg"
                alt="White colored diamond shape"
                height="11"
                typeof="image/svg+xml"
              />
              <Typography variant="h6" display="inline-block">
                STABILITY PER HISTORY
              </Typography>
            </div>
            <IconButton onClick={() => setOpen(false)}>
              <CloseIcon
                sx={{
                  color: '#64616D',
                }}
              />
            </IconButton>
          </DialogTitle>
          <DialogContent
            onScroll={handleScroll}
            sx={{
              p: 0,
              backgroundColor: 'background.default',
              border: '1px solid',
              borderColor: 'background.paper',
            }}
          >
            {data.getBorrowerStabilityHistory.history.map((history, index) => (
              <div
                style={{
                  borderBottom:
                    index === data.getBorrowerStabilityHistory.pageInfo.totalCount - 1
                      ? 'none'
                      : `1px solid ${BUTTON_BORDER}`,
                  padding: '20px',
                }}
                key={index}
              >
                {getComponentForBorrowerHistoryType(history)}
              </div>
            ))}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

type StabilityWidgetProps = {
  history: GetBorrowerStabilityHistoryQuery['getBorrowerStabilityHistory']['history'][number];
};

function StabilityClaimedRewards({ history }: StabilityWidgetProps) {
  const lostTokens = history.values.filter((reward) => reward.amount < 0);
  const gainedTokens = history.values.filter((reward) => reward.amount > 0);

  return (
    <>
      <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '20px' }}>
        <div className="flex">
          <Typography variant="titleAlternate" color="primary.contrastText">
            {formatUnixTimestamp(history.timestamp, false)}
          </Typography>
        </div>

        <Label variant="success">Claimed Collateral</Label>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 120, gap: 20 }}>
          {lostTokens.map(({ token, amount }) => (
            <div className="flex" key={token.address}>
              <Typography fontWeight={400}>{roundCurrency(amount, 5)}</Typography>
              <Label variant="none">{token.symbol}</Label>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <Box
            sx={{
              backgroundColor: 'info.background',
              border: '1px solid',
              borderColor: 'info.main',
              padding: '10px',
              width: 170,
            }}
          >
            <Typography
              className="flex"
              variant="titleAlternate"
              color="info.main"
              fontWeight={400}
              sx={{ gap: '5px', justifyContent: 'end' }}
            >
              + {roundCurrency(history.resultInUSD - history.claimInUSD!)} $
              <ExpandLessSharpIcon sx={{ color: 'info.main' }} />
            </Typography>
          </Box>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {gainedTokens.map(({ token, amount }) => (
            <div className="flex" style={{ justifyContent: 'end' }} key={token.address}>
              <Typography fontWeight={400}>{roundCurrency(amount, 5)}</Typography>
              <Label variant="none">{token.symbol}</Label>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function StabilityDeposit({ history }: StabilityWidgetProps) {
  return (
    <>
      <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '20px' }}>
        <div className="flex">
          <Typography variant="titleAlternate" color="primary.contrastText">
            {formatUnixTimestamp(history.timestamp, false)}
          </Typography>
        </div>

        <Label variant="none">Deposited token</Label>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {history.values.map(({ amount, token }) => (
          <div className="flex" style={{ width: '100%', justifyContent: 'end' }} key={token.address}>
            <Typography fontWeight={400}>{roundCurrency(amount, 5)}</Typography>
            <Label variant="none">{token.symbol}</Label>
          </div>
        ))}
      </div>
    </>
  );
}

function StabilityWithdraw({ history }: StabilityWidgetProps) {
  return (
    <>
      <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '20px' }}>
        <div className="flex">
          <Typography variant="titleAlternate" color="primary.contrastText">
            {formatUnixTimestamp(history.timestamp, false)}
          </Typography>
        </div>

        <Label variant="info">Withdrawn token</Label>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {history.values.map(({ amount, token }) => (
          <div className="flex" style={{ width: '100%', justifyContent: 'end' }} key={token.address}>
            <Typography fontWeight={400}>{roundCurrency(amount, 5)}</Typography>
            <Label variant="none">{token.symbol}</Label>
          </div>
        ))}
      </div>
    </>
  );
}

export default StabilityHistoryDialog;
