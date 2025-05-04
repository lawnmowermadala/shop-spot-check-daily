
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Home, Clipboard, Star, BarChart, Building, Users, BookOpen } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    // For ratings pages, consider both /ratings and /rate-staff as active for the ratings tab
    if (path === '/ratings' && (location.pathname === '/ratings' || location.pathname === '/rate-staff')) {
      return true;
    }
    return location.pathname === path;
  };
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-2 z-10">
      <div className="flex justify-around">
        <Link to="/">
          <Button 
            variant={isActive('/') ? 'default' : 'ghost'} 
            className="flex flex-col items-center gap-1 h-auto py-2"
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Button>
        </Link>
        <Link to="/assignments">
          <Button 
            variant={isActive('/assignments') ? 'default' : 'ghost'} 
            className="flex flex-col items-center gap-1 h-auto py-2"
          >
            <Clipboard className="h-5 w-5" />
            <span className="text-xs">Assignments</span>
          </Button>
        </Link>
        <Link to="/ratings">
          <Button 
            variant={isActive('/ratings') ? 'default' : 'ghost'} 
            className="flex flex-col items-center gap-1 h-auto py-2"
          >
            <Star className="h-5 w-5" />
            <span className="text-xs">Ratings</span>
          </Button>
        </Link>
        <Link to="/departments">
          <Button 
            variant={isActive('/departments') ? 'default' : 'ghost'} 
            className="flex flex-col items-center gap-1 h-auto py-2"
          >
            <Building className="h-5 w-5" />
            <span className="text-xs">Departments</span>
          </Button>
        </Link>
        <Link to="/staff">
          <Button 
            variant={isActive('/staff') ? 'default' : 'ghost'} 
            className="flex flex-col items-center gap-1 h-auto py-2"
          >
            <Users className="h-5 w-5" />
            <span className="text-xs">Staff</span>
          </Button>
        </Link>
        <Link to="/analytics">
          <Button 
            variant={isActive('/analytics') ? 'default' : 'ghost'} 
            className="flex flex-col items-center gap-1 h-auto py-2"
          >
            <BarChart className="h-5 w-5" />
            <span className="text-xs">Analytics</span>
          </Button>
        </Link>
        <Link to="/manual">
          <Button 
            variant={isActive('/manual') ? 'default' : 'ghost'} 
            className="flex flex-col items-center gap-1 h-auto py-2"
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-xs">Manual</span>
          </Button>
        </Link>
      </div>
    </nav>
  );
};

export default Navigation;
