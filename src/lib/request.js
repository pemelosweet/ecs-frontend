// 统一请求层（借鉴 mtop / axios 的拦截器心智）：
// - 业务代码只用 cloud(name, params)，不再直接触碰 Parse.Cloud.run
// - 请求/响应拦截器：interceptors.request.use(fn) / interceptors.response.use(fn)
//   请求拦截器收到 ctx = { name, params }，可原地改写（如注入公共参数）
//   响应拦截器收到 { name, params, data }，返回值非 undefined 时替换 data
// - 错误归一化：失败统一抛 RequestError（message 已是中文，code 为 Parse 错误码）
//   调用侧 zhError(err, ...) 依然兼容（中文 message 原样透传）

import Parse from '@/lib/parse'
import { zhError } from '@/lib/errorMsg'

const requestFns = []
const responseFns = []

export const interceptors = {
  request: {
    use(fn) {
      requestFns.push(fn)
      return fn
    },
  },
  response: {
    use(fn) {
      responseFns.push(fn)
      return fn
    },
  },
}

// 归一化请求错误：message 中文文案，code 原始错误码，cause 原始错误对象
export class RequestError extends Error {
  constructor(cause) {
    super(zhError(cause))
    this.name = 'RequestError'
    this.code = cause?.code
    this.cause = cause
  }
}

// Cloud 函数统一入口
export async function cloud(name, params = {}) {
  const ctx = { name, params }
  for (const fn of requestFns) await fn(ctx)

  try {
    let data = await Parse.Cloud.run(ctx.name, ctx.params)
    for (const fn of responseFns) {
      const next = await fn({ name: ctx.name, params: ctx.params, data })
      if (next !== undefined) data = next
    }
    return data
  } catch (err) {
    throw new RequestError(err)
  }
}
