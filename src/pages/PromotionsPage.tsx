
import Navigation from '@/components/Navigation';

const PromotionsPage = () => {
  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Promotions & Markdowns</h1>
      <p className="mb-6 text-gray-600">
        Manage promotional discounts and product markdowns to optimize inventory and sales.
      </p>
      
      <div className="p-8 text-center border-2 border-dashed rounded-lg">
        <h2 className="text-lg font-medium text-gray-500">Promotions Management Coming Soon</h2>
        <p className="text-sm text-gray-400 mt-2">
          This page is under development. Soon you'll be able to set up promotional discounts and manage product markdowns.
        </p>
      </div>
      
      <Navigation />
    </div>
  );
};

export default PromotionsPage;
