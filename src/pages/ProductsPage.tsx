
import Navigation from '@/components/Navigation';

const ProductsPage = () => {
  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Products</h1>
      <p className="mb-6 text-gray-600">
        Manage your bakery and kitchen products catalog here. Add new products, update existing ones, and organize them by categories.
      </p>
      
      <div className="p-8 text-center border-2 border-dashed rounded-lg">
        <h2 className="text-lg font-medium text-gray-500">Product Management Coming Soon</h2>
        <p className="text-sm text-gray-400 mt-2">
          This page is under development. Check back later for product catalog management features.
        </p>
      </div>
      
      <Navigation />
    </div>
  );
};

export default ProductsPage;
