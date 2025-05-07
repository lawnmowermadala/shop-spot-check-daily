
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  Menu, Croissant, ChefHat, CookingPot, ShoppingCart, 
  AlertTriangle, BarChart4, BookOpen, UserCog, LogOut, User 
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface MenuItemProps {
  icon: React.ReactElement;
  label: string;
  to: string;
  onClick?: () => void;
  badge?: React.ReactNode;
  show?: boolean;
}

const MenuItem = ({ icon, label, to, onClick, badge, show = true }: MenuItemProps) => {
  if (!show) return null;
  
  return (
    <Link to={to} onClick={onClick}>
      <Button 
        variant="ghost" 
        className="w-full justify-start gap-3 px-3 py-6 font-normal hover:bg-slate-100 relative"
      >
        {icon}
        <span>{label}</span>
        {badge}
      </Button>
    </Link>
  );
};

const SidebarMenu = () => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleClose = () => setOpen(false);

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate('/login');
  };

  // Don't show the menu if user is not logged in
  if (!user) return null;

  // Determine which menu items to show based on role
  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'admin' || user?.role === 'supervisor';
  const isKitchenStaff = user?.role === 'kitchen-staff' || isSupervisor;

  return (
    <div className="fixed top-4 left-4 z-50">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="rounded-full shadow-md">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Kitchen & Bakery</h2>
              <p className="text-sm text-muted-foreground">Production Management</p>
              {user && (
                <div className="mt-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">{user.username}</span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                    {user.role}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-auto py-2">
              <MenuItem 
                icon={<Croissant className="h-5 w-5" />} 
                label="Products" 
                to="/products"
                onClick={handleClose}
                show={isSupervisor}
              />
              <MenuItem 
                icon={<ChefHat className="h-5 w-5" />} 
                label="Daily Production" 
                to="/production"
                onClick={handleClose}
                badge={<span className="absolute right-3 rounded-full bg-orange-100 px-2 text-xs text-orange-800">Staff</span>}
                show={isKitchenStaff || isSupervisor}
              />
              <MenuItem 
                icon={<CookingPot className="h-5 w-5" />} 
                label="Stock Management" 
                to="/stock"
                onClick={handleClose}
                show={isSupervisor}
              />
              <MenuItem 
                icon={<ShoppingCart className="h-5 w-5" />} 
                label="Promotions" 
                to="/promotions"
                onClick={handleClose}
                show={isSupervisor}
              />
              <MenuItem 
                icon={<AlertTriangle className="h-5 w-5" />} 
                label="Expired Stock" 
                to="/expired"
                onClick={handleClose}
                badge={<span className="absolute right-3 rounded-full bg-orange-100 px-2 text-xs text-orange-800">Staff</span>}
                show={isKitchenStaff || isSupervisor}
              />
              <MenuItem 
                icon={<BarChart4 className="h-5 w-5" />} 
                label="Analytics" 
                to="/analytics"
                onClick={handleClose}
                show={isSupervisor}
              />
              <MenuItem 
                icon={<BookOpen className="h-5 w-5" />} 
                label="Help" 
                to="/manual"
                onClick={handleClose}
              />
              <MenuItem 
                icon={<UserCog className="h-5 w-5" />} 
                label="User Management" 
                to="/user-management"
                onClick={handleClose}
                badge={<span className="absolute right-3 rounded-full bg-purple-100 px-2 text-xs text-purple-800">Admin</span>}
                show={isAdmin}
              />
              
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 px-3 py-6 font-normal hover:bg-slate-100 text-red-600 hover:text-red-700 mt-4"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </Button>
            </div>
            
            <div className="p-4 text-center text-xs text-gray-500 border-t">
              Conceived and developed by Elton Niati<br />
              eaglevision.dev30@gmail.com
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default SidebarMenu;
