/*
# Add secure order creation function

1. New Functions
- `create_order(...)`: validates the cart, reads each item's current price from `menu_items`, calculates the subtotal and total on the server, then writes the order and its lines in one transaction.

2. Security Changes
- Direct INSERT on `orders` and `order_items` is revoked from `anon` and `authenticated`, and their insert policies are dropped. Orders can only be created through the function, so the browser cannot submit its own prices.
- The function runs as its owner (SECURITY DEFINER) with a fixed search path.
- EXECUTE is granted to `anon` and `authenticated` only, because the app has no sign-in and the cashier screen calls it directly.

3. Important Notes
- Delivery fee is passed in by the cashier screen and stored with the order; it is not recalculated here yet.
- Items that are missing, inactive, or have a quantity outside 1-99 cause the whole order to be rejected.
*/

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

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'delivery_fee', v_fee,
    'total', v_total
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION create_order(text, text, text, text, numeric, numeric, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_order(text, text, text, text, numeric, numeric, jsonb) TO anon, authenticated;

REVOKE INSERT ON orders FROM anon, authenticated;
REVOKE INSERT ON order_items FROM anon, authenticated;
DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
DROP POLICY IF EXISTS "anon_insert_order_items" ON order_items;
