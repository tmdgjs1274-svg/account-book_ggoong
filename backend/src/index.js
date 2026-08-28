require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { requireAuth } = require('./middleware/auth');
const { resolveGroupContext } = require('./middleware/groupContext');
const categoriesRouter = require('./routes/categories');
const transactionsRouter = require('./routes/transactions');
const budgetsRouter = require('./routes/budgets');
const recurringRouter = require('./routes/recurring');
const statsRouter = require('./routes/stats');
const groupsRouter = require('./routes/groups');
const spendersRouter = require('./routes/spenders');
const ledgerSettingsRouter = require('./routes/ledgerSettings');

const app = express();
const PORT = process.env.PORT || 4000;

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim());

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());
app.use(morgan('tiny'));

// Render 헬스체크용 (인증 불필요)
app.get('/health', (req, res) => res.json({ ok: true }));

// 이 아래 라우트는 모두 로그인 필요
app.use('/api', requireAuth);

// 그룹 관리 자체는 개인/그룹 컨텍스트와 무관 (X-Group-Id 헤더 불필요)
app.use('/api/groups', groupsRouter);

// 아래는 X-Group-Id 헤더로 개인/그룹 컨텍스트를 판별
app.use('/api/categories', resolveGroupContext, categoriesRouter);
app.use('/api/spenders', resolveGroupContext, spendersRouter);
app.use('/api/transactions', resolveGroupContext, transactionsRouter);
app.use('/api/budgets', resolveGroupContext, budgetsRouter);
app.use('/api/recurring', resolveGroupContext, recurringRouter);
app.use('/api/stats', resolveGroupContext, statsRouter);
app.use('/api/ledger-settings', resolveGroupContext, ledgerSettingsRouter);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// 공통 에러 핸들러
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

app.listen(PORT, () => {
  console.log(`hh-budget-api listening on port ${PORT}`);
});
