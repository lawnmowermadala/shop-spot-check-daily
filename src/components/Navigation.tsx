
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Home, Clipboard, Star, BarChart, Building, Users, BookOpen, ShoppingCart, FileBarChart } from 'lucide-react';
import { useIsMobile } from "@/hooks/use-mobile";

const Navigation = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const isActive = (path: string) => {
    // For ratings pages, consider both /ratings and /rate-staff as active for the ratings tab
    if (path === '/ratings' && (location.pathname === '/ratings' || location.pathname === '/rate-staff')) {
      return true;
    }
    return location.pathname === path;
  };
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-1 z-10">
      <div className="flex justify-around items-center">
        <Link to="/">
          <Button 
            variant={isActive('/') ? 'default' : 'ghost'} 
            className="flex flex-col items-center h-auto py-1 px-1"
          >
            <Home className="h-4 w-4" />
            <span className="text-[10px]">{!isMobile && "Home"}</span>
          </Button>
        </Link>
        <Link to="/assignments">
          <Button 
            variant={isActive('/assignments') ? 'default' : 'ghost'} 
            className="flex flex-col items-center h-auto py-1 px-1"
          >
            <Clipboard className="h-4 w-4" />
            <span className="text-[10px]">{!isMobile ? "Assignments" : "Tasks"}</span>
          </Button>
        </Link>
        <Link to="/ratings">
          <Button 
            variant={isActive('/ratings') ? 'default' : 'ghost'} 
            className="flex flex-col items-center h-auto py-1 px-1"
          >
            <Star className="h-4 w-4" />
            <span className="text-[10px]">Ratings</span>
          </Button>
        </Link>
        <Link to="/departments">
          <Button 
            variant={isActive('/departments') ? 'default' : 'ghost'} 
            className="flex flex-col items-center h-auto py-1 px-1"
          >
            <Building className="h-4 w-4" />
            <span className="text-[10px]">Depts</span>
          </Button>
        </Link>
        <Link to="/staff">
          <Button 
            variant={isActive('/staff') ? 'default' : 'ghost'} 
            className="flex flex-col items-center h-auto py-1 px-1"
          >
            <Users className="h-4 w-4" />
            <span className="text-[10px]">Staff</span>
          </Button>
        </Link>
        <Link to="/pos">
          <Button 
            variant={isActive('/pos') ? 'default' : 'ghost'} 
            className="flex flex-col items-center h-auto py-1 px-1"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="text-[10px]">POS</span>
          </Button>
        </Link>
        <Link to="/sales-reports">
          <Button 
            variant={isActive('/sales-reports') ? 'default' : 'ghost'} 
            className="flex flex-col items-center h-auto py-1 px-1"
          >
            <FileBarChart className="h-4 w-4" />
            <span className="text-[10px]">Sales</span>
          </Button>
        </Link>
        <Link to="/manual">
          <Button 
            variant={isActive('/manual') ? 'default' : 'ghost'} 
            className="flex flex-col items-center h-auto py-1 px-1"
          >
            <BookOpen className="h-4 w-4" />
            <span className="text-[10px]">Help</span>
          </Button>
        </Link>
      </div>
      <div className="w-full text-center text-[9px] text-gray-500 py-1 border-t">
        Conceived and developed by Elton Niati | eaglevision.dev30@gmail.com
      </div>
    </nav>
  );
};

export default Navigation;
