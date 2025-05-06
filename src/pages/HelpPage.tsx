
import Navigation from '@/components/Navigation';
import { Link } from 'react-router-dom';

const HelpPage = () => {
  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Help & Documentation</h1>
      <p className="mb-6 text-gray-600">
        Find information and guidance on using the production management system.
      </p>
      
      <div className="grid gap-6 mb-6">
        <Link to="/manual" className="block p-6 border rounded-lg hover:bg-blue-50 transition-colors">
          <h2 className="text-xl font-semibold mb-2">User Manual</h2>
          <p className="text-gray-600">
            Detailed instructions for all features and functions of the production management system.
          </p>
        </Link>
        
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Contact Support</h2>
          <p className="text-gray-600 mb-4">
            Need additional help? Contact the development team.
          </p>
          <p className="text-gray-600">
            Email: <a href="mailto:eaglevision.dev30@gmail.com" className="text-blue-600 hover:underline">eaglevision.dev30@gmail.com</a>
          </p>
        </div>
      </div>
      
      <Navigation />
    </div>
  );
};

export default HelpPage;
