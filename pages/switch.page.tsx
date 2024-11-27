import { Trans } from '@lingui/macro';
import { Box, CircularProgress, Paper, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { ConnectWalletPaper } from 'src/components/ConnectWalletPaper';
import { ContentContainer } from 'src/components/ContentContainer';
import { TopInfoPanel } from 'src/components/TopInfoPanel/TopInfoPanel';
import { supportedNetworksWithEnabledMarket } from 'src/components/transactions/Switch/common';
import { NetworkSelector } from 'src/components/transactions/Switch/NetworkSelector';
import { TokenInfoWithBalance, useTokensBalance } from 'src/hooks/generic/useTokensBalance';
import { MainLayout } from 'src/layouts/MainLayout';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { SwitchPageWrapper } from 'src/modules/switch/SwitchPageWrapper';
import { useRootStore } from 'src/store/root';
import { CustomMarket, marketsData } from 'src/ui-config/marketsConfig';
import { TOKEN_LIST } from 'src/ui-config/TokenList';
import { getNetworkConfig } from 'src/utils/marketsAndNetworksConfig';

const defaultNetwork = marketsData[CustomMarket.proto_mainnet_v3];

export default function Switch() {
  const currentChainId = useRootStore((store) => store.currentChainId);
  const { chainId: connectedChainId, loading } = useWeb3Context();
  const user = useRootStore((store) => store.account);

  const [selectedChainId, setSelectedChainId] = useState(() => {
    if (supportedNetworksWithEnabledMarket.find((elem) => elem.chainId === currentChainId))
      return currentChainId;
    return defaultNetwork.chainId;
  });

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

  return (
    <>
      {!user ? (
        <ConnectWalletPaper loading={loading} />
      ) : (
        <SwitchModalContentWrapper
          user={user}
          chainId={selectedChainId}
          setSelectedChainId={setSelectedChainId}
        />
      )}
    </>
  );
}

interface SwitchModalContentWrapperProps {
  user: string;
  chainId: number;
  setSelectedChainId: (chainId: number) => void;
}

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

const SwitchModalContentWrapper = ({
  user,
  chainId,
  setSelectedChainId,
}: SwitchModalContentWrapperProps) => {
  const theme = useTheme();
  const upToLG = useMediaQuery(theme.breakpoints.up('lg'));
  const downToSM = useMediaQuery(theme.breakpoints.down('sm'));
  const downToXSM = useMediaQuery(theme.breakpoints.down('xsm'));

  const filteredTokens = useMemo(() => getFilteredTokens(chainId), [chainId]);

  console.log('chainId', chainId);

  const { data: baseTokenList } = useTokensBalance(filteredTokens, chainId, user);

  if (!baseTokenList) {
    return (
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', my: '60px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <TopInfoPanel
        titleComponent={
          <Box mb={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
              {/* <img src={`/aave-logo-purple.svg`} width="64px" height="64px" alt="" /> */}
              <Typography
                variant={downToXSM ? 'h2' : upToLG ? 'display1' : 'h1'}
                sx={{ ml: 2, mr: 3 }}
              >
                <Trans>Switch</Trans>
              </Typography>
              <NetworkSelector
                networks={supportedNetworksWithEnabledMarket}
                selectedNetwork={chainId}
                setSelectedNetwork={setSelectedChainId}
              />
            </Box>
          </Box>
        }
      >
        <Box>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
          ullamco laboris nisi ut aliquip ex ea commodo consequat
        </Box>
      </TopInfoPanel>
      <ContentContainer>
        <Paper
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            p: 4,
            flex: 1,
          }}
        >
          <SwitchPageWrapper />
        </Paper>
      </ContentContainer>
    </>
  );
};

Switch.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
