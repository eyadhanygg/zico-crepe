/*
# Add inventory, recipes (bill of materials) and automatic stock deduction

1. New Tables
- `inventory_items`: raw materials and supplies (name, category, unit, current stock, low-stock threshold). Stock may go negative when sales outrun the recorded count, so the shortage is visible instead of blocking a sale.
- `recipe_ingredients`: for each menu item, the exact amount of each inventory item needed to make one unit (e.g. 50 g Nutella + 1 packaging box).
- `inventory_movements`: a history of every stock change, either from a sale or a manual adjustment, with the stock level after the change.

2. New Functions (all require the manager PIN, like the existing menu functions)
- `manager_list_inventory(pin)`: returns all inventory items.
- `manager_save_inventory_item(pin, item_id, name, category, unit, low_stock_threshold, initial_stock)`: creates or edits an item. The initial stock is only used when creating; stock afterwards changes only through adjustments or sales.
- `manager_adjust_inventory_stock(pin, item_id, change, note)`: adds or removes a quantity manually and logs it.
- `manager_delete_inventory_item(pin, item_id)`: removes an item. Its recipe lines are removed with it; its history is kept with the name.
- `manager_get_recipe(pin, menu_item_id)`: returns the ingredient lines of a menu item.
- `manager_save_recipe(pin, menu_item_id, lines)`: replaces the ingredient lines of a menu item in one step.
- `create_order(...)` is updated: after saving the order, it works out the ingredients used by each item's recipe, deducts them from stock, logs each change, and returns the names of any ingredients that are now at or below their threshold so the cashier can see a soft warning. The order is never blocked by stock.

3. Security Changes
- All three new tables have row level security enabled and no access is granted to `anon` or `authenticated`. The browser can only reach them through the PIN-protected functions above.
- The new functions are callable only by `anon` and `authenticated` roles through the same pattern as the existing manager functions, and check the PIN before doing anything.

4. Important Notes
- Stock deduction and order saving happen in the same database step, so either both succeed or neither does.
- Deleting a menu item still follows the existing rules; recipe lines for a deleted menu item are removed automatically.
*/

CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL CHECK (char_length(btrim(name_ar)) BETWEEN 1 AND 80),
  category text NOT NULL DEFAULT 'other' CHECK (char_length(category) BETWEEN 1 AND 40),
  unit text NOT NULL CHECK (char_length(unit) BETWEEN 1 AND 20),
  stock_quantity numeric(12,3) NOT NULL DEFAULT 0,
  low_stock_threshold numeric(12,3) NOT NULL DEFAULT 0 CHECK (low_stock_threshold >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS recipe_ingredients_inventory_item_idx
  ON recipe_ingredients (inventory_item_id);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  item_name_ar text NOT NULL,
  change_quantity numeric(12,3) NOT NULL,
  stock_after numeric(12,3) NOT NULL,
  reason text NOT NULL CHECK (reason IN ('sale', 'manual_adjust')),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 200),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_movements_item_idx
  ON inventory_movements (inventory_item_id, created_at DESC);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON inventory_items FROM anon, authenticated;
REVOKE ALL ON recipe_ingredients FROM anon, authenticated;
REVOKE ALL ON inventory_movements FROM anon, authenticated;

CREATE OR REPLACE FUNCTION manager_list_inventory(p_pin text) RETURNS jsonb
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

  RETURN jsonb_build_object('ok', true, 'data', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name_ar', name_ar,
        'category', category,
        'unit', unit,
        'stock_quantity', stock_quantity,
        'low_stock_threshold', low_stock_threshold
      )
      ORDER BY category, name_ar
    )
    FROM inventory_items
  ), '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION manager_save_inventory_item(
  p_pin text,
  p_item_id uuid,
  p_name text,
  p_category text,
  p_unit text,
  p_low_stock_threshold numeric,
  p_initial_stock numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_status text;
  v_name text := btrim(COALESCE(p_name, ''));
  v_category text := btrim(COALESCE(p_category, ''));
  v_unit text := btrim(COALESCE(p_unit, ''));
  v_id uuid;
BEGIN
  v_status := _check_manager_pin(p_pin);
  IF v_status <> 'ok' THEN
    RETURN jsonb_build_object('ok', false, 'error', v_status);
  END IF;

  IF v_name = '' OR length(v_name) > 80
     OR v_category = '' OR length(v_category) > 40
     OR v_unit = '' OR length(v_unit) > 20
     OR p_low_stock_threshold IS NULL OR p_low_stock_threshold < 0 OR p_low_stock_threshold > 1000000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  IF p_item_id IS NULL THEN
    IF p_initial_stock IS NULL OR p_initial_stock < 0 OR p_initial_stock > 1000000 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
    END IF;

    INSERT INTO inventory_items (name_ar, category, unit, stock_quantity, low_stock_threshold)
      VALUES (v_name, v_category, v_unit, round(p_initial_stock, 3), round(p_low_stock_threshold, 3))
      RETURNING id INTO v_id;

    IF p_initial_stock > 0 THEN
      INSERT INTO inventory_movements (inventory_item_id, item_name_ar, change_quantity, stock_after, reason, note)
        VALUES (v_id, v_name, round(p_initial_stock, 3), round(p_initial_stock, 3), 'manual_adjust', 'رصيد افتتاحي');
    END IF;
  ELSE
    UPDATE inventory_items
      SET name_ar = v_name,
          category = v_category,
          unit = v_unit,
          low_stock_threshold = round(p_low_stock_threshold, 3),
          updated_at = now()
      WHERE id = p_item_id
      RETURNING id INTO v_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION manager_adjust_inventory_stock(
  p_pin text,
  p_item_id uuid,
  p_change numeric,
  p_note text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_status text;
  v_note text := btrim(COALESCE(p_note, ''));
  v_name text;
  v_stock numeric(12,3);
BEGIN
  v_status := _check_manager_pin(p_pin);
  IF v_status <> 'ok' THEN
    RETURN jsonb_build_object('ok', false, 'error', v_status);
  END IF;

  IF p_change IS NULL OR p_change = 0 OR abs(p_change) > 1000000 OR length(v_note) > 200 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  UPDATE inventory_items
    SET stock_quantity = stock_quantity + round(p_change, 3),
        updated_at = now()
    WHERE id = p_item_id
    RETURNING name_ar, stock_quantity INTO v_name, v_stock;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  INSERT INTO inventory_movements (inventory_item_id, item_name_ar, change_quantity, stock_after, reason, note)
    VALUES (p_item_id, v_name, round(p_change, 3), v_stock, 'manual_adjust', v_note);

  RETURN jsonb_build_object('ok', true, 'stock_quantity', v_stock);
END;
$$;

CREATE OR REPLACE FUNCTION manager_delete_inventory_item(p_pin text, p_item_id uuid) RETURNS jsonb
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

  DELETE FROM inventory_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION manager_get_recipe(p_pin text, p_menu_item_id uuid) RETURNS jsonb
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

  RETURN jsonb_build_object('ok', true, 'data', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object('inventory_item_id', r.inventory_item_id, 'quantity', r.quantity)
      ORDER BY i.name_ar
    )
    FROM recipe_ingredients r
    JOIN inventory_items i ON i.id = r.inventory_item_id
    WHERE r.menu_item_id = p_menu_item_id
  ), '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION manager_save_recipe(
  p_pin text,
  p_menu_item_id uuid,
  p_lines jsonb
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

  IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;
  IF jsonb_array_length(p_lines) > 30 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_lines) AS l(inventory_item_id uuid, quantity numeric)
    WHERE l.inventory_item_id IS NULL OR l.quantity IS NULL OR l.quantity < 0.001 OR l.quantity > 100000
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_lines) AS l(inventory_item_id uuid, quantity numeric)
    GROUP BY l.inventory_item_id
    HAVING COUNT(*) > 1
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE id = p_menu_item_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_lines) AS l(inventory_item_id uuid, quantity numeric)
    WHERE NOT EXISTS (SELECT 1 FROM inventory_items i WHERE i.id = l.inventory_item_id)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  DELETE FROM recipe_ingredients WHERE menu_item_id = p_menu_item_id;

  INSERT INTO recipe_ingredients (menu_item_id, inventory_item_id, quantity)
  SELECT p_menu_item_id, l.inventory_item_id, round(l.quantity, 3)
  FROM jsonb_to_recordset(p_lines) AS l(inventory_item_id uuid, quantity numeric);

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION create_order(
  p_order_type text,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_delivery_distance_km numeric,
  p_delivery_fee numeric,
  p_items jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bad integer;
  v_subtotal numeric(10,2);
  v_fee numeric(10,2);
  v_total numeric(10,2);
  v_order_id uuid;
  v_order_number bigint;
  v_need RECORD;
  v_ing RECORD;
  v_low_stock jsonb := '[]'::jsonb;
BEGIN
  IF p_order_type NOT IN ('dine_in', 'takeaway', 'delivery') THEN
    RAISE EXCEPTION 'invalid order type';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'order has no items';
  END IF;

  IF p_order_type = 'delivery' AND btrim(COALESCE(p_delivery_address, '')) = '' THEN
    RAISE EXCEPTION 'delivery address is required';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE m.id IS NULL OR l.quantity IS NULL OR l.quantity < 1 OR l.quantity > 99),
    COALESCE(SUM(m.price * l.quantity), 0)
  INTO v_bad, v_subtotal
  FROM jsonb_to_recordset(p_items) AS l(menu_item_id uuid, quantity integer, notes text)
  LEFT JOIN menu_items m ON m.id = l.menu_item_id AND m.is_active;

  IF v_bad > 0 THEN
    RAISE EXCEPTION 'one or more items are unavailable';
  END IF;

  v_fee := CASE WHEN p_order_type = 'delivery' THEN GREATEST(COALESCE(p_delivery_fee, 0), 0) ELSE 0 END;
  v_total := v_subtotal + v_fee;

  INSERT INTO orders (
    order_type, customer_name, customer_phone, delivery_address,
    delivery_distance_km, delivery_fee, subtotal, total
  ) VALUES (
    p_order_type,
    LEFT(COALESCE(p_customer_name, ''), 120),
    LEFT(COALESCE(p_customer_phone, ''), 30),
    LEFT(COALESCE(p_delivery_address, ''), 300),
    CASE WHEN p_order_type = 'delivery' THEN p_delivery_distance_km ELSE NULL END,
    v_fee,
    v_subtotal,
    v_total
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  INSERT INTO order_items (order_id, menu_item_id, item_name_ar, unit_price, quantity, line_total, notes_ar)
  SELECT v_order_id, m.id, m.name_ar, m.price, l.quantity, m.price * l.quantity, LEFT(COALESCE(l.notes, ''), 300)
  FROM jsonb_to_recordset(p_items) AS l(menu_item_id uuid, quantity integer, notes text)
  JOIN menu_items m ON m.id = l.menu_item_id;

  FOR v_need IN
    SELECT r.inventory_item_id, SUM(r.quantity * l.quantity) AS amount
    FROM jsonb_to_recordset(p_items) AS l(menu_item_id uuid, quantity integer, notes text)
    JOIN recipe_ingredients r ON r.menu_item_id = l.menu_item_id
    GROUP BY r.inventory_item_id
  LOOP
    UPDATE inventory_items
      SET stock_quantity = stock_quantity - v_need.amount,
          updated_at = now()
      WHERE id = v_need.inventory_item_id
      RETURNING name_ar, stock_quantity, low_stock_threshold INTO v_ing;

    INSERT INTO inventory_movements (inventory_item_id, item_name_ar, change_quantity, stock_after, reason, order_id)
      VALUES (v_need.inventory_item_id, v_ing.name_ar, -v_need.amount, v_ing.stock_quantity, 'sale', v_order_id);

    IF v_ing.stock_quantity <= v_ing.low_stock_threshold THEN
      v_low_stock := v_low_stock || jsonb_build_array(jsonb_build_object('name', v_ing.name_ar));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'delivery_fee', v_fee,
    'total', v_total,
    'low_stock', v_low_stock
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION manager_list_inventory(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION manager_save_inventory_item(text, uuid, text, text, text, numeric, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION manager_adjust_inventory_stock(text, uuid, numeric, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION manager_delete_inventory_item(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION manager_get_recipe(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION manager_save_recipe(text, uuid, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION manager_list_inventory(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manager_save_inventory_item(text, uuid, text, text, text, numeric, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manager_adjust_inventory_stock(text, uuid, numeric, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manager_delete_inventory_item(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manager_get_recipe(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manager_save_recipe(text, uuid, jsonb) TO anon, authenticated;
