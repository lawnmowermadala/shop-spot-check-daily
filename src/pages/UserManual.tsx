import React from 'react';
import Navigation from '@/components/Navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clipboard, Star, Home, BarChart, Building, Users, AlertTriangle, Clock, Image, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';

const UserManual = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto p-4 pb-20 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-center flex-1">User Manual</h1>
        <Button 
          onClick={handlePrint}
          variant="outline"
          size="sm"
          className="ml-4 print:hidden"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Manual
        </Button>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Daily Shop Check Application</span>
            <span className="text-sm text-gray-500">v1.0</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm">
          <p>
            Welcome to the Daily Shop Check application. This tool helps managers track and assign 
            inspection tasks throughout your shop, ensuring quality standards are maintained.
          </p>
          
          <h3 className="text-lg font-medium mt-4 mb-2">Quick Navigation</h3>
          <div className="my-4 flex flex-wrap gap-4">
            <Link to="/" className="inline-flex items-center px-3 py-2 rounded bg-blue-100 text-blue-700 no-underline">
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
            <Link to="/assignments" className="inline-flex items-center px-3 py-2 rounded bg-blue-100 text-blue-700 no-underline">
              <Clipboard className="h-4 w-4 mr-2" />
              Assignments
            </Link>
            <Link to="/ratings" className="inline-flex items-center px-3 py-2 rounded bg-blue-100 text-blue-700 no-underline">
              <Star className="h-4 w-4 mr-2" />
              Ratings
            </Link>
            <Link to="/departments" className="inline-flex items-center px-3 py-2 rounded bg-blue-100 text-blue-700 no-underline">
              <Building className="h-4 w-4 mr-2" />
              Departments
            </Link>
            <Link to="/staff" className="inline-flex items-center px-3 py-2 rounded bg-blue-100 text-blue-700 no-underline">
              <Users className="h-4 w-4 mr-2" />
              Staff
            </Link>
            <Link to="/analytics" className="inline-flex items-center px-3 py-2 rounded bg-blue-100 text-blue-700 no-underline">
              <BarChart className="h-4 w-4 mr-2" />
              Analytics
            </Link>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm">
            <p className="font-medium text-blue-700">Need help?</p>
            <p className="text-blue-600">
              This manual will guide you through all the features of the application.
              For additional support, contact <a href="mailto:eaglevision.dev30@gmail.com" className="text-blue-700 underline">eaglevision.dev30@gmail.com</a>.
            </p>
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="space-y-4">
        <AccordionItem value="dashboard" className="bg-white rounded-lg border shadow-sm">
          <AccordionTrigger className="px-4">
            <div className="flex items-center">
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Dashboard Overview</h3>
                <p className="text-sm text-gray-600">
                  The Dashboard is your central command center for daily shop inspections.
                </p>
              </div>
              
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-800 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Previous Day Assignments
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Assignments from the previous day that are not completed will be highlighted with an amber border.
                  These require immediate attention.
                </p>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Incomplete Assignments Carousel
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  At the top of the dashboard, you'll see a carousel showing all incomplete assignments with a counter.
                  Use the navigation arrows to scroll through incomplete tasks one by one. This gives you a quick overview
                  of what needs attention without having to scroll through the entire list.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium">Key Dashboard Features</h4>
                <ul className="mt-2 space-y-3">
                  <li className="bg-gray-50 p-3 rounded">
                    <div className="font-medium">Adding Shop Areas</div>
                    <p className="text-sm text-gray-600 mt-1">
                      Create shop areas that need regular checking. Each area should have a clear name and description.
                    </p>
                  </li>
                  <li className="bg-gray-50 p-3 rounded">
                    <div className="font-medium">Assigning Tasks</div>
                    <p className="text-sm text-gray-600 mt-1">
                      Click "Assign" on any area to delegate inspection responsibility to staff members.
                      You can provide specific instructions and even attach a reference photo.
                    </p>
                  </li>
                  <li className="bg-gray-50 p-3 rounded">
                    <div className="font-medium">Assignment Status Tracker</div>
                    <p className="text-sm text-gray-600 mt-1">
                      The dashboard shows assignments created in the last 24 hours that aren't marked as complete.
                      Completed tasks are automatically hidden from the dashboard but remain visible in the Assignments page.
                    </p>
                  </li>
                  <li className="bg-gray-50 p-3 rounded">
                    <div className="font-medium">Daily Assignment Counter</div>
                    <p className="text-sm text-gray-600 mt-1">
                      View today's total assignment count at the top of the dashboard to track daily workload.
                    </p>
                  </li>
                </ul>
              </div>
              
              <div className="p-3 border rounded">
                <h4 className="font-medium">Example Workflow</h4>
                <ol className="mt-2 space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">1</span>
                    <span>Create all required shop areas via "Add New Area"</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">2</span>
                    <span>Review incomplete assignments carousel for any pending tasks</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">3</span>
                    <span>Assign each area to staff members at the start of the day</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">4</span>
                    <span>Staff update assignment status throughout the day</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">5</span>
                    <span>Review outstanding and completed assignments</span>
                  </li>
                </ol>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="assignments" className="bg-white rounded-lg border shadow-sm">
          <AccordionTrigger className="px-4">
            <div className="flex items-center">
              <Clipboard className="h-4 w-4 mr-2" />
              Assignments
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Managing Assignments</h3>
                <p className="text-sm text-gray-600">
                  The Assignments page provides a complete view of all tasks, including historical data.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium">Assignment Controls</h4>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded text-sm">
                    <div className="font-medium">Filtering Options</div>
                    <p className="text-gray-600 mt-1">
                      Filter assignments by status (All, Pending, In Progress, Completed) 
                      and date range to quickly find what you need.
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded text-sm">
                    <div className="font-medium">Assignment Actions</div>
                    <p className="text-gray-600 mt-1">
                      Update assignment status with the action buttons:
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <div className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">Start</div>
                      <div className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">Complete</div>
                      <div className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">Incomplete</div>
                      <div className="inline-flex items-center px-2 py-1 rounded text-xs bg-red-100 text-red-800">Clear</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium">Photo Attachments</h4>
                <div className="mt-2 p-3 bg-gray-50 rounded flex items-start">
                  <Image className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                  <div className="text-sm">
                    <p>
                      Assignments with photos will display a "View Photo" button.
                      Click to see the reference image that was attached when the assignment was created.
                    </p>
                    <p className="mt-1 text-gray-600">
                      Photos are useful for providing visual guidance on how areas should look when properly maintained.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium">Assignment Details</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Click "View Instructions" on any assignment to expand and see detailed instructions
                  and other information like assignment time and status.
                </p>
              </div>
              
              <div className="p-3 border rounded">
                <h4 className="font-medium">Printing Assignment Lists</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Use the "Print List" button to generate a printer-friendly version of your current
                  filtered assignments. This is great for handouts or record-keeping.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="staff-departments" className="bg-white rounded-lg border shadow-sm">
          <AccordionTrigger className="px-4">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Staff & Departments
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Managing Your Team</h3>
                <p className="text-sm text-gray-600">
                  The Staff and Department pages help you organize your team structure.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded">
                  <h4 className="font-medium flex items-center">
                    <Users className="h-4 w-4 mr-1 text-blue-500" />
                    Staff Management
                  </h4>
                  <ul className="mt-2 space-y-2 text-sm">
                    <li>Add new staff members with their name and department</li>
                    <li>View a complete list of all staff members</li>
                    <li>Staff members become available in the assignment dropdown</li>
                    <li>Track performance through the ratings system</li>
                  </ul>
                </div>
                
                <div className="p-3 border rounded">
                  <h4 className="font-medium flex items-center">
                    <Building className="h-4 w-4 mr-1 text-blue-500" />
                    Department Setup
                  </h4>
                  <ul className="mt-2 space-y-2 text-sm">
                    <li>Create departments to organize your team</li>
                    <li>Assign staff members to specific departments</li>
                    <li>Filter reporting by department</li>
                    <li>Track department-level performance</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded">
                <h4 className="font-medium text-blue-700">Best Practice</h4>
                <p className="text-sm text-blue-600 mt-1">
                  Set up your departments first, then add staff members to ensure proper organization 
                  from the beginning.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="ratings" className="bg-white rounded-lg border shadow-sm">
          <AccordionTrigger className="px-4">
            <div className="flex items-center">
              <Star className="h-4 w-4 mr-2" />
              Ratings System
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Performance Evaluation</h3>
                <p className="text-sm text-gray-600">
                  The Ratings system helps you track and improve staff performance over time.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded">
                  <h4 className="font-medium">Rating Staff Members</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Use the Rate Staff page to evaluate performance across multiple categories:
                  </p>
                  <ul className="mt-2 text-sm space-y-1 list-disc pl-5">
                    <li>Product Knowledge</li>
                    <li>Job Performance</li>
                    <li>Customer Service</li>
                    <li>Teamwork</li>
                    <li>Overall Rating</li>
                  </ul>
                </div>
                
                <div className="p-3 border rounded">
                  <h4 className="font-medium">Viewing Ratings</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    The Staff Ratings page shows a summary of all ratings received by team members.
                    Use this data to:
                  </p>
                  <ul className="mt-2 text-sm space-y-1 list-disc pl-5">
                    <li>Identify top performers</li>
                    <li>Find areas for training and improvement</li>
                    <li>Track progress over time</li>
                    <li>Support performance reviews</li>
                  </ul>
                </div>
              </div>
              
              <div className="p-3 bg-green-50 rounded border border-green-100">
                <h4 className="font-medium text-green-800">Rating Best Practices</h4>
                <ul className="mt-2 space-y-2 text-sm text-green-700">
                  <li>Rate staff members consistently, such as weekly or monthly</li>
                  <li>Use objective criteria for each rating category</li>
                  <li>Include specific comments to support numerical ratings</li>
                  <li>Share performance feedback directly with staff members</li>
                  <li>Use ratings data to create targeted training programs</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="analytics" className="bg-white rounded-lg border shadow-sm">
          <AccordionTrigger className="px-4">
            <div className="flex items-center">
              <BarChart className="h-4 w-4 mr-2" />
              Analytics
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Performance Insights</h3>
                <p className="text-sm text-gray-600">
                  The Analytics page provides visual data to help you understand trends and make informed decisions.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded">
                  <h4 className="font-medium">Assignment Metrics</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Track assignment completion rates across different time periods:
                  </p>
                  <ul className="mt-2 text-sm space-y-1 list-disc pl-5">
                    <li>Daily completion rates</li>
                    <li>Department performance comparison</li>
                    <li>Individual staff member productivity</li>
                    <li>Time to completion analysis</li>
                  </ul>
                </div>
                
                <div className="p-3 border rounded">
                  <h4 className="font-medium">Rating Analysis</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Visualize staff performance ratings:
                  </p>
                  <ul className="mt-2 text-sm space-y-1 list-disc pl-5">
                    <li>Average ratings by category</li>
                    <li>Rating trends over time</li>
                    <li>Department-level performance</li>
                    <li>Individual growth tracking</li>
                  </ul>
                </div>
              </div>
              
              <div className="p-3 bg-purple-50 rounded border border-purple-100">
                <h4 className="font-medium text-purple-800">Using Analytics Effectively</h4>
                <p className="text-sm text-purple-700 mt-1">
                  Analytics are most valuable when used consistently to drive improvement:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-purple-700 list-disc pl-5">
                  <li>Review analytics weekly with department managers</li>
                  <li>Set improvement targets based on historical data</li>
                  <li>Recognize high-performing individuals and departments</li>
                  <li>Identify bottlenecks or problem areas quickly</li>
                  <li>Use data to inform staffing and training decisions</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="status-guide" className="bg-white rounded-lg border shadow-sm">
          <AccordionTrigger className="px-4">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Assignment Status Guide
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Understanding Assignment Status</h3>
                <p className="text-sm text-gray-600">
                  Each assignment can have one of the following statuses:
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                    <span className="font-medium">Pending</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Assignment has been created but the staff member hasn't started working on it yet.
                    This is the initial state of all new assignments.
                  </p>
                </div>
                
                <div className="p-3 border rounded">
                  <div className="flex items-center mb-2">
                    <Clock className="h-5 w-5 text-blue-500 mr-2" />
                    <span className="font-medium">In Progress</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Staff has started working on the assignment but hasn't completed it yet.
                    Staff can mark an assignment as "In Progress" to indicate they're actively working on it.
                  </p>
                </div>
                
                <div className="p-3 border rounded">
                  <div className="flex items-center mb-2">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span className="font-medium">Completed</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Assignment has been successfully completed by the staff member.
                    Completed assignments are hidden from the home dashboard but remain visible on the Assignments page.
                  </p>
                </div>
                
                <div className="p-3 border rounded">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                    <span className="font-medium">Incomplete</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    The staff member was unable to complete the assignment. This status should include comments
                    explaining why the task couldn't be completed (e.g., missing supplies, equipment issues).
                  </p>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded">
                <h4 className="font-medium text-blue-700">Status Workflow</h4>
                <p className="text-sm text-blue-600 mt-1">
                  The typical assignment workflow goes from Pending → In Progress → Completed.
                  If issues arise, an assignment may be marked as Incomplete, which requires manager attention.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="tips" className="bg-white rounded-lg border shadow-sm">
          <AccordionTrigger className="px-4">
            <div className="flex items-center">
              <Star className="h-4 w-4 mr-2" />
              Tips and Best Practices
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Getting the Most from Daily Shop Check</h3>
                <p className="text-sm text-gray-600">
                  Follow these recommendations to optimize your experience and results:
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded">
                  <h4 className="font-medium">Daily Workflow</h4>
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="flex items-start">
                      <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mr-2">AM</div>
                      <p>Check incomplete assignments carousel first, then create new assignments for the day during morning briefing</p>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mr-2">Day</div>
                      <p>Staff update assignment status as they complete their work</p>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mr-2">PM</div>
                      <p>Managers review completion status and follow up on incomplete tasks</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 border rounded">
                  <h4 className="font-medium">Effective Instructions</h4>
                  <ul className="mt-2 space-y-1 text-sm list-disc pl-5">
                    <li>Be specific and clear about expectations</li>
                    <li>Include important details and standards</li>
                    <li>Use photos to show expected results</li>
                    <li>Set realistic time expectations</li>
                    <li>Include safety instructions when relevant</li>
                  </ul>
                </div>
              </div>
              
              <div className="p-3 bg-green-50 rounded">
                <h4 className="font-medium text-green-800">Success Tips</h4>
                <div className="mt-2 space-y-3 text-sm text-green-700">
                  <p>
                    <strong>Regular Updates:</strong> Encourage staff to update assignment status in real-time
                    for the most accurate dashboard view.
                  </p>
                  <p>
                    <strong>Photo Documentation:</strong> Use the photo upload feature consistently to provide
                    clear visual guides for staff.
                  </p>
                  <p>
                    <strong>Performance Recognition:</strong> Use the ratings system to acknowledge excellent work
                    and identify training opportunities.
                  </p>
                  <p>
                    <strong>Data-Driven Decisions:</strong> Review analytics regularly to identify patterns
                    and make informed improvements.
                  </p>
                  <p>
                    <strong>Incomplete Task Management:</strong> Use the incomplete assignments carousel to quickly
                    prioritize tasks that need immediate attention.
                  </p>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="my-8">
        <CardHeader>
          <CardTitle>About Daily Shop Check</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            <p>
              Daily Shop Check was conceived and developed by Elton Niati to help retail managers
              maintain consistent quality standards throughout their shops.
            </p>
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Elton Niati</p>
                  <p className="text-xs text-gray-500">Developer</p>
                </div>
                <a 
                  href="mailto:eaglevision.dev30@gmail.com"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  eaglevision.dev30@gmail.com
                </a>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500 text-center">
              &copy; 2025 Daily Shop Check. All rights reserved.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default UserManual;
