import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import { MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { useEffect, useState } from 'react';
import { NETWORKS, useEthers } from '../../context/EthersProvider';

function NetworkSwitch() {
  const [currentNetwork, setCurrentNetwork] = useState<(typeof NETWORKS)[number]>(NETWORKS[0]);

  const { provider } = useEthers();

  const handleChange = async (event: SelectChangeEvent<(typeof NETWORKS)[number]['chainName']>) => {
    const choosenNetwork = NETWORKS.find((network) => network.chainName === event.target.value)!;
    const { blockExplorerUrls, chainId, chainName, nativeCurrency, rpcUrls } = choosenNetwork;

    if (typeof window.ethereum !== 'undefined') {
      window.ethereum
        .request({
          method: 'wallet_switchEthereumChain',
          params: [
            {
              // All params must be provided to make it work
              chainId,
            },
          ],
        })

        .then(() => {
          setCurrentNetwork(choosenNetwork);
        })
        .catch(() => {
          if (typeof window.ethereum !== 'undefined') {
            window.ethereum
              .request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    // All params must be provided to make it work
                    chainId,
                    rpcUrls,
                    chainName,
                    nativeCurrency,
                    blockExplorerUrls,
                  },
                ],
              })
              .then(() => {
                setCurrentNetwork(choosenNetwork);
              });
          }
        });
    }
  };

  useEffect(() => {
    const handleNetworkChange = (chainId: string) => {
      const currentNetwork = NETWORKS.find((network) => network.chainId === chainId);

      if (currentNetwork) {
        setCurrentNetwork(currentNetwork);
      }
    };

    if (typeof window.ethereum !== 'undefined') {
      // Update Switch on manual network change.
      window.ethereum.on('chainChanged', handleNetworkChange);

      // Get current network once and set switch initially
      provider.getNetwork().then((currentNetwork) => {
        const network = NETWORKS.find((network) => network.chainIdNumber === Number(currentNetwork.chainId));
        if (network) {
          setCurrentNetwork(network);
        }
      });
    }

    // Cleanup the listener when the component unmounts
    return () => {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeListener('chainChanged', handleNetworkChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Select
      value={currentNetwork.chainName}
      onChange={handleChange}
      variant="outlined"
      IconComponent={ArrowDropDownRoundedIcon}
      sx={{
        height: '32px',
        fontFamily: 'Space Grotesk Variable',
        fontSize: '14.3px',
        fontWeight: '700',
        color: 'text.secondary',

        backgroundColor: 'background.emphasis',
        border: 'background.emphasis',
        '& .MuiOutlinedInput-notchedOutline.MuiOutlinedInput-notchedOutline': {
          borderWidth: 0,
        },
      }}
    >
      {NETWORKS.map((network) => (
        <MenuItem
          value={network.chainName}
          key={network.chainName}
          sx={{
            fontFamily: 'Space Grotesk Variable',
            fontSize: '14.3px',
            fontWeight: '700',
            color: 'text.secondary',
            height: '32px',
          }}
        >
          {network.chainName}
        </MenuItem>
      ))}
    </Select>
  );
}

export default NetworkSwitch;
