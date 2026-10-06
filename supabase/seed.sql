-- MkulimaLink demo data.
--
-- Generated file — do not edit. Regenerate with:
--
--     npm run seed:sql
--
-- Built from src/data/catalog.js and src/data/seed/*, which are the same modules
-- the app falls back to when no project is configured. Editing those and running
-- the script again is the way to change what is in here.
--
-- Every timestamp is relative to when this file is applied, not to when it was
-- written: the demo market is about freshness, and fixed dates would make a
-- project seeded last month read as a dead one.
--
-- Safe to re-run. Each statement upserts on a natural key, so applying it twice
-- refreshes the timestamps instead of duplicating the market.

begin;

-- The units farmers and buyers quote in, and what one of each weighs.
insert into public.units (id, label, short_label, kg) values
  ('crate', 'Crate', 'crate', 64),
  ('gunia', 'Bag (gunia)', '90 kg bag', 90),
  ('net', 'Net', 'net', 13),
  ('kg', 'Kilogram', 'kg', 1),
  ('bunch', 'Bunch', 'bunch', 18),
  ('tray', 'Tray', 'tray', 1.9)
on conflict (id) do update set
  label = excluded.label,
  short_label = excluded.short_label,
  kg = excluded.kg;

insert into public.grades (id, label, note, sort_order) values
  ('g1', 'Grade 1', 'Uniform size, no blemish', 0),
  ('g2', 'Grade 2', 'Sound, some size variation', 1),
  ('ungraded', 'Ungraded', 'Straight from the field', 2)
on conflict (id) do update set
  label = excluded.label,
  note = excluded.note,
  sort_order = excluded.sort_order;

-- sort_order is the order the board lists them in — see board_today().
insert into public.crops (id, name, category, unit_id, sort_order) values
  ('tomato', 'Tomato', 'Vegetables', 'crate', 0),
  ('potato', 'Potato', 'Roots', 'gunia', 1),
  ('onion', 'Red onion', 'Vegetables', 'net', 2),
  ('cabbage', 'Cabbage', 'Vegetables', 'gunia', 3),
  ('kale', 'Kale (sukuma)', 'Greens', 'gunia', 4),
  ('avocado', 'Hass avocado', 'Fruit', 'crate', 5),
  ('banana', 'Banana', 'Fruit', 'bunch', 6),
  ('maize', 'Dry maize', 'Grain', 'gunia', 7),
  ('beans', 'Rosecoco beans', 'Legumes', 'gunia', 8),
  ('capsicum', 'Capsicum', 'Vegetables', 'crate', 9),
  ('eggs', 'Eggs', 'Livestock', 'tray', 10),
  ('passion', 'Passion fruit', 'Fruit', 'crate', 11)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  unit_id = excluded.unit_id,
  sort_order = excluded.sort_order;

-- Counties that supply Nairobi and Mombasa in volume.
insert into public.counties (name) values
  ('Bomet'),
  ('Bungoma'),
  ('Kiambu'),
  ('Kirinyaga'),
  ('Kisii'),
  ('Machakos'),
  ('Meru'),
  ('Murang’a'),
  ('Nakuru'),
  ('Narok'),
  ('Nyandarua'),
  ('Nyeri'),
  ('Taita Taveta'),
  ('Trans Nzoia'),
  ('Uasin Gishu')
on conflict (name) do nothing;

insert into public.reference_markets (id, name, city) values
  ('wakulima', 'Wakulima', 'Nairobi'),
  ('kongowea', 'Kongowea', 'Mombasa'),
  ('kibuye', 'Kibuye', 'Kisumu')
on conflict (id) do update set
  name = excluded.name,
  city = excluded.city;

-- Demo accounts. user_id stays null on every one: two thirds of them
-- registered over USSD and have no login at all, and the rest are demo rows
-- with no auth.users behind them. account_no_seq starts at 1190, so the first
-- real signup continues the series rather than colliding with these.
insert into public.profiles (account_no, name, role, county, channel, state, phone, deals, gmv, created_at) values
  ('u-1189', 'Mercy Chebet', 'farmer', 'Bomet', 'ussd', 'pending', '0722 415 118', 0, 0, now() - interval '18 minutes'),
  ('u-1188', 'Sailapu Produce', 'buyer', 'Nakuru', 'web', 'pending', '0733 902 674', 0, 0, now() - interval '84 minutes'),
  ('u-1187', 'Joseph Kimani', 'farmer', 'Nyandarua', 'android', 'pending', '0710 336 291', 0, 0, now() - interval '360 minutes'),
  ('u-1186', 'Halima Yusuf', 'farmer', 'Taita Taveta', 'ussd', 'active', '0729 118 540', 1, 68400, now() - interval '1140 minutes'),
  ('u-1185', 'Peter Njoroge', 'farmer', 'Kiambu', 'android', 'active', '0721 447 903', 2, 154800, now() - interval '1560 minutes'),
  ('u-1184', 'Gathoni Kitchens', 'buyer', 'Kiambu', 'web', 'active', '0700 552 188', 3, 402600, now() - interval '1980 minutes'),
  ('u-1183', 'Eunice Wairimu', 'farmer', 'Nyeri', 'ussd', 'pending', '0715 620 774', 0, 0, now() - interval '2640 minutes'),
  ('u-1182', 'Barasa Njeru', 'farmer', 'Trans Nzoia', 'android', 'active', '0726 809 315', 4, 611000, now() - interval '3000 minutes'),
  ('u-1181', 'Alice Moraa', 'farmer', 'Kisii', 'ussd', 'active', '0717 293 660', 1, 44200, now() - interval '3300 minutes'),
  ('u-1180', 'Riverside Grocers', 'buyer', 'Kiambu', 'web', 'active', '0705 774 021', 9, 1284000, now() - interval '3660 minutes'),
  ('u-1179', 'Daniel Kiptoo', 'farmer', 'Uasin Gishu', 'android', 'limited', '0723 501 887', 1, 39500, now() - interval '3960 minutes'),
  ('u-1178', 'Faith Nyambura', 'farmer', 'Murang’a', 'ussd', 'active', '0718 342 155', 2, 96300, now() - interval '4200 minutes'),
  ('u-1177', 'Simon Mutiso', 'farmer', 'Machakos', 'ussd', 'active', '0712 668 430', 3, 121700, now() - interval '4740 minutes'),
  ('u-1176', 'Kilimo Fresh Ltd', 'buyer', 'Nakuru', 'web', 'active', '0709 210 366', 14, 2940000, now() - interval '5400 minutes'),
  ('u-1175', 'Rebecca Auma', 'farmer', 'Bungoma', 'ussd', 'pending', '0714 905 277', 0, 0, now() - interval '5940 minutes'),
  ('u-1174', 'Stephen Kariuki', 'farmer', 'Kirinyaga', 'android', 'active', '0720 133 592', 6, 788400, now() - interval '6240 minutes'),
  ('u-1173', 'Mwea Rice & Veg', 'buyer', 'Kirinyaga', 'web', 'active', '0702 481 730', 7, 966100, now() - interval '6720 minutes'),
  ('u-1172', 'Lucy Wangeci', 'farmer', 'Nyandarua', 'ussd', 'active', '0716 559 048', 2, 87900, now() - interval '7080 minutes'),
  ('u-1171', 'Elijah Ochieng', 'farmer', 'Kisii', 'android', 'suspended', '0724 770 213', 1, 28600, now() - interval '7560 minutes'),
  ('u-1170', 'Naserian Sankale', 'farmer', 'Narok', 'ussd', 'active', '0711 048 695', 5, 512300, now() - interval '7980 minutes'),
  ('u-1169', 'Hotel Sarova Sourcing', 'buyer', 'Nakuru', 'web', 'active', '0703 916 224', 22, 4118000, now() - interval '8400 minutes'),
  ('u-1168', 'Zachary Mwenda', 'farmer', 'Meru', 'android', 'active', '0727 385 901', 3, 233500, now() - interval '9300 minutes'),
  ('u-1167', 'Priscilla Cherono', 'farmer', 'Bomet', 'ussd', 'active', '0719 604 458', 4, 296700, now() - interval '10320 minutes'),
  ('u-1166', 'Githeri House', 'buyer', 'Kiambu', 'android', 'limited', '0706 337 862', 2, 118000, now() - interval '10680 minutes'),
  ('u-1165', 'Musa Abdalla', 'farmer', 'Taita Taveta', 'ussd', 'active', '0713 220 597', 2, 74800, now() - interval '11040 minutes'),
  ('u-1164', 'Wanjiru Kamau', 'farmer', 'Nyeri', 'android', 'active', '0722 861 340', 8, 903200, now() - interval '11400 minutes'),
  ('u-1163', 'Tabitha Nekesa', 'farmer', 'Bungoma', 'ussd', 'active', '0715 093 728', 1, 41600, now() - interval '11820 minutes'),
  ('u-1162', 'Karatina Aggregators', 'buyer', 'Nyeri', 'web', 'active', '0708 442 019', 18, 3366400, now() - interval '12300 minutes'),
  ('u-1161', 'Boniface Ndegwa', 'farmer', 'Kiambu', 'android', 'active', '0721 705 286', 5, 447900, now() - interval '12660 minutes'),
  ('u-1160', 'Esther Kanini', 'farmer', 'Machakos', 'ussd', 'active', '0717 826 604', 3, 158300, now() - interval '13140 minutes'),
  ('u-1159', 'Kipchoge Wekesa', 'farmer', 'Trans Nzoia', 'android', 'active', '0726 314 977', 11, 1702500, now() - interval '13440 minutes'),
  ('u-1158', 'Salome Atieno', 'farmer', 'Kisii', 'ussd', 'active', '0712 550 831', 2, 66100, now() - interval '13740 minutes'),
  ('u-1157', 'Nairobi School Meals', 'buyer', 'Kiambu', 'web', 'active', '0701 668 455', 26, 5240800, now() - interval '14040 minutes'),
  ('u-1156', 'Gideon Rotich', 'farmer', 'Uasin Gishu', 'ussd', 'active', '0723 907 142', 4, 318600, now() - interval '14280 minutes'),
  ('u-1155', 'Margaret Wangari', 'farmer', 'Murang’a', 'android', 'active', '0720 483 719', 7, 622400, now() - interval '14820 minutes'),
  ('u-1154', 'Coast Fresh Traders', 'buyer', 'Taita Taveta', 'web', 'active', '0704 271 508', 12, 1998300, now() - interval '15480 minutes'),
  ('u-1153', 'Vincent Kilonzo', 'farmer', 'Machakos', 'ussd', 'active', '0718 736 220', 2, 92500, now() - interval '15840 minutes'),
  ('u-1152', 'Jane Wanjiku', 'farmer', 'Kirinyaga', 'android', 'active', '0722 059 384', 9, 1146700, now() - interval '16260 minutes'),
  ('u-1151', 'Leonard Osoro', 'farmer', 'Kisii', 'ussd', 'active', '0716 401 953', 3, 137200, now() - interval '16680 minutes'),
  ('u-1150', 'Nakuru Wholesale Veg', 'buyer', 'Nakuru', 'web', 'active', '0707 155 632', 20, 3804500, now() - interval '17100 minutes'),
  ('u-1149', 'Agnes Nyaguthii', 'farmer', 'Nyeri', 'ussd', 'active', '0713 984 407', 5, 361800, now() - interval '17460 minutes'),
  ('u-1148', 'Hosea Sang', 'farmer', 'Bomet', 'android', 'active', '0725 612 178', 6, 528900, now() - interval '17820 minutes'),
  ('u-1147', 'Purity Mbaka', 'farmer', 'Meru', 'ussd', 'active', '0719 337 865', 4, 274600, now() - interval '18180 minutes'),
  ('u-1146', 'Limuru Green Market', 'buyer', 'Kiambu', 'web', 'active', '0705 890 341', 16, 2612900, now() - interval '18480 minutes'),
  ('u-1145', 'Nicholas Maina', 'farmer', 'Nyandarua', 'android', 'active', '0721 264 730', 10, 1337500, now() - interval '18600 minutes')
on conflict (account_no) do update set
  name = excluded.name,
  role = excluded.role,
  county = excluded.county,
  channel = excluded.channel,
  state = excluded.state,
  phone = excluded.phone,
  deals = excluded.deals,
  gmv = excluded.gmv,
  created_at = excluded.created_at;

-- farmer_id is null: these nine farmers are not among the seeded accounts, and
-- inventing links would have put nine fake relationships in on day one. The
-- denormalised name is what the schema keeps a lot readable by.
insert into public.listings (id, farmer_name, farmer_lots, farmer_rating, crop_id, grade_id, quantity, price, county, ward, ready_in_days, status, note, created_at) values
  ('lot-2841', 'Grace Wanjiku', 37, 4.9, 'tomato', 'g1', 42, 4900, 'Kirinyaga', 'Mwea', 1, 'open', 'Picked this morning, still firm. Can load onto a 3-tonne pickup.', now() - interval '36 minutes'),
  ('lot-2839', 'Kipchoge Farms', 112, 4.8, 'potato', 'g1', 120, 3250, 'Nyandarua', 'Ol Kalou', 0, 'open', 'Shangi variety, cured four days. Loading bay on the tarmac.', now() - interval '180 minutes'),
  ('lot-2836', 'Njeri Mwangi', 21, 5, 'avocado', 'g1', 64, 2680, 'Murang’a', 'Kandara', 2, 'open', 'Export-reject Hass — full size, dry matter above 24%.', now() - interval '300 minutes'),
  ('lot-2834', 'Samuel Otieno', 58, 4.6, 'kale', 'g2', 30, 1210, 'Kiambu', 'Limuru', 0, 'open', 'Cut to order — tell me the morning you want it and I harvest at 5am.', now() - interval '480 minutes'),
  ('lot-2830', 'Naserian Cooperative', 240, 4.9, 'onion', 'g1', 210, 1420, 'Narok', 'Suswa', 0, 'open', 'Cooperative lot from nine members. Graded and netted on site.', now() - interval '1320 minutes'),
  ('lot-2828', 'Mutuma Kariuki', 14, 4.7, 'capsicum', 'g1', 18, 5500, 'Meru', 'Timau', 1, 'open', 'Mixed red and yellow, greenhouse grown. Cold room available.', now() - interval '1620 minutes'),
  ('lot-2825', 'Chepkoech Ngeno', 31, 4.8, 'beans', 'g1', 45, 11400, 'Bomet', 'Longisa', 0, 'open', 'Dried to 13% moisture and sorted twice. Moisture meter reading on request.', now() - interval '2640 minutes'),
  ('lot-2821', 'Barasa Holdings', 96, 4.5, 'maize', 'g2', 300, 4550, 'Trans Nzoia', 'Kitale', 3, 'open', 'Aflatoxin tested, certificate attached to the lot.', now() - interval '3600 minutes'),
  ('lot-2818', 'Moraa Nyakundi', 44, 4.7, 'banana', 'g1', 88, 1000, 'Kisii', 'Nyaribari', 1, 'open', 'Tissue-culture bananas, cut green for a two-day haul.', now() - interval '4380 minutes')
on conflict (id) do update set
  farmer_name = excluded.farmer_name,
  farmer_lots = excluded.farmer_lots,
  farmer_rating = excluded.farmer_rating,
  crop_id = excluded.crop_id,
  grade_id = excluded.grade_id,
  quantity = excluded.quantity,
  price = excluded.price,
  county = excluded.county,
  ward = excluded.ward,
  ready_in_days = excluded.ready_in_days,
  status = excluded.status,
  note = excluded.note,
  created_at = excluded.created_at;

-- Fourteen trading days per crop, walked backwards from today by the same
-- function that draws the trend with no project attached — so switching one on
-- does not redraw the chart. Yesterday is derived from each row's stated
-- 24-hour change, which is why board_today() can read the change off the data
-- instead of storing it.
insert into public.board_prices (board_date, crop_id, price, broker_price) values
  ((now() at time zone 'Africa/Nairobi')::date - 13, 'tomato', 4380, 3520),
  ((now() at time zone 'Africa/Nairobi')::date - 12, 'tomato', 4470, 3590),
  ((now() at time zone 'Africa/Nairobi')::date - 11, 'tomato', 4450, 3580),
  ((now() at time zone 'Africa/Nairobi')::date - 10, 'tomato', 4350, 3500),
  ((now() at time zone 'Africa/Nairobi')::date - 9, 'tomato', 4420, 3550),
  ((now() at time zone 'Africa/Nairobi')::date - 8, 'tomato', 4360, 3510),
  ((now() at time zone 'Africa/Nairobi')::date - 7, 'tomato', 4410, 3550),
  ((now() at time zone 'Africa/Nairobi')::date - 6, 'tomato', 4340, 3490),
  ((now() at time zone 'Africa/Nairobi')::date - 5, 'tomato', 4410, 3550),
  ((now() at time zone 'Africa/Nairobi')::date - 4, 'tomato', 4500, 3620),
  ((now() at time zone 'Africa/Nairobi')::date - 3, 'tomato', 4420, 3550),
  ((now() at time zone 'Africa/Nairobi')::date - 2, 'tomato', 4510, 3630),
  ((now() at time zone 'Africa/Nairobi')::date - 1, 'tomato', 4570, 3670),
  ((now() at time zone 'Africa/Nairobi')::date, 'tomato', 4850, 3900),
  ((now() at time zone 'Africa/Nairobi')::date - 13, 'potato', 3030, 2460),
  ((now() at time zone 'Africa/Nairobi')::date - 12, 'potato', 3040, 2470),
  ((now() at time zone 'Africa/Nairobi')::date - 11, 'potato', 3040, 2470),
  ((now() at time zone 'Africa/Nairobi')::date - 10, 'potato', 3050, 2480),
  ((now() at time zone 'Africa/Nairobi')::date - 9, 'potato', 3030, 2460),
  ((now() at time zone 'Africa/Nairobi')::date - 8, 'potato', 2990, 2430),
  ((now() at time zone 'Africa/Nairobi')::date - 7, 'potato', 3030, 2460),
  ((now() at time zone 'Africa/Nairobi')::date - 6, 'potato', 3110, 2530),
  ((now() at time zone 'Africa/Nairobi')::date - 5, 'potato', 3070, 2490),
  ((now() at time zone 'Africa/Nairobi')::date - 4, 'potato', 3110, 2530),
  ((now() at time zone 'Africa/Nairobi')::date - 3, 'potato', 3160, 2570),
  ((now() at time zone 'Africa/Nairobi')::date - 2, 'potato', 3160, 2570),
  ((now() at time zone 'Africa/Nairobi')::date - 1, 'potato', 3130, 2540),
  ((now() at time zone 'Africa/Nairobi')::date, 'potato', 3200, 2600),
  ((now() at time zone 'Africa/Nairobi')::date - 13, 'onion', 1640, 1300),
  ((now() at time zone 'Africa/Nairobi')::date - 12, 'onion', 1600, 1270),
  ((now() at time zone 'Africa/Nairobi')::date - 11, 'onion', 1570, 1250),
  ((now() at time zone 'Africa/Nairobi')::date - 10, 'onion', 1530, 1210),
  ((now() at time zone 'Africa/Nairobi')::date - 9, 'onion', 1510, 1200),
  ((now() at time zone 'Africa/Nairobi')::date - 8, 'onion', 1500, 1190),
  ((now() at time zone 'Africa/Nairobi')::date - 7, 'onion', 1470, 1170),
  ((now() at time zone 'Africa/Nairobi')::date - 6, 'onion', 1440, 1140),
  ((now() at time zone 'Africa/Nairobi')::date - 5, 'onion', 1460, 1160),
  ((now() at time zone 'Africa/Nairobi')::date - 4, 'onion', 1480, 1170),
  ((now() at time zone 'Africa/Nairobi')::date - 3, 'onion', 1510, 1200),
  ((now() at time zone 'Africa/Nairobi')::date - 2, 'onion', 1480, 1170),
  ((now() at time zone 'Africa/Nairobi')::date - 1, 'onion', 1500, 1190),
  ((now() at time zone 'Africa/Nairobi')::date, 'onion', 1450, 1150),
  ((now() at time zone 'Africa/Nairobi')::date - 13, 'cabbage', 1780, 1410),
  ((now() at time zone 'Africa/Nairobi')::date - 12, 'cabbage', 1800, 1420),
  ((now() at time zone 'Africa/Nairobi')::date - 11, 'cabbage', 1810, 1430),
  ((now() at time zone 'Africa/Nairobi')::date - 10, 'cabbage', 1840, 1450),
  ((now() at time zone 'Africa/Nairobi')::date - 9, 'cabbage', 1860, 1470),
  ((now() at time zone 'Africa/Nairobi')::date - 8, 'cabbage', 1830, 1440),
  ((now() at time zone 'Africa/Nairobi')::date - 7, 'cabbage', 1820, 1440),
  ((now() at time zone 'Africa/Nairobi')::date - 6, 'cabbage', 1820, 1440),
  ((now() at time zone 'Africa/Nairobi')::date - 5, 'cabbage', 1830, 1440),
  ((now() at time zone 'Africa/Nairobi')::date - 4, 'cabbage', 1860, 1470),
  ((now() at time zone 'Africa/Nairobi')::date - 3, 'cabbage', 1900, 1500),
  ((now() at time zone 'Africa/Nairobi')::date - 2, 'cabbage', 1860, 1470),
  ((now() at time zone 'Africa/Nairobi')::date - 1, 'cabbage', 1880, 1480),
  ((now() at time zone 'Africa/Nairobi')::date, 'cabbage', 1900, 1500),
  ((now() at time zone 'Africa/Nairobi')::date - 13, 'kale', 1210, 950),
  ((now() at time zone 'Africa/Nairobi')::date - 12, 'kale', 1200, 940),
  ((now() at time zone 'Africa/Nairobi')::date - 11, 'kale', 1200, 940),
  ((now() at time zone 'Africa/Nairobi')::date - 10, 'kale', 1220, 960),
  ((now() at time zone 'Africa/Nairobi')::date - 9, 'kale', 1220, 960),
  ((now() at time zone 'Africa/Nairobi')::date - 8, 'kale', 1200, 940),
  ((now() at time zone 'Africa/Nairobi')::date - 7, 'kale', 1210, 950),
  ((now() at time zone 'Africa/Nairobi')::date - 6, 'kale', 1230, 960),
  ((now() at time zone 'Africa/Nairobi')::date - 5, 'kale', 1230, 960),
  ((now() at time zone 'Africa/Nairobi')::date - 4, 'kale', 1240, 970),
  ((now() at time zone 'Africa/Nairobi')::date - 3, 'kale', 1260, 990),
  ((now() at time zone 'Africa/Nairobi')::date - 2, 'kale', 1250, 980),
  ((now() at time zone 'Africa/Nairobi')::date - 1, 'kale', 1270, 1000),
  ((now() at time zone 'Africa/Nairobi')::date, 'kale', 1250, 980),
  ((now() at time zone 'Africa/Nairobi')::date - 13, 'avocado', 2310, 1800),
  ((now() at time zone 'Africa/Nairobi')::date - 12, 'avocado', 2320, 1800),
  ((now() at time zone 'Africa/Nairobi')::date - 11, 'avocado', 2360, 1840),
  ((now() at time zone 'Africa/Nairobi')::date - 10, 'avocado', 2410, 1870),
  ((now() at time zone 'Africa/Nairobi')::date - 9, 'avocado', 2430, 1890),
  ((now() at time zone 'Africa/Nairobi')::date - 8, 'avocado', 2450, 1910),
  ((now() at time zone 'Africa/Nairobi')::date - 7, 'avocado', 2500, 1940),
  ((now() at time zone 'Africa/Nairobi')::date - 6, 'avocado', 2550, 1980),
  ((now() at time zone 'Africa/Nairobi')::date - 5, 'avocado', 2520, 1960),
  ((now() at time zone 'Africa/Nairobi')::date - 4, 'avocado', 2510, 1950),
  ((now() at time zone 'Africa/Nairobi')::date - 3, 'avocado', 2470, 1920),
  ((now() at time zone 'Africa/Nairobi')::date - 2, 'avocado', 2520, 1960),
  ((now() at time zone 'Africa/Nairobi')::date - 1, 'avocado', 2490, 1940),
  ((now() at time zone 'Africa/Nairobi')::date, 'avocado', 2700, 2100),
  ((now() at time zone 'Africa/Nairobi')::date - 13, 'banana', 980, 760),
  ((now() at time zone 'Africa/Nairobi')::date - 12, 'banana', 980, 760),
  ((now() at time zone 'Africa/Nairobi')::date - 11, 'banana', 980, 760),
  ((now() at time zone 'Africa/Nairobi')::date - 10, 'banana', 1000, 780),
  ((now() at time zone 'Africa/Nairobi')::date - 9, 'banana', 1020, 790),
  ((now() at time zone 'Africa/Nairobi')::date - 8, 'banana', 1030, 800),
  ((now() at time zone 'Africa/Nairobi')::date - 7, 'banana', 1010, 780),
  ((now() at time zone 'Africa/Nairobi')::date - 6, 'banana', 1010, 780),
  ((now() at time zone 'Africa/Nairobi')::date - 5, 'banana', 1030, 800),
  ((now() at time zone 'Africa/Nairobi')::date - 4, 'banana', 1010, 780),
  ((now() at time zone 'Africa/Nairobi')::date - 3, 'banana', 990, 770),
  ((now() at time zone 'Africa/Nairobi')::date - 2, 'banana', 980, 760),
  ((now() at time zone 'Africa/Nairobi')::date - 1, 'banana', 980, 760),
  ((now() at time zone 'Africa/Nairobi')::date, 'banana', 980, 760),
  ((now() at time zone 'Africa/Nairobi')::date - 13, 'maize', 4600, 4050),
  ((now() at time zone 'Africa/Nairobi')::date - 12, 'maize', 4640, 4090),
  ((now() at time zone 'Africa/Nairobi')::date - 11, 'maize', 4730, 4160),
  ((now() at time zone 'Africa/Nairobi')::date - 10, 'maize', 4620, 4070),
  ((now() at time zone 'Africa/Nairobi')::date - 9, 'maize', 4720, 4160),
  ((now() at time zone 'Africa/Nairobi')::date - 8, 'maize', 4670, 4110),
  ((now() at time zone 'Africa/Nairobi')::date - 7, 'maize', 4740, 4170),
  ((now() at time zone 'Africa/Nairobi')::date - 6, 'maize', 4780, 4210),
  ((now() at time zone 'Africa/Nairobi')::date - 5, 'maize', 4840, 4260),
  ((now() at time zone 'Africa/Nairobi')::date - 4, 'maize', 4810, 4230),
  ((now() at time zone 'Africa/Nairobi')::date - 3, 'maize', 4790, 4220),
  ((now() at time zone 'Africa/Nairobi')::date - 2, 'maize', 4750, 4180),
  ((now() at time zone 'Africa/Nairobi')::date - 1, 'maize', 4640, 4090),
  ((now() at time zone 'Africa/Nairobi')::date, 'maize', 4600, 4050),
  ((now() at time zone 'Africa/Nairobi')::date - 13, 'beans', 10250, 9090),
  ((now() at time zone 'Africa/Nairobi')::date - 12, 'beans', 10300, 9140),
  ((now() at time zone 'Africa/Nairobi')::date - 11, 'beans', 10520, 9330),
  ((now() at time zone 'Africa/Nairobi')::date - 10, 'beans', 10480, 9300),
  ((now() at time zone 'Africa/Nairobi')::date - 9, 'beans', 10570, 9380),
  ((now() at time zone 'Africa/Nairobi')::date - 8, 'beans', 10600, 9400),
  ((now() at time zone 'Africa/Nairobi')::date - 7, 'beans', 10720, 9510),
  ((now() at time zone 'Africa/Nairobi')::date - 6, 'beans', 10820, 9600),
  ((now() at time zone 'Africa/Nairobi')::date - 5, 'beans', 11080, 9830),
  ((now() at time zone 'Africa/Nairobi')::date - 4, 'beans', 11350, 10070),
  ((now() at time zone 'Africa/Nairobi')::date - 3, 'beans', 11160, 9900),
  ((now() at time zone 'Africa/Nairobi')::date - 2, 'beans', 11190, 9930),
  ((now() at time zone 'Africa/Nairobi')::date - 1, 'beans', 11100, 9850),
  ((now() at time zone 'Africa/Nairobi')::date, 'beans', 11500, 10200),
  ((now() at time zone 'Africa/Nairobi')::date - 13, 'capsicum', 5240, 4170),
  ((now() at time zone 'Africa/Nairobi')::date - 12, 'capsicum', 5140, 4090),
  ((now() at time zone 'Africa/Nairobi')::date - 11, 'capsicum', 5040, 4010),
  ((now() at time zone 'Africa/Nairobi')::date - 10, 'capsicum', 4980, 3970),
  ((now() at time zone 'Africa/Nairobi')::date - 9, 'capsicum', 5050, 4020),
  ((now() at time zone 'Africa/Nairobi')::date - 8, 'capsicum', 5060, 4030),
  ((now() at time zone 'Africa/Nairobi')::date - 7, 'capsicum', 5000, 3980),
  ((now() at time zone 'Africa/Nairobi')::date - 6, 'capsicum', 5110, 4070),
  ((now() at time zone 'Africa/Nairobi')::date - 5, 'capsicum', 5000, 3980),
  ((now() at time zone 'Africa/Nairobi')::date - 4, 'capsicum', 4990, 3970),
  ((now() at time zone 'Africa/Nairobi')::date - 3, 'capsicum', 5070, 4040),
  ((now() at time zone 'Africa/Nairobi')::date - 2, 'capsicum', 5040, 4010),
  ((now() at time zone 'Africa/Nairobi')::date - 1, 'capsicum', 5150, 4100),
  ((now() at time zone 'Africa/Nairobi')::date, 'capsicum', 5400, 4300),
  ((now() at time zone 'Africa/Nairobi')::date - 13, 'eggs', 450, 400),
  ((now() at time zone 'Africa/Nairobi')::date - 12, 'eggs', 450, 400),
  ((now() at time zone 'Africa/Nairobi')::date - 11, 'eggs', 440, 390),
  ((now() at time zone 'Africa/Nairobi')::date - 10, 'eggs', 440, 390),
  ((now() at time zone 'Africa/Nairobi')::date - 9, 'eggs', 430, 380),
  ((now() at time zone 'Africa/Nairobi')::date - 8, 'eggs', 440, 390),
  ((now() at time zone 'Africa/Nairobi')::date - 7, 'eggs', 450, 400),
  ((now() at time zone 'Africa/Nairobi')::date - 6, 'eggs', 450, 400),
  ((now() at time zone 'Africa/Nairobi')::date - 5, 'eggs', 450, 400),
  ((now() at time zone 'Africa/Nairobi')::date - 4, 'eggs', 450, 400),
  ((now() at time zone 'Africa/Nairobi')::date - 3, 'eggs', 460, 410),
  ((now() at time zone 'Africa/Nairobi')::date - 2, 'eggs', 470, 420),
  ((now() at time zone 'Africa/Nairobi')::date - 1, 'eggs', 470, 420),
  ((now() at time zone 'Africa/Nairobi')::date, 'eggs', 470, 420),
  ((now() at time zone 'Africa/Nairobi')::date - 13, 'passion', 5670, 4570),
  ((now() at time zone 'Africa/Nairobi')::date - 12, 'passion', 5710, 4600),
  ((now() at time zone 'Africa/Nairobi')::date - 11, 'passion', 5770, 4650),
  ((now() at time zone 'Africa/Nairobi')::date - 10, 'passion', 5740, 4630),
  ((now() at time zone 'Africa/Nairobi')::date - 9, 'passion', 5890, 4750),
  ((now() at time zone 'Africa/Nairobi')::date - 8, 'passion', 5850, 4720),
  ((now() at time zone 'Africa/Nairobi')::date - 7, 'passion', 5920, 4770),
  ((now() at time zone 'Africa/Nairobi')::date - 6, 'passion', 6050, 4880),
  ((now() at time zone 'Africa/Nairobi')::date - 5, 'passion', 5950, 4800),
  ((now() at time zone 'Africa/Nairobi')::date - 4, 'passion', 5890, 4750),
  ((now() at time zone 'Africa/Nairobi')::date - 3, 'passion', 5980, 4820),
  ((now() at time zone 'Africa/Nairobi')::date - 2, 'passion', 6000, 4840),
  ((now() at time zone 'Africa/Nairobi')::date - 1, 'passion', 6070, 4900),
  ((now() at time zone 'Africa/Nairobi')::date, 'passion', 6200, 5000)
on conflict (board_date, crop_id) do update set
  price = excluded.price,
  broker_price = excluded.broker_price;

-- fee is a generated column — public.buyer_fee(amount) — so it is deliberately
-- not written here. The buyer's 6% rides on top of the amount and the farmer is
-- paid in full, and the schema is where that rule is kept rather than the seed.
insert into public.settlements (id, listing_id, farmer_name, buyer_name, amount, state, mpesa_ref, opened_at, settled_at) values
  ('st-4471', 'lot-2825', 'Chepkoech Ngeno', 'Nairobi School Meals', 522000, 'releasing', 'TJ7QK4L2XM', now() - interval '24 minutes', null),
  ('st-4470', 'lot-2830', 'Naserian Cooperative', 'Kilimo Fresh Ltd', 298200, 'held', 'TJ7PB9R6WC', now() - interval '180 minutes', null),
  ('st-4469', 'lot-2839', 'Kipchoge Farms', 'Nakuru Wholesale Veg', 390000, 'held', 'TJ6ZN3H8VD', now() - interval '420 minutes', null),
  ('st-4468', 'lot-2818', 'Moraa Nyakundi', 'Coast Fresh Traders', 88000, 'held', 'TJ6MC5T1QF', now() - interval '720 minutes', null),
  ('st-4467', 'lot-2841', 'Grace Wanjiku', 'Hotel Sarova Sourcing', 205800, 'failed', 'TJ6HD2Y7KP', now() - interval '1080 minutes', null),
  ('st-4466', 'lot-2836', 'Njeri Mwangi', 'Riverside Grocers', 171520, 'paid', 'TJ5WR8G4NB', now() - interval '1620 minutes', now() - interval '1619 minutes'),
  ('st-4465', 'lot-2834', 'Samuel Otieno', 'Gathoni Kitchens', 36300, 'paid', 'TJ5KF6J9LT', now() - interval '2040 minutes', now() - interval '2039 minutes')
on conflict (id) do update set
  listing_id = excluded.listing_id,
  farmer_name = excluded.farmer_name,
  buyer_name = excluded.buyer_name,
  amount = excluded.amount,
  state = excluded.state,
  mpesa_ref = excluded.mpesa_ref,
  opened_at = excluded.opened_at,
  settled_at = excluded.settled_at;

-- All open — resolved_at, resolved_by and resolution stay null.
insert into public.flags (id, listing_id, rule, detail, severity, raised_at) values
  ('flag-118', 'lot-2828', 'Possible double post', 'Same crate count, grade and photos as lot #2827, posted forty minutes earlier. One of the two is likely a repeat.', 'review', now() - interval '120 minutes'),
  ('flag-117', 'lot-2821', 'Certificate unread', 'Aflatoxin certificate attached as a photo the parser could not read. Needs a human to confirm the batch number.', 'review', now() - interval '540 minutes'),
  ('flag-116', 'lot-2834', 'Repeat cancellation', 'Third lot this month from this farmer cancelled after a buyer committed.', 'urgent', now() - interval '1260 minutes'),
  ('flag-115', 'lot-2818', 'Weight dispute open', 'Buyer weighed 1.46 t against 1.58 t declared. Payment held pending both sides’ photos.', 'urgent', now() - interval '1800 minutes')
on conflict (id) do update set
  listing_id = excluded.listing_id,
  rule = excluded.rule,
  detail = excluded.detail,
  severity = excluded.severity,
  raised_at = excluded.raised_at;

-- The external probes only. There is no row here for Postgres itself: the
-- client derives that from its own connection, because a row in Postgres
-- saying Postgres is reachable is only ever readable when it already is.
insert into public.system_checks (id, label, state, detail, meta, sort_order) values
  ('board', 'Board publish', 'ok', 'Today’s prices posted 05:12 EAT, ahead of the 06:00 cutoff.', '12 crops', 0),
  ('feed-wakulima', 'Wakulima price feed', 'warning', 'No sheet since Monday. Tomato and onion are holding Monday’s reference.', '2 days stale', 1),
  ('mpesa', 'M-Pesa B2C', 'ok', 'Settling in about 40 seconds. No failed disbursements today.', '38 s median', 2),
  ('sms', 'SMS and USSD gateway', 'warning', 'Safaricom shortcode queue backed up — price alerts are 25 minutes late.', '25 min lag', 3)
on conflict (id) do update set
  label = excluded.label,
  state = excluded.state,
  detail = excluded.detail,
  meta = excluded.meta,
  sort_order = excluded.sort_order;

commit;
