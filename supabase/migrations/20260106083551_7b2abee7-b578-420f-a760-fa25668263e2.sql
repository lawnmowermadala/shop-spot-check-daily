-- Drop the existing check constraint and create a new one with all destinations
ALTER TABLE expired_stock_dispatches DROP CONSTRAINT IF EXISTS expired_stock_dispatches_dispatch_destination_check;

ALTER TABLE expired_stock_dispatches ADD CONSTRAINT expired_stock_dispatches_dispatch_destination_check 
CHECK (dispatch_destination IN ('pig_feed', 'dog_feed', 'ginger_biscuit', 'banana_bread', 'kitchen_used'));