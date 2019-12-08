
const Dagger = require("eth-dagger")
const BigNumber = require("bignumber.js")
const express = require('express');
const Twit = require("twit");
const AWS = require('aws-sdk')
const {
  getAddressForSymbol,
  getTransferAmountFromLogs,
  handleRetweet,
  handleTransferEvent } = require('./utils');

AWS.config.update({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})
const host = process.env.HOST || '0.0.0.0'
const port = process.env.PORT || 8000

// --------------------------------------------
// --------------------------------------------
//    Need to run a basic server for Heroku
// --------------------------------------------
// --------------------------------------------

const server = express()
  .use((req, res) => res.send('Hello World!') )
  .listen(port, () => console.log(`HTTP listening on ${ port }`));

// --------------------------------------------
// --------------------------------------------
//   Watch for transfer actions & then handle
// --------------------------------------------
// --------------------------------------------

const options = [{ host: host, port: port }]
const dagger = new Dagger(
  "wss://mainnet.dagger.matic.network", 
  options
) 

const DAIAddress = getAddressForSymbol('DAI')
const MKRAddress = getAddressForSymbol('MKR')
const USDCAddress = getAddressForSymbol('USDC')
const GNTAddress = getAddressForSymbol('GNT')
const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

// Listen for every SAI token transfer occurs
dagger.on(`confirmed:log/${SAIAddress}/filter/${transferTopic}/#`, result => {
  const tokenSymbol = 'SAI'
  const tokenAmount = getTransferAmountFromLogs(result)
  const transactionHash = result.transactionHash

  console.log(`Transfer: ${tokenAmount} ${tokenSymbol}`)

  handleTransferEvent({
    amount: tokenAmount,
    tokenSymbol: tokenSymbol,
    transactionHash: transactionHash    
  })
})

// Listen for every DAI token transfer occurs
dagger.on(`confirmed:log/${DAIAddress}/filter/${transferTopic}/#`, result => {
  const tokenSymbol = 'DAI'
  const tokenAmount = getTransferAmountFromLogs(result)
  const transactionHash = result.transactionHash

  console.log(`Transfer: ${tokenAmount} ${tokenSymbol}`)

  handleTransferEvent({
    amount: tokenAmount,
    tokenSymbol: tokenSymbol,
    transactionHash: transactionHash    
  })
})

// Listen for every MKR token transfer occurs
dagger.on(`confirmed:log/${MKRAddress}/filter/${transferTopic}/#`, result => {
  const tokenSymbol = 'MKR'
  const tokenAmount = getTransferAmountFromLogs(result)
  const transactionHash = result.transactionHash

  console.log(`Transfer: ${tokenAmount} ${tokenSymbol}`)

  handleTransferEvent({
    amount: tokenAmount,
    tokenSymbol: tokenSymbol,
    transactionHash: transactionHash    
  })
})

// Listen for every USDC token transfer occurs
dagger.on(`confirmed:log/${USDCAddress}/filter/${transferTopic}/#`, result => {
  const tokenSymbol = 'USDC'
  const tokenAmount = getTransferAmountFromLogs(result, 6)
  const transactionHash = result.transactionHash

  console.log(`Transfer: ${tokenAmount} ${tokenSymbol}`)

  handleTransferEvent({
    amount: tokenAmount,
    tokenSymbol: tokenSymbol,
    transactionHash: transactionHash    
  })
})

// --------------------------------------------
// --------------------------------------------
//    Retweet tweets from relevant accounts
// --------------------------------------------
// --------------------------------------------

const T = new Twit({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
})

let compoundBotUserId = '1067343515854622720'
let makerBotUserId = '1020011875642245120'
let andrewYangUserId = '2228878592'

// Listen for @CompoundBot tweets
// var stream = T.stream('statuses/filter', {
//   follow: [compoundBotUserId, makerBotUserId]
// })

// stream.on('tweet', function (tweet) {
//   let isReply = !!tweet.in_reply_to_status_id_str

//   if(!isReply) {
//     console.log(tweet)

//     handleRetweet({
//       tweet: tweet 
//     })
//   }
// })
