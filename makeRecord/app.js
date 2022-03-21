'use strict';

const dayjs = require('dayjs');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB();

exports.lambdaHandler = async (event, context) => {
  try {
    const ymd = dayjs().format('YYYYMMDD');
    const createdAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    // DynamoDB に 300件データ挿入
    for (let i = 0; i < 300; i++) {
      await putProcess(ymd, createdAt);
    }
    return true;
  } catch (err) {
    console.log(err);
    context.fail(err);
  }
};

const putProcess = async (ymd, createdAt) => {
  const params = {
    TableName: `Process`,
    Item: {
      'ymd': {
        N: ymd
      },
      'id': {
        S: uuidv4()
      },
      'status': {
        S: 'READY'
      },
      'createdAt': {
        S: createdAt
      },
      'updatedAt': {
        S: createdAt
      }
    },
  };
  await ddb.putItem(params).promise();
};