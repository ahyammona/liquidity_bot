import assert = require("assert");
import {Wallet} from '@project-serum/anchor';

import {
  jsonInfo2PoolKeys,
  Liquidity,
  LiquidityPoolKeys,
  Percent,
  Token,
  TokenAmount,
  ApiPoolInfoV4,
  LIQUIDITY_STATE_LAYOUT_V4,
  MARKET_STATE_LAYOUT_V3,
  TxVersion,
  Market,
  TOKEN_PROGRAM_ID,
  SPL_ACCOUNT_LAYOUT,
  SPL_MINT_LAYOUT,
  Currency,
  InnerSimpleV0Transaction,
  buildSimpleTransaction,
  TokenAccount,
  LOOKUP_TABLE_CACHE
} from '@raydium-io/raydium-sdk';
import { 
  Keypair,
  SendOptions,
  Signer,
  PublicKey,
  Connection,
  Transaction,
  VersionedTransaction,
  ComputeBudgetInstruction,
  ComputeBudgetProgram,
  } from '@solana/web3.js';

const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9); // Random unique identifier for your session

 const makeTxVersion = TxVersion.LEGACY; // LEGACY

 const connection = new Connection(`https://api.devnet.solana.com`)

 const DEFAULT_TOKEN = {
    'SOL': new Currency(9, 'USDC', 'USDC'),
    'WSOL': new Token(TOKEN_PROGRAM_ID, new PublicKey('So11111111111111111111111111111111111111112'), 9, 'WSOL', 'WSOL'),
    'USDC': new Token(TOKEN_PROGRAM_ID, new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), 6, 'USDC', 'USDC'),
    'RAY': new Token(TOKEN_PROGRAM_ID, new PublicKey('34K23tYU71NbNypSA2TZ9M3xA8kF1pCBU7r5LwhAmEaK'), 6),
    'RAY_USDC-LP': new Token(TOKEN_PROGRAM_ID, new PublicKey('FGYXP4vBkMEtKhxrmEBcWN8VNmXX8qNgEJpENKDETZ4Y'), 6, 'RAY-USDC', 'RAY-USDC'),
  }
type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>
type TestTxInputInfo = {
  outputToken: Token
  targetPool: string
  inputTokenAmount: TokenAmount
  walletTokenAccounts: WalletTokenAccounts
  slippage: Percent
  wallet: Keypair
}
const privateKey = new Uint8Array([
    190, 129, 89, 173, 55, 130, 139, 23, 88, 207, 184, 103, 72, 95, 227, 117, 84, 176, 28, 102, 157, 220, 115, 141, 112, 27, 39, 106, 235, 152, 176, 129, 204, 127, 84, 35, 30, 174, 194, 82, 218, 197, 41, 29, 40, 127, 141, 231, 136, 82, 169, 81, 35, 98, 54, 198, 168, 30, 48, 46, 231, 166, 154, 193
  ]);
const wallet = new Wallet(Keypair.fromSecretKey(privateKey));
const addLookupTableInfo = LOOKUP_TABLE_CACHE

async function requestAirdrop(){
    (async () => {
      // 1e9 lamports = 10^9 lamports = 1 SOL
      let txhash = await connection.requestAirdrop(wallet.publicKey, 2000000000);
      console.log(`txhash: ${txhash}`);
    })();
  }
async function getbalance(){
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(balance);
}
  
async function formatAmmKeysById(id: string): Promise<ApiPoolInfoV4> {
    const account = await connection.getAccountInfo(new PublicKey(id))
    if (account === null) throw Error(' get id info error ')
    const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data)
  
    const marketId = info.marketId
    const marketAccount = await connection.getAccountInfo(marketId)
    if (marketAccount === null) throw Error(' get market info error')
    const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data)
  
    const lpMint = info.lpMint
    const lpMintAccount = await connection.getAccountInfo(lpMint)
    if (lpMintAccount === null) throw Error(' get lp mint info error')
    const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data)
  
    return {
      id,
      baseMint: info.baseMint.toString(),
      quoteMint: info.quoteMint.toString(),
      lpMint: info.lpMint.toString(),
      baseDecimals: info.baseDecimal.toNumber(),
      quoteDecimals: info.quoteDecimal.toNumber(),
      lpDecimals: lpMintInfo.decimals,
      version: 4,
      programId: account.owner.toString(),
      authority: Liquidity.getAssociatedAuthority({ programId: account.owner }).publicKey.toString(),
      openOrders: info.openOrders.toString(),
      targetOrders: info.targetOrders.toString(),
      baseVault: info.baseVault.toString(),
      quoteVault: info.quoteVault.toString(),
      withdrawQueue: info.withdrawQueue.toString(),
      lpVault: info.lpVault.toString(),
      marketVersion: 3,
      marketProgramId: info.marketProgramId.toString(),
      marketId: info.marketId.toString(),
      marketAuthority: Market.getAssociatedAuthority({ programId: info.marketProgramId, marketId: info.marketId }).publicKey.toString(),
      marketBaseVault: marketInfo.baseVault.toString(),
      marketQuoteVault: marketInfo.quoteVault.toString(),
      marketBids: marketInfo.bids.toString(),
      marketAsks: marketInfo.asks.toString(),
      marketEventQueue: marketInfo.eventQueue.toString(),
      lookupTableAccount: PublicKey.default.toString()
    }
  }

 async function sendTx(
    connection: Connection,
    payer: Keypair | Signer,
    txs: (VersionedTransaction | Transaction)[],
    options?: SendOptions
  ): Promise<string[]> {
    const txids: string[] = [];
    for (const iTx of txs) {
      if (iTx instanceof VersionedTransaction) {
        iTx.sign([payer]);
        txids.push(await connection.sendTransaction(iTx, options));
      } else {
        txids.push(await connection.sendTransaction(iTx, [payer], options));
      }
    }
    return txids;
  }
  
  async function getWalletTokenAccount(connection: Connection, wallet: PublicKey): Promise<TokenAccount[]> {
    const walletTokenAccount = await connection.getTokenAccountsByOwner(wallet, {
      programId: TOKEN_PROGRAM_ID,
    });
    return walletTokenAccount.value.map((i) => ({
      pubkey: i.pubkey,
      programId: i.account.owner,
      accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
    }));
   }
  
 async function buildAndSendTx(innerSimpleV0Transaction: InnerSimpleV0Transaction[], options?: SendOptions) {
    const willSendTx = await buildSimpleTransaction({
      connection,
      makeTxVersion,
      payer: wallet.publicKey,
      innerTransactions: innerSimpleV0Transaction,
      addLookupTableInfo: addLookupTableInfo,
    })
  
    return await sendTx(connection, wallet.payer, willSendTx, options)
  }
  
async function swapOnlyAmm(input: TestTxInputInfo) {
  // -------- pre-action: get pool info --------
  const targetPoolInfo = await formatAmmKeysById(input.targetPool)
  const maxLamports = 100000;
  assert(targetPoolInfo, 'cannot find the target pool')
  const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys
  // -------- step 1: coumpute amount out --------
  const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
    poolKeys: poolKeys,
    poolInfo: await Liquidity.fetchInfo({ connection, poolKeys }),
    amountIn: input.inputTokenAmount,
    currencyOut: input.outputToken,
    slippage: input.slippage,
    
  })
  // -------- step 2: create instructions by SDK function --------
  const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
    connection,
    poolKeys,
    userKeys: {
      tokenAccounts: input.walletTokenAccounts,
      owner: input.wallet.publicKey,
    },
    amountIn: input.inputTokenAmount,
    amountOut: minAmountOut,
    fixedSide: 'in',
    makeTxVersion,
    computeBudgetConfig: {
      microLamports: maxLamports,
    },
  })

  console.log('amountOut:', amountOut.toFixed(), '  minAmountOut: ', minAmountOut.toFixed())

  return { txids: await buildAndSendTx(innerTransactions) }
}

 async function Buy(token,Pool, amount, decimal) {
  
  const inputToken = DEFAULT_TOKEN.WSOL // USDC
  const outputToken = new Token(TOKEN_PROGRAM_ID, new PublicKey(token), decimal)// RAY
  const targetPool = Pool // USDC-RAY pool
  const inputTokenAmount = new TokenAmount(inputToken, amount)
  const slippage = new Percent(1, 100)
  const walletTokenAccounts = await getWalletTokenAccount(connection, wallet.publicKey)

  swapOnlyAmm({
    outputToken,
    targetPool,
    inputTokenAmount,
    slippage,
    walletTokenAccounts,
    wallet: wallet.payer,
  }).then(({ txids }) => {
    /** continue with txids */
    console.log('txids', txids)
  })
}
export async function Sell(token, Pool, amount, decimal) {
  const inputToken = new Token(TOKEN_PROGRAM_ID, new PublicKey(token), decimal)// USDC
  const outputToken = DEFAULT_TOKEN.WSOL // RAY
  const targetPool = Pool // USDC-RAY pool
  
  const inputTokenAmount = new TokenAmount(inputToken, amount)
  const slippage = new Percent(1, 100)
  const walletTokenAccounts = await getWalletTokenAccount(connection, wallet.publicKey)

  swapOnlyAmm({
    outputToken,
    targetPool,
    inputTokenAmount,
    slippage,
    walletTokenAccounts,
    wallet: wallet.payer,
  }).then(({ txids }) => {
    /** continue with txids */
    console.log('txids', txids)
  })
}


Buy('9oHicjinDDU8D83pXdMzaCucwB8rbFboXJih2BtGy87n','DfT81SeAQ9PpgD6axw2eGLWCT8fnTWA8fS32Gw6HGQk2',10000000,9);