import { useQuery } from '@tanstack/react-query';
import { useRootStore } from 'src/store/root';

interface LimitOrderResponse {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
  orders: LimitOrder[];
}

interface LimitOrder {
  expiry: number;
  createdAt: number;
  updatedAt: number;
  transactionHash: string | null;
  chaindId: number;
  maker: string;
  taker: string;
  makerAsset: string;
  takerAsset: string;
  makerAmount: string;
  takerAmount: string;
  state: 'PENDING' | 'FILLED' | 'CANCELLED'; // TODO: check all states
}

export const useLimitOrders = (chainId: number) => {
  const user = useRootStore((state) => state.account);
  return useQuery({
    queryFn: async () => {
      const result = await fetch(`https://api.paraswap.io/ft/orders/${chainId}/maker/${user}`);
      const data = await result.json();
      return data;
    },
    queryKey: ['limitOrders', user],
    enabled: !!user,
  });
};
