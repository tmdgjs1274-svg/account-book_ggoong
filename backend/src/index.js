require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { requireAuth } = require('./middleware/auth');
const categoriesRouter = require('./routes/categories');
const transactionsRouter = require('./routes/transactions');
const budgetsRouter = require('./routes/budgets');
const recurringRouter = require('./routes/recurring');
const statsRouter = require('./routes/stats');

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
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/recurring', recurringRouter);
app.use('/api/stats', statsRouter);

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
