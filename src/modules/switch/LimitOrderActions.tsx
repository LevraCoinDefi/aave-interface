import { Trans } from '@lingui/macro';
import { useQueryClient } from '@tanstack/react-query';
import { parseUnits } from 'ethers/lib/utils';
import { TxActionsWrapper } from 'src/components/transactions/TxActionsWrapper';
import { checkRequiresApproval } from 'src/components/transactions/utils';
import { useLimitOrder } from 'src/hooks/paraswap/useLimitOrder';
import { useApprovalTx } from 'src/hooks/useApprovalTx';
import { useApprovedAmount } from 'src/hooks/useApprovedAmount';
import { useModalContext } from 'src/hooks/useModal';
import { useRootStore } from 'src/store/root';

export interface LimitOrderActionProps {
  sellAsset: string;
  sellAssetSymbol: string;
  sellAssetDecimals: number;
  amountToSell: string;
  receiveAsset: string;
  receiveAmount: string;
  receiveAssetDecimals: number;
  chainId: number;
  blocked: boolean;
  loading: boolean;
  isWrongNetwork: boolean;
}

const AugustsRFQMap: { [chainId: number]: string } = {
  1: '0xe92b586627ccA7a83dC919cc7127196d70f55a06',
  137: '0xF3CD476C3C4D3Ac5cA2724767f269070CA09A043',
};

export const LimitOrderActions = ({
  sellAsset,
  sellAssetSymbol,
  amountToSell,
  sellAssetDecimals,
  receiveAsset,
  receiveAmount,
  receiveAssetDecimals,
  chainId,
  blocked,
  loading,
  isWrongNetwork,
}: LimitOrderActionProps) => {
  const {
    approvalTxState,
    mainTxState,
    loadingTxns,
    setLoadingTxns,
    setApprovalTxState,
    setMainTxState,
    setGasLimit,
    setTxError,
  } = useModalContext();
  const queryClient = useQueryClient();
  const [user] = useRootStore((state) => [state.account]);
  const { mutateAsync: buildLimitOrder } = useLimitOrder(chainId);

  const permitAvailable = false; // TODO check if permit is supported

  const {
    data: approvedAmount,
    refetch: fetchApprovedAmount,
    isFetching: fetchingApprovedAmount,
    isFetchedAfterMount,
  } = useApprovedAmount({
    chainId,
    token: sellAsset,
    spender: AugustsRFQMap[chainId],
  });

  const requiresApproval =
    Number(amountToSell) !== 0 &&
    checkRequiresApproval({
      approvedAmount: approvedAmount ? approvedAmount.toString() : '0',
      amount: amountToSell,
      signedAmount: '0',
    });

  const { approval } = useApprovalTx({
    usePermit: false,
    approvedAmount: {
      amount: approvedAmount?.toString() || '0',
      user: user,
      token: sellAsset,
      spender: AugustsRFQMap[chainId],
    },
    requiresApproval,
    assetAddress: sellAsset,
    symbol: sellAssetSymbol,
    decimals: 18, // TODO
    signatureAmount: '', // TODO
    onApprovalTxConfirmed: fetchApprovedAmount,
  });

  if (requiresApproval && approvalTxState?.success) {
    // There was a successful approval tx, but the approval amount is not enough.
    // Clear the state to prompt for another approval.
    setApprovalTxState({});
  }

  const action = async () => {
    console.log('action');
    try {
      const tx = await buildLimitOrder({
        maker: user,
        expiry: 1732834671, // TODO
        makerAsset: sellAsset,
        takerAsset: receiveAsset,
        makerAmount: parseUnits(amountToSell, sellAssetDecimals).toString(),
        takerAmount: parseUnits(receiveAmount, receiveAssetDecimals).toString(),
      });
      console.log(tx);
      queryClient.invalidateQueries({ queryKey: ['limitOrders'] });
    } catch (e) {
      console.error(e);
      setTxError(e.message);
    }
  };

  return (
    <TxActionsWrapper
      blocked={blocked}
      mainTxState={mainTxState}
      approvalTxState={approvalTxState}
      isWrongNetwork={isWrongNetwork}
      requiresAmount
      amount={amountToSell}
      symbol={sellAssetSymbol}
      preparingTransactions={loading}
      actionText={<Trans>Limit Order {sellAssetSymbol}</Trans>}
      actionInProgressText={<Trans>TODOing {sellAssetSymbol}</Trans>}
      handleApproval={approval}
      handleAction={action}
      requiresApproval={requiresApproval}
      tryPermit={permitAvailable}
    />
  );
};
