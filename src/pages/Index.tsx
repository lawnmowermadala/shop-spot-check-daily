import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type AssignmentStatus = 'complete' | 'incomplete' | 'loading' | 'error';

interface AssignmentData {
  id: string;
  title: string;
  description: string;
  due_date: string;
  status: 'complete' | 'incomplete';
  assigned_to: string;
  created_at: string;
}

export default function AssignmentPage() {
  const router = useRouter();
  const { assignmentId } = router.query;
  const [status, setStatus] = useState<AssignmentStatus>('loading');
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [formData, setFormData] = useState({
    reassign_to: '',
    new_deadline: '',
    comments: ''
  });
  const [isFormUnlocked, setIsFormUnlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!assignmentId) return;

    const fetchAssignment = async () => {
      try {
        const { data, error } = await supabase
          .from('assignments')
          .select('*')
          .eq('id', assignmentId)
          .single();

        if (error) throw error;

        if (data) {
          setAssignment(data);
          setStatus(data.status);
          
          // Unlock form if assignment is incomplete
          if (data.status === 'incomplete') {
            setIsFormUnlocked(true);
          }
        } else {
          throw new Error('Assignment not found');
        }
      } catch (error) {
        console.error('Error fetching assignment:', error);
        setStatus('error');
      }
    };

    fetchAssignment();
  }, [assignmentId, supabase]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Update assignment in Supabase
      const { data, error } = await supabase
        .from('assignments')
        .update({
          assigned_to: formData.reassign_to,
          due_date: formData.new_deadline,
          status: 'incomplete',
          updated_at: new Date().toISOString(),
          comments: formData.comments
        })
        .eq('id', assignmentId)
        .select()
        .single();

      if (error) throw error;

      setSubmitMessage('Assignment successfully reassigned!');
      setIsFormUnlocked(false);
      
      // Update local state with new assignment data
      if (data) {
        setAssignment(data);
      }
    } catch (error) {
      console.error('Error reassigning:', error);
      setSubmitMessage('Failed to reassign. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading assignment details...</p>
        </div>
      </div>
    );
  }

  if (status === 'error' || !assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-500">
          <h2 className="text-2xl font-bold">Error</h2>
          <p>Failed to load assignment details.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>{assignment.title} - Assignment</title>
        <meta name="description" content={`Details for assignment: ${assignment.title}`} />
      </Head>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
            <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
              <div className="flex items-center text-sm text-gray-500">
                <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span>Assigned to: {assignment.assigned_to}</span>
              </div>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900">Description</h2>
              <p className="mt-1 text-sm text-gray-600">{assignment.description}</p>
            </div>

            <div className="mb-6">
              <div className="flex items-center">
                <h2 className="text-lg font-medium text-gray-900">Status</h2>
                <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                  assignment.status === 'complete' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {assignment.status === 'complete' ? 'Complete' : 'Incomplete'}
                </span>
              </div>

              {assignment.status === 'complete' ? (
                <div className="mt-2 p-4 bg-green-50 rounded-md">
                  <p className="text-green-700">This assignment has been marked as complete. No further action is required.</p>
                </div>
              ) : (
                <div className="mt-2 p-4 bg-yellow-50 rounded-md">
                  <p className="text-yellow-700">This assignment is incomplete. You may reassign it if needed.</p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-medium text-gray-900">Reassignment Form</h2>
              
              {!isFormUnlocked ? (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <p className="text-gray-600">
                    {assignment.status === 'complete' 
                      ? 'This assignment is complete and cannot be reassigned.' 
                      : 'Please click the unlock button below to enable reassignment.'}
                  </p>
                  {assignment.status === 'incomplete' && (
                    <button
                      onClick={() => setIsFormUnlocked(true)}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Unlock Reassignment Form
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleReassign} className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="reassign_to" className="block text-sm font-medium text-gray-700">
                      Reassign To
                    </label>
                    <select
                      id="reassign_to"
                      name="reassign_to"
                      value={formData.reassign_to}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="">Select a team member</option>
                      <option value="john.doe">John Doe</option>
                      <option value="jane.smith">Jane Smith</option>
                      <option value="mike.johnson">Mike Johnson</option>
                      <option value="sarah.williams">Sarah Williams</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="new_deadline" className="block text-sm font-medium text-gray-700">
                      New Deadline
                    </label>
                    <input
                      type="date"
                      id="new_deadline"
                      name="new_deadline"
                      value={formData.new_deadline}
                      onChange={handleInputChange}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="comments" className="block text-sm font-medium text-gray-700">
                      Additional Comments
                    </label>
                    <textarea
                      id="comments"
                      name="comments"
                      rows={3}
                      value={formData.comments}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Any additional instructions or comments..."
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setIsFormUnlocked(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Reassignment'}
                    </button>
                  </div>

                  {submitMessage && (
                    <div className={`p-3 rounded-md ${submitMessage.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {submitMessage}
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
