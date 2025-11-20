-- Add last_viewed_release column to users table for changelog notification feature
-- This column tracks which app version the user last saw in the changelog modal

ALTER TABLE users
ADD COLUMN last_viewed_release TEXT;

-- Add index for query performance
CREATE INDEX IF NOT EXISTS idx_users_last_viewed_release
ON users(last_viewed_release);

-- Add comment for documentation
COMMENT ON COLUMN users.last_viewed_release IS 'Semantic version string (e.g., "1.2.0") of the last app release the user viewed in the changelog modal. NULL means user has not viewed any changelog yet.';
