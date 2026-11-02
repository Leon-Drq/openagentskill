-- New logins keep the source account/profile relationship atomic. Existing
-- profiles and their claimed identities are never overwritten by this trigger.
CREATE TRIGGER auth_user_profile AFTER INSERT ON auth_users BEGIN
  INSERT INTO profiles(id,display_name) VALUES (NEW.id,NEW.name)
  ON CONFLICT(id) DO NOTHING;
END;
