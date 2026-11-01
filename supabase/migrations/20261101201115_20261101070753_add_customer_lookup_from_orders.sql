/*
# Customer lookup for the cashier

1. New Functions
- `search_customers(p_query)`: returns up to 5 previous customers whose name contains the typed text or whose phone number starts with it. Each result has the customer's name, phone number and most recent delivery address. The search needs at least 2 characters.
- Customers are derived from past orders, so no separate customer table is needed.

2. Security Changes
- The browser can no longer read the orders or order items tables directly.
- The cashier only reads customers through `search_customers`, which returns a small, capped set of fields.
- Creating orders is unchanged and still goes through `create_order`.
*/

REVOKE SELECT ON orders FROM anon, authenticated;
REVOKE SELECT ON order_items FROM anon, authenticated;

CREATE OR REPLACE FUNCTION search_customers(p_query text) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH term AS (
    SELECT btrim(COALESCE(p_query, '')) AS value
  ),
  matched AS (
    SELECT o.customer_phone, o.customer_name, o.delivery_address, o.created_at
    FROM orders o
    CROSS JOIN term t
    WHERE length(t.value) >= 2
      AND o.customer_phone IS NOT NULL
      AND (o.customer_phone LIKE t.value || '%' OR o.customer_name ILIKE '%' || t.value || '%')
  ),
  customers AS (
    SELECT
      customer_phone AS phone,
      (array_agg(customer_name ORDER BY created_at DESC))[1] AS name,
      (array_agg(delivery_address ORDER BY created_at DESC)
        FILTER (WHERE delivery_address IS NOT NULL AND delivery_address <> ''))[1] AS address,
      max(created_at) AS last_order_at
    FROM matched
    GROUP BY customer_phone
    ORDER BY max(created_at) DESC
    LIMIT 5
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('name', name, 'phone', phone, 'address', address)
      ORDER BY last_order_at DESC
    ),
    '[]'::jsonb
  )
  FROM customers;
$$;

REVOKE EXECUTE ON FUNCTION search_customers(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_customers(text) TO anon, authenticated;