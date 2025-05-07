
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Edit, Trash2, Plus, QrCode, Key, User, UserCheck, UserX } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Navigation from '@/components/Navigation';

// Types
interface PosUser {
  id: string;
  username: string;
  password: string;
  qr_code: string | null;
  role: string;
  created_at: string;
  created_by: string | null;
  active: boolean;
}

const generateQRCode = () => {
  // In a real app, use a proper QR code generation API
  // For now, we'll just create a random 8-character string
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const UserManagementPage = () => {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'kitchen-staff', // Default role
    active: true,
    useQRCode: false,
    qr_code: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch Users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['pos_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_users')
        .select('*')
        .order('username');
      
      if (error) throw error;
      return data as PosUser[];
    }
  });

  // Create/Update User Mutation
  const upsertUser = useMutation({
    mutationFn: async () => {
      if (!userForm.username || (!userForm.useQRCode && !userForm.password)) {
        throw new Error('Username and either Password or QR Code are required');
      }

      const userData = {
        username: userForm.username,
        password: userForm.useQRCode ? generateQRCode() : userForm.password,
        qr_code: userForm.useQRCode ? userForm.qr_code || generateQRCode() : null,
        role: userForm.role,
        active: userForm.active,
      };

      if (isEditing && currentUserId) {
        const { error } = await supabase
          .from('pos_users')
          .update(userData)
          .eq('id', currentUserId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pos_users')
          .insert([userData]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos_users'] });
      resetForm();
      setDialogOpen(false);
      toast(isEditing ? "User updated successfully" : "User created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Toggle User Active Status
  const toggleUserStatus = useMutation({
    mutationFn: async ({ id, active }: { id: string, active: boolean }) => {
      const { error } = await supabase
        .from('pos_users')
        .update({ active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pos_users'] });
      toast(`User ${variables.active ? 'activated' : 'deactivated'} successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Delete User Mutation
  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pos_users')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos_users'] });
      toast("User deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleEditUser = (user: PosUser) => {
    setIsEditing(true);
    setCurrentUserId(user.id);
    setUserForm({
      username: user.username,
      password: user.password,
      role: user.role,
      active: user.active || true,
      useQRCode: !!user.qr_code,
      qr_code: user.qr_code || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setUserForm({
      username: '',
      password: '',
      role: 'kitchen-staff',
      active: true,
      useQRCode: false,
      qr_code: ''
    });
    setIsEditing(false);
    setCurrentUserId(null);
    setShowPassword(false);
  };

  const handleToggleQR = () => {
    setUserForm(prev => {
      if (!prev.useQRCode && !prev.qr_code) {
        return { ...prev, useQRCode: !prev.useQRCode, qr_code: generateQRCode() };
      }
      return { ...prev, useQRCode: !prev.useQRCode };
    });
  };

  const handleGenerateNewQR = () => {
    setUserForm(prev => ({ ...prev, qr_code: generateQRCode() }));
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'supervisor':
        return 'secondary';
      case 'kitchen-staff':
      default:
        return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <UserCheck className="h-4 w-4" />;
      case 'supervisor':
        return <User className="h-4 w-4" />;
      case 'kitchen-staff':
      default:
        return <UserX className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-gray-500">Manage access for kitchen staff and supervisors</p>
        </div>
        
        {/* Add User Button */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit User' : 'Create New User'}</DialogTitle>
              <DialogDescription>
                {isEditing 
                  ? 'Update existing user information' 
                  : 'Add a new user for POS login with either password or QR code'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Username"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                />
              </div>
              
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="role">Role</Label>
                </div>
                <Select 
                  value={userForm.role} 
                  onValueChange={(value) => setUserForm({ ...userForm, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="kitchen-staff">Kitchen Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="active" 
                  checked={userForm.active}
                  onCheckedChange={(checked) => setUserForm({ ...userForm, active: checked })}
                />
                <Label htmlFor="active">Account Active</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="use-qr" 
                  checked={userForm.useQRCode}
                  onCheckedChange={handleToggleQR}
                />
                <Label htmlFor="use-qr">Use QR Code Authentication</Label>
              </div>
              
              {userForm.useQRCode ? (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="qr-code">QR Code</Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGenerateNewQR}
                      className="h-8"
                    >
                      Generate New
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="qr-code"
                      value={userForm.qr_code}
                      readOnly
                    />
                    <Button variant="outline" size="icon" className="h-10 w-10">
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    This code will be used for QR code login. Save it somewhere safe.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="h-8"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => upsertUser.mutate()}
                disabled={upsertUser.isPending}
              >
                {upsertUser.isPending 
                  ? (isEditing ? "Updating..." : "Creating...") 
                  : (isEditing ? "Update User" : "Create User")
                }
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>POS Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : users.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Login Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getRoleIcon(user.role)}
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.qr_code ? (
                          <div className="flex items-center gap-1">
                            <QrCode className="h-4 w-4" />
                            <span>QR Code</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Key className="h-4 w-4" />
                            <span>Password</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? "outline" : "secondary"}>
                          {user.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => toggleUserStatus.mutate({ 
                              id: user.id, 
                              active: !user.active 
                            })}
                          >
                            {user.active ? (
                              <UserX className="h-4 w-4 text-orange-500" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this user?')) {
                                deleteUser.mutate(user.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No users found. Create your first user to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-md">
        <h3 className="font-medium text-yellow-800">Developer Notes</h3>
        <p className="text-sm text-yellow-700 mt-1">
          This page is for developer access only. It allows you to create users with different roles for accessing the POS system.
        </p>
        <ul className="list-disc list-inside mt-2 text-sm text-yellow-700">
          <li>Admin: Full access to all features</li>
          <li>Supervisor: Access to products, stock, promotions, analytics</li>
          <li>Kitchen Staff: Access to production and expired stock management</li>
        </ul>
      </div>
      
      <Navigation />
    </div>
  );
};

export default UserManagementPage;
