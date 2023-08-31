'use client';

import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { PropsWithChildren, ReactNode } from 'react';

type Props = {
  title: string;
  isDraggable?: boolean;
  noPadding?: boolean;
  border?: boolean;
  icon?: ReactNode;
  headBorder?: 'full' | 'bottom';
  underline?: boolean;
};

function FeatureBox({
  title,
  isDraggable = false,
  noPadding = false,
  headBorder = undefined,
  border = false,
  icon = <StarBorderIcon fontSize="small" />,
  children,
}: PropsWithChildren<Props>) {
  return (
    <Box
      sx={{
        border: border ? '1px solid' : 'none',
        borderBottom: '1px solid',
        borderColor: 'background.paper',
        width: '100%',
        p: noPadding ? 0 : 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 2,
          border: headBorder === 'full' ? '1px solid' : 'none',
          borderBottom: headBorder === 'bottom' ? '1px solid' : 'none',
          borderColor: headBorder ? 'background.paper' : 'none',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            pt: noPadding ? 2 : 0,
            pl: noPadding ? 2 : 0,
          }}
        >
          {icon}
          <Typography variant="subtitle2" component="h5" textTransform="uppercase">
            {title}
          </Typography>
        </Box>

        {isDraggable && (
          <DragIndicatorIcon
            sx={{
              color: '#64616D',
            }}
          />
        )}
      </Box>

      {children}
    </Box>
  );
}

export default FeatureBox;
