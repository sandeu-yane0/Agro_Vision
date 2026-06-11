-- ============================================================
--  AgroVision IA — Schéma Supabase
--  À exécuter dans : Supabase > SQL Editor > New Query
-- ============================================================

-- ─── 1. Table profils agriculteurs ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name   TEXT NOT NULL,
  region      TEXT,
  cultures    TEXT[]  DEFAULT '{}',
  avatar_url  TEXT,
  bio         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger : met à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger : crée un profil vide dès qu'un utilisateur s'inscrit
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── 2. Table conversations DM ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dm_conversations (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_1    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  participant_2    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_message     TEXT,
  last_message_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_chat CHECK (participant_1 <> participant_2)
);

-- Unicité de la paire (indépendante de l'ordre)
CREATE UNIQUE INDEX IF NOT EXISTS unique_conversation_pair
  ON dm_conversations (
    LEAST(participant_1::text, participant_2::text),
    GREATEST(participant_1::text, participant_2::text)
  );

-- ─── 3. Table messages DM ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dm_messages (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id  UUID REFERENCES dm_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id        UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content          TEXT NOT NULL,
  is_read          BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS dm_messages_conv_idx ON dm_messages (conversation_id, created_at);

-- ─── 4. Row Level Security ─────────────────────────────────────────────────

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profils publics lisibles par tous"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Utilisateur crée son propre profil"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Utilisateur modifie son propre profil"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- dm_conversations
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir ses propres conversations"
  ON dm_conversations FOR SELECT
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Créer une conversation"
  ON dm_conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Mettre à jour last_message"
  ON dm_conversations FOR UPDATE
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- dm_messages
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir les messages de ses conversations"
  ON dm_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dm_conversations
      WHERE id = conversation_id
        AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
  );

CREATE POLICY "Envoyer un message"
  ON dm_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Marquer comme lu"
  ON dm_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM dm_conversations
      WHERE id = conversation_id
        AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
  );

-- ─── 5. Activer Realtime ────────────────────────────────────────────────────
-- Dans Supabase Dashboard > Database > Replication
-- Activer "Realtime" pour la table : dm_messages

-- OU via SQL :
ALTER PUBLICATION supabase_realtime ADD TABLE dm_messages;
