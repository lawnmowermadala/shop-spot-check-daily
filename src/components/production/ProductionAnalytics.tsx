
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AIProductionAnalytics from './AIProductionAnalytics';

interface DailyProduction {
  date: string;
  total_production: number;
}

interface StaffProductionStats {
  staff_name: string;
  total_batches: number;
  total_units: number;
}

interface ProductionBatch {
  id: string;
  product_name: string;
  quantity_produced: number;
  production_date: string;
  staff_name: string;
  total_ingredient_cost?: number;
  cost_per_unit?: number;
}

interface ProductionAnalyticsProps {
  showComparison: boolean;
  showStaffAnalytics: boolean;
  showAIAnalytics?: boolean;
  comparisonDays: number;
  setComparisonDays: (days: number) => void;
  historicalProduction: DailyProduction[];
  staffStats: StaffProductionStats[];
  productionBatches?: ProductionBatch[];
}

const ProductionAnalytics = ({
  showComparison,
  showStaffAnalytics,
  showAIAnalytics = true,
  comparisonDays,
  setComparisonDays,
  historicalProduction,
  staffStats,
  productionBatches = []
}: ProductionAnalyticsProps) => {
  const chartData = historicalProduction.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    production: item.total_production
  }));

  const staffChartData = staffStats.map(stat => ({
    name: stat.staff_name,
    units: stat.total_units
  }));

  return (
    <>
      {/* AI Production Analytics */}
      {showAIAnalytics && (
        <AIProductionAnalytics
          historicalProduction={historicalProduction}
          staffStats={staffStats}
          productionBatches={productionBatches}
          comparisonDays={comparisonDays}
        />
      )}

      {/* Staff Analytics Chart */}
      {showStaffAnalytics && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span>Staff Production Analytics</span>
              <select 
                value={comparisonDays}
                onChange={(e) => setComparisonDays(Number(e.target.value))}
                className="p-2 border rounded text-sm w-full sm:w-auto"
              >
                <option value="7">Last 7 Days</option>
                <option value="14">Last 14 Days</option>
                <option value="30">Last 30 Days</option>
              </select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="units" fill="#22c55e" name="Total Units Produced" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Staff Stats Table */}
            {staffStats.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Total Batches</TableHead>
                    <TableHead>Total Units</TableHead>
                    <TableHead>Avg Units/Batch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffStats.map((stat, index) => (
                    <TableRow key={stat.staff_name} className={index === 0 ? 'bg-green-50' : ''}>
                      <TableCell className="font-medium">
                        {stat.staff_name}
                        {index === 0 && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Top Producer</span>}
                      </TableCell>
                      <TableCell>{stat.total_batches}</TableCell>
                      <TableCell>{stat.total_units}</TableCell>
                      <TableCell>{stat.total_batches > 0 ? (stat.total_units / stat.total_batches).toFixed(1) : '0.0'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Production Comparison Chart */}
      {showComparison && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span>Production Comparison</span>
              <select 
                value={comparisonDays}
                onChange={(e) => setComparisonDays(Number(e.target.value))}
                className="p-2 border rounded text-sm w-full sm:w-auto"
              >
                <option value="7">Last 7 Days</option>
                <option value="14">Last 14 Days</option>
                <option value="30">Last 30 Days</option>
              </select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="production" fill="#3b82f6" name="Daily Production (units)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default ProductionAnalytics;
