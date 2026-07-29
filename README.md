# Love Radar

恋爱雷达（Love Radar）是一个移动端优先的 AI 恋爱聊天分析网站。用户可以上传聊天截图或粘贴聊天记录，系统会生成偏娱乐、讨论和分享导向的关系风险报告。

线上示例：<https://lovescannerai.com>

## Features

- AI 聊天关系分析：敷衍、冷暴力、养鱼、真诚度、上头风险等维度
- 截图上传解析：使用视觉模型识别聊天气泡左右关系
- 文本粘贴分析：直接分析微信聊天记录文本
- 可分享报告页：综合评分、雷达图、关系进度、证据、建议
- 高级版解锁：卡密兑换、面包多购买链接、兑换码领取页
- 截图额度控制：免费每日次数限制，高级版额外额度
- 轻登录：手机号验证码登录，保存报告和高级截图权益
- 管理后台：生成兑换码、导出 CSV、查看基础转化指标
- 隐私默认：不保存原始聊天记录，只保存匿名报告摘要

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui style components
- PostgreSQL / Neon
- DeepSeek Chat API
- Qwen-VL / DashScope compatible API
- Vercel

## Local Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open <http://localhost:3000>.

## Environment Variables

Create `.env.local` from `.env.example` and fill in your own values. Never commit real keys.

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash

QWEN_VL_API_KEY=your_dashscope_api_key
QWEN_VL_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_VL_MODEL=qwen-vl-plus

NEXT_PUBLIC_ENABLE_SCREENSHOT_UPLOAD=true
SCREENSHOT_DAILY_LIMIT=2

DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DATABASE?sslmode=require
REPORT_TTL_DAYS=30

NEXT_PUBLIC_MBD_BUY_URL=https://your-mianbaoduo-product-url
ADMIN_PASSWORD=change_me

AUTH_SESSION_SECRET=change_me_to_a_long_random_string
ALIYUN_SMS_ACCESS_KEY_ID=your_aliyun_sms_access_key_id
ALIYUN_SMS_ACCESS_KEY_SECRET=your_aliyun_sms_access_key_secret
ALIYUN_SMS_REGION=cn-hangzhou
ALIYUN_SMS_SIGN_NAME=恋爱雷达
ALIYUN_SMS_TEMPLATE_CODE=SMS_xxxxxx
```

Optional Tencent OCR variables are still supported for legacy OCR experiments:

```env
OCR_PROVIDER=tencent
TENCENT_SECRET_ID=your_tencent_secret_id
TENCENT_SECRET_KEY=your_tencent_secret_key
TENCENT_OCR_REGION=ap-guangzhou
```

## Database

Run `db/schema.sql` once in Neon or any PostgreSQL database before production use.

The app stores:

- anonymous report summaries
- report scores and tags
- optional user phone account identifiers for lightweight login
- redemption code usage status
- screenshot quota usage
- basic product analytics events

The app does not store raw chat logs.

## Scripts

Generate unlock codes:

```bash
pnpm codes:generate -- 100 single_report
```

Run checks:

```bash
pnpm lint
pnpm build
```

## Privacy

- Chat logs are used only for the current analysis request.
- Raw chat logs and screenshots are not saved by this app.
- Reports contain only generated summaries, scores, tags, and excerpts.
- Users are reminded to mask phone numbers, addresses, IDs, schools, companies, and other sensitive information.
- Results are for entertainment and communication reference only. They are not psychological, legal, medical, or relationship decision advice.

## License

MIT
