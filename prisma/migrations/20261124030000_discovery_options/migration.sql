CREATE TABLE "DiscoveryOption" (
  "kind" TEXT NOT NULL CHECK ("kind" IN ('condition', 'sort')),
  "key" TEXT NOT NULL,
  "labelSq" TEXT NOT NULL,
  "labelEn" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  PRIMARY KEY ("kind", "key")
);
ALTER TABLE "DiscoveryOption" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "DiscoveryOption" FROM PUBLIC;
DO $permissions$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON TABLE "DiscoveryOption" FROM %I', api_role);
    END IF;
  END LOOP;
END
$permissions$;
INSERT INTO "DiscoveryOption" ("kind", "key", "labelSq", "labelEn", "sortOrder") VALUES
  ('condition', 'NEW', 'I ri', 'New', 0),
  ('condition', 'LIKE_NEW', 'Si i ri', 'Like new', 1),
  ('condition', 'VERY_GOOD', 'Shumë mirë', 'Very good', 2),
  ('condition', 'GOOD', 'Mirë', 'Good', 3),
  ('condition', 'FAIR', 'Me shenja përdorimi', 'Visible wear', 4),
  ('sort', 'ending', 'Mbarojnë së shpejti', 'Ending soon', 0),
  ('sort', 'newest', 'Më të rejat', 'Newest', 1),
  ('sort', 'price_asc', 'Çmimi më i ulët', 'Lowest price', 2),
  ('sort', 'price_desc', 'Çmimi më i lartë', 'Highest price', 3);
