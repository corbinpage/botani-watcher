const Web3 = require("web3")
const web3 = new Web3()
const Dagger = require("eth-dagger")
const BigNumber = require("bignumber.js")
const express = require('express');
const Twit = require("twit");

const AWS = require('aws-sdk')

AWS.config.update({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})

const host = process.env.HOST || '0.0.0.0'
const port = process.env.PORT || 8000

// connect to Dagger ETH main network (network id: 1) over web socket
const options = [{ host: host, port: port }]

const dagger = new Dagger(
  "wss://mainnet.dagger.matic.network", 
  options
) // dagger server

// const T = new Twit({
//   consumer_key: process.env.TWITTER_CONSUMER_KEY,
//   consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
//   access_token: process.env.TWITTER_ACCESS_TOKEN,
//   access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
// })

const server = express()
  .use((req, res) => res.send('Hello World!') )
  .listen(port, () => console.log(`HTTP listening on ${ port }`));

const DAIAddress = '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359'
const MKRAddress = '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2'
const GNTAddress = '0xa74476443119a942de498590fe1f2454d7d4ac0d'
const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

// Listen for every DAI token transfer occurs
dagger.on(`confirmed:log/${DAIAddress}/filter/${transferTopic}/#`, result => {
  const tokenSymbol = 'DAI'
  const tokenAmount = getTransferAmountFromLogs(result)
  console.log(`Amount: ${tokenAmount} ${tokenSymbol}`)

  triggerFlow('whale-dai-tweeting', {
    amount: tokenAmount,
    tokenSymbol: tokenSymbol,
    transactionHash: result.transactionHash
  })
})

// Listen for every MKR token transfer occurs
dagger.on(`confirmed:log/${MKRAddress}/filter/${transferTopic}/#`, result => {
  const tokenSymbol = 'MKR'
  const tokenAmount = getTransferAmountFromLogs(result)
  console.log(`Amount: ${tokenAmount} ${tokenSymbol}`)

  triggerFlow('whale-mkr-tweeting', {
    amount: tokenAmount,
    tokenSymbol: tokenSymbol,
    transactionHash: result.transactionHash
  })
})

// Listen for @CompoundBot tweets
// var stream = T.stream('statuses/filter', {
//   // track: '#apple',
//   // "exact phrase match": "Borrow / Supply Rates (APR) as of block ",
//   from: 'DeFiWhale'

// })

// stream.on('tweet', function (tweet) {
//   console.log(tweet)
// })

function getTransferAmountFromLogs(logData) {
  const inputs = [
    {
      indexed: true,
      name: '_from',
      type: 'address'
    },
    {
      indexed: true,
      name: '_to',
      type: 'address'
    },
    {
      indexed: false,
      name: '_value',
      type: 'uint256'
    }
  ]
  const hexString = logData.data
  const topics = logData.topics
  topics.shift()

  const output = web3.eth.abi.decodeLog(inputs, hexString, topics)

  const bigNumberValue = new BigNumber(output._value.toString())
  const value = bigNumberValue.shiftedBy(-18).decimalPlaces(2).toNumber()

  return value
}

async function triggerFlow(flowName, params) {
	// console.log(`Flow triggered: ${flowName}`)
	let flowModel = getFlowModel(flowName)

	let res = sendMessage(flowModel, params)
	// console.log(`Flow message sent: ${flowName}`)

	return res
}

function getFlowModel(flowName) {
	let flowModel = []

	switch(flowName) {
    case 'whale-dai-tweeting':
      flowModel = [
        {
          "task_type": "whale-dai-tweeting",
          "inputs": {
            "rule": {
              "conditions": {
                "priority": 1,
                "all": [
                  { "operator": "greaterThanInclusive", "value": 50000, "fact": "amount" }
                ]
              },
              "priority": 1,
              "event": {
                "type": "success",
                "params": {
                  "decision": true
                }
              }
            }
          }
        }
      ]
    break;
		case 'whale-mkr-tweeting':
      flowModel = [
        {
          "task_type": "whale-mkr-tweeting",
          "inputs": {
            "rule": {
              "conditions": {
                "priority": 1,
                "all": [
                  { "operator": "greaterThanInclusive", "value": 20, "fact": "amount" }
                ]
              },
              "priority": 1,
              "event": {
                "type": "success",
                "params": {
                  "decision": true
                }
              }
            }
          }
        }
      ]
		break;

		default:

	}

	return flowModel
}

async function sendMessage(flowModel, params) {
	const sns = new AWS.SNS(
    {apiVersion: '2010-03-31'}
  )
  const queueArn = `arn:aws:sns:us-east-1:061031305521:${flowModel[0]["task_type"]}`
	const message = {
		params: params,
		flowModel: flowModel,
		taskHistory: []
	}

	let snsParams = {
	  Message: JSON.stringify(message),
	  TopicArn: queueArn
	}

	var res = await sns.publish(snsParams).promise()

	return res
}