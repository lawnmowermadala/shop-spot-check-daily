import { useState, useEffect } from 'react';
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";

interface Department {
  id: number;
  name: string;
}

interface Staff {
  id: number;
  name: string;
  department_id: number;
  department_name?: string;
}

export default function StaffPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);

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
      const { data, error } = await supabase
        .from('staff')
        .select(`
          *,
          departments:department_id (name)
        `)
        .order('name'); // Sort by staff name

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
        department_name: item.departments?.name || 'No Department'
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
        <h2 className="text-lg font-semibold mb-2">Staff List</h2>
        {loadingStaff ? (
          <p className="text-center text-gray-500">Loading staff members...</p>
        ) : staff.length > 0 ? (
          <div className="space-y-2">
            {staff.map((person) => (
              <div key={person.id} className="p-3 border rounded bg-white shadow-sm">
                <div className="font-medium">{person.name}</div>
                <div className="text-sm text-gray-600">{person.department_name}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">No staff members found</p>
        )}
      </div>
      
      <Navigation />
    </div>
  );
}
