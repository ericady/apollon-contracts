import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Typography } from '@mui/material';

function DiagramPlaceholder() {
  return (
    <div
      style={{
        background: '#1e1b27',
        height: '216px',
        width: '320px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          borderRadius: 5,
          border: '2px solid #3C3945',
          padding: '3px 10px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: '18px', marginRight: '3px' }} />
        <Typography>No Data to Show</Typography>
      </div>
    </div>
  );
}

export default DiagramPlaceholder;
