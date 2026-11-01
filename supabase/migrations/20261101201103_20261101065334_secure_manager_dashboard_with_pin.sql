/*
# Protect the manager dashboard with a PIN

1. New Table
- `manager_auth`: a single row holding the hashed manager PIN, the count of recent wrong attempts, and the lock-until time. Only database functions can read or change it; the browser has no access.

2. New Functions
- `manager_pin_is_set()`: tells the app whether a PIN has been created yet.
- `manager_verify_pin(pin)`: checks a PIN. After 5 wrong attempts the dashboard locks for 15 minutes.
- `manager_set_pin(current_pin, new_pin)`: creates the PIN on first use, or changes it when the current PIN is supplied. PINs are 4 to 8 digits.
- `manager_sales_summary(pin, from, to, timezone)`: returns the sales summary only when the PIN is correct.
- `manager_save_category`, `manager_set_category_active`, `manager_save_menu_item`, `manager_set_menu_item_active`, `manager_delete_menu_item`: every menu change, each requiring the PIN.

3. Security Changes
- Direct INSERT, UPDATE and DELETE on `menu_categories` and `menu_items` are revoked from `anon` and `authenticated`, and their write policies are dropped.
- `dashboard_sales_summary` is no longer callable from the browser. It is only reached through `manager_sales_summary`, which checks the PIN first.
- `_check_manager_pin` is internal and not callable from the browser.

4. Important Notes
- The PIN is stored as a bcrypt hash using the pgcrypto extension.
- Until the owner creates a PIN, the first visitor to the dashboard is asked to create one.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS manager_auth (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pin_hash text,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz
);

INSERT INTO manager_auth (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE manager_auth ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON manager_auth FROM anon, authenticated;

CREATE OR REPLACE FUNCTION _check_manager_pin(p_pin text) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
  v_failed integer;
  v_locked_until timestamptz;
BEGIN
  SELECT pin_hash, failed_attempts, locked_until
    INTO v_hash, v_failed, v_locked_until
    FROM manager_auth
    WHERE id = 1
    FOR UPDATE;

  IF v_hash IS NULL THEN
    RETURN 'pin_not_set';
  END IF;

  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RETURN 'pin_locked';
  END IF;

  IF p_pin IS NOT NULL AND extensions.crypt(p_pin, v_hash) = v_hash THEN
    UPDATE manager_auth SET failed_attempts = 0, locked_until = NULL WHERE id = 1;
    RETURN 'ok';
  END IF;

  IF v_failed + 1 >= 5 THEN
    UPDATE manager_auth SET failed_attempts = 0, locked_until = now() + interval '15 minutes' WHERE id = 1;
  ELSE
    UPDATE manager_auth SET failed_attempts = v_failed + 1 WHERE id = 1;
  END IF;

  RETURN 'invalid_pin';
END;
$$;

REVOKE EXECUTE ON FUNCTION _check_manager_pin(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION manager_pin_is_set() RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT pin_hash IS NOT NULL FROM manager_auth WHERE id = 1), false);
$$;

CREATE OR REPLACE FUNCTION manager_verify_pin(p_pin text) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_status text;
BEGIN
  v_status := _check_manager_pin(p_pin);
  RETURN jsonb_build_object(
    'ok', v_status = 'ok',
    'error', CASE WHEN v_status = 'ok' THEN NULL ELSE v_status END
  );
END;
$$;

CREATE OR REPLACE FUNCTION manager_set_pin(p_current_pin text, p_new_pin text) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_status text;
BEGIN
  IF p_new_pin IS NULL OR p_new_pin !~ '^[0-9]{4,8}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_format');
  END IF;

  IF manager_pin_is_set() THEN
    v_status := _check_manager_pin(p_current_pin);
    IF v_status <> 'ok' THEN
      RETURN jsonb_build_object('ok', false, 'error', v_status);
    END IF;
  END IF;

  UPDATE manager_auth
    SET pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf')),
        failed_attempts = 0,
        locked_until = NULL
    WHERE id = 1;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION dashboard_sales_summary(timestamptz, timestamptz, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION manager_sales_summary(
  p_pin text,
  p_from timestamptz,
  p_to timestamptz,
  p_timezone text DEFAULT 'Africa/Cairo'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  v_status := _check_manager_pin(p_pin);
  IF v_status <> 'ok' THEN
    RETURN jsonb_build_object('ok', false, 'error', v_status);
  END IF;
  RETURN jsonb_build_object('ok', true, 'data', dashboard_sales_summary(p_from, p_to, p_timezone));
END;
$$;

CREATE OR REPLACE FUNCTION manager_save_category(
  p_pin text,
  p_category_id uuid,
  p_name text,
  p_is_active boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_status text;
  v_name text := btrim(COALESCE(p_name, ''));
  v_id uuid;
  v_sort integer;
BEGIN
  v_status := _check_manager_pin(p_pin);
  IF v_status <> 'ok' THEN
    RETURN jsonb_build_object('ok', false, 'error', v_status);
  END IF;

  IF v_name = '' OR length(v_name) > 60 OR p_is_active IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  IF p_category_id IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort FROM menu_categories;
    INSERT INTO menu_categories (name_ar, sort_order, is_active)
      VALUES (v_name, v_sort, p_is_active)
      RETURNING id INTO v_id;
  ELSE
    UPDATE menu_categories
      SET name_ar = v_name, is_active = p_is_active
      WHERE id = p_category_id
      RETURNING id INTO v_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION manager_set_category_active(
  p_pin text,
  p_category_id uuid,
  p_is_active boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_status text;
BEGIN
  v_status := _check_manager_pin(p_pin);
  IF v_status <> 'ok' THEN
    RETURN jsonb_build_object('ok', false, 'error', v_status);
  END IF;

  IF p_is_active IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  UPDATE menu_categories SET is_active = p_is_active WHERE id = p_category_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION manager_save_menu_item(
  p_pin text,
  p_item_id uuid,
  p_category_id uuid,
  p_name text,
  p_description text,
  p_price numeric,
  p_image_url text,
  p_is_active boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_status text;
  v_name text := btrim(COALESCE(p_name, ''));
  v_description text := btrim(COALESCE(p_description, ''));
  v_id uuid;
  v_sort integer;
BEGIN
  v_status := _check_manager_pin(p_pin);
  IF v_status <> 'ok' THEN
    RETURN jsonb_build_object('ok', false, 'error', v_status);
  END IF;

  IF v_name = '' OR length(v_name) > 80 OR length(v_description) > 240
     OR p_price IS NULL OR p_price < 0 OR p_price > 100000
     OR p_category_id IS NULL OR p_is_active IS NULL
     OR (p_image_url IS NOT NULL AND (length(p_image_url) > 500 OR p_image_url !~* '^https?://')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM menu_categories WHERE id = p_category_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF p_item_id IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort
      FROM menu_items WHERE category_id = p_category_id;
    INSERT INTO menu_items (category_id, name_ar, description_ar, price, image_url, sort_order, is_active)
      VALUES (p_category_id, v_name, v_description, round(p_price, 2), NULLIF(btrim(COALESCE(p_image_url, '')), ''), v_sort, p_is_active)
      RETURNING id INTO v_id;
  ELSE
    UPDATE menu_items
      SET category_id = p_category_id,
          name_ar = v_name,
          description_ar = v_description,
          price = round(p_price, 2),
          image_url = NULLIF(btrim(COALESCE(p_image_url, '')), ''),
          is_active = p_is_active
      WHERE id = p_item_id
      RETURNING id INTO v_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION manager_set_menu_item_active(
  p_pin text,
  p_item_id uuid,
  p_is_active boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_status text;
BEGIN
  v_status := _check_manager_pin(p_pin);
  IF v_status <> 'ok' THEN
    RETURN jsonb_build_object('ok', false, 'error', v_status);
  END IF;

  IF p_is_active IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  UPDATE menu_items SET is_active = p_is_active WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION manager_delete_menu_item(p_pin text, p_item_id uuid) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_status text;
BEGIN
  v_status := _check_manager_pin(p_pin);
  IF v_status <> 'ok' THEN
    RETURN jsonb_build_object('ok', false, 'error', v_status);
  END IF;

  DELETE FROM menu_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE INSERT, UPDATE, DELETE ON menu_categories FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON menu_items FROM anon, authenticated;
DROP POLICY IF EXISTS "anon_insert_menu_categories" ON menu_categories;
DROP POLICY IF EXISTS "anon_update_menu_categories" ON menu_categories;
DROP POLICY IF EXISTS "anon_delete_menu_categories" ON menu_categories;
DROP POLICY IF EXISTS "anon_insert_menu_items" ON menu_items;
DROP POLICY IF EXISTS "anon_update_menu_items" ON menu_items;
DROP POLICY IF EXISTS "anon_delete_menu_items" ON menu_items;

REVOKE EXECUTE ON FUNCTION manager_pin_is_set() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION manager_verify_pin(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION manager_set_pin(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION manager_sales_summary(text, timestamptz, timestamptz, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION manager_save_category(text, uuid, text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION manager_set_category_active(text, uuid, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION manager_save_menu_item(text, uuid, uuid, text, text, numeric, text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION manager_set_menu_item_active(text, uuid, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION manager_delete_menu_item(text, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION manager_pin_is_set() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manager_verify_pin(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manager_set_pin(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manager_sales_summary(text, timestamptz, timestamptz, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manager_save_category(text, uuid, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manager_set_category_active(text, uuid, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manager_save_menu_item(text, uuid, uuid, text, text, numeric, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manager_set_menu_item_active(text, uuid, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manager_delete_menu_item(text, uuid) TO anon, authenticated;