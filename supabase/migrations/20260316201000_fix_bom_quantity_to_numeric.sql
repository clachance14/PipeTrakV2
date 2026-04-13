-- Change quantity from INTEGER to NUMERIC to support fractional quantities (e.g. 1.2 LF of pipe)
ALTER TABLE drawing_bom_items ALTER COLUMN quantity TYPE NUMERIC USING quantity::numeric;
