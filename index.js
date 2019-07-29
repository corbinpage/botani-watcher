const Web3 = require("web3")
const web3 = new Web3()
const Dagger = require("eth-dagger")
const BigNumber = require("bignumber.js")
const express = require('express');

const AWS = require('aws-sdk')

AWS.config.update({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})

const host = process.env.HOST || '0.0.0.0'
const port = process.env.PORT || 8000

const server = express()
  .use((req, res) => res.send('Hello World!') )
  .listen(port, () => console.log(`HTTP listening on ${ port }`));

// connect to Dagger ETH main network (network id: 1) over web socket
const options = [{ host: host, port: port }]
const dagger = new Dagger(
  // "wss://mainnet.dagger.matic.network", 
  "mqtts://mainnet.dagger.matic.network", 
  options
) // dagger server

const DAIAddress = '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359'
const MKRAddress = '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2'
const GNTAddress = '0xa74476443119a942de498590fe1f2454d7d4ac0d'
const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

// const DAIAbi = require('./data/dai.json')
const DAIAbi = [
  {
    constant: false,
    inputs: [
      {
        name: '_spender',
        type: 'address'
      },
      {
        name: '_value',
        type: 'uint256'
      }
    ],
    name: 'approve',
    outputs: [
      {
        name: 'success',
        type: 'bool'
      }
    ],
    payable: false,
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [
      {
        name: '',
        type: 'uint256'
      }
    ],
    payable: false,
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      {
        name: '_from',
        type: 'address'
      },
      {
        name: '_to',
        type: 'address'
      },
      {
        name: '_value',
        type: 'uint256'
      }
    ],
    name: 'transferFrom',
    outputs: [
      {
        name: 'success',
        type: 'bool'
      }
    ],
    payable: false,
    type: 'function'
  },
  {
    constant: true,
    inputs: [
      {
        name: '_owner',
        type: 'address'
      }
    ],
    name: 'balanceOf',
    outputs: [
      {
        name: 'balance',
        type: 'uint256'
      }
    ],
    payable: false,
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      {
        name: '_to',
        type: 'address'
      },
      {
        name: '_value',
        type: 'uint256'
      }
    ],
    name: 'transfer',
    outputs: [
      {
        name: 'success',
        type: 'bool'
      }
    ],
    payable: false,
    type: 'function'
  },
  {
    constant: true,
    inputs: [
      {
        name: '_owner',
        type: 'address'
      },
      {
        name: '_spender',
        type: 'address'
      }
    ],
    name: 'allowance',
    outputs: [
      {
        name: 'remaining',
        type: 'uint256'
      }
    ],
    payable: false,
    type: 'function'
  },
  {
    anonymous: false,
    inputs: [
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
    ],
    name: 'Transfer',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: '_owner',
        type: 'address'
      },
      {
        indexed: true,
        name: '_spender',
        type: 'address'
      },
      {
        indexed: false,
        name: '_value',
        type: 'uint256'
      }
    ],
    name: 'Approval',
    type: 'event'
  }
]

const web3Contract = new web3.eth.Contract(DAIAbi, DAIAddress)
const daggerContract = dagger.contract(web3Contract)

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

// // Listen for every MKR token transfer occurs
// dagger.on(`confirmed:log/${MKRAddress}/filter/${transferTopic}/#`, result => {
//   const tokenSymbol = 'MKR'
//   const tokenAmount = getTransferAmountFromLogs(result)
//   console.log(`Amount: ${tokenAmount} ${tokenSymbol}`)

//   triggerFlow('whale-mkr-tweeting', {
//     amount: tokenAmount,
//     tokenSymbol: tokenSymbol,
//     transactionHash: result.transactionHash
//   })
// })

// get new block as soon as it gets created
// dagger.on("latest:block", function(result) {
//   console.log("New block created: ", result);
// });
//

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
                  { "operator": "greaterThanInclusive", "value": 10000, "fact": "amount" }
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