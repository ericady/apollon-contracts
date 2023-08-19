'use client';

import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function NavigationBar() {
  const pathname = usePathname();

  return (
    <AppBar position="static">
      <Toolbar>
        <img src="assets/svgs/Apollon_logo_negative.svg" alt="Apollon Logo" height="30" typeof="image/svg+xml" />

        <Button
          href="/balance"
          LinkComponent={Link}
          style={pathname === '/balance' ? { textDecoration: 'underline', marginLeft: 32 } : { marginLeft: 32 }}
        >
          Balance
        </Button>
        <Button
          href="/spot"
          LinkComponent={Link}
          style={pathname === '/spot' ? { textDecoration: 'underline', marginLeft: 32 } : { marginLeft: 32 }}
        >
          Spot
        </Button>
        <Button
          href="/pools"
          LinkComponent={Link}
          style={pathname === '/pools' ? { textDecoration: 'underline', marginLeft: 32 } : { marginLeft: 32 }}
        >
          Pools
        </Button>
      </Toolbar>
    </AppBar>
  );
}
export default NavigationBar;
