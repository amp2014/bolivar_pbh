-- House binder inventory seed — physical items at Bolivar PBH
-- Column name is `location` (not location_in_house) per app schema
-- Run in Supabase SQL editor; verify with the count query at the bottom

INSERT INTO inventory (name, category, location, notes, condition)
VALUES

-- PORCH CLOSET (7 rows)
('Cornhole Boards',            'Games & Recreation', 'Porch Closet', 'Includes bags',             'good'),
('Cornhole Bags',              'Games & Recreation', 'Porch Closet', 'Stored with cornhole boards','good'),
('Tools (general)',            'Tools & Hardware',   'Porch Closet', null,                         'good'),
('Paint',                      'Tools & Hardware',   'Porch Closet', null,                         'good'),
('Caulk',                      'Tools & Hardware',   'Porch Closet', null,                         'good'),
('Air Compressor',             'Tools & Hardware',   'Porch Closet', null,                         'good'),
('Nails / Nuts / Bolts / Screws', 'Tools & Hardware','Porch Closet', 'Assorted fasteners',         'good'),

-- SHED (12 rows)
('Ice Chests / Coolers',       'Outdoor & Beach',    'Shed',         null,                         'good'),
('Bicycles',                   'Outdoor & Beach',    'Shed',         null,                         'good'),
('Beach Chairs',               'Outdoor & Beach',    'Shed',         null,                         'good'),
('Beach Toys',                 'Outdoor & Beach',    'Shed',         null,                         'good'),
('Fishing Rods',               'Outdoor & Beach',    'Shed',         null,                         'good'),
('Fishing Gear',               'Outdoor & Beach',    'Shed',         'Tackle, lures, etc.',         'good'),
('Yard Tools',                 'Tools & Hardware',   'Shed',         null,                         'good'),
('BBQ Grill',                  'Outdoor & Beach',    'Shed',         null,                         'good'),
('Charcoal',                   'Outdoor & Beach',    'Shed',         'Dispose of ash in burn barrel in back yard', 'good'),
('Lighter Fluid',              'Outdoor & Beach',    'Shed',         'Stored with grill and charcoal', 'good'),
('Lumber (misc)',              'Tools & Hardware',   'Shed',         null,                         'good'),
('Plumbing Supplies',          'Tools & Hardware',   'Shed',         null,                         'good');

-- Verify: row count increase and grouped breakdown
-- SELECT location, count(*) FROM inventory GROUP BY location ORDER BY location;
