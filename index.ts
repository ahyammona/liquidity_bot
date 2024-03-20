import { Connection, clusterApiUrl,Keypair, VersionedTransaction,  PublicKey } from "@solana/web3.js";
//const fetch = require("cross-fetch");
//const fetch = require("node-fetch");
import  {createUmi}  from "@metaplex-foundation/umi-bundle-defaults";
import  {walletAdapterIdentity}  from "@metaplex-foundation/umi-signer-wallet-adapters";
import  {Wallet} from '@project-serum/anchor';
//const {  TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } = require('@solana/spl-token');
import bs58 from 'bs58';


//const { LIQUIDITY_STATE_LAYOUT_V4, Liquidity} = require("@raydium-io/raydium-sdk");
//const BN = require('bn.js');
import Token from "@solana/spl-token";
import anchor from "@project-serum/anchor"
import { ammCreateMarket, createMarket } from "./createMarket";
import { createPool } from "./createPool";
import { addLP } from "./addLiquidity";
import { removeLP } from "./removeLiquidity";
import {mplTokenMetadata}  from "@metaplex-foundation/mpl-token-metadata";
var TelegramBot = require("node-telegram-bot-api");
//const umi = require("@metaplex-foundation/umi");

import {percentAmount, generateSigner, signerIdentity, keypairIdentity}  from '@metaplex-foundation/umi'
import  {createFungible, mintV1,TokenStandard,createAndMint, transferV1} from '@metaplex-foundation/mpl-token-metadata';
import { createMint } from "@metaplex-foundation/mpl-toolbox";
import { LIQUIDITY_STATE_LAYOUT_V4 } from "@raydium-io/raydium-sdk";

const e = require("express");

const TELEGRAM_BOT_TOKEN = "6935580394:AAGgD4tOWko1mv-AQCgrJ3KtKziHQvHXKvQ"

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling : true});
const msgId = -1002075281954;

const SOLANA = "So11111111111111111111111111111111111111112"
const RAYDIUM_PUBLIC_KEY = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const Raydium_Authority_PUBLIC_KEY = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1";
const RAY_SOL_LP_V4_POOL_KEY = '89ZKE4aoyfLBe2RuV6jM3JGNhaV18Nxh8eNtjRcndBip';
const RAYDIUM_LIQUIDITY_JSON = 'https://api.raydium.io/v2/sdk/liquidity/mainnet.json';
const privateKey = new Uint8Array([
  113, 125, 244, 134,  25,  29,  69, 139,  36, 130,  95,
  172, 222, 137,   0,  82,  85,  68, 212,  68, 152,  76,
  107, 133, 107, 207, 210, 149, 179, 244,   9, 138, 114,
  165, 230,  55,  46, 248, 217, 163,  49, 144, 179,  34,
   59, 251, 216, 236, 223,  58, 187, 201, 226, 204, 219,
  137, 162, 255,  38, 115,  86, 213,  54,  51
]);
var wallet = new Wallet(Keypair.fromSecretKey(privateKey));
var pool;
var initialBalance = 1000000 ;
var target = 2;
var trade = true;
var hit = false;
//const wallet = new Wallet(Keypair.generate());
//const wallet = new Wallet(Keypair.fromSecretKey(bs58.decode("3a00617a85c4b4eee6c50c5432821295c880f41229cbb11d860c443954bb4166")));
// Random unique identifier for your session

const testConnection = new Connection(`https://api.devnet.solana.com`);

async function requestAirdrop(){
  (async () => {
    // 1e9 lamports = 10^9 lamports = 1 SOL
    let txhash = await testConnection.requestAirdrop(wallet.publicKey, 2000000000);
    console.log(`txhash: ${txhash}`);
  })();
}
async function main() { 
 const umi = createUmi(`https://api.devnet.solana.com`)
 .use(mplTokenMetadata())

  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(privateKey))
  umi.use(keypairIdentity(keypair))
  const mint = generateSigner(umi)
  var name = "Inhumane";
  var symbol = "IH";
  var supply = 1000000_000000000
  if(trade == false){
  }else{
    await createToken(umi,mint,name,symbol,supply);
     
    await addLiquidity(mint,supply);
    hit = false; 
    trade = false;
    setTimeout( async ()=>{
      if(pool == undefined){
     }else{
      const pair = new PublicKey(pool);
      const info = await testConnection.getAccountInfo(pair);
      const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(info.data);
      const vault = await getPoolInfo(pool);
      console.log("vault :" + vault);
      console.log("LP Mint :" + poolState.lpMint);
      getChanges(vault,poolState.lpMint,pool);
    } 
   },38000) 
  }  
}
async function createToken(umi,mint,name,symbol,supply) {
// const umi = createUmi(`https://api.devnet.solana.com`)
// .use(mplTokenMetadata())

//  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(privateKey))
//  umi.use(keypairIdentity(keypair))
//  const mint = generateSigner(umi)
 //bot.sendMessage(msgId,`Token Created https://explorer.solana.com/address/${mint.publicKey}?cluster=devnet`)
//  console.log("owner" + umi.identity.publicKey);

  
createAndMint(umi, {
  mint,
  authority: umi.identity,
  name: name,
  symbol: symbol,
  uri: 'https://bafybeihgqm5zda3qb76mk4aa3oyqufp4es2q6xa4xwuqhzyy54taqmuote.ipfs.w3s.link/19.jpg',
  sellerFeeBasisPoints: percentAmount(5), //sell fees 500 = 5%, 1000 = 10%, 5000 = 50%
  decimals: 9,
  
  amount: supply, //totalsupply
  tokenOwner: umi.identity.publicKey,
  tokenStandard: TokenStandard.Fungible,
  }).sendAndConfirm(umi)
  console.log(mint.publicKey);
  
  bot.sendMessage(msgId,`Token Created https://explorer.solana.com/address/${mint.publicKey}?cluster=devnet`)
}
async function addLiquidity(mint,supply) {
  let poolID;
  const token = mint.publicKey;
  const marketId : any = await ammCreateMarket(token);
   setTimeout(async() => {
    const [tx, poolId]: any = await createPool(token,marketId,initialBalance,999900_000000000)
    poolID = poolId;
    pool = poolId;
    bot.sendMessage(msgId, `
    Pool Created  
    address : ${poolId}
     https://explorer.solana.com/tx/${tx}?cluster=devnet`)
   },10000)
   
    setTimeout(async() =>{
     addLP(token,poolID.toString());
    bot.sendMessage(msgId, "Liquidity Added");
   },35000)

}
async function getPoolInfo(lpToken){
  let mainCheck;
  let mainAddress;
  let decimal;

  const pair = new PublicKey(lpToken);
  
  const info = await testConnection.getAccountInfo(pair);
   
  if (!info) return;
  const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(info.data);

    if(new PublicKey(SOLANA) == poolState.quoteMint){
       mainCheck = await testConnection.getTokenAccountBalance(
          poolState.quoteVault
       )
       mainAddress = poolState.quoteVault;
       decimal = poolState.quoteDecimal
    }else{
      mainCheck = await testConnection.getTokenAccountBalance(
          poolState.baseVault
      )
      mainAddress = poolState.baseVault;
    }

  return mainAddress;
}

 async function getChanges(address,lp,pool){
  let addr = new PublicKey(address);
  const subscriptionID = testConnection.onAccountChange(
  addr,
  async(updatedAccountInfo, context) => {
    if(hit == true){
    }else{
    const Bal: any = updatedAccountInfo.lamports/1000000000
    const initial = initialBalance / 1000000000;
    let prof:any = Number(Bal) / Number(initial); 
    console.log(` Updated Sol Bal: ` + Number(Bal).toFixed(2));
    console.log(`Profit ${Number(prof).toFixed(2)}`);
    bot.sendMessage(msgId,`  
     Profit info :  ${prof}
    `); 
    }
    if(hit == true){
    }else{
    const solBal :any = updatedAccountInfo.lamports/1000000000
    const initial = initialBalance / 1000000000;
    let profit : any = Number(solBal) / Number(initial); 
   if(profit > target){
     await removeLP(pool.toString(),lp.toString()) 
     bot.sendMessage(msgId,`  
     Target hit  ${Number(profit).toFixed(2)}
     `); 
     bot.sendMessage(msgId, "Liquidity Removed");
     hit = true;
     profit = 0;
     trade = true
    }
  }
  }
)
}

async function getbalance(){
  const balance = await testConnection.getBalance(wallet.publicKey);
  console.log(balance);
}


//requestAirdrop();
//removeLP("HKifjCSWWX1bU2xT78J7zgxH78Rfbxfww5Zgpc1B3vPp","CcxV9AzN22jM2gLkF2YXwLW7PCfxgwj6KfUCcgubATwT") 
main();
//getbalance(); 