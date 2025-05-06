
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Croissant, ChefHat, CookingPot, ShoppingCart, AlertTriangle, BarChart4, BookOpen, Users, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface MenuItemProps {
  icon: React.ReactElement;
  label: string;
  to: string;
  onClick?: () => void;
}

// Initial default user
const DEFAULT_USERS = [
  { username: "Elton", password: "060919771982", role: "supervisor" }
];

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);
  const [users, setUsers] = useState(DEFAULT_USERS);
  
  // Load users from localStorage on component mount
  useEffect(() => {
    const storedUsers = localStorage.getItem("bakeryUsers");
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    }
  }, []);

  const handleLogin = () => {
    const user = users.find(
      (user) => user.username === username && user.password === password
    );

    if (user) {
      setIsAuthenticated(true);
      setCurrentUser({ username: user.username, role: user.role });
      toast({
        title: "Login Successful",
        description: `Welcome, ${user.username}!`,
      });
      // Clear password field but keep username
      setPassword("");
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid username or password",
        variant: "destructive"
      });
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
  };

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
            
            {!isAuthenticated ? (
              <div className="flex-1 p-4">
                <h3 className="text-lg font-medium mb-4">Login Required</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleLogin();
                      }}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleLogin}
                    disabled={!username || !password}
                  >
                    Login
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-3 bg-blue-50">
                  <p className="text-sm">
                    Logged in as: <strong>{currentUser?.username}</strong> ({currentUser?.role})
                  </p>
                </div>
                <div className="flex-1 overflow-auto py-2">
                  <MenuItem 
                    icon={<Croissant className="h-5 w-5" />} 
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
                  {currentUser?.role === "supervisor" && (
                    <MenuItem 
                      icon={<Users className="h-5 w-5" />} 
                      label="User Management" 
                      to="/users"
                      onClick={handleClose}
                    />
                  )}
                  <MenuItem 
                    icon={<BookOpen className="h-5 w-5" />} 
                    label="Help" 
                    to="/manual"
                    onClick={handleClose}
                  />
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 px-3 py-6 font-normal text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => {
                      handleLogout();
                      handleClose();
                    }}
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </Button>
                </div>
              </>
            )}
            
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
