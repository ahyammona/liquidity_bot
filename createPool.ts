import { BN } from 'bn.js';

import {
  Liquidity,
  MAINNET_PROGRAM_ID,
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
 var poolId;

 //const connection = new Connection(`https://api.devnet.solana.com`);
 const connection = new Connection(clusterApiUrl("devnet"))


 const DEFAULT_TOKEN = {
    'SOL': new Currency(9, 'USDC', 'USDC'),
    'WSOL': new Token(TOKEN_PROGRAM_ID, new PublicKey('So11111111111111111111111111111111111111112'), 9, 'WSOL', 'WSOL'),
    'USDC': new Token(TOKEN_PROGRAM_ID, new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), 6, 'USDC', 'USDC'),
    'RAY': new Token(TOKEN_PROGRAM_ID, new PublicKey('34K23tYU71NbNypSA2TZ9M3xA8kF1pCBU7r5LwhAmEaK'), 6),
    'RAY_USDC-LP': new Token(TOKEN_PROGRAM_ID, new PublicKey('FGYXP4vBkMEtKhxrmEBcWN8VNmXX8qNgEJpENKDETZ4Y'), 6, 'RAY-USDC', 'RAY-USDC'),
  }
type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>

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
async function buildAndSendTx(innerSimpleV0Transaction: InnerSimpleV0Transaction[], options: SendOptions = { skipPreflight: true } ) {
    const willSendTx = await buildSimpleTransaction({
      connection,
      makeTxVersion,
      payer: wallet.publicKey,
      innerTransactions: innerSimpleV0Transaction,
      addLookupTableInfo: addLookupTableInfo,
    })
  
    return await sendTx(connection, wallet.payer, willSendTx, options)
  }

function calcMarketStartPrice(input: CalcStartPrice) {
  return input.addBaseAmount.toNumber() / 10 ** 6 / (input.addQuoteAmount.toNumber() / 10 ** 6)
}

type LiquidityPairTargetInfo = {
  baseToken: Token
  quoteToken
  targetMarketId: PublicKey
}

function getMarketAssociatedPoolKeys(input: LiquidityPairTargetInfo) {
  return Liquidity.getAssociatedPoolKeys({
    version: 4,
    marketVersion: 3,
    baseMint: input.baseToken.mint,
    quoteMint: input.quoteToken.mint,
    baseDecimals: input.baseToken.decimals,
    quoteDecimals: input.quoteToken.decimals,
    marketId: input.targetMarketId,
    programId: DEVNET_PROGRAM_ID.AmmV4,
    marketProgramId: DEVNET_PROGRAM_ID.OPENBOOK_MARKET,
  })
}


type TestTxInputInfo = LiquidityPairTargetInfo &
  CalcStartPrice & {
    startTime: number // seconds
    walletTokenAccounts: WalletTokenAccounts
    payer: Keypair
  }

async function ammCreatePool(input: TestTxInputInfo): Promise<[ txids: string[], poolId : PublicKey ]> {
  // -------- step 1: make instructions --------
  const initPoolInstructionResponse = await Liquidity.makeCreatePoolV4InstructionV2Simple({
    connection,
    programId: DEVNET_PROGRAM_ID.AmmV4,
    marketInfo: {
      marketId: input.targetMarketId,
      programId: DEVNET_PROGRAM_ID.OPENBOOK_MARKET,
    },
    baseMintInfo: input.baseToken,
    quoteMintInfo: input.quoteToken,
    baseAmount: input.addBaseAmount,
    quoteAmount: input.addQuoteAmount,
    startTime: new BN(Math.floor(input.startTime)),
    ownerInfo: {
      feePayer: input.payer.publicKey,
      wallet: input.payer.publicKey,
      tokenAccounts: input.walletTokenAccounts,
      useSOLBalance: true,
    },
    associatedOnly: false,
    checkCreateATAOwner: true,
    makeTxVersion,
    feeDestinationId: new PublicKey('3XMrhbv989VxAMi3DErLV9eJht1pHppW5LbKxe9fkEFR')//7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5'), // only mainnet use this
  })

  poolId = initPoolInstructionResponse.address.ammId;
  const txids = await buildAndSendTx(initPoolInstructionResponse.innerTransactions)
  return [txids, poolId]
}

export async function createPool(token, marketId, solAmount,tokenAMount) {
  const baseToken = DEFAULT_TOKEN.WSOL // USDC
  const quoteToken = new Token(TOKEN_PROGRAM_ID, new PublicKey(token), 9) // RAY
  const targetMarketId = new PublicKey(marketId);
  const addBaseAmount = new BN(solAmount) // 10000 / 10 ** 6,
  const addQuoteAmount = new BN(tokenAMount) // 10000 / 10 ** 6,
  const startTime = Math.floor(Date.now() / 1000) + 60 * 60  // start from 7 days later
  const walletTokenAccounts = await getWalletTokenAccount(connection, wallet.publicKey)
  const payer = wallet.payer;
  /* do something with start price if needed */
  const startPrice = calcMarketStartPrice({ addBaseAmount, addQuoteAmount })

  /* do something with market associated pool keys if needed */
  const associatedPoolKeys = getMarketAssociatedPoolKeys({
    baseToken,
    quoteToken,
    targetMarketId,
  })

  const [txid,pooId] : any = await ammCreatePool({
    startTime,
    addBaseAmount,
    addQuoteAmount,
    baseToken,
    quoteToken,
    targetMarketId,
    payer,
    walletTokenAccounts,
  })
  console.log("tx " + txid)
  console.log("poolid " + pooId)
  return[txid,poolId]
}
