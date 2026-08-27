const express = require('express');
const { supabaseAdmin } = require('../supabaseAdmin');
const { applyScope } = require('../middleware/groupContext');

const router = express.Router();

// GET /api/spenders - "누가 소비했는지" 태그 목록 (개인 또는 현재 그룹 컨텍스트)
// 로그인 계정과 무관한 단순 이름표라, 로그인 없는 가족 구성원도 등록해둘 수 있어요.
router.get('/', async (req, res) => {
  let query = supabaseAdmin.from('spenders').select('*');
  query = applyScope(query, req);
  query = query.order('sort_order', { ascending: true });

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/spenders - 태그 추가
router.post('/', async (req, res) => {
  const { name, color } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name은 필수입니다.' });
  }

  const { data, error } = await supabaseAdmin
    .from('spenders')
    .insert({
      user_id: req.userId,
      group_id: req.groupId,
      name: name.trim(),
      color: color || '#3182F6',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/spenders/:id - 태그 수정 (이름/색/순서)
router.put('/:id', async (req, res) => {
  const { name, color, sort_order: sortOrder } = req.body;

  let query = supabaseAdmin
    .from('spenders')
    .update({ name, color, sort_order: sortOrder })
    .eq('id', req.params.id);
  query = applyScope(query, req);

  const { data, error } = await query.select().single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: '구성원을 찾을 수 없습니다.' });
  res.json(data);
});

// DELETE /api/spenders/:id
router.delete('/:id', async (req, res) => {
  let query = supabaseAdmin.from('spenders').delete().eq('id', req.params.id);
  query = applyScope(query, req);

  const { error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = router;
