import TableCell from '@mui/material/TableCell';

type Props = {
  title: string;
  cellProps?: React.ComponentProps<typeof TableCell>;
};

function HeaderCell({ title, cellProps = {} }: Props) {
  return (
    <TableCell sx={{ color: 'text.disabled' }} {...cellProps}>
      {title}
    </TableCell>
  );
}

export default HeaderCell;
