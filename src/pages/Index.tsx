
import { useState } from 'react';
import ChecklistItem from '@/components/ChecklistItem';

const shopAreas = [
  {
    area: "Front Entrance",
    description: "Check cleanliness of entrance area, windows, and door handles"
  },
  {
    area: "Cash Register Area",
    description: "Ensure counter is clean and organized, check register functionality"
  },
  {
    area: "Display Windows",
    description: "Check for cleanliness, proper product arrangement, and lighting"
  },
  {
    area: "Fitting Rooms",
    description: "Inspect mirrors, hooks, and general cleanliness"
  },
  {
    area: "Main Floor",
    description: "Check aisles, product displays, and floor cleanliness"
  },
  {
    area: "Storage Room",
    description: "Verify organization, cleanliness, and inventory arrangement"
  },
  {
    area: "Break Room",
    description: "Check cleanliness, supplies, and equipment functionality"
  },
  {
    area: "Restrooms",
    description: "Inspect cleanliness, supplies, and functionality"
  },
  {
    area: "Back Office",
    description: "Check organization, cleanliness, and equipment"
  },
  {
    area: "Outdoor Area",
    description: "Inspect sidewalk, parking area, and exterior cleanliness"
  }
];

const Index = () => {
  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Daily Shop Check</h1>
      <p className="text-gray-600 mb-6 text-center">
        {new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </p>
      
      <div className="space-y-4">
        {shopAreas.map((area, index) => (
          <ChecklistItem
            key={index}
            area={area.area}
            description={area.description}
          />
        ))}
      </div>
    </div>
  );
};

export default Index;
