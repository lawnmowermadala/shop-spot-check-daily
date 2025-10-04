-- Create trigger to automatically deduct kitchen stock when production ingredients are added
CREATE TRIGGER trigger_deduct_kitchen_stock_on_production
  AFTER INSERT ON production_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION deduct_kitchen_stock_on_production();