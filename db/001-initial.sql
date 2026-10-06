CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY, name TEXT NOT NULL, goal TEXT NOT NULL DEFAULT 'ENEM', daily_minutes INTEGER NOT NULL DEFAULT 30);
CREATE TABLE IF NOT EXISTS reviews (user_id TEXT NOT NULL, card_id TEXT NOT NULL, due BIGINT NOT NULL, "interval" INTEGER NOT NULL DEFAULT 0, repetitions INTEGER NOT NULL DEFAULT 0, rating INTEGER NOT NULL, PRIMARY KEY(user_id,card_id));
CREATE TABLE IF NOT EXISTS lesson_progress (user_id TEXT NOT NULL, lesson_id TEXT NOT NULL, completed_at BIGINT NOT NULL, PRIMARY KEY(user_id,lesson_id));
CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at BIGINT NOT NULL, exam TEXT NOT NULL, answers TEXT NOT NULL, score INTEGER, total INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_attempts_user_created ON attempts(user_id,created_at DESC);
