
// src/pages/StaffPage.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useSupabase } from "@/hooks/useSupabase";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
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
  const supabase = useSupabase();
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDepartments();
    fetchStaff();
  }, []);

  async function fetchDepartments() {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      setDepartments(data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch departments",
        variant: "destructive",
      });
    }
  }

  async function fetchStaff() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("staff")
        .select(`
          id, 
          name, 
          department_id,
          departments(name)
        `)
        .order("name");

      if (error) {
        throw error;
      }

      const formattedStaff = data?.map(staff => ({
        id: staff.id,
        name: staff.name,
        department_id: staff.department_id,
        department_name: staff.departments?.name
      })) || [];

      setStaffMembers(formattedStaff);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast({
        title: "Error",
        description: "Failed to fetch staff members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Staff name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from("staff")
        .insert([{ name, department_id: departmentId || null }]);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Success",
        description: "Staff member added successfully!",
      });
      setName("");
      setDepartmentId("");
      fetchStaff();
    } catch (error) {
      console.error("Error adding staff member:", error);
      toast({
        title: "Error",
        description: "Failed to add staff member",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-4">Staff Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add Staff Member</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Staff Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <Select.Trigger>
                  <Select.Value placeholder="Select Department" />
                </Select.Trigger>
                <Select.Content>
                  {departments.map((dept) => (
                    <Select.Item key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              <Button type="submit">Add Staff Member</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff List</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center">Loading staff members...</p>
            ) : staffMembers.length > 0 ? (
              <ul className="space-y-2">
                {staffMembers.map((staff) => (
                  <li key={staff.id} className="p-2 bg-gray-50 rounded">
                    <strong>{staff.name}</strong> - {staff.department_name || "No Department"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground">No staff members found</p>
            )}
          </CardContent>
        </Card>
      </div>
      <Navigation />
    </div>
  );
}
