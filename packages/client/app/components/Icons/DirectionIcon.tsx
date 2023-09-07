import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { SvgIconProps } from '@mui/material';

type Props = SvgIconProps & {
  showIncrease: boolean;
};

function DirectionIcon({ showIncrease, ...iconProps }: Props) {
  return showIncrease ? (
    <KeyboardArrowUpIcon sx={{ color: 'success.main', ml: '-5px' }} {...iconProps} />
  ) : (
    <KeyboardArrowDownIcon sx={{ color: 'error.main', ml: '-5px' }} {...iconProps} />
  );
}

export default DirectionIcon;
