import { useMutation } from '@tanstack/react-query';
import { getParaswapLimitOrder } from './common';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { BuildLimitOrderInput, LimitOrderToSend } from '@paraswap/sdk';

export const useLimitOrder = (chainId: number) => {
  const { provider, currentAccount } = useWeb3Context();

  return useMutation({
    mutationFn: async (order: BuildLimitOrderInput) => {
      if (!provider || !currentAccount) {
        throw new Error('No provider or account');
      }

      const paraswap = getParaswapLimitOrder(chainId, currentAccount, provider);
      const signableOrderData = await paraswap.buildLimitOrder(order);
      console.log('signableOrderData', signableOrderData);
      const signature = await paraswap.signLimitOrder(signableOrderData);
      console.log('signature', signature);

      const orderToSend: LimitOrderToSend = {
        ...signableOrderData.data,
        signature,
      };

      const newOrder = await paraswap.postLimitOrder(orderToSend);
      console.log('newOrder', newOrder);
    },
  });
};
