# AGENTS.md — ecs-frontend

> React 18 + Vite + antd 5 + react-router v6 + dayjs；JS(JSX)，禁用 TS。生产：Docker(node 构建→nginx) @ 阿里云 ECS，域名 https://xmg111.xyz

## 项目结构

```
src/
├── layouts/MainLayout.jsx   # 全局布局（侧边菜单）
├── pages/XxxPage/index.jsx  # 页面：大驼峰 + Page 后缀
├── router/index.jsx         # 路由表（挂 MainLayout children 下）
├── router/menuConfig.jsx    # 侧边菜单（@ant-design/icons）
└── main.jsx / App.jsx / index.css
```

## 核心规范

- 函数组件 + Hooks；表单用 antd `Form`，`setFieldsValue` 回填；提示用 `message`（成败都提示）
- 日期用 dayjs，提交转 `YYYY-MM-DD` 字符串；注释与文案用中文
- API：路径以 `/api` 开头（dev 走 vite 代理，prod 走 nginx）；只用原生 `fetch` 不用 axios
- 响应先 `res.text()` 再安全 `JSON.parse`；回填接口 `GET /api/xxx/latest` 返回 404 = 暂无数据，不报错
- 新增页面三步：建 `pages/XxxPage/index.jsx` → `router/index.jsx` 注册 → `menuConfig.jsx` 加菜单

## 安全红线

- 禁改 `nginx.conf` 证书路径（宿主机 `/etc/letsencrypt` 挂载进容器）
- `Dockerfile` / `nginx.conf` 改动必须兼容 ECS 部署路径 `/var/www/frontend`
- 禁止提交密钥、证书、敏感配置到仓库

## 工作流

- 开发：`npm run dev`；构建：`npm run build` → `dist/`
- 部署：由后端仓库 `/opt/backend` 的 docker-compose 统一管理，前端不单独部署
- Git：主分支 `main`，中文提交信息 `类型: 描述`（feat/fix/chore/docs/refactor）
- 测试：单元/集成用 Vitest + RTL（`npm test`，单元同目录 `*.test.jsx`，集成在 `tests/integration/`）；e2e 用 Playwright（`npm run test:e2e`，用例在 `e2e/`）
- CI/CD：（暂未实现）

### 流程技能（.qoder/skills/）

开发任务须按阶段调用对应技能，入口为 `using-superpowers`（网关，负责调度）：

| 阶段 | 技能 | 职责 |
|---|---|---|
| 分支隔离 | `using-git-worktrees` | 动工前建隔离工作区 |
| 需求分析文档 | `brainstorming` | 动代码前澄清意图、边界与方案 |
| 计划文档 | `writing-plans` | 多步任务先写分步计划 |
| 按计划实施 | `executing-plans` | 带检查点逐步执行 |
| 编码前 | `test-driven-development` | 先定验证标准再写实现 |
| 遇到 bug | `systematic-debugging` | 先定位根因，禁止瞎猜修 |
| 宣告完成前 | `verification-before-completion` | 先跑验证拿证据，再说"完成" |
| 评审 | `requesting-code-review` / `receiving-code-review` | 请求评审 / 处理评审意见 |
| 收尾 | `finishing-a-development-branch` | 分支合并 |
| UI 交互 | `ui-interaction` | 页面交互规范与验收走查 |
| 质量门禁 | `code-quality-check` | 诊断/测试/构建全绿才算过 |
| 并行派发（按需） | `dispatching-parallel-agents` | 计划含 ≥2 无依赖子任务时，拆分并分配给多个 agent 并行执行 |
| 并行管理（按需） | `subagent-driven-development` | 管理并行 agent 生命周期、汇总结果、处理冲突与合并 |

#### 开发流程（按任务类型选模式）

> 最低保障：每条路径必须满足 **有分支隔离 + 有质量门禁 + 有验证证据**

**标准模式：新功能 / 多步任务**

```
├── 1. using-git-worktrees            # 建隔离工作区
├── 2. brainstorming                  # 需求澄清：意图/边界/方案 用户确认，唯一确认源
├── 3. writing-plans                  # 制定分步计划
├── 4. executing-plans                # 带检查点实施
│       ├─ 若计划含 ≥2 个无依赖子任务 → dispatching-parallel-agents 并行派发
│       └─ 各子任务独立推进 → subagent-driven-development 管理生命周期
├── 5. test-driven-development        # TDD（API 相关须含 mock 覆盖）
├── 6. code-quality-check             # 质量门禁：lint/测试/构建全绿
├── 7. ui-interaction                 # 页面改动时：交互走查 + npm run test:e2e
├── 8. verification-before-completion # 跑验证拿证据
├── 9. code-review                    # requesting / receiving
│       ↻ review 打回 → 回到步骤 5 修复后重新走 6-8
└── 10. finishing-a-development-branch # 收尾：分支合并 + 涉及新页面/API 时更新 docs/
```

**轻量模式：小改动 / 单文件（极简，跳过澄清与计划）**

```
├── 1. using-git-worktrees            # 建分支隔离（可简化为 git checkout -b fix/xxx）
├── 2. test-driven-development        # TDD
├── 3. code-quality-check             # 质量门禁：诊断/测试/构建
├── 4. ui-interaction                 # 交互走查 + npm run test:e2e
├── 5. code-review                    # requesting / receiving
│       ↻ review 打回 → 回到步骤 2
└── 6. finishing-a-development-branch # 收尾提交
```

**bug 模式：缺陷修复**

```
├── 1. using-git-worktrees            # 建分支隔离
├── 2. systematic-debugging           # 定位根因后修复
├── 3. code-quality-check             # 质量门禁：确保修复不引入新问题
├── 4. verification-before-completion # 验证修复生效
├── 5. code-review                    # 代码审查
│       ↻ review 打回 → 回到步骤 2
└── 6. finishing-a-development-branch # 收尾提交
```

#### 失败回退规则

- **验证失败**（步骤 6/7/8）→ 回到 TDD 步骤修复，重新走质量门禁
- **review 打回** → 回到编码/修复步骤，修完后重跑门禁 + 验证
- **构建失败** → 优先检查 lint 错误，修复后重跑 `npm run build`

#### 并行执行规则（dispatching-parallel-agents + subagent-driven-development）

**何时触发：** 标准模式步骤 4（executing-plans）阶段，计划拆分出 ≥2 个互不依赖的子任务时自动启用。

**典型场景：**
- 同时新增 2+ 个独立页面（如 FormPage + OrgPage，互无数据依赖）
- 前端页面 + 后端 API mock 可同步开发
- 多个不共享状态的组件并行实现

**执行方式：**
1. `dispatching-parallel-agents`：将独立子任务分配给多个 agent 并行执行
2. `subagent-driven-development`：管理各 agent 生命周期，汇总结果，处理冲突
3. 所有并行子任务完成后，统一进入步骤 5（TDD）继续后续流程

**不适用：** 子任务间有共享状态、相互调用、或操作同一文件时，必须串行执行

