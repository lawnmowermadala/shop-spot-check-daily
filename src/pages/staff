// app/departments/page.tsx
"use client";
import { createClient } from "@/utils/supabase/client";
import { useState } from "react";

export default function DepartmentsPage() {
  const [name, setName] = useState("");
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from("departments")
      .insert([{ name }]);
    if (error) alert("Error creating department: " + error.message);
    else {
      alert("Department created!");
      setName("");
    }
  };

  return (
    <div>
      <h1>Create Department</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Department Name"
          required
        />
        <button type="submit">Create</button>
      </form>
    </div>
  );
}
