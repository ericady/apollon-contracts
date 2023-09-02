import { Box, Typography } from '@mui/material';
import { PropsWithChildren } from 'react';
import { BUTTON_BORDER, SECONDARY_TEXT } from '../../theme';

type Props = {
  variant: 'success' | 'error' | 'info' | 'none';
};

function Label({ variant, children }: PropsWithChildren<Props>) {
  switch (variant) {
    case 'success':
      return (
        <div style={{ display: 'inline-block' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: BUTTON_BORDER,
              padding: '2px 5px',
              color: SECONDARY_TEXT,
              borderRadius: '3px',
            }}
          >
            <Typography variant="titleAlternate">{children}</Typography>
          </Box>
        </div>
      );
    case 'error':
      return (
        <div style={{ display: 'inline-block' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: BUTTON_BORDER,
              padding: '2px 5px',
              color: SECONDARY_TEXT,
              borderRadius: '3px',
            }}
          >
            <Typography variant="titleAlternate">{children}</Typography>
          </Box>
        </div>
      );
    case 'info':
      return (
        <div style={{ display: 'inline-block' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: BUTTON_BORDER,
              padding: '2px 5px',
              color: SECONDARY_TEXT,
              borderRadius: '3px',
            }}
          >
            <Typography variant="titleAlternate">{children}</Typography>
          </Box>
        </div>
      );
    case 'none':
      return (
        <div style={{ display: 'inline-block' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: BUTTON_BORDER,
              padding: '2px 5px',
              color: SECONDARY_TEXT,
              borderRadius: '3px',
            }}
          >
            <Typography variant="titleAlternate">{children}</Typography>
          </Box>
        </div>
      );

    default:
      const _: never = variant;
  }
}

export default Label;
