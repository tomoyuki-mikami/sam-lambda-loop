'use strict';

const dayjs = require('dayjs');
const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

// 10秒経過時にループを抜けて終了する（実際は14分とかギリギリでいいが、検証のため）
const TIMEOUT_SEC = 10;

exports.lambdaHandler = async (event, context) => {
  try {
    // 時間計測用
    const startTime = dayjs();
    console.log(`startTime: ${startTime.format('YYYY-MM-DD HH:mm:ss')}`);

    // イテレータの取得。当日分の処理のステータスがすべて SUCCESS になったら iterator.continue を false にして返す
    const iterator = event.result.iterator;
    iterator.cnt++;

    const ymd = dayjs().format('YYYYMMDD');

    // 未処理のデータだけ取得
    const processes = await listProcessByStatus(ymd, 'READY');

    const updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    for (const process of processes) {
      // 15分超えないように計測する
      const checkTime = dayjs();
      const diffSec = checkTime.diff(startTime) / 1000;
      if (diffSec > TIMEOUT_SEC) {
        // Lambda の限界 15分を超える前にループを抜けて終了する
        console.log(`15分超える前にループを抜ける。startTime: ${startTime.format('YYYY-MM-DD HH:mm:ss')} → checkTime: ${checkTime.format('YYYY-MM-DD HH:mm:ss')} = 経過時間: ${diffSec}s`);
        return {
          iterator: iterator,
        };
      }
      // ステータス更新
      await updateProcess(process.ymd, process.id, 'SUCCESS', updatedAt);
    }
    // ここまで到達したらすべての処理が完了したことになるのでループを抜けるように設定する
    iterator.continue = false;

    return {
      iterator: iterator,
    };
  } catch (err) {
    console.log(err);
    context.fail(err);
  }
};

const listProcessByStatus = async (ymd, status) => {
  let list = [];
  const params = {
    TableName: `Process`,
    KeyConditionExpression: `ymd = :ymd`,
    FilterExpression: `#st = :status`,
    ExpressionAttributeNames: {
      '#st': 'status'
    },
    ExpressionAttributeValues: {
      ":ymd": Number(ymd),
      ":status": status,
    },
  };
  while (true) {
    const res = await docClient.query(params).promise();
    list = list.concat(res.Items);
    if (res.LastEvaluatedKey) {
      params.ExclusiveStartKey = res.LastEvaluatedKey;
    } else {
      break;
    }
  }
  return list;
};

const updateProcess = async (ymd, id, status, updatedAt) => {
  const params = {
    TableName: `Process`,
    Key: {
      'ymd': {
        N: ymd.toString(),
      },
      'id': {
        S: id,
      },
    },
    UpdateExpression: "SET #st = :status, updatedAt = :updatedAt",
    ExpressionAttributeNames: {
      '#st': 'status'
    },
    ExpressionAttributeValues: {
      ":status": {"S": status},
      ":updatedAt": {"S": updatedAt},
    },
  };
  await ddb.updateItem(params).promise();
};