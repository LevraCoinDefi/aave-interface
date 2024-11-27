import { AaveV3Ethereum } from '@bgd-labs/aave-address-book';
import { Trans } from '@lingui/macro';
import { Box, Divider, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import StyledToggleButton from 'src/components/StyledToggleButton';
import StyledToggleButtonGroup from 'src/components/StyledToggleButtonGroup';
import { supportedNetworksWithEnabledMarket } from 'src/components/transactions/Switch/common';
import { SwitchModalContent } from 'src/components/transactions/Switch/SwitchModalContent';
import { TokenInfoWithBalance, useTokensBalance } from 'src/hooks/generic/useTokensBalance';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useRootStore } from 'src/store/root';
import { CustomMarket, marketsData } from 'src/ui-config/marketsConfig';
import { queryKeysFactory } from 'src/ui-config/queries';
import { TOKEN_LIST, TokenInfo } from 'src/ui-config/TokenList';
import { getNetworkConfig } from 'src/utils/marketsAndNetworksConfig';
import invariant from 'tiny-invariant';

import { LimitOrder } from './LimitOrder';
import { LimitOrderHistory } from './LimitOrderHistory';

const defaultNetwork = marketsData[CustomMarket.proto_mainnet_v3];

const getFilteredTokens = (chainId: number): TokenInfoWithBalance[] => {
  let customTokenList = TOKEN_LIST.tokens;
  const savedCustomTokens = localStorage.getItem('customTokens');
  if (savedCustomTokens) {
    customTokenList = customTokenList.concat(JSON.parse(savedCustomTokens));
  }
  const transformedTokens = customTokenList.map((token) => {
    return { ...token, balance: '0' };
  });
  const realChainId = getNetworkConfig(chainId).underlyingChainId ?? chainId;
  return transformedTokens.filter((token) => token.chainId === realChainId);
};

export const SwitchPageWrapper = () => {
  const [mode, setMode] = useState<'switch' | 'limit_order'>('switch');
  const currentChainId = useRootStore((store) => store.currentChainId);
  const { chainId: connectedChainId, loading } = useWeb3Context();
  const user = useRootStore((store) => store.account);
  const queryClient = useQueryClient();

  const [selectedChainId, setSelectedChainId] = useState(() => {
    if (supportedNetworksWithEnabledMarket.find((elem) => elem.chainId === currentChainId))
      return currentChainId;
    return defaultNetwork.chainId;
  });

  const filteredTokens = useMemo(() => getFilteredTokens(selectedChainId), [selectedChainId]);

  const { data: baseTokenList } = useTokensBalance(filteredTokens, selectedChainId, user);

  useEffect(() => {
    // Passing chainId as prop will set default network for switch modal
    if (
      connectedChainId &&
      supportedNetworksWithEnabledMarket.find((elem) => elem.chainId === connectedChainId)
    ) {
      setSelectedChainId(connectedChainId);
    } else if (
      connectedChainId &&
      supportedNetworksWithEnabledMarket.find((elem) => elem.chainId === connectedChainId)
    ) {
      const supportedFork = supportedNetworksWithEnabledMarket.find(
        (elem) => elem.underlyingChainId === connectedChainId
      );
      setSelectedChainId(supportedFork ? supportedFork.chainId : connectedChainId);
    } else if (supportedNetworksWithEnabledMarket.find((elem) => elem.chainId === currentChainId)) {
      setSelectedChainId(currentChainId);
    } else {
      setSelectedChainId(defaultNetwork.chainId);
    }
  }, [currentChainId, connectedChainId, connectedChainId]);

  const { defaultInputToken, defaultOutputToken } = useMemo(() => {
    if (baseTokenList) {
      const defaultInputToken =
        baseTokenList.find((token) => token.extensions?.isNative) || baseTokenList[0];
      const defaultOutputToken =
        baseTokenList.find(
          (token) =>
            (token.address === AaveV3Ethereum.ASSETS.GHO.UNDERLYING || token.symbol == 'AAVE') &&
            token.address !== defaultInputToken.address
        ) || baseTokenList.find((token) => token.address !== defaultInputToken.address);
      invariant(
        defaultInputToken && defaultOutputToken,
        'token list should have at least 2 assets'
      );
      return { defaultInputToken, defaultOutputToken };
    }
    return { defaultInputToken: filteredTokens[0], defaultOutputToken: filteredTokens[1] };
  }, [baseTokenList, filteredTokens]);

  const addNewToken = async (token: TokenInfoWithBalance) => {
    queryClient.setQueryData<TokenInfoWithBalance[]>(
      queryKeysFactory.tokensBalance(filteredTokens, selectedChainId, user),
      (oldData) => {
        if (oldData)
          return [...oldData, token].sort((a, b) => Number(b.balance) - Number(a.balance));
        return [token];
      }
    );
    const customTokens = localStorage.getItem('customTokens');
    const newTokenInfo = {
      address: token.address,
      symbol: token.symbol,
      decimals: token.decimals,
      chainId: token.chainId,
      name: token.name,
      logoURI: token.logoURI,
      extensions: {
        isUserCustom: true,
      },
    };
    if (customTokens) {
      const parsedCustomTokens: TokenInfo[] = JSON.parse(customTokens);
      parsedCustomTokens.push(newTokenInfo);
      localStorage.setItem('customTokens', JSON.stringify(parsedCustomTokens));
    } else {
      localStorage.setItem('customTokens', JSON.stringify([newTokenInfo]));
    }
  };

  return (
    <Box>
      <StyledToggleButtonGroup
        exclusive
        value={mode}
        onChange={(_, value) => {
          if (value !== null) {
            setMode(value);
          }
        }}
      >
        <StyledToggleButton value="switch">
          <Typography variant="buttonS">
            <Trans>Switch</Trans>
          </Typography>
        </StyledToggleButton>
        <StyledToggleButton value="limit_order">
          <Typography variant="buttonS">
            <Trans>Limit Order</Trans>
          </Typography>
        </StyledToggleButton>
      </StyledToggleButtonGroup>
      {mode === 'switch' && (
        <SwitchModalContent
          key={selectedChainId}
          selectedChainId={selectedChainId}
          setSelectedChainId={setSelectedChainId}
          supportedNetworks={supportedNetworksWithEnabledMarket}
          defaultInputToken={defaultInputToken}
          defaultOutputToken={defaultOutputToken}
          tokens={baseTokenList || []}
          addNewToken={addNewToken}
        />
      )}
      {mode === 'limit_order' && (
        <>
          <LimitOrder
            selectedChainId={selectedChainId}
            tokens={baseTokenList || []}
            addNewToken={addNewToken}
            defaultInputToken={defaultInputToken}
            defaultOutputToken={defaultOutputToken}
          />
          <Divider />
          <LimitOrderHistory chainId={selectedChainId} />
        </>
      )}
    </Box>
  );
};
