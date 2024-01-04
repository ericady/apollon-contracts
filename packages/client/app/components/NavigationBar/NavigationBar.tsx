'use client';

import { PaletteMode, Tab, Tabs, Typography } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dispatch, SetStateAction, SyntheticEvent, useEffect, useState } from 'react';
import ThemeSwitch from '../Buttons/ThemeSwitch';
import EthersAddressLabel from '../EthersAddressLabel/EthersAddressLabel';
import ApollonLogo from '../Icons/ApollonLogo';
import TCRChip from '../TCRChip/TCRChip';

export const ROUTES = ['/balance', '/spot', '/pools', '/'];

type Props = {
  themeMode: PaletteMode;
  setThemeMode: Dispatch<SetStateAction<PaletteMode>>;
};

function NavigationBar({ themeMode, setThemeMode }: Props) {
  const pathname = usePathname();
  const [tabValue, setTabValue] = useState<'/balance' | '/spot' | '/pools'>('/spot');

  const handleChange = (_: SyntheticEvent, newValue: '/balance' | '/spot' | '/pools') => {
    setTabValue(newValue);
  };

  useEffect(() => {
    if (pathname === '/') {
      setTabValue('/spot');
    } else if (pathname !== tabValue && ROUTES.includes(pathname)) {
      setTabValue(pathname as '/balance' | '/spot' | '/pools');
    }
  }, [pathname, setTabValue, tabValue]);

  return (
    <AppBar sx={{ height: 48, boxShadow: 'none' }} position="sticky">
      <Toolbar
        style={{
          minHeight: '48px',
        }}
        sx={{
          backgroundColor: 'background.default',
          borderBottom: '1px solid',
          borderBottomColor: 'background.paper',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div className="apollon-navigation-bar" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/" style={{ height: 30 }}>
              <ApollonLogo />
            </Link>
            <Tabs
              value={tabValue}
              onChange={handleChange}
              sx={{
                '.MuiTabs-flexContainer': { border: 'none' },
              }}
            >
              <Tab
                sx={{ p: 0 }}
                label={
                  <Link href="/balance" style={{ padding: '12px 16px' }}>
                    <Typography
                      variant={pathname === '/balance' ? 'body1' : 'subtitle2'}
                      fontFamily="Space Grotesk Variable"
                    >
                      Balance
                    </Typography>
                  </Link>
                }
                value="/balance"
                disableRipple
              />
              <Tab
                sx={{ p: 0 }}
                label={
                  <Link href="/spot" style={{ padding: '12px 16px' }}>
                    <Typography
                      variant={pathname === '/spot' ? 'body1' : 'subtitle2'}
                      fontFamily="Space Grotesk Variable"
                    >
                      Spot
                    </Typography>
                  </Link>
                }
                value="/spot"
                disableRipple
              />
              <Tab
                sx={{ p: 0 }}
                label={
                  <Link href="/pools" style={{ padding: '12px 16px' }}>
                    <Typography
                      variant={pathname === '/pools' ? 'body1' : 'subtitle2'}
                      fontFamily="Space Grotesk Variable"
                    >
                      Pools
                    </Typography>
                  </Link>
                }
                value="/pools"
                disableRipple
              />
            </Tabs>

            <TCRChip />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <EthersAddressLabel />

            <ThemeSwitch themeMode={themeMode} setThemeMode={setThemeMode} />
          </div>
        </div>
      </Toolbar>
    </AppBar>
  );
}
export default NavigationBar;
