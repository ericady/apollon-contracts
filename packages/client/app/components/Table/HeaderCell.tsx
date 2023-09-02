import TableCell from '@mui/material/TableCell';

type Props = {
  title: string;
  cellProps?: React.ComponentProps<typeof TableCell>;
};

function HeaderCell({ title, cellProps = {} }: Props) {
  return (
    <TableCell
      sx={{
        color: 'text.disabled',
        font: '14.3px Space Grotesk Variable',
        fontWeight: 700,
        borderColor: 'background.paper',
      }}
      {...cellProps}
    >
      {title}
    </TableCell>
  );
}

export default HeaderCell;
