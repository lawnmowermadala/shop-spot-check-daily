
import { useState, useEffect } from 'react';
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import Navigation from "@/components/Navigation";

interface Department {
  id: number;
  name: string;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDepartment, setNewDepartment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepartments();
  }, []);

  async function fetchDepartments() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      setDepartments(data || []);
    } catch (error) {
      toast.error("Error loading departments");
      console.error("Error fetching departments:", error);
    } finally {
      setLoading(false);
    }
  }

  async function addDepartment() {
    if (!newDepartment.trim()) {
      toast.error("Please enter a department name");
      return;
    }

    try {
      const { error } = await supabase
        .from('departments')
        .insert([{ name: newDepartment.trim() }]);

      if (error) {
        throw error;
      }

      toast.success("Department added successfully");
      setNewDepartment('');
      fetchDepartments();
    } catch (error) {
      toast.error("Error adding department");
      console.error("Error adding department:", error);
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Departments</h1>
      
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Add New Department</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Department Name"
            value={newDepartment}
            onChange={(e) => setNewDepartment(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addDepartment()}
          />
          <Button onClick={addDepartment}>Add</Button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Existing Departments</h2>
        {loading ? (
          <p className="text-center text-gray-500">Loading departments...</p>
        ) : departments.length > 0 ? (
          <div className="space-y-2">
            {departments.map((dept) => (
              <div key={dept.id} className="p-3 border rounded bg-white shadow-sm">
                {dept.name}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">No departments found</p>
        )}
      </div>
      
      <Navigation />
    </div>
  );
}
