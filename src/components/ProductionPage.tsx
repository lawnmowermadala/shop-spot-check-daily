import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { BarChart, User2, PackageCheck, TrendingUp } from 'lucide-react';
import { StaffStats } from '@/types';

interface ProductionAnalyticsProps {
  showComparison: boolean;
  showStaffAnalytics: boolean;
  comparisonDays: number;
  setComparisonDays: React.Dispatch<React.SetStateAction<number>>;
  historicalProduction: number[];
  staffStats: StaffStats[];
}

const ProductionAnalytics: React.FC<ProductionAnalyticsProps> = ({
  showComparison,
  showStaffAnalytics,
  comparisonDays,
  setComparisonDays,
  historicalProduction,
  staffStats,
}) => {
  return (
    <>
      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900">AI Production Analytics</h3>
            <p className="mt-1 text-sm text-gray-600">
              Gain insights into production trends and staff performance.
            </p>
          </div>
        </div>
        <div className="mt-5 md:col-span-2 md:mt-0">
          <div className="shadow sm:overflow-hidden sm:rounded-md">
            <div className="space-y-6 bg-white px-4 py-5 sm:p-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-3 sm:col-span-2">
                  <label htmlFor="company-website" className="block text-sm font-medium text-gray-700">
                    Historical Production Data
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                      Units Produced
                    </span>
                    <input
                      type="text"
                      name="company-website"
                      id="company-website"
                      className="block w-full min-w-0 flex-1 rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="e.g., 100, 120, 110"
                      value={historicalProduction.join(', ')}
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  About
                </label>
                <div className="mt-1">
                  <textarea
                    rows={4}
                    name="about"
                    id="about"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    defaultValue={'AI analysis and insights on production data.'}
                    disabled
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Brief description of the production analysis.
                </p>
              </div>

              <div className="bg-gray-50 px-4 py-3 text-right sm:px-6">
                <button
                  type="submit"
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  disabled
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductionAnalytics;
