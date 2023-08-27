'use client';

import { Typography } from '@mui/material';
import { useEthers } from '../../context/EthersProvider';

function EthersAddressLabel() {
  const { address, connectWallet } = useEthers();

  //   TODO: remove connectWallet once there is a login screen
  return (
    <div onClick={() => connectWallet()} className="flex">
      <img src="assets/svgs/Star24.svg" alt="Green colored diamond shape" height="8" typeof="image/svg+xml" />

      <Typography variant="body2">{address}</Typography>
    </div>
  );
}

export default EthersAddressLabel;
