const express = require('express');
const crypto = require('crypto');
const { supabaseAdmin } = require('../supabaseAdmin');
const { DEFAULT_CATEGORIES } = require('../lib/defaultCategories');

const router = express.Router();

// 헷갈리기 쉬운 문자(0/O, 1/I/L) 제외한 8자리 초대코드
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateInviteCode() {
  let code = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i += 1) {
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return code;
}

// GET /api/groups - 내가 속한 그룹 목록
router.get('/', async (req, res) => {
  const { data: memberships, error } = await supabaseAdmin
    .from('group_members')
    .select('group:groups(id, name, invite_code, created_by, created_at)')
    .eq('user_id', req.userId);

  if (error) return res.status(500).json({ error: error.message });

  const groups = memberships.map((m) => m.group).filter(Boolean);

  // 멤버 수도 같이 내려줌
  const withCounts = await Promise.all(
    groups.map(async (g) => {
      const { count } = await supabaseAdmin
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', g.id);
      return { ...g, member_count: count || 1 };
    })
  );

  res.json(withCounts);
});

// POST /api/groups - 새 그룹 생성 (+ 기본 카테고리 자동 생성)
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '그룹 이름을 입력해주세요.' });
  }

  let inviteCode = generateInviteCode();
  // 코드 중복 방지 (극히 낮은 확률이지만 재시도)
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: existing } = await supabaseAdmin
      .from('groups')
      .select('id')
      .eq('invite_code', inviteCode)
      .maybeSingle();
    if (!existing) break;
    inviteCode = generateInviteCode();
  }

  const { data: group, error: groupError } = await supabaseAdmin
    .from('groups')
    .insert({ name: name.trim(), invite_code: inviteCode, created_by: req.userId })
    .select()
    .single();

  if (groupError) return res.status(500).json({ error: groupError.message });

  const { error: memberError } = await supabaseAdmin
    .from('group_members')
    .insert({ group_id: group.id, user_id: req.userId });

  if (memberError) return res.status(500).json({ error: memberError.message });

  const { error: categoryError } = await supabaseAdmin.from('categories').insert(
    DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: req.userId, group_id: group.id }))
  );

  if (categoryError) return res.status(500).json({ error: categoryError.message });

  res.status(201).json({ ...group, member_count: 1 });
});

// POST /api/groups/join - 초대 코드로 그룹 참여
router.post('/join', async (req, res) => {
  const { invite_code: inviteCode } = req.body;
  if (!inviteCode) return res.status(400).json({ error: '초대 코드를 입력해주세요.' });

  const { data: group, error: groupError } = await supabaseAdmin
    .from('groups')
    .select('*')
    .eq('invite_code', inviteCode.trim().toUpperCase())
    .maybeSingle();

  if (groupError) return res.status(500).json({ error: groupError.message });
  if (!group) return res.status(404).json({ error: '유효하지 않은 초대 코드예요.' });

  const { data: existing } = await supabaseAdmin
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', req.userId)
    .maybeSingle();

  if (!existing) {
    const { error: joinError } = await supabaseAdmin
      .from('group_members')
      .insert({ group_id: group.id, user_id: req.userId });
    if (joinError) return res.status(500).json({ error: joinError.message });
  }

  res.status(200).json(group);
});

// GET /api/groups/:id/members - 그룹 멤버 목록 (이메일 포함)
router.get('/:id/members', async (req, res) => {
  const { data: myMembership } = await supabaseAdmin
    .from('group_members')
    .select('id')
    .eq('group_id', req.params.id)
    .eq('user_id', req.userId)
    .maybeSingle();

  if (!myMembership) return res.status(403).json({ error: '이 그룹의 멤버가 아니에요.' });

  const { data: members, error } = await supabaseAdmin
    .from('group_members')
    .select('user_id, joined_at')
    .eq('group_id', req.params.id)
    .order('joined_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const withEmails = await Promise.all(
    members.map(async (m) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
      return {
        user_id: m.user_id,
        joined_at: m.joined_at,
        email: data?.user?.email || '알 수 없음',
        is_me: m.user_id === req.userId,
      };
    })
  );

  res.json(withEmails);
});

// POST /api/groups/:id/leave - 그룹 탈퇴
router.post('/:id/leave', async (req, res) => {
  const { error } = await supabaseAdmin
    .from('group_members')
    .delete()
    .eq('group_id', req.params.id)
    .eq('user_id', req.userId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = router;
