
// src/pages/DepartmentsPage.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSupabase } from "@/hooks/useSupabase";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Navigation from "@/components/Navigation";

interface Department {
  id: number;
  name: string;
}

export default function DepartmentsPage() {
  const supabase = useSupabase();
  const [name, setName] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDepartments();
  }, []);

  async function fetchDepartments() {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Department name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase.from("departments").insert([{ name }]);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Success",
        description: "Department created successfully!",
      });
      setName("");
      fetchDepartments();
    } catch (error) {
      console.error("Error creating department:", error);
      toast({
        title: "Error",
        description: "Failed to create department",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-4">Departments Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Department</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Department Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Button type="submit">Create Department</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Departments</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center">Loading departments...</p>
            ) : departments.length > 0 ? (
              <ul className="space-y-2">
                {departments.map((dept) => (
                  <li key={dept.id} className="p-2 bg-gray-50 rounded">
                    {dept.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground">No departments found</p>
            )}
          </CardContent>
        </Card>
      </div>
      <Navigation />
    </div>
  );
}
