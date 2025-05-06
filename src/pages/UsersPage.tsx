
import { useState, useEffect } from "react";
import Navigation from '@/components/Navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter } from "@/components/ui/drawer";
import { AlertTriangle, Trash2, UserPlus } from "lucide-react";

interface User {
  username: string;
  password: string;
  role: "supervisor" | "staff";
}

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"supervisor" | "staff">("staff");

  // Load users from localStorage on component mount
  useEffect(() => {
    const storedUsers = localStorage.getItem("bakeryUsers");
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    } else {
      // Set default user if no users exist
      const defaultUsers = [{ username: "Elton", password: "060919771982", role: "supervisor" as const }];
      setUsers(defaultUsers);
      localStorage.setItem("bakeryUsers", JSON.stringify(defaultUsers));
    }
  }, []);

  // Save users to localStorage whenever they change
  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem("bakeryUsers", JSON.stringify(users));
    }
  }, [users]);

  const handleAddUser = () => {
    if (!newUsername || !newPassword) {
      toast({
        title: "Error",
        description: "Username and password are required",
        variant: "destructive"
      });
      return;
    }

    if (users.some(user => user.username === newUsername)) {
      toast({
        title: "Error",
        description: "Username already exists",
        variant: "destructive"
      });
      return;
    }

    const newUser: User = {
      username: newUsername,
      password: newPassword,
      role: newRole
    };

    setUsers([...users, newUser]);
    setNewUsername("");
    setNewPassword("");
    setNewRole("staff");

    toast({
      title: "Success",
      description: `User ${newUsername} added successfully`
    });
  };

  const handleDeleteUser = (username: string) => {
    // Check if it's the last supervisor
    const supervisors = users.filter(user => user.role === "supervisor");
    if (supervisors.length <= 1 && supervisors.some(user => user.username === username)) {
      toast({
        title: "Error",
        description: "Cannot delete the last supervisor user",
        variant: "destructive"
      });
      return;
    }

    const updatedUsers = users.filter(user => user.username !== username);
    setUsers(updatedUsers);
    toast({
      title: "User Deleted",
      description: `User ${username} has been removed`
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <p className="mb-6 text-gray-600">
        Add, edit, or remove users who can access the production management system.
      </p>

      <div className="mb-6">
        <Drawer>
          <DrawerTrigger asChild>
            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
              <UserPlus className="mr-2 h-4 w-4" />
              Add New User
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Add New User</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-username">Username</Label>
                <Input
                  id="new-username"
                  placeholder="Enter username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex gap-4">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="role-staff"
                      name="role"
                      value="staff"
                      checked={newRole === "staff"}
                      onChange={() => setNewRole("staff")}
                      className="mr-2"
                    />
                    <Label htmlFor="role-staff" className="cursor-pointer">
                      Staff
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="role-supervisor"
                      name="role"
                      value="supervisor"
                      checked={newRole === "supervisor"}
                      onChange={() => setNewRole("supervisor")}
                      className="mr-2"
                    />
                    <Label htmlFor="role-supervisor" className="cursor-pointer">
                      Supervisor
                    </Label>
                  </div>
                </div>
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={handleAddUser} disabled={!newUsername || !newPassword}>
                Add User
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      {users.length === 0 ? (
        <div className="text-center p-8 border border-dashed rounded-lg">
          <p className="text-gray-500">No users found.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Username</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.username} className="border-t">
                  <td className="px-4 py-3">{user.username}</td>
                  <td className="px-4 py-3">
                    <span 
                      className={`inline-block px-2 py-1 rounded-full text-xs ${
                        user.role === "supervisor" 
                          ? "bg-blue-100 text-blue-700" 
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteUser(user.username)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="mt-6 bg-amber-50 p-4 rounded-lg flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
        <p className="text-sm text-amber-800">
          User credentials are stored locally in the browser. Make sure to add necessary users before clearing browser data.
        </p>
      </div>
      
      <Navigation />
    </div>
  );
};

export default UsersPage;
