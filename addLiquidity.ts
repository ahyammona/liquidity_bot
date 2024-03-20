import Decimal from 'decimal.js';
import { BN } from 'bn.js';

import {
  Liquidity,
  MAINNET_PROGRAM_ID,
  CurrencyAmount,
  jsonInfo2PoolKeys,
  LiquidityPoolKeys,
  Percent,
  Token,
  MarketV2,
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
  LOOKUP_TABLE_CACHE,
  DEVNET_PROGRAM_ID
} from '@raydium-io/raydium-sdk';
import {
    Keypair,
    SendOptions,
    Signer,
    PublicKey,
    Connection,
    Transaction,
    VersionedTransaction,
    clusterApiUrl,
    ComputeBudgetInstruction,
    ComputeBudgetProgram,
} from '@solana/web3.js';


const ZERO = new BN(0)
type BN = typeof ZERO

type CalcStartPrice = {
  addBaseAmount: BN
  addQuoteAmount: BN
}
import assert = require("assert");
import {Wallet} from '@project-serum/anchor';


const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9); // Random unique identifier for your session

const makeTxVersion = TxVersion.LEGACY; // LEGACY
   //const connection = new Connection(`https://api.devnet.solana.com`);
 const connection = new Connection(clusterApiUrl("devnet"))
  
 const DEFAULT_TOKEN = {
    'SOL': new Currency(9, 'USDC', 'USDC'),
    'WSOL': new Token(TOKEN_PROGRAM_ID, new PublicKey('So11111111111111111111111111111111111111112'), 9, 'WSOL', 'WSOL'),
    'USDC': new Token(TOKEN_PROGRAM_ID, new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), 6, 'USDC', 'USDC'),
    'RAY': new Token(TOKEN_PROGRAM_ID, new PublicKey('34K23tYU71NbNypSA2TZ9M3xA8kF1pCBU7r5LwhAmEaK'), 6),
    'RAY_USDC-LP': new Token(TOKEN_PROGRAM_ID, new PublicKey('FGYXP4vBkMEtKhxrmEBcWN8VNmXX8qNgEJpENKDETZ4Y'), 6, 'RAY-USDC', 'RAY-USDC'),
  }


const privateKey = new Uint8Array([
  113, 125, 244, 134,  25,  29,  69, 139,  36, 130,  95,
  172, 222, 137,   0,  82,  85,  68, 212,  68, 152,  76,
  107, 133, 107, 207, 210, 149, 179, 244,   9, 138, 114,
  165, 230,  55,  46, 248, 217, 163,  49, 144, 179,  34,
   59, 251, 216, 236, 223,  58, 187, 201, 226, 204, 219,
  137, 162, 255,  38, 115,  86, 213,  54,  51  ]);
const wallet = new Wallet(Keypair.fromSecretKey(privateKey));
const addLookupTableInfo = LOOKUP_TABLE_CACHE


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
async function buildAndSendTx(innerSimpleV0Transaction: InnerSimpleV0Transaction[], options: SendOptions = { skipPreflight: true }) {
    const willSendTx = await buildSimpleTransaction({
      connection,
      makeTxVersion,
      payer: wallet.publicKey,
      innerTransactions: innerSimpleV0Transaction,
      addLookupTableInfo: addLookupTableInfo,
    })
  
    return await sendTx(connection, wallet.payer, willSendTx, options)
  }
type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>
type TestTxInputInfo = {
  baseToken: Token
  quoteToken: Token
  targetPool: String
  inputTokenAmount: TokenAmount
  slippage: Percent
  walletTokenAccounts: WalletTokenAccounts
  wallet: Keypair
}
async function formatAmmKeysById(id: any): Promise<ApiPoolInfoV4> {
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

async function ammAddLiquidity(
  input: TestTxInputInfo
): Promise<{ txids: string[]; anotherAmount: TokenAmount | CurrencyAmount }> {
  const targetPoolInfo = await formatAmmKeysById(input.targetPool)
  assert(targetPoolInfo, 'cannot find the target pool')

  // -------- step 1: compute another amount --------
  const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys
  const extraPoolInfo = await Liquidity.fetchInfo({ connection, poolKeys })
  const { maxAnotherAmount, anotherAmount, liquidity } = Liquidity.computeAnotherAmount({
    poolKeys,
    poolInfo: { ...targetPoolInfo, ...extraPoolInfo },
    amount: input.inputTokenAmount,
    anotherCurrency: input.quoteToken,
    slippage: input.slippage,
  })
   
  console.log('will add liquidity info', {
    liquidity: liquidity.toString(),
    liquidityD: new Decimal(liquidity.toString()).div(10 ** extraPoolInfo.lpDecimals),
  })

  // -------- step 2: make instructions --------
  const addLiquidityInstructionResponse = await Liquidity.makeAddLiquidityInstructionSimple({
    connection,
    poolKeys,
    userKeys: {
      owner: input.wallet.publicKey,
      payer: input.wallet.publicKey,
      tokenAccounts: input.walletTokenAccounts,
    },
    amountInA: input.inputTokenAmount,
    amountInB: maxAnotherAmount,
    fixedSide: 'a',
    makeTxVersion,
  })

  return { txids: await buildAndSendTx(addLiquidityInstructionResponse.innerTransactions), anotherAmount }
}

export async function addLP(token, poolId) {
  const baseToken = DEFAULT_TOKEN.WSOL // USDC
  const quoteToken = new Token(TOKEN_PROGRAM_ID, new PublicKey(token), 9)  // RAY
  const targetPool = poolId // RAY-USDC pool
  const inputTokenAmount = new TokenAmount(baseToken, 100)
  const slippage = new Percent(1, 100)
  const walletTokenAccounts = await getWalletTokenAccount(connection, wallet.publicKey)

  ammAddLiquidity({
    baseToken,
    quoteToken,
    targetPool,
    inputTokenAmount,
    slippage,
    walletTokenAccounts,
    wallet: wallet.payer,
  }).then(({ txids, anotherAmount }) => {
    /** continue with txids */
    console.log('add Liquidity txids', txids)
    
  })
}