import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useTheme } from '@mui/material';

function ForwardIcon() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return <ArrowForwardIosIcon sx={{ color: isDarkMode ? '#46434F' : '#AEAEAE', fontSize: '18px' }} />;
}

export default ForwardIcon;
