const Web3 = require("web3")
const web3 = new Web3()
const BigNumber = require("bignumber.js")
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});

module.exports.getTransferAmountFromLogs = (logData, decimals=18) => {
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
  const value = bigNumberValue.shiftedBy(-1 * decimals).decimalPlaces(2).toNumber()

  return value
}

module.exports.adjustTokenAmount = (amount_str, dec=18) => {
	const bigNumberValue = new BigNumber(amount_str.toString())
  const value = bigNumberValue.shiftedBy(-1 * dec).decimalPlaces(2).toNumber()

	return value
}

module.exports.formatAmount = (amount, isCurrency=false) => {
	let usNumberFormatter = new Intl.NumberFormat('en-US');
  let usdformatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  let output = 0

  if(isCurrency) {
  	output = usNumberFormatter.format(amount.toFixed(2))
  } else {
  	output = usdformatter.format(amount)
  }

	return output
}

module.exports.getAddressForSymbol = (tokenSymbol='DAI') => {
	let address = '0x'
	const MKRAddress = '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2'
	const SAIAddress = '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359'
	const DAIAddress = '0x6b175474e89094c44da98b954eedeac495271d0f'
	const USDCAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
	const GNTAddress = '0xa74476443119a942de498590fe1f2454d7d4ac0d'
	const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

	switch(tokenSymbol) {
		case 'MKR':
			address = MKRAddress
		break
		case 'SAI':
			address = SAIAddress
		break
		case 'DAI':
			address = DAIAddress
		break
		case 'USDC':
			address = USDCAddress
		break
		case 'GNT':
			address = GNTAddress
		break
	}

	return address
}

async function getPrices(limit=10) {
	const dynamoDb = new AWS.DynamoDB.DocumentClient();

  const params = {
    TableName: 'BOTANI_PRICES',
    Limit: limit
  }

  try {
    const response = await dynamoDb.scan(params).promise()

		return response.Items[0]['data']
	} catch (error) {
	  console.error(error);
	  return {}
	}
}

module.exports.getPriceFromSymbol = async (symbol='DAI') => {
	const prices = await getPrices()
	let price = 0

	try {
		price = prices[symbol]['quote']['USD']['price'] || 0
		price = price.toFixed(2)
	} catch(error) {
		console.error(error)
	}

	return price
}

async function getDailyTransferReports(limit=1) {
	const dynamoDb = new AWS.DynamoDB.DocumentClient();

  const params = {
    TableName: 'DAILY_TRANSFER_SUMMARY',
    Limit: limit
  }

  try {
    const response = await dynamoDb.scan(params).promise()

		return response.Items
	} catch (error) {
	  console.error(error);
	  return {}
	}
}

module.exports.getLatestTransferReport = async () => {
	const dailyReports = await getDailyTransferReports()
	let price = 0

	return dailyReports[0]
}

module.exports.getMessageFromSNS = (input) => {
	let output = {}

	try {
		const sns = input["Records"][0]["Sns"]

		if(typeof sns["Message"] === 'string') {
			output = JSON.parse(sns["Message"])
		} else {
			output = sns["Message"]
		}
		
	} catch(error) {
		console.error(error)
	}

	return output
}

async function sendSNSMessage(topic, params) {
	const sns = new AWS.SNS(
    {apiVersion: '2010-03-31'}
  )
  const queueArn = `arn:aws:sns:us-east-1:061031305521:${topic}`
	let snsParams = {
	  Message: JSON.stringify(params),
	  TopicArn: queueArn
	}

	var res = await sns.publish(snsParams).promise()

	return res
}

module.exports.handleRetweet = async (params) => {
	let res = await sendSNSMessage('retweet-tweet', params)

	return res
}

module.exports.handleTransferEvent = async (params) => {
	let res = await sendSNSMessage('handle-transfer-event', params)

	return res
}

module.exports.sendTweetMessage = async (params) => {
	let res = await sendSNSMessage('send-tweet-message', params)

	return res
}