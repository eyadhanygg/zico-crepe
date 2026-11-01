/*
# Add dashboard sales summary function

1. New Function
- `dashboard_sales_summary(p_from, p_to, p_timezone)`: returns one JSON object with the sales figures for a time range:
  - Totals: order count, gross sales, item sales, delivery fees, average ticket.
  - Breakdown by order type (dine-in, takeaway, delivery).
  - Daily performance: orders and sales per calendar day in the restaurant's timezone.
  - Top 5 selling items by revenue.

2. Security
- The function runs with the caller's permissions (SECURITY INVOKER) and only reads `orders` and `order_items`, which the app already allows for reading.
- EXECUTE is granted to `anon` and `authenticated`, matching the rest of the app which has no sign-in.

3. Important Notes
- The date range is limited to 400 days to keep queries fast.
- An invalid timezone or an end date before the start date is rejected with a clear error.
*/

CREATE OR REPLACE FUNCTION dashboard_sales_summary(
  p_from timestamptz,
  p_to timestamptz,
  p_timezone text DEFAULT 'Africa/Cairo'
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to <= p_from THEN
    RAISE EXCEPTION 'invalid date range';
  END IF;

  IF p_to - p_from > interval '400 days' THEN
    RAISE EXCEPTION 'date range is too large';
  END IF;

  PERFORM now() AT TIME ZONE p_timezone;

  WITH scoped AS (
    SELECT o.id, o.order_type, o.subtotal, o.delivery_fee, o.total, o.created_at
    FROM orders o
    WHERE o.created_at >= p_from AND o.created_at < p_to
  ),
  totals AS (
    SELECT
      COUNT(*) AS order_count,
      COALESCE(SUM(total), 0) AS gross_sales,
      COALESCE(SUM(subtotal), 0) AS item_sales,
      COALESCE(SUM(delivery_fee), 0) AS delivery_fees
    FROM scoped
  ),
  by_type AS (
    SELECT order_type, COUNT(*) AS order_count, COALESCE(SUM(total), 0) AS sales
    FROM scoped
    GROUP BY order_type
  ),
  by_day AS (
    SELECT
      to_char((created_at AT TIME ZONE p_timezone)::date, 'YYYY-MM-DD') AS day,
      COUNT(*) AS order_count,
      COALESCE(SUM(total), 0) AS sales
    FROM scoped
    GROUP BY 1
  ),
  top_items AS (
    SELECT oi.item_name_ar AS name, SUM(oi.quantity) AS quantity, SUM(oi.line_total) AS sales
    FROM order_items oi
    JOIN scoped s ON s.id = oi.order_id
    GROUP BY oi.item_name_ar
    ORDER BY SUM(oi.line_total) DESC, oi.item_name_ar
    LIMIT 5
  )
  SELECT jsonb_build_object(
    'order_count', (SELECT order_count FROM totals),
    'gross_sales', (SELECT gross_sales FROM totals),
    'item_sales', (SELECT item_sales FROM totals),
    'delivery_fees', (SELECT delivery_fees FROM totals),
    'average_ticket', (
      SELECT CASE WHEN order_count > 0 THEN ROUND(gross_sales / order_count, 2) ELSE 0 END FROM totals
    ),
    'by_type', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('order_type', order_type, 'order_count', order_count, 'sales', sales) ORDER BY order_type)
      FROM by_type
    ), '[]'::jsonb),
    'by_day', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('day', day, 'order_count', order_count, 'sales', sales) ORDER BY day)
      FROM by_day
    ), '[]'::jsonb),
    'top_items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', name, 'quantity', quantity, 'sales', sales))
      FROM top_items
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION dashboard_sales_summary(timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dashboard_sales_summary(timestamptz, timestamptz, text) TO anon, authenticated;