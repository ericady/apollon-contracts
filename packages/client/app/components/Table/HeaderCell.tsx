import { Tooltip } from '@mui/material';
import TableCell from '@mui/material/TableCell';
import { ComponentProps } from 'react';

type Props = {
  title: string;
  cellProps?: ComponentProps<typeof TableCell>;
  tooltipProps?: Omit<ComponentProps<typeof Tooltip>, 'children'>;
};

function HeaderCell({ title, cellProps = {}, tooltipProps }: Props) {
  return (
    <TableCell
      {...cellProps}
      sx={{
        ...cellProps.sx,
        color: 'text.disabled',
        font: '14.3px Space Grotesk Variable',
        fontWeight: 700,
        borderColor: 'background.paper',
      }}
    >
      {tooltipProps ? (
        <Tooltip
          {...tooltipProps}
          title={tooltipProps.title}
          sx={{ backgroundColor: 'background.emphasis', ...tooltipProps.sx }}
        >
          <span>{title}</span>
        </Tooltip>
      ) : (
        title
      )}
    </TableCell>
  );
}

export default HeaderCell;
