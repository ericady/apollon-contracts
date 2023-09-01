'use client';

import { Button, Typography } from '@mui/material';
import { useEthers } from '../../context/EthersProvider';

function EthersAddressLabel() {
  const { address, connectWallet } = useEthers();

  return address ? (
    <div className="flex">
      <img src="assets/svgs/Star24.svg" alt="Green colored diamond shape" height="8" typeof="image/svg+xml" />

      <Typography fontSize={12} variant="subtitle2">
        {address}
      </Typography>
    </div>
  ) : (
    <Button
      onClick={connectWallet}
      sx={{ width: 170, height: 32, borderColor: 'primary.contrastText' }}
      size="small"
      variant="outlined"
    >
      Connect Wallet
    </Button>
  );
}

export default EthersAddressLabel;
