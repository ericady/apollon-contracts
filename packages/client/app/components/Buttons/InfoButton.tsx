import { Button, Typography } from '@mui/material';

type Props = {
  title: string;
  description: string;
  disabled?: boolean;
};

function InfoButton({ title, description, disabled = false }: Props) {
  return (
    <div>
      <Button variant="outlined" type="submit" disabled={disabled}>
        {title}
      </Button>
      <Typography
        variant="hint"
        sx={{
          display: 'flex',
          textAlign: 'center',
          justifyContent: 'center',
          gap: '5px',
          alignItems: 'center',
          marginTop: '6px',
        }}
      >
        <img
          src="assets/svgs/Info.svg"
          alt="an lower case i info icon with a rounded square"
          height="16"
          typeof="image/svg+xml"
        />

        {description}
      </Typography>
    </div>
  );
}

export default InfoButton;
