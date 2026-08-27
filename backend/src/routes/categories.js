const express = require('express');
const { supabaseAdmin } = require('../supabaseAdmin');

const router = express.Router();

// GET /api/categories - 내 카테고리 전체 조회
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('user_id', req.userId)
    .order('type', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/categories - 카테고리 추가
router.post('/', async (req, res) => {
  const { name, type, color, icon } = req.body;
  if (!name || !['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'name과 type(income|expense)은 필수입니다.' });
  }

  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert({
      user_id: req.userId,
      name,
      type,
      color: color || '#3182F6',
      icon: icon || 'etc',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/categories/:id - 카테고리 수정
router.put('/:id', async (req, res) => {
  const { name, color, icon, sort_order: sortOrder } = req.body;

  const { data, error } = await supabaseAdmin
    .from('categories')
    .update({ name, color, icon, sort_order: sortOrder })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
  res.json(data);
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = router;
