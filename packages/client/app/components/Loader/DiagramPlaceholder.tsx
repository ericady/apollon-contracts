import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Typography } from '@mui/material';

type Props = {
  fullWidth?: boolean;
};

function DiagramPlaceholder({ fullWidth = false }: Props) {
  return (
    <div
      style={{
        background: '#1e1b27',
        height: '216px',
        width: fullWidth ? '100%' : '320px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          border: '2px solid #3C3945',
          backgroundColor: '#282531',
          borderRadius: 5,
          padding: '3px 10px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <InfoOutlinedIcon sx={{ marginRight: '3px' }} color="primary" fontSize="small" />
        <Typography variant="titleAlternate">No Data to Show</Typography>
      </div>
    </div>
  );
}

export default DiagramPlaceholder;
