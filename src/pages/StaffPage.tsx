import { useState, useEffect } from 'react';
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";

interface Department {
  id: number;
  name: string;
}

interface Staff {
  id: number;
  name: string;
  department_id: number;
  department_name?: string;
  active?: boolean;
}

export default function StaffPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editName, setEditName] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');

  useEffect(() => {
    fetchDepartments();
    fetchStaff();
  }, []);

  async function fetchDepartments() {
    try {
      setLoadingDepts(true);
      console.log("Fetching departments...");
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name'); // Already sorted by name

      if (error) {
        console.error("Error fetching departments:", error);
        throw error;
      }

      console.log("Departments data:", data);
      setDepartments(data || []);
    } catch (error) {
      toast.error("Error loading departments");
      console.error("Error fetching departments:", error);
    } finally {
      setLoadingDepts(false);
    }
  }

  async function fetchStaff() {
    try {
      setLoadingStaff(true);
      console.log("Fetching staff members...");
      // Join staff with departments to get department names
      let query = supabase
        .from('staff')
        .select(`
          *,
          departments:department_id (name)
        `);
      
      // Filter by active status if showInactive is false
      if (!showInactive) {
        query = query.eq('active', true);
      }
      
      const { data, error } = await query.order('name');

      if (error) {
        console.error("Error fetching staff:", error);
        throw error;
      }

      console.log("Staff data:", data);
      // Transform the data to include the department name
      const staffWithDeptNames = data?.map(item => ({
        id: item.id,
        name: item.name,
        department_id: item.department_id,
        department_name: item.departments?.name || 'No Department',
        active: item.active
      })) || [];

      setStaff(staffWithDeptNames);
    } catch (error) {
      toast.error("Error loading staff members");
      console.error("Error fetching staff:", error);
    } finally {
      setLoadingStaff(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Please enter a staff name");
      return;
    }

    if (!departmentId) {
      toast.error("Please select a department");
      return;
    }

    try {
      console.log("Adding new staff member:", { name, department_id: departmentId });
      const { error, data } = await supabase
        .from('staff')
        .insert([{ 
          name: name.trim(), 
          department_id: parseInt(departmentId) 
        }])
        .select();

      if (error) {
        console.error("Error adding staff:", error);
        throw error;
      }

      console.log("New staff member added:", data);
      toast.success("Staff member added successfully");
      setName('');
      setDepartmentId('');
      fetchStaff();
    } catch (error) {
      toast.error("Error adding staff member");
      console.error("Error adding staff:", error);
    }
  }

  async function handleEdit(person: Staff) {
    setEditingStaff(person);
    setEditName(person.name);
    setEditDepartmentId(person.department_id.toString());
  }

  async function handleUpdate() {
    if (!editingStaff) return;
    
    if (!editName.trim()) {
      toast.error("Please enter a staff name");
      return;
    }

    if (!editDepartmentId) {
      toast.error("Please select a department");
      return;
    }

    try {
      const { error } = await supabase
        .from('staff')
        .update({ 
          name: editName.trim(), 
          department_id: parseInt(editDepartmentId) 
        })
        .eq('id', editingStaff.id);

      if (error) throw error;

      toast.success("Staff member updated successfully");
      setEditingStaff(null);
      fetchStaff();
    } catch (error) {
      toast.error("Error updating staff member");
      console.error("Error updating staff:", error);
    }
  }

  async function handleToggleActive(person: Staff) {
    try {
      const { error } = await supabase
        .from('staff')
        .update({ active: !person.active })
        .eq('id', person.id);

      if (error) throw error;

      toast.success(person.active ? "Staff member deactivated" : "Staff member activated");
      fetchStaff();
    } catch (error) {
      toast.error("Error updating staff status");
      console.error("Error updating staff status:", error);
    }
  }

  useEffect(() => {
    fetchStaff();
  }, [showInactive]);

  const departmentOptions = departments.map((dept) => ({
    value: dept.id.toString(),
    label: dept.name,
  }));

  return (
    <div className="max-w-md mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Staff Management</h1>
      
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Add New Staff Member</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Staff Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          
          <Select value={departmentId} onValueChange={setDepartmentId} required>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent items={departmentOptions} />
          </Select>
          
          <Button type="submit">Add Staff Member</Button>
        </form>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Staff List</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
            {showInactive ? "Hide Inactive" : "Show Inactive"}
          </Button>
        </div>
        {loadingStaff ? (
          <p className="text-center text-gray-500">Loading staff members...</p>
        ) : staff.length > 0 ? (
          <div className="space-y-2">
            {staff.map((person) => (
              <div key={person.id} className={`p-3 border rounded shadow-sm ${person.active === false ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">
                      {person.name}
                      {person.active === false && <span className="ml-2 text-xs text-gray-500">(Inactive)</span>}
                    </div>
                    <div className="text-sm text-gray-600">{person.department_name}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(person)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(person)}
                    >
                      {person.active === false ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-600" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">No staff members found</p>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Staff Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
            
            <Select value={editDepartmentId} onValueChange={setEditDepartmentId} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent items={departmentOptions} />
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStaff(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Navigation />
    </div>
  );
}
