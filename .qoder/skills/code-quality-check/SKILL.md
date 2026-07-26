---
name: code-quality-check
description: 代码质量门禁。任何代码改动在提交或宣告完成前使用：依次执行编译/lint 诊断、单元与集成测试、e2e、构建验证，全部通过才算过关。
---

# code-quality-check：质量门禁

## 检查顺序（全绿才算过）

```
1. IDE 诊断     # GetProblems 检查改动文件，0 error
2. 单元 + 集成  # npm test
3. e2e          # npm run test:e2e（涉及页面/路由改动时必跑）
4. 构建         # npm run build 成功，无报错
```

## 规则

- 任何一步失败：先修复再从失败步骤重跑，禁止跳过或降级
- 修复引发的新改动，重新从第 1 步开始
- 检查结果要在回复中给出真实输出摘要（用例数/构建结果），不许口头"应该没问题"

## 说明

- 项目暂未配置 ESLint / Prettier，lint 以 IDE 诊断为准；引入后在此补充命令
