'use client';

import { createTheme } from '@mui/material/styles';

import '@fontsource/inter';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import '@fontsource/space-grotesk';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';

const PRIMARY_BACKGROUND = '#000000';
const PAPER_BACKGROUND = '#2A2636';
const PRIMARY_TEXT = '#FFFFFF';
const SECONDARY_TEXT = '#827F8B';
const THRID_TEXT = '#504D59';
const DISABLED_TEXT = '#504D59';
const BUTTON_BACKGROUND = '#1E1B27';
const BUTTON_TEXT = '#827F8B';
const BUTTON_BORDER = '#282531';
const BUTTON_2_TEXT = '#ffffff';
const BUTTON_2_BORDER = '#3C3945';
const BUTTON_BACKGROUND_HOVER = '#1D202F';
const GREEN_TEXT = '#66bb6a';
const GREEN_BACKGROUND = '#1A2E25';
const RED_TEXT = '#f44336';
const RED_BACKGROUND = '#321923';

const customButton = {
  contained: {
    backgroundColor: BUTTON_BACKGROUND,
    color: BUTTON_TEXT,
    border: `2px solid ${BUTTON_BORDER}`,
    fontWeight: '700',
    width: '100%',
    height: '32px',
    textTransform: 'none',
    '&:hover': {
      backgroundColor: BUTTON_BACKGROUND_HOVER,
      color: BUTTON_TEXT,
      border: '2px solid transparent',
    },
  },
  outlined: {
    backgroundColor: 'transparent',
    color: BUTTON_2_TEXT,
    border: `2px solid ${BUTTON_2_BORDER}`,
    fontWeight: '700',
    width: '100%',
    height: '40px',
    textTransform: 'none',
    '&:hover': {
      backgroundColor: BUTTON_BACKGROUND_HOVER,
      color: BUTTON_2_TEXT,
      border: '2px solid transparent',
    },
  },
  rounded: {
    backgroundColor: BUTTON_BACKGROUND,
    color: PRIMARY_TEXT,
    border: `2px solid ${BUTTON_BORDER}`,
    fontWeight: '700',
    padding: '0px',
    height: '30px',
    display: 'inline-block',
    textTransform: 'none',
    '&:hover': {
      backgroundColor: BUTTON_BACKGROUND_HOVER,
      color: PRIMARY_TEXT,
      border: '2px solid transparent',
    },
  },
};

const customTypography = {
  body1: {
    color: PRIMARY_TEXT,
    fontWeight: '700',
    fontSize: '14px',
  },
  body2: {
    color: SECONDARY_TEXT,
    fontWeight: '400',
    fontSize: '14px',
  },
  subtitle1: {
    color: THRID_TEXT,
    fontWeight: '700',
    fontSize: '14px',
  },
  subtitle2: {
    color: SECONDARY_TEXT,
    fontWeight: '700',
    fontSize: '14px',
  },
  h6: {
    background: BUTTON_BORDER,
    display: 'inline-block',
    padding: '1px 5px',
    color: SECONDARY_TEXT,
    fontWeight: '700',
    borderRadius: '3px',
    fontSize: '14px',
  },
  greenposition: {
    color: GREEN_TEXT,
    background: GREEN_BACKGROUND,
    display: 'inline-block',
    padding: '1px 5px',
    fontWeight: '700',
    borderRadius: '3px',
    fontSize: '14px',
  },
  redposition: {
    color: RED_TEXT,
    background: RED_BACKGROUND,
    display: 'inline-block',
    padding: '1px 5px',
    fontWeight: '700',
    borderRadius: '3px',
    fontSize: '14px',
  },
};

// const customInputStyles = {
//   input: {
//     border: '1px solid #46434F !important',
//     borderRadius: '5px',
//     maxWidth: '100%',
//     display: 'block !important',
//     color: '#fff',
//     fontWeight: '700',
//   },
// };

const theme = createTheme({
  palette: {
    mode: 'dark', // This specifies the theme as dark mode
    background: {
      default: PRIMARY_BACKGROUND,
      paper: PAPER_BACKGROUND,
    },
    text: {
      primary: PRIMARY_TEXT,
      secondary: SECONDARY_TEXT,
      disabled: DISABLED_TEXT,
    },
    success: {
      main: '#3DD755',
      contrastText: '#1E1B27', // Text color that will be readable against the success color
    },
    error: {
      main: '#E04A4A',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#33B6FF',
      contrastText: '#1E1B27',
    },
    // action: {
    //   active: '#FFFFFF',
    //   hover: '#504D59', // Color when an actionable item is hovered
    //   selected: '#3D3945', // Color when an actionable item is selected
    //   disabledBackground: '#3D3945', // Background color for disabled action items
    //   disabled: '#504D59', // Text color for disabled action items
    // },
  },

  typography: customTypography,
  components: {
    MuiButton: {
      styleOverrides: customButton,
    },

    // MuiTextField: {
    //   styleOverrides: customInputStyles,
    // },

    // MuiTableCell: {
    //   styleOverrides: {
    //     root: {
    //       borderBottom: 'none', // This will remove the border from the TableRow
    //     },
    //   },
    // },
    // MuiTableRow: {
    //   styleOverrides: {
    //     root: {
    //       borderBottom: 'none',
    //     },
    //   },
    // },
  },
});

export default theme;
