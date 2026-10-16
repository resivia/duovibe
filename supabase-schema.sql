-- ═══════════════════════════════════════════════════════════════════
-- DuoVibe Supabase Database Schema
-- ═══════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS game_events CASCADE;
DROP TABLE IF EXISTS love_notes CASCADE;

CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  player1 JSONB,
  player2 JSONB,
  current_game TEXT DEFAULT '',
  game_state JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE game_events (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_player INTEGER,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE love_notes (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  from_player INTEGER NOT NULL,
  message TEXT NOT NULL,
  emoji TEXT DEFAULT '💌',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rooms_updated_at
BEFORE UPDATE ON rooms
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE love_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public events" ON game_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public notes" ON love_notes FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE game_events;
ALTER PUBLICATION supabase_realtime ADD TABLE love_notes;