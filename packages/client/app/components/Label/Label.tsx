import { Box } from '@mui/material';
import { PropsWithChildren } from 'react';
import { BLUE_BACKGROUND, BUTTON_BORDER, GREEN_BACKGROUND, RED_BACKGROUND, SECONDARY_TEXT } from '../../theme';

type Props = {
  variant: 'success' | 'error' | 'info' | 'none';
};

function Label({ variant, children }: PropsWithChildren<Props>) {
  switch (variant) {
    case 'success':
      return (
        <Box
          sx={{
            color: 'success.main',
            background: GREEN_BACKGROUND,
            display: 'inline-block',
            padding: '1px 5px',
            fontWeight: '700',
            borderRadius: '3px',
            fontSize: '14px',
          }}
        >
          {children}
        </Box>
      );
    case 'error':
      return (
        <Box
          sx={{
            color: 'error.main',
            background: RED_BACKGROUND,
            display: 'inline-block',
            padding: '1px 5px',
            fontWeight: '700',
            borderRadius: '3px',
            fontSize: '14px',
          }}
        >
          {children}
        </Box>
      );
    case 'info':
      return (
        <Box
          sx={{
            color: 'info.main',
            background: BLUE_BACKGROUND,
            display: 'inline-block',
            padding: '1px 5px',
            fontWeight: '700',
            borderRadius: '3px',
            fontSize: '14px',
          }}
        >
          {children}
        </Box>
      );
    case 'none':
      return (
        <Box
          sx={{
            background: BUTTON_BORDER,
            display: 'inline-block',
            padding: '1px 5px',
            color: SECONDARY_TEXT,
            fontWeight: '700',
            borderRadius: '3px',
            fontSize: '14px',
          }}
        >
          {children}
        </Box>
      );

    default:
      const _: never = variant;
  }
}

export default Label;
