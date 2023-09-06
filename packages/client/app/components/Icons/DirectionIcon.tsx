import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

type Props = {
  showIncrease: boolean;
};

function DirectionIcon({ showIncrease }: Props) {
  return showIncrease ? (
    <KeyboardArrowUpIcon sx={{ color: 'success.main', ml: '-5px' }} />
  ) : (
    <KeyboardArrowDownIcon sx={{ color: 'error.main', ml: '-5px' }} />
  );
}

export default DirectionIcon;
