'use client';

import StarBorderIcon from '@mui/icons-material/StarBorder';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { PropsWithChildren, ReactNode } from 'react';

type Props = {
  title: string;
  icon?: ReactNode;
};

function FeatureBox({ title, icon = <StarBorderIcon />, children }: PropsWithChildren<Props>) {
  return (
    <Box sx={{ borderBottom: '1px solid', borderBottomColor: 'background.paper' }}>
      <Box sx={{ m: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}

          <Typography>{title}</Typography>
        </Box>
      </Box>

      {children}
    </Box>
  );
}

export default FeatureBox;
