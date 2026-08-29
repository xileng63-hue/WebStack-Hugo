# HJCM 灵感导航

从原 WebStack-Hugo 网站重构而来的可编辑导航站。公开页面负责浏览与搜索，管理后台负责分类、链接、排序、显隐、推荐位、站点文案和数据备份。

## 已完成

- 迁移旧站 21 个分类与全部有效链接
- 响应式公开导航页、站内搜索和分类筛选
- 分类与链接的新增、编辑、删除、显隐和排序
- 首页推荐位与自定义图标、颜色、标签
- 站点标题、公告、介绍、Logo 文字和品牌色设置
- JSON 导入与导出
- Supabase 邮箱密码登录、Postgres 数据持久化和 RLS 权限
- 无数据库时自动进入本地演示模式
- 适配 Vercel 的单页应用路由配置

## 本地运行

```bash
npm install
npm run dev
```

未创建 `.env` 时，网站自动使用浏览器 `localStorage`。点击右上角“管理后台”可以直接体验全部编辑功能，但数据只在当前浏览器保存。

## 启用在线管理后台

1. 创建一个 Supabase 项目。
2. 在 Supabase 的 SQL Editor 中执行 [`supabase/schema.sql`](./supabase/schema.sql)。
3. 在 Supabase Authentication 中关闭公开注册，并手动创建一个管理员用户。
4. 复制 `.env.example` 为 `.env.local`，填入项目 URL 和 Publishable/Anon Key：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-anon-key
```

5. 重启开发服务器，登录管理后台，在“数据与备份”中点击“载入旧站初始内容”。

前端使用的 Anon Key 可以公开；真正的写权限由登录会话和数据库 RLS 控制。不要把 Supabase Service Role Key 放进前端环境变量。

## 部署到 Vercel

1. 将项目推送到 GitHub。
2. 在 Vercel 导入仓库，Framework Preset 选择 Vite。
3. 添加 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 两个环境变量。
4. 重新部署，将现有域名 `www.hjcmgzs.xyz` 绑定到新项目。

构建命令为 `npm run build`，输出目录为 `dist`。

## 数据说明

- `src/data/seed.ts`：从旧站提取并清理后的初始导航数据。
- `supabase/schema.sql`：云端数据库表与权限策略。
- 本地模式存储键：`hjcm-navigation-data-v1`。
- 后台 JSON 备份包含分类、链接和站点设置，可跨环境迁移。

