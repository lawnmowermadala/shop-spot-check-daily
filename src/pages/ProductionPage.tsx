
import Navigation from '@/components/Navigation';

const ProductionPage = () => {
  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Daily Production</h1>
      <p className="mb-6 text-gray-600">
        Record and track daily production outputs for all bakery and kitchen items.
      </p>
      
      <div className="p-8 text-center border-2 border-dashed rounded-lg">
        <h2 className="text-lg font-medium text-gray-500">Production Tracking Coming Soon</h2>
        <p className="text-sm text-gray-400 mt-2">
          This page is under development. Soon you'll be able to log production quantities by staff member and view daily production summaries.
        </p>
      </div>
      
      <Navigation />
    </div>
  );
};

export default ProductionPage;
