import Parse from 'parse'

// 与后端 .env 中的 PARSE_APP_ID 保持一致
const APP_ID = 'com.xmg.admin'
const SERVER_URL = '/parse'

Parse.initialize(APP_ID)
Parse.serverURL = SERVER_URL

export default Parse
