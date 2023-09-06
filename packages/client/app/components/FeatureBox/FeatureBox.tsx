'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { PropsWithChildren } from 'react';

type Props = {
  title: string;
  isDraggable?: boolean;
  noPadding?: boolean;
  borderRadius?: boolean;
  border?: 'full' | 'bottom';
  icon?: 'green' | 'neutral';
  headBorder?: 'full' | 'bottom';
  underline?: boolean;
};

function FeatureBox({
  title,
  isDraggable = false,
  noPadding = false,
  headBorder = undefined,
  borderRadius = false,
  border = undefined,
  icon = 'neutral',
  children,
}: PropsWithChildren<Props>) {
  return (
    <Box
      sx={{
        border: border === 'full' ? '1px solid' : 'none',
        borderBottom: border ? '1px solid' : 'none',
        borderColor: 'background.paper',
        borderRadius: borderRadius ? 1 : 0,
        width: '100%',
        p: noPadding ? 0 : 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1.25,
          border: headBorder === 'full' ? '1px solid' : 'none',
          borderBottom: headBorder === 'bottom' || headBorder === 'full' ? '1px solid' : 'none',
          borderColor: headBorder ? 'background.paper' : 'none',
          pt: noPadding ? 2 : 0,
          pl: noPadding ? 2 : 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          {icon === 'green' ? (
            <img
              src="assets/svgs/Star24_green.svg"
              alt="Green colored diamond shape"
              height="11"
              typeof="image/svg+xml"
            />
          ) : (
            <img
              src="assets/svgs/Star24_white.svg"
              alt="White colored diamond shape"
              height="11"
              typeof="image/svg+xml"
            />
          )}
          <Typography variant="titleAlternate" component="h5" textTransform="uppercase">
            {title}
          </Typography>
        </Box>

        {isDraggable && (
          <img
            style={{ paddingRight: 16 }}
            src="assets/svgs/Drag-n-Drop.svg"
            alt="Green colored diamond shape"
            height="21"
            typeof="image/svg+xml"
          />
        )}
      </Box>

      {children}
    </Box>
  );
}

export default FeatureBox;
