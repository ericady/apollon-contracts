'use client';

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark', // This specifies the theme as dark mode
    background: {
      default: '#1E1B27',
      paper: '#2A2636', // Slightly lighter background for elevated components
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#827F8B',
      disabled: '#504D59',
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
    action: {
      active: '#FFFFFF',
      hover: '#504D59', // Color when an actionable item is hovered
      selected: '#3D3945', // Color when an actionable item is selected
      disabledBackground: '#3D3945', // Background color for disabled action items
      disabled: '#504D59', // Text color for disabled action items
    },
  },
  components: {
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: 'none', // This will remove the border from the TableRow
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          borderBottom: 'none',
        },
      },
    },
  },
});

export default theme;
