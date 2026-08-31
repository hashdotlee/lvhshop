ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS weight_g int,
ADD COLUMN IF NOT EXISTS length_cm int,
ADD COLUMN IF NOT EXISTS width_cm int,
ADD COLUMN IF NOT EXISTS height_cm int,
ADD COLUMN IF NOT EXISTS delivery_note text,
ADD COLUMN IF NOT EXISTS carrier_metadata jsonb;
