# sam-lambda-loop
StepFunctions を使って同一 Lambda をループさせるデモ  
DynamoDB にあるデータに基づいて、バッチ処理をしたい想定  

## デプロイ
```shell
sam validate --profile <自分の profile>
sam build
# 初回
sam deploy -g --profile <自分の profile>
# 2回目以降
sam deploy --profile <自分の profile>
```

## Process テーブル
処理対象となるテーブル  
ymd が対象日、status が処理ステータス

## MakeRecordFunction
検証のためにデータを作成する Lambda  
300件のレコードを Process テーブルに登録する

## ProcessLoopFunction
実際に行いたいバッチ処理  
Process テーブルから当日分で処理ステータスが未処理のものを取得し、それに対してステータスを処理済みにする  
すべての処理が完了前に10秒を経過したら Lambda が終了するようになっている（実際は14分とかギリギリにする）  
`iterator.continue` が true かどうかで Lambda をループするかが決まる

## ProcessStateMachine
Lambda 処理全体を1つのフローにしているもの  
これを実行して、時間のかかる処理もすべて Lambda で完了するか検証している  
statemachine.json に従って動作する  