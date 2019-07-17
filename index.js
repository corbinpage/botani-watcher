const Web3 = require("web3")
const web3 = new Web3()
const Dagger = require("eth-dagger")
const BigNumber = require("bignumber.js")

const AWS = require('aws-sdk')
AWS.config.update({region: 'us-east-1'})

// connect to Dagger ETH main network (network id: 1) over web socket
const dagger = new Dagger("wss://mainnet.dagger.matic.network") // dagger server

const DAIAddress = '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359'
const MKRAddress = '0xa74476443119a942de498590fe1f2454d7d4ac0d'
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




// dagger.on(`latest:log/${DAIAddress}/filter/${transferTopic}/#`, function(result) {
// 	console.log(result);


// 	triggerFlow('whale-tweet-dai-transfer', {
// 		symbol: 'DAI',
// 		amount: result.amount,
// 		from: result.from
// 	})
// })


const web3Contract = new web3.eth.Contract(DAIAbi, DAIAddress)
const daggerContract = dagger.contract(web3Contract)

// Get subscription filter
// const transactionFilter = daggerContract.events.Approval({
// 	room: "latest",
// 	filter: {
// 		from: '0x869eC00FA1DC112917c781942Cc01c68521c415e'
// 	}
// });

// // Start watching logs
// transactionFilter.watch((log) => {
// 	console.log('New DAI Transfer')
// 	console.log(log)
//   // log.returnValues.value => 100 GNT
//   // log.returnValues.from => '0x12345678...'
//   // log.returnValues.to => address which value has been transferred to
// });



// Listen for every Golem token transfer (notice `#` at the end)
dagger.on(`confirmed:log/${DAIAddress}/filter/${transferTopic}/#`, result => {
  console.log('New DAI Transfer')
  const tokenAmount = getTransferAmountFromLogs(result)
  console.log(`Amount: ${tokenAmount}`)
})

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
	console.log(`Flow triggered: ${flowName}`)
	let flowModel = getFlowModel(flowName)

	// let res = sendMessage(flowModel, params)
	console.log(`Flow message sent: ${flowName}`)

	return res
}

function getFlowModel(flowName) {
	let flowModel = []

	switch(flowName) {
		case 'whale-dai-tweeting':
		break;

		default:

	}

	return flowModel
}

async function sendMessage(flowModel, params) {
	const sns = new AWS.SNS({apiVersion: '2010-03-31'})
	const message = {
		params: params,
		flowModel: flowModel,
		taskHistory: []
	}

	let snsParams = {
	  Message: JSON.stringify(message),
	  TopicArn: 'arn:aws:sns:us-east-1:061031305521:botani',
	  MessageAttributes: {
	    'task_type': {
	      DataType: 'String',
	      StringValue: message.flowModel[0]["task_type"]
	    },
	    'task_id': {
	      DataType: 'Number',
	      StringValue: '0'
	    }
    }
	}

	var res = await sns.publish(snsParams).promise()

	return res
}