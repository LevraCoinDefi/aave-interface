import { BigNumber } from 'bignumber.js';
import { Trans } from '@lingui/macro';
import { Box, Button, Stack, Typography } from '@mui/material';
import { debounce } from 'lodash';
import { useMemo, useState } from 'react';
import { SwitchAssetInput } from 'src/components/transactions/Switch/SwitchAssetInput';
import { TokenInfoWithBalance } from 'src/hooks/generic/useTokensBalance';
import { useParaswapSellRates } from 'src/hooks/paraswap/useParaswapRates';
import { useRootStore } from 'src/store/root';
import { TxErrorType } from 'src/ui-config/errorMapping';
import { getNetworkConfig } from 'src/utils/marketsAndNetworksConfig';

import { AssetInput } from 'src/components/transactions/AssetInput';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { LimitOrderActions } from './LimitOrderActions';

export interface LimitOrderProps {
  selectedChainId: number;
  tokens: TokenInfoWithBalance[];
  defaultInputToken: TokenInfoWithBalance;
  defaultOutputToken: TokenInfoWithBalance;
  addNewToken: (token: TokenInfoWithBalance) => Promise<void>;
}

export const LimitOrder = ({
  selectedChainId,
  tokens,
  defaultInputToken,
  defaultOutputToken,
  addNewToken,
}: LimitOrderProps) => {
  const [selectedInputToken, setSelectedInputToken] = useState(defaultInputToken);
  const [selectedOutputToken, setSelectedOutputToken] = useState(defaultOutputToken);
  const [debounceInputAmount, setDebounceInputAmount] = useState('');
  const [inputAmount, setInputAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [txError, setTxError] = useState<TxErrorType | undefined>(undefined);
  const user = useRootStore((store) => store.account);

  const selectedNetworkConfig = getNetworkConfig(selectedChainId);

  const {
    data: sellRates,
    error: ratesError,
    isFetching: ratesLoading,
  } = useParaswapSellRates({
    chainId: selectedNetworkConfig.underlyingChainId ?? selectedChainId,
    amount: parseUnits('1', selectedInputToken.decimals).toString(), // TODO: need to adjust amount here based on asset. Intention is to get a rate using a small amount to minimize slippage/price impact
    srcToken: selectedInputToken.address,
    srcDecimals: selectedInputToken.decimals,
    destToken: selectedOutputToken.address,
    destDecimals: selectedOutputToken.decimals,
    user,
    options: {
      partner: 'aave-widget',
    },
  });

  console.log(sellRates);

  let amountToReceive = '';
  if (inputAmount !== '' && !ratesLoading && !ratesError && limitPrice) {
    const sellAmount = parseUnits(inputAmount, selectedInputToken.decimals);
    console.log(sellAmount.toString());
    const limitPriceBN = parseUnits(limitPrice, selectedOutputToken.decimals);
    console.log(limitPriceBN.toString());
    amountToReceive = sellAmount.mul(limitPriceBN).toString();
    console.log(amountToReceive);
    amountToReceive = formatUnits(
      amountToReceive,
      selectedOutputToken.decimals + selectedInputToken.decimals
    );
  }

  const handleSetLimitPrice = (percentageRelativeToMarketRate?: number) => {
    if (sellRates) {
      if (!percentageRelativeToMarketRate) {
        setLimitPrice(formatUnits(sellRates.destAmount, sellRates.destDecimals));
        return;
      }

      const limitPrice = BigNumber(sellRates.destAmount)
        .multipliedBy(1 + percentageRelativeToMarketRate / 100)
        .toFixed(0);

      setLimitPrice(formatUnits(limitPrice, sellRates.destDecimals));
    }
  };

  const handleInputChange = (value: string) => {
    setTxError(undefined);
    if (value === '-1') {
      setInputAmount(selectedInputToken.balance);
      debouncedInputChange(selectedInputToken.balance);
    } else {
      setInputAmount(value);
      debouncedInputChange(value);
    }
  };

  const debouncedInputChange = useMemo(() => {
    return debounce((value: string) => {
      setDebounceInputAmount(value);
    }, 300);
  }, [setDebounceInputAmount]);

  const handleSelectedInputToken = (token: TokenInfoWithBalance) => {
    if (!tokens.find((t) => t.address === token.address)) {
      addNewToken(token).then(() => {
        setSelectedInputToken(token);
        setTxError(undefined);
      });
    } else {
      setSelectedInputToken(token);
      setTxError(undefined);
    }
  };

  const handleSelectedOutputToken = (token: TokenInfoWithBalance) => {
    if (!tokens.find((t) => t.address === token.address)) {
      addNewToken(token).then(() => {
        setSelectedOutputToken(token);
        setTxError(undefined);
      });
    } else {
      setSelectedOutputToken(token);
      setTxError(undefined);
    }
  };

  return (
    <>
      <SwitchAssetInput
        chainId={selectedChainId}
        assets={tokens.filter((token) => token.address !== selectedOutputToken.address)}
        value={inputAmount}
        onChange={handleInputChange}
        usdValue={sellRates?.srcUSD || '0'}
        onSelect={handleSelectedInputToken}
        selectedAsset={selectedInputToken}
        inputTitle={<Trans>Sell Amount</Trans>}
      />
      <AssetInput
        value={limitPrice}
        onChange={(value) => setLimitPrice(value)}
        symbol={selectedOutputToken.symbol}
        usdValue="0"
        assets={[
          {
            symbol: selectedOutputToken.symbol,
            balance: '0',
          },
        ]}
        inputTitle={<Trans>When 1 {selectedInputToken.symbol} is worth</Trans>}
      />
      <Stack direction="row" spacing={2} justifyContent="center">
        <Button size="small" variant="outlined" onClick={() => handleSetLimitPrice()}>
          Use Market Rate
        </Button>
        <Button size="small" variant="outlined" onClick={() => handleSetLimitPrice(5)}>
          +5%
        </Button>
        <Button size="small" variant="outlined" onClick={() => handleSetLimitPrice(10)}>
          +10%
        </Button>
      </Stack>
      <SwitchAssetInput
        chainId={selectedChainId}
        assets={tokens.filter((token) => token.address !== selectedInputToken.address)}
        value={amountToReceive}
        usdValue={sellRates?.destUSD || '0'}
        loading={
          debounceInputAmount !== '0' && debounceInputAmount !== '' && ratesLoading && !ratesError
        }
        onSelect={handleSelectedOutputToken}
        disableInput={true}
        selectedAsset={selectedOutputToken}
        inputTitle={<Trans>Receive</Trans>}
      />
      {txError && (
        <Box mt={2}>
          <Typography color="error">TODO</Typography>
        </Box>
      )}
      <LimitOrderActions
        sellAsset={selectedInputToken.address}
        sellAssetSymbol={selectedInputToken.symbol}
        amountToSell={inputAmount}
        sellAssetDecimals={selectedInputToken.decimals}
        receiveAsset={selectedOutputToken.address}
        receiveAmount={amountToReceive}
        receiveAssetDecimals={selectedOutputToken.decimals}
        chainId={selectedChainId}
        blocked={false}
        loading={false}
        isWrongNetwork={false}
      />
    </>
  );
};
