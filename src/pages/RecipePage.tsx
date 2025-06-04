// Ingredient form state
const [ingredientData, setIngredientData] = useState({
  ingredient_id: '', // NEW: store ingredient ID
  ingredient_name: '',
  pack_size: '',
  pack_unit: 'kg',
  pack_price: '',
  quantity_used: '',
  used_unit: 'g'
});

// Edit states
const [editIngredientData, setEditIngredientData] = useState({
  ingredient_id: '', // NEW: store ingredient ID for edit
  ingredient_name: '',
  pack_size: '',
  pack_unit: '',
  pack_price: '',
  quantity_used: '',
  used_unit: ''
});
