
import Navigation from '@/components/Navigation';

const AnalyticsPage = () => {
  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>
      <p className="mb-6 text-gray-600">
        View production and inventory metrics to optimize kitchen and bakery operations.
      </p>
      
      <div className="p-8 text-center border-2 border-dashed rounded-lg">
        <h2 className="text-lg font-medium text-gray-500">Analytics Coming Soon</h2>
        <p className="text-sm text-gray-400 mt-2">
          This page is under development. Soon you'll be able to track production metrics, stock levels, and sales data.
        </p>
      </div>
      
      <Navigation />
    </div>
  );
};

export default AnalyticsPage;
