const axios = require('axios')
const url = process.env.TEAMS_URL 

exports.handler = async (event, context) => {
    const response = {
        statusCode: 200,
        body: 'codecommitのイベントをTeamsに通知しました',
    }
    
    let message = ""
    console.log("event ... ", event)
    console.log("Sns ... ", event.Records[0].Sns)
    try{
      let SnsMessageObj =JSON.parse(event.Records[0].Sns.Message)
      switch (SnsMessageObj.detailType) {
        case 'CodeCommit Pull Request State Change':
          message = pullRequestMessage(SnsMessageObj)
          break;
        case 'CodeCommit Comment on Pull Request':
          message = pullRequestCommentsMessage(SnsMessageObj)
          break;
          default: 
          message = `PR#${SnsMessageObj.detail.pullRequestId} 不明な通知です`
      }
      await teamsPost(message, url)

    } catch (e) {
      console.log(e)
      await teamsPost("CodeCommitNotifyが失敗しました", url)
    }
    return response
}

/** プルリク時のメッセージ形成 */
function pullRequestMessage(SnsMessageObj){
  let repositoryName = SnsMessageObj.detail.repositoryNames
  let prId = SnsMessageObj.detail.pullRequestId
  let title = SnsMessageObj.detail.title
  let pullRequestStatus = SnsMessageObj.detail.pullRequestStatus
  let from = SnsMessageObj.detail.sourceReference
  let to = SnsMessageObj.detail.destinationReference
  let body = SnsMessageObj.detail.notificationBody

  let message = 
    `${repositoryName}：PR#${prId} "${title}" is ${pullRequestStatus}  \n` + 
    `${from} → ${to}  \n` + 
    `${body}`
 return message
}
/** コメント時のメッセージ */
function pullRequestCommentsMessage(SnsMessageObj){
  let message =''
  let repositoryName = SnsMessageObj.detail.repositoryName
  let prId = SnsMessageObj.detail.pullRequestId
  let file = SnsMessageObj.additionalAttributes.filePath
  if (SnsMessageObj.additionalAttributes.commentedLine){
    let lineMessage = SnsMessageObj.additionalAttributes.commentedLine
    let lineNum = SnsMessageObj.additionalAttributes.commentedLineNumber
    message = `${repositoryName}：PR#${prId} ${file}:${lineNum}行目( ${lineMessage} )に対して新しいコメントがあります。`
  } else {
    message = `${repositoryName}：PR#${prId} ファイル：${file}に対して新しいコメントがあります。`
  }
  
 return message
}

/**
 * Teamsに通知する
 * @param {*} message 投稿するメッセージ
 * @param {*} teams_url Incoming WebhookのURL
 */
async function teamsPost (message, teams_url){
  try{
    const url = teams_url
    const text = message
    await axios(
      {
        method: 'post',
        url,
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          "type": "message",
          "text": text
      },
    }).then(response => {
        console.log('res:', response.data)
    }).catch(error => {
        console.log(error)
    })
  }catch(e){
    console.log(e)
  }
}