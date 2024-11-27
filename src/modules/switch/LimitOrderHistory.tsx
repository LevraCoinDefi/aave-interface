import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useLimitOrders } from './useLimitOrders';

export const LimitOrderHistory = ({ chainId }: { chainId: number }) => {
  const { data } = useLimitOrders(chainId);
  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <TableContainer sx={{ width: '500px' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Sell Asset</TableCell>
            <TableCell>Receive Asset</TableCell>
            <TableCell>Sell Amount</TableCell>
            <TableCell>Receive Amount</TableCell>
            <TableCell>State</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.orders.map((order) => (
            <TableRow key={order.transactionHash}>
              <TableCell>{order.makerAsset}</TableCell>
              <TableCell>{order.takerAsset}</TableCell>
              <TableCell>{order.makerAmount}</TableCell>
              <TableCell>{order.takerAmount}</TableCell>
              <TableCell>{order.state}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
