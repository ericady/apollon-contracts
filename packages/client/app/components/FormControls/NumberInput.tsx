import { SxProps, TextField, TextFieldProps, Theme } from '@mui/material';
import { forwardRef } from 'react';

type Props = TextFieldProps & {
  sx?: SxProps<Theme>;
};

/**
 * Because the web platform can not create a reliable number input ._.
 * TODO: Exchange it with https://mui.com/base-ui/react-number-input/ some wonderful day.
 */
const NumberInput = forwardRef<HTMLInputElement | undefined, Props>((textfieldProps, ref) => {
  return (
    <TextField
      inputRef={ref}
      {...textfieldProps}
      type="number"
      sx={{
        '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
          display: 'none',
        },
        '& input[type=number]': {
          MozAppearance: 'textfield',
        },
        ...textfieldProps.sx,
      }}
    />
  );
});
NumberInput.displayName = 'NumberInput';

export default NumberInput;
