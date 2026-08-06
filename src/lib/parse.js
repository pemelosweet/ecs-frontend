import Parse from 'parse'

// 与后端 index.js 中的默认值保持一致
const APP_ID = 'ecs-app'
const SERVER_URL = '/parse'

Parse.initialize(APP_ID)
Parse.serverURL = SERVER_URL

export default Parse
