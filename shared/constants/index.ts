export const CATEGORIES = [
  { id: 'homemade', name: 'Homemade Products', icon: '🧵', color: '#E6E6FA' },
  { id: 'beauty', name: 'Beauty & Personal Care', icon: '🧴', color: '#FFB6C1' },
  { id: 'jewelry', name: 'Jewelry & Accessories', icon: '💍', color: '#C3B1E1' },
  { id: 'home', name: 'Home Decor', icon: '🏠', color: '#87CEEB' },
  { id: 'clothing', name: 'Clothing & Textiles', icon: '👕', color: '#FFB347' },
  { id: 'food', name: 'Food & Beverages', icon: '🍪', color: '#77DD77' },
  { id: 'crafts', name: 'Handmade Crafts', icon: '🎨', color: '#AEC6CF' },
  { id: 'pets', name: 'Pet Products', icon: '🐾', color: '#FFA07A' },
  { id: 'gifts', name: 'Customized Gifts', icon: '🎁', color: '#FFD700' },
  { id: 'other', name: 'Other', icon: '✨', color: '#D3D3D3' },
] as const;

export type CategoryId = typeof CATEGORIES[number]['id'];
