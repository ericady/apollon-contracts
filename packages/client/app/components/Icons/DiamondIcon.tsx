import { useTheme } from '@mui/material';

function DiamondIcon() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return isDarkMode ? (
    <img src="assets/svgs/Star24_white.svg" alt="White colored diamond shape" height="11" typeof="image/svg+xml" />
  ) : (
    <img src="assets/svgs/Star24_black.svg" alt="Black colored diamond shape" height="11" typeof="image/svg+xml" />
  );
}

export default DiamondIcon;
