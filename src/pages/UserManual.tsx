
import React from 'react';
import Navigation from '@/components/Navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Clipboard, Star, Home, BarChart, Building, Users, Plus, Clock, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const UserManual = () => {
  return (
    <div className="container mx-auto p-4 pb-20 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">User Manual</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Application Overview</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm">
          <p>
            The Daily Shop Check application helps you manage and track assignments for your team members
            across different areas of your shop. This manual will guide you through the main features
            and functions of the application.
          </p>
          <div className="my-4 flex flex-wrap gap-4">
            <Link to="/" className="inline-flex items-center px-3 py-2 rounded bg-blue-100 text-blue-700 no-underline">
              <Home className="h-4 w-4 mr-2" />
              Home Page
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
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="space-y-4">
        <AccordionItem value="home" className="bg-white rounded-lg border shadow-sm">
          <AccordionTrigger className="px-4">Home Page</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <h3 className="text-lg font-medium mb-2">Home Page Features</h3>
            <ul className="space-y-4">
              <li>
                <div className="font-medium">Adding New Areas</div>
                <p className="text-sm text-gray-600 mt-1">
                  Use the "Add New Area" section to create shop areas that need to be checked. 
                  Enter an area name and description, then click the "Add Area" button.
                </p>
                <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                  <strong>Example:</strong> Area name: "Front Display", Description: "Check product arrangement and cleanliness"
                </div>
              </li>
              <li>
                <div className="font-medium">Assigning Tasks</div>
                <p className="text-sm text-gray-600 mt-1">
                  Each area has an "Assign" button. Click this to assign the area to a staff member.
                  Select a staff member, add optional instructions, and upload a photo if needed.
                </p>
              </li>
              <li>
                <div className="font-medium">Recent Assignments</div>
                <p className="text-sm text-gray-600 mt-1">
                  The home page shows assignments from the past 24 hours. For older assignments, 
                  visit the Assignments page.
                </p>
              </li>
              <li>
                <div className="font-medium">Today's Assignments Counter</div>
                <p className="text-sm text-gray-600 mt-1">
                  At the top of the page, you can see how many assignments have been made today.
                </p>
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="assignments" className="bg-white rounded-lg border shadow-sm">
          <AccordionTrigger className="px-4">Assignments Page</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <h3 className="text-lg font-medium mb-2">Assignments Page Features</h3>
            <ul className="space-y-4">
              <li>
                <div className="font-medium">Filtering Assignments</div>
                <p className="text-sm text-gray-600 mt-1">
                  Use the filter buttons to view assignments by status: All, Pending, In Progress, Completed, or Incomplete.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <div className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100"><AlertTriangle className="h-3 w-3 text-orange-500 mr-1" /> Pending</div>
                  <div className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100"><Clock className="h-3 w-3 text-blue-500 mr-1" /> In Progress</div>
                  <div className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100"><Check className="h-3 w-3 text-green-500 mr-1" /> Completed</div>
                </div>
              </li>
              <li>
                <div className="font-medium">Date Range Filtering</div>
                <p className="text-sm text-gray-600 mt-1">
                  Use the date picker to filter assignments by date range. Select a start date and optionally an end date.
                </p>
              </li>
              <li>
                <div className="font-medium">Updating Assignment Status</div>
                <p className="text-sm text-gray-600 mt-1">
                  Each assignment has action buttons to update its status:
                </p>
                <ul className="list-disc ml-5 mt-1 text-xs text-gray-600">
                  <li>"Start" - Mark an assignment as in progress</li>
                  <li>"Complete" - Mark an assignment as done</li>
                  <li>"Incomplete" - Mark an assignment that couldn't be completed</li>
                  <li>"Clear" - Remove a pending assignment that hasn't been started yet</li>
                </ul>
              </li>
              <li>
                <div className="font-medium">Viewing Instructions</div>
                <p className="text-sm text-gray-600 mt-1">
                  Click "View Instructions" to see detailed instructions for an assignment.
                  This expands the row to show the full instructions.
                </p>
              </li>
              <li>
                <div className="font-medium">Printing Assignment Lists</div>
                <p className="text-sm text-gray-600 mt-1">
                  Click the "Print List" button to generate a printable version of the current filtered assignments.
                  The print view includes all instructions and details.
                </p>
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="departments" className="bg-white rounded-lg border shadow-sm">
          <AccordionTrigger className="px-4">Departments Page</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <h3 className="text-lg font-medium mb-2">Managing Departments</h3>
            <ul className="space-y-2">
              <li>
                <div className="font-medium">Adding Departments</div>
                <p className="text-sm text-gray-600 mt-1">
                  Enter a department name in the input field and click "Add" to create a new department.
                </p>
              </li>
              <li>
                <div className="font-medium">Viewing Departments</div>
                <p className="text-sm text-gray-600 mt-1">
                  All existing departments are displayed in a list below the add department section.
                </p>
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="staff" className="bg-white rounded-lg border shadow-sm">
          <AccordionTrigger className="px-4">Staff Management</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <h3 className="text-lg font-medium mb-2">Staff Management Features</h3>
            <p className="text-sm text-gray-600 mb-2">
              The Staff page allows you to manage staff members who can be assigned to tasks.
            </p>
            <ul className="space-y-2">
              <li>
                <div className="font-medium">Adding Staff Members</div>
                <p className="text-sm text-gray-600 mt-1">
                  Enter staff details and select their department to add new staff members.
                </p>
              </li>
              <li>
                <div className="font-medium">Viewing Staff List</div>
                <p className="text-sm text-gray-600 mt-1">
                  View all staff members along with their associated departments.
                </p>
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="ratings" className="bg-white rounded-lg border shadow-sm">
          <AccordionTrigger className="px-4">Ratings System</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <h3 className="text-lg font-medium mb-2">Staff Rating Features</h3>
            <ul className="space-y-2">
              <li>
                <div className="font-medium">Rating Staff Members</div>
                <p className="text-sm text-gray-600 mt-1">
                  Use the Rate Staff page to provide feedback and ratings for staff performance.
                </p>
              </li>
              <li>
                <div className="font-medium">Viewing Staff Ratings</div>
                <p className="text-sm text-gray-600 mt-1">
                  The Staff Ratings page shows a summary of all ratings received by staff members.
                </p>
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="analytics" className="bg-white rounded-lg border shadow-sm">
          <AccordionTrigger className="px-4">Analytics</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <h3 className="text-lg font-medium mb-2">Analytics Features</h3>
            <p className="text-sm text-gray-600 mb-2">
              The Analytics page provides visual data about assignments, completion rates, and staff performance.
            </p>
            <ul className="space-y-2">
              <li>
                <div className="font-medium">Assignment Metrics</div>
                <p className="text-sm text-gray-600 mt-1">
                  View charts showing assignment completion rates, assignments per department, and more.
                </p>
              </li>
              <li>
                <div className="font-medium">Performance Tracking</div>
                <p className="text-sm text-gray-600 mt-1">
                  Track staff performance metrics over time.
                </p>
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="tips" className="bg-white rounded-lg border shadow-sm">
          <AccordionTrigger className="px-4">Tips and Best Practices</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <h3 className="text-lg font-medium mb-2">Recommendations for Effective Use</h3>
            <ul className="space-y-2">
              <li>
                <div className="font-medium">Daily Shop Check Workflow</div>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Morning:</strong> Create assignments for the day<br />
                  <strong>During the day:</strong> Staff marks assignments as in progress or complete<br />
                  <strong>End of day:</strong> Review completion status and print reports as needed
                </p>
              </li>
              <li>
                <div className="font-medium">Clear Instructions</div>
                <p className="text-sm text-gray-600 mt-1">
                  Always provide clear instructions when assigning tasks to staff members.
                  Include specific details about what needs to be checked or completed.
                </p>
              </li>
              <li>
                <div className="font-medium">Regular Updates</div>
                <p className="text-sm text-gray-600 mt-1">
                  Encourage staff to update assignment status regularly throughout the day.
                </p>
              </li>
              <li>
                <div className="font-medium">Use Photos</div>
                <p className="text-sm text-gray-600 mt-1">
                  When applicable, use the photo upload feature to provide visual examples of how an area should look.
                </p>
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="my-8">
        <CardHeader>
          <CardTitle>Assignment Status Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 border rounded">
              <div className="flex items-center mb-2">
                <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                <span className="font-medium">Pending</span>
              </div>
              <p className="text-sm text-gray-600">
                Assignment has been created but staff hasn't started working on it yet.
              </p>
            </div>
            
            <div className="p-3 border rounded">
              <div className="flex items-center mb-2">
                <Clock className="h-5 w-5 text-blue-500 mr-2" />
                <span className="font-medium">In Progress</span>
              </div>
              <p className="text-sm text-gray-600">
                Staff has started working on the assignment but hasn't completed it yet.
              </p>
            </div>
            
            <div className="p-3 border rounded">
              <div className="flex items-center mb-2">
                <Check className="h-5 w-5 text-green-500 mr-2" />
                <span className="font-medium">Completed</span>
              </div>
              <p className="text-sm text-gray-600">
                Assignment has been successfully completed by the staff member.
              </p>
            </div>
            
            <div className="p-3 border rounded">
              <div className="flex items-center mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="font-medium">Needs Check</span>
              </div>
              <p className="text-sm text-gray-600">
                Assignment requires verification or additional inspection.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default UserManual;
