import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Package, ChefHat, BarChart3, Calendar, Utensils, Star, DollarSign, Archive, UserCheck, Search, AlertTriangle } from "lucide-react";

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/ingredients", icon: Utensils, label: "Ingredients" },
    { to: "/products", icon: Package, label: "Products" },
    { to: "/recipes", icon: ChefHat, label: "Recipes" },
    { to: "/suppliers", icon: Users, label: "Suppliers" },
    { to: "/customers", icon: UserCheck, label: "Customers" },
    { to: "/sales", icon: DollarSign, label: "Sales" },
    { to: "/expenses", icon: BarChart3, label: "Expenses" },
    { to: "/inventory", icon: Archive, label: "Inventory" },
    { to: "/reports", icon: Calendar, label: "Reports" },
    { to: "/duplicate-review", icon: AlertTriangle, label: "Review Duplicates" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t z-50">
      <ul className="flex justify-around items-center p-2">
        {navItems.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 ${
                location.pathname === item.to ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="text-xs">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navigation;
