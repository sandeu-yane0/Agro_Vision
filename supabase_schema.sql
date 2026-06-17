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

-- ─── 6. Rôles & vérification ──────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'agriculteur'
  CHECK (role IN ('agriculteur','admin'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Pour créer le premier admin, exécuter manuellement :
-- UPDATE profiles SET role = 'admin' WHERE id = '<uuid-du-compte>';

-- ─── 7. Signalements de comptes ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS account_reports (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason           TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_report CHECK (reporter_id <> reported_user_id)
);

ALTER TABLE account_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Créer un signalement"
  ON account_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admin lit les signalements"
  ON account_reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin traite les signalements"
  ON account_reports FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─── 8. Coopératives ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cooperatives (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  culture     TEXT NOT NULL,
  description TEXT,
  founder_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cooperatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coopératives visibles par tous"
  ON cooperatives FOR SELECT USING (true);

CREATE POLICY "Créer une coopérative"
  ON cooperatives FOR INSERT WITH CHECK (auth.uid() = founder_id);

CREATE POLICY "Fondateur ou admin modifient la coopérative"
  ON cooperatives FOR UPDATE
  USING (
    auth.uid() = founder_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── 9. Membres de coopérative ─────────────────────────────────────────────
-- status='pending'   → invitation envoyée par le fondateur, en attente de réponse du membre
-- status='requested' → demande pour rejoindre envoyée par l'agriculteur, en attente du fondateur
-- status='accepted'  → membre actif (accès au chat)
-- status='refused'   → refusé par l'une ou l'autre partie

CREATE TABLE IF NOT EXISTS cooperative_members (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cooperative_id UUID REFERENCES cooperatives(id) ON DELETE CASCADE NOT NULL,
  member_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role           TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('founder','member')),
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','refused','requested')),
  invited_at     TIMESTAMPTZ DEFAULT NOW(),
  responded_at   TIMESTAMPTZ,
  UNIQUE (cooperative_id, member_id)
);

ALTER TABLE cooperative_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir les membres de ses coopératives"
  ON cooperative_members FOR SELECT
  USING (
    auth.uid() = member_id
    OR EXISTS (SELECT 1 FROM cooperatives WHERE id = cooperative_id AND founder_id = auth.uid())
  );

CREATE POLICY "Inviter ou demander à rejoindre"
  ON cooperative_members FOR INSERT
  WITH CHECK (
    auth.uid() = member_id
    OR EXISTS (SELECT 1 FROM cooperatives WHERE id = cooperative_id AND founder_id = auth.uid())
  );

CREATE POLICY "Répondre à une invitation/demande"
  ON cooperative_members FOR UPDATE
  USING (
    auth.uid() = member_id
    OR EXISTS (SELECT 1 FROM cooperatives WHERE id = cooperative_id AND founder_id = auth.uid())
  );

-- ─── 10. Messages de groupe coopérative ────────────────────────────────────

CREATE TABLE IF NOT EXISTS cooperative_messages (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cooperative_id UUID REFERENCES cooperatives(id) ON DELETE CASCADE NOT NULL,
  sender_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content        TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coop_messages_idx ON cooperative_messages (cooperative_id, created_at);

ALTER TABLE cooperative_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lire si membre accepté"
  ON cooperative_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM cooperative_members
    WHERE cooperative_id = cooperative_messages.cooperative_id
      AND member_id = auth.uid() AND status = 'accepted'
  ));

CREATE POLICY "Écrire si membre accepté"
  ON cooperative_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM cooperative_members
      WHERE cooperative_id = cooperative_messages.cooperative_id
        AND member_id = auth.uid() AND status = 'accepted'
    )
  );

-- ─── 11. Notifications ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  data       JSONB DEFAULT '{}',
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir ses notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

-- Permissif par nécessité : un agriculteur doit pouvoir notifier un autre
-- (invitation, demande de rejoindre, réponse à une demande).
CREATE POLICY "Créer une notification pour autrui"
  ON notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Marquer ses notifications comme lues"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ─── 12. Realtime (coopératives & notifications) ───────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE cooperative_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ─── 13. Demandes de certification ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certification_requests (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  motivation   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revoked')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS cert_requests_farmer_idx ON certification_requests (farmer_id, created_at DESC);
ALTER TABLE certification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir ses propres demandes"
  ON certification_requests FOR SELECT
  USING (
    auth.uid() = farmer_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Créer sa demande de certification"
  ON certification_requests FOR INSERT WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "Admin traite les demandes"
  ON certification_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Ajouter 'certification_approved' / 'certification_rejected' / 'certification_revoked'
-- au type de notification côté client (colonne `type` reste TEXT libre, pas de contrainte à modifier).
