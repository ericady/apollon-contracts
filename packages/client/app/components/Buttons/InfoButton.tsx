import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Button, Typography } from '@mui/material';

type Props = {
  title: string;
  description: string;
};

function InfoButton({ title, description }: Props) {
  return (
    <div>
      <Button variant="outlined">{title}</Button>
      <Typography
        variant="subtitle1"
        fontSize={12}
        sx={{
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          gap: '5px',
          alignItems: 'center',
          marginTop: '10px',
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: '15px' }} />
        {description}
      </Typography>
    </div>
  );
}

export default InfoButton;
