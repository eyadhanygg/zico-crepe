/*
# Create menu and orders schema for Ziko Crepe POS

1. New Tables
- `menu_categories`: groups of menu items (name in Arabic, display order, active flag).
- `menu_items`: sellable items linked to a category (name, description, price, image, active flag).
- `orders`: one row per sale with order type (dine-in, takeaway, delivery), customer details, fees and totals.
- `order_items`: line items of an order, storing a snapshot of name and unit price at time of sale.

2. Security
- RLS enabled on every table.
- Single-tenant app with no sign-in, so policies target `anon` and `authenticated`.
- Grants are limited to the verbs the app uses. Orders and order lines cannot be updated or deleted from the client.

3. Notes
- `order_number` is an identity column so it needs no separate sequence grant.
- Seed rows for categories and items are inserted only when the tables are empty, so re-running this migration is safe.
*/

CREATE TABLE IF NOT EXISTS menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  description_ar text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_items_category_idx ON menu_items (category_id);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number bigint GENERATED ALWAYS AS IDENTITY,
  order_type text NOT NULL CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')),
  customer_name text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  delivery_address text NOT NULL DEFAULT '',
  delivery_distance_km numeric(6,2),
  delivery_fee numeric(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  subtotal numeric(10,2) NOT NULL CHECK (subtotal >= 0),
  total numeric(10,2) NOT NULL CHECK (total >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_phone_idx ON orders (customer_phone);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name_ar text NOT NULL,
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total numeric(10,2) NOT NULL CHECK (line_total >= 0),
  notes_ar text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON menu_categories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON menu_items TO anon, authenticated;
GRANT SELECT, INSERT ON orders TO anon, authenticated;
GRANT SELECT, INSERT ON order_items TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_menu_categories" ON menu_categories;
CREATE POLICY "anon_select_menu_categories" ON menu_categories FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_menu_categories" ON menu_categories;
CREATE POLICY "anon_insert_menu_categories" ON menu_categories FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_menu_categories" ON menu_categories;
CREATE POLICY "anon_update_menu_categories" ON menu_categories FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_menu_categories" ON menu_categories;
CREATE POLICY "anon_delete_menu_categories" ON menu_categories FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_menu_items" ON menu_items;
CREATE POLICY "anon_select_menu_items" ON menu_items FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_menu_items" ON menu_items;
CREATE POLICY "anon_insert_menu_items" ON menu_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_menu_items" ON menu_items;
CREATE POLICY "anon_update_menu_items" ON menu_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_menu_items" ON menu_items;
CREATE POLICY "anon_delete_menu_items" ON menu_items FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_orders" ON orders;
CREATE POLICY "anon_select_orders" ON orders FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_order_items" ON order_items;
CREATE POLICY "anon_select_order_items" ON order_items FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_order_items" ON order_items;
CREATE POLICY "anon_insert_order_items" ON order_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

INSERT INTO menu_categories (name_ar, sort_order)
SELECT v.name_ar, v.sort_order FROM (VALUES
  ('كريب حلو', 1),
  ('كريب مالح', 2),
  ('مشروبات', 3)
) AS v(name_ar, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM menu_categories);

INSERT INTO menu_items (category_id, name_ar, description_ar, price, image_url, sort_order)
SELECT c.id, v.name_ar, v.description_ar, v.price, v.image_url, v.sort_order
FROM (VALUES
  ('كريب حلو', 'نوتيلا بالموز', 'نوتيلا فاخرة مع شرائح موز طازجة', 85.00, 'https://images.pexels.com/photos/6732239/pexels-photo-6732239.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 1),
  ('كريب حلو', 'فراولة بالكريمة', 'فراولة طازجة مع كريمة مخفوقة وصوص كراميل', 90.00, 'https://images.pexels.com/photos/6732239/pexels-photo-6732239.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 2),
  ('كريب حلو', 'كريب بالبوظة', 'كرة بوظة فانيليا مع صوص الشوكولاتة', 95.00, 'https://images.pexels.com/photos/26646120/pexels-photo-26646120.png?auto=compress&cs=tinysrgb&h=650&w=940', 3),
  ('كريب مالح', 'دجاج ومشروم', 'دجاج متبل مع مشروم وجبن موزاريلا', 105.00, 'https://images.pexels.com/photos/1439319/pexels-photo-1439319.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 1),
  ('كريب مالح', 'جبن وسجق', 'جبن شيدر مع سجق مشوي وصوص الثوم', 110.00, 'https://images.pexels.com/photos/1439319/pexels-photo-1439319.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 2),
  ('مشروبات', 'عصير ليمون بالنعناع', 'ليمون طازج مع نعناع', 35.00, 'https://images.pexels.com/photos/7140288/pexels-photo-7140288.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 1)
) AS v(category_name, name_ar, description_ar, price, image_url, sort_order)
JOIN menu_categories c ON c.name_ar = v.category_name
WHERE NOT EXISTS (SELECT 1 FROM menu_items);
