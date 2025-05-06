
import { useState } from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Bread, ChefHat, CookingPot, ShoppingCart, AlertTriangle, BarChart4, BookOpen } from "lucide-react";

interface MenuItemProps {
  icon: React.ReactElement;
  label: string;
  to: string;
  onClick?: () => void;
}

const MenuItem = ({ icon, label, to, onClick }: MenuItemProps) => (
  <Link to={to} onClick={onClick}>
    <Button 
      variant="ghost" 
      className="w-full justify-start gap-3 px-3 py-6 font-normal hover:bg-slate-100"
    >
      {icon}
      <span>{label}</span>
    </Button>
  </Link>
);

const SidebarMenu = () => {
  const [open, setOpen] = useState(false);
  
  const handleClose = () => setOpen(false);

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
            </div>
            
            <div className="flex-1 overflow-auto py-2">
              <MenuItem 
                icon={<Bread className="h-5 w-5" />} 
                label="Products" 
                to="/products"
                onClick={handleClose}
              />
              <MenuItem 
                icon={<ChefHat className="h-5 w-5" />} 
                label="Daily Production" 
                to="/production"
                onClick={handleClose}
              />
              <MenuItem 
                icon={<CookingPot className="h-5 w-5" />} 
                label="Stock Management" 
                to="/stock"
                onClick={handleClose}
              />
              <MenuItem 
                icon={<ShoppingCart className="h-5 w-5" />} 
                label="Promotions" 
                to="/promotions"
                onClick={handleClose}
              />
              <MenuItem 
                icon={<AlertTriangle className="h-5 w-5" />} 
                label="Expired Stock" 
                to="/expired"
                onClick={handleClose}
              />
              <MenuItem 
                icon={<BarChart4 className="h-5 w-5" />} 
                label="Analytics" 
                to="/analytics"
                onClick={handleClose}
              />
              <MenuItem 
                icon={<BookOpen className="h-5 w-5" />} 
                label="Help" 
                to="/manual"
                onClick={handleClose}
              />
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
