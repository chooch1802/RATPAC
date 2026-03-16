-- Groups
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  join_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text) FROM 1 FOR 6)),
  avatar_color TEXT NOT NULL DEFAULT '#00FF87',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- Wager additions
ALTER TABLE wagers ADD COLUMN IF NOT EXISTS sport TEXT;
ALTER TABLE wagers ADD COLUMN IF NOT EXISTS bet_type TEXT;
ALTER TABLE wagers ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;
ALTER TABLE wagers ADD COLUMN IF NOT EXISTS parent_wager_id UUID REFERENCES wagers(id) ON DELETE SET NULL;

-- Comments
CREATE TABLE IF NOT EXISTS wager_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wager_id UUID NOT NULL REFERENCES wagers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE wager_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Groups readable by members" ON groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid())
);
CREATE POLICY "Authenticated can create groups" ON groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group creator can update" ON groups FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Group members readable by members" ON group_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
);
CREATE POLICY "Authenticated can join groups" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can leave" ON group_members FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Comments readable by wager participants" ON wager_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM wagers w WHERE w.id = wager_comments.wager_id AND (w.is_public = true OR w.creator_id = auth.uid() OR w.opponent_id = auth.uid()))
);
CREATE POLICY "Participants can comment" ON wager_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors can delete own comments" ON wager_comments FOR DELETE USING (auth.uid() = user_id);
