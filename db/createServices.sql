INSERT INTO "public"."Unit" ("shortName", "fullName", "price", "duration") VALUES
  ('m2', 'Area size (in m2)', 5.00, 6),
  ('m2', 'Area size (in m2)', 6.15,6),
  ('m2', 'Area size (in m2)', 10.00, 12),
  ('m2', 'Area size (in m2)', 7.00, 6),
  ('window', 'Number of windows', 30.00, 30),
  ('hour', 'Number of hours', 40.00, 60),
  ('oven', 'Number of ovens', 40.00, 60),
  ('1 kg', 'Total weight of dishes', 20.00, 30),
  ('fridge', 'Number of fridges', 40.00, 60),
  ('microwave oven', 'Number of ovens', 20.00, 20),
  ('1 kg', 'Weight', 40.00, 60),
  ('balcony', 'Number of balconies', 40.00, 30),
  ('pieces', 'Number of blinds', 25.00, 30),
  ('wardrobe', 'Number of wardrobes', 50.00, 60),
  ('pieces', 'Number of cabinets', 60.00, 90),
  ('couch', 'Number of couches', 150.00, 60),
  ('corner sofa', 'Number of sofas', 180.00, 90),
  ('carpet', 'Number of carpets', 15.00, 10),
  ('armchair', 'Number of armchairs', 55.00, 30),
  ('chair', 'Number of chairs', 20.00, 20),
  ('hour', 'Number of hours', 40.00, 60);

INSERT INTO "public"."Service" ("name", "isPrimary", "unitId", "minNumberOfUnitsIfPrimary", "minCostIfPrimary", "detergentsCost") VALUES
  ('Home Cleaning', true, 1, 30, NULL, 15),
  ('Office Cleaning', true, 2, 30, NULL, 15),
  ('Cleaning after renovation', true, 3, 30, NULL, 15),
  ('Cleaning after moving', true, 4, 30, NULL, 15),
  ('Furniture cleaning', true, NULL, NULL, 120, 15),
  ('Window cleaning', true, 5, 5, NULL, 15),
  ('Ironing', true, 6, 1, NULL, 15),
  ('Oven cleaning', false, 7, 1, NULL, 15),
  ('Dishwashing', false, 8, 1, NULL, 15),
  ('Fridge cleaning', false, 9, 1, NULL, 15),
  ('Microwave oven cleaning', false, 10, 1, NULL, 15),
  ('Clothes/bedding/towels washing', false, 11, 1, NULL, 15),
  ('Balcony cleaning', false, 12, 1, NULL, 15),
  ('Window blinds cleaning', false, 13, 1, NULL, 15),
  ('Interior of the wardrobe cleaning', false, 14, 1, NULL, 15),
  ('Interior of the kitchen cabinets cleaning', false, 15, 1, NULL, 15),
  ('Couch washing', false, 16, 1, NULL, 15),
  ('Corner sofa washing', false, 17, 1, NULL, 15),
  ('Carpet washing', false, 18, 1, NULL, 15),
  ('Armchair washing', false, 19, 1, NULL, 15),
  ('Chair/office chair/stool washing', false, 20, 1, NULL, 15),
  ('Paint/glue from floor cleaning', false, 21, 1, NULL, 15);

INSERT INTO "public"."_PrimarySecondaryService" VALUES
  -- home cleaning
  (8,   1),
  (9,   1),
  (10,  1),
  (11,  1),
  (12,  1),
  (13,  1),
  (6,   1),
  (7,   1),
  -- office cleaning
  (10,  2),
  (11,  2),
  (6,   2),
  -- renovations
  (22,  3),
  (14,  3),
  (6,   3),
  (13,  3),
  -- moving
  (6,   4),
  (13,  4),
  (15,  4),
  (16,  4),
  -- furniture
  (16,  5),
  (17,  5),
  (18,  5),
  (19,  5),
  (20,  5),
  -- window
  (14, 6),
  (13, 6);

-- or this - but the first insert is more likely to be correct
-- INSERT INTO "public"."_PrimarySecondaryService" VALUES
--   -- home cleaning
--   (1, 8),
--   (1, 9),
--   (1, 10),
--   (1, 11),
--   (1, 12),
--   (1, 13),
--   (1, 6),
--   (1, 7),
--   -- office cleaning
--   (2, 10),
--   (2, 11),
--   (2, 6),
--   -- renovations
--   (3, 22),
--   (3, 14),
--   (3, 6),
--   (3, 13),
--   -- moving
--   (4, 6),
--   (4, 13),
--   (4, 15),
--   (4, 16),
--   -- furniture
--   (5, 16),
--   (5, 17),
--   (5, 18),
--   (5, 19),
--   (5, 20),
--   -- window
--   (6, 14),
--   (6, 13);


INSERT INTO "public"."CleaningFrequency" ("name", "value") VALUES
  ('Once', 'ONCE'),
  ('Once a week', 'ONCE_A_WEEK'),
  ('Every two weeks', 'EVERY_TWO_WEEKS'),
  ('Once a month', 'ONCE_A_MONTH');


INSERT INTO "public"."_CleaningFrequencyToService" VALUES
-- home cleaning
  (1, 1),
  (2, 1),
  (3, 1),
  (4, 1),
-- office cleaning
  (1, 2),
  (2, 2),
  (3, 2),
  (4, 2),
-- cleaning after renovation
  (1, 3),
-- cleaning after moving
  (1, 4),
-- furninture cleaning
  (1, 5),
  (4, 5),
-- window cleaning
  (1, 6),
  (4, 6),
-- ironing
  (1, 7),
  (4, 7);

-- delete all subservices
-- DELETE FROM "public"."_PrimarySecondaryService"