import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search, Plus, Edit2, Archive, MoreHorizontal,
  ChevronLeft, ChevronRight, Filter, X,
  Users, Briefcase, FileText, Save, Eye,
  User, Calendar, MessageSquare, Settings
} from 'lucide-react';

// Mock API with MSW-like behavior
class MockAPI {
  constructor() {
    this.data = {
      jobs: [],
      candidates: [],
      assessments: {},
      candidateTimelines: {}
    };
    this.initializeData();
  }

  async delay() {
    const latency = 200 + Math.random() * 1000;
    await new Promise(resolve => setTimeout(resolve, latency));

    // 5-10% error rate on writes
    if (Math.random() < 0.075) {
      throw new Error('Network error occurred');
    }
  }

  initializeData() {
    // Seed jobs
    const jobTitles = [
      'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
      'Product Manager', 'UX Designer', 'Data Scientist', 'DevOps Engineer',
      'Mobile Developer', 'QA Engineer', 'Technical Writer', 'Sales Manager',
      'Marketing Specialist', 'HR Manager', 'Finance Analyst', 'Customer Success',
      'Business Analyst', 'Security Engineer', 'Solutions Architect',
      'Engineering Manager', 'Growth Hacker', 'UI Designer', 'Database Admin',
      'Cloud Engineer', 'Machine Learning Engineer', 'Site Reliability Engineer'
    ];

    const tags = ['Remote', 'Senior', 'Junior', 'Contract', 'Full-time', 'Part-time', 'Urgent'];

    this.data.jobs = jobTitles.map((title, i) => ({
      id: `job-${i + 1}`,
      title,
      slug: title.toLowerCase().replace(/\s+/g, '-'),
      status: Math.random() > 0.3 ? 'active' : 'archived',
      tags: tags.slice(0, Math.floor(Math.random() * 3) + 1),
      order: i,
      createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
    }));

    // Seed candidates
    const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
    const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas'];
    const stages = ['applied', 'screen', 'tech', 'offer', 'hired', 'rejected'];

    for (let i = 0; i < 1000; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const candidate = {
        id: `candidate-${i + 1}`,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
        stage: stages[Math.floor(Math.random() * stages.length)],
        jobId: this.data.jobs[Math.floor(Math.random() * this.data.jobs.length)].id,
        appliedAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString()
      };
      this.data.candidates.push(candidate);

      // Create timeline
      this.data.candidateTimelines[candidate.id] = [
        {
          id: `timeline-${i}-1`,
          type: 'stage_change',
          from: null,
          to: 'applied',
          timestamp: candidate.appliedAt,
          note: 'Application submitted'
        }
      ];
    }

    // Seed assessments
    const questionTypes = ['single-choice', 'multi-choice', 'short-text', 'long-text', 'numeric', 'file-upload'];

    this.data.jobs.slice(0, 3).forEach(job => {
      const assessment = {
        id: `assessment-${job.id}`,
        jobId: job.id,
        title: `${job.title} Assessment`,
        sections: [
          {
            id: 'section-1',
            title: 'Technical Skills',
            questions: []
          },
          {
            id: 'section-2',
            title: 'Experience',
            questions: []
          }
        ]
      };

      // Generate 10+ questions per assessment
      for (let i = 0; i < 12; i++) {
        const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
        const sectionIndex = Math.floor(i / 6);

        const question = {
          id: `question-${job.id}-${i}`,
          type,
          title: `Question ${i + 1}: What is your experience with ${type}?`,
          required: Math.random() > 0.3,
          options: type.includes('choice') ? ['Option A', 'Option B', 'Option C'] : undefined,
          validation: type === 'numeric' ? { min: 1, max: 10 } :
            type === 'short-text' ? { maxLength: 100 } : undefined
        };

        assessment.sections[sectionIndex].questions.push(question);
      }

      this.data.assessments[job.id] = assessment;
    });

    this.saveToStorage();
  }

  saveToStorage() {
    localStorage.setItem('hr-app-data', JSON.stringify(this.data));
  }

  loadFromStorage() {
    const stored = localStorage.getItem('hr-app-data');
    if (stored) {
      this.data = JSON.parse(stored);
    }
  }

  async getJobs(params = {}) {
    await this.delay();

    let jobs = [...this.data.jobs];

    if (params.search) {
      jobs = jobs.filter(job =>
        job.title.toLowerCase().includes(params.search.toLowerCase())
      );
    }

    if (params.status) {
      jobs = jobs.filter(job => job.status === params.status);
    }

    jobs.sort((a, b) => a.order - b.order);

    const page = parseInt(params.page) || 1;
    const pageSize = parseInt(params.pageSize) || 10;
    const start = (page - 1) * pageSize;

    return {
      jobs: jobs.slice(start, start + pageSize),
      total: jobs.length,
      page,
      pageSize
    };
  }

  async createJob(job) {
    await this.delay();
    const newJob = {
      ...job,
      id: `job-${Date.now()}`,
      slug: job.title.toLowerCase().replace(/\s+/g, '-'),
      order: this.data.jobs.length,
      createdAt: new Date().toISOString()
    };
    this.data.jobs.push(newJob);
    this.saveToStorage();
    return newJob;
  }

  async updateJob(id, updates) {
    await this.delay();
    const index = this.data.jobs.findIndex(job => job.id === id);
    if (index >= 0) {
      this.data.jobs[index] = { ...this.data.jobs[index], ...updates };
      this.saveToStorage();
      return this.data.jobs[index];
    }
    throw new Error('Job not found');
  }

  async reorderJobs(fromOrder, toOrder) {
    await this.delay();

    // Simulate occasional failure
    if (Math.random() < 0.1) {
      throw new Error('Reorder failed');
    }

    const jobs = [...this.data.jobs].sort((a, b) => a.order - b.order);
    const [moved] = jobs.splice(fromOrder, 1);
    jobs.splice(toOrder, 0, moved);

    jobs.forEach((job, index) => {
      job.order = index;
    });

    this.data.jobs = jobs;
    this.saveToStorage();
    return jobs;
  }

  async getCandidates(params = {}) {
    await this.delay();

    let candidates = [...this.data.candidates];

    if (params.search) {
      const search = params.search.toLowerCase();
      candidates = candidates.filter(candidate =>
        candidate.name.toLowerCase().includes(search) ||
        candidate.email.toLowerCase().includes(search)
      );
    }

    if (params.stage) {
      candidates = candidates.filter(candidate => candidate.stage === params.stage);
    }

    const page = parseInt(params.page) || 1;
    const pageSize = parseInt(params.pageSize) || 50;
    const start = (page - 1) * pageSize;

    return {
      candidates: candidates.slice(start, start + pageSize),
      total: candidates.length,
      page,
      pageSize
    };
  }

  async updateCandidate(id, updates) {
    await this.delay();
    const index = this.data.candidates.findIndex(c => c.id === id);
    if (index >= 0) {
      const oldStage = this.data.candidates[index].stage;
      this.data.candidates[index] = { ...this.data.candidates[index], ...updates };

      if (updates.stage && updates.stage !== oldStage) {
        if (!this.data.candidateTimelines[id]) {
          this.data.candidateTimelines[id] = [];
        }
        this.data.candidateTimelines[id].push({
          id: `timeline-${id}-${Date.now()}`,
          type: 'stage_change',
          from: oldStage,
          to: updates.stage,
          timestamp: new Date().toISOString(),
          note: `Moved from ${oldStage} to ${updates.stage}`
        });
      }

      this.saveToStorage();
      return this.data.candidates[index];
    }
    throw new Error('Candidate not found');
  }

  async getCandidateTimeline(id) {
    await this.delay();
    return this.data.candidateTimelines[id] || [];
  }

  async getAssessment(jobId) {
    await this.delay();
    return this.data.assessments[jobId];
  }

  async saveAssessment(jobId, assessment) {
    await this.delay();
    this.data.assessments[jobId] = assessment;
    this.saveToStorage();
    return assessment;
  }
}

const api = new MockAPI();

// Main App Component
export default function HRApp() {
  const [currentView, setCurrentView] = useState('jobs');

  // Load data on app start
  useEffect(() => {
    api.loadFromStorage();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">HR Management</h1>
            </div>
            <div className="flex space-x-8">
              {[
                { key: 'jobs', label: 'Jobs', icon: Briefcase },
                { key: 'candidates', label: 'Candidates', icon: Users },
                { key: 'assessments', label: 'Assessments', icon: FileText }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setCurrentView(key)}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 ${
                    currentView === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  data-testid={`nav-button-${key}`}
                >
                  <Icon className="w-4 h-4 mr-1" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentView === 'jobs' && <JobsView />}
        {currentView === 'candidates' && <CandidatesView />}
        {currentView === 'assessments' && <AssessmentsView />}
      </main>
    </div>
  );
}

// Jobs View Component
function JobsView() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  const pageSize = 10;

  const loadJobs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const result = await api.getJobs({
        search: searchTerm,
        status: statusFilter,
        page,
        pageSize
      });
      setJobs(result.jobs);
      setTotal(result.total);
      setCurrentPage(result.page);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, pageSize]);

  useEffect(() => {
    loadJobs(1);
  }, [loadJobs]);

  const handleReorder = async (draggedJob, dropTargetJob) => {
    if (draggedJob.order === dropTargetJob.order) return;

    // Optimistic update
    const optimisticJobs = [...jobs];
    const dragIndex = optimisticJobs.findIndex(job => job.id === draggedJob.id);
    const dropIndex = optimisticJobs.findIndex(job => job.id === dropTargetJob.id);

    // This is the correct way to handle optimistic UI for drag-and-drop
    const [movedItem] = optimisticJobs.splice(dragIndex, 1);
    optimisticJobs.splice(dropIndex, 0, movedItem);
    setJobs(optimisticJobs);

    try {
      // Pass the original order values to the API
      await api.reorderJobs(draggedJob.order, dropTargetJob.order);
      // Re-fetch to ensure data is in sync with the server
      await loadJobs(currentPage);
    } catch (error) {
      console.error('Reorder failed:', error);
      // Rollback on failure by re-fetching the correct state from the server
      loadJobs(currentPage);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Jobs</h1>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => {
              setEditingJob(null);
              setShowModal(true);
            }}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            data-testid="add-job-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Job
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full"
              data-testid="job-search-input"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
          data-testid="status-filter-select"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Jobs List */}
      <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="p-6 text-center" data-testid="loading-indicator">Loading...</div>
        ) : (
          <ul className="divide-y divide-gray-200" data-testid="jobs-list">
            {jobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                onEdit={(jobToEdit) => {
                  setEditingJob(jobToEdit);
                  setShowModal(true);
                }}
                onArchive={async (jobToArchive) => {
                  try {
                    await api.updateJob(jobToArchive.id, {
                      status: jobToArchive.status === 'active' ? 'archived' : 'active'
                    });
                    loadJobs(currentPage);
                  } catch (error) {
                    console.error('Failed to update job:', error);
                  }
                }}
                onReorder={handleReorder}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(total / pageSize)}
        onPageChange={(page) => loadJobs(page)}
      />

      {/* Job Modal */}
      {showModal && (
        <JobModal
          job={editingJob}
          onSave={async (jobData) => {
            try {
              if (editingJob) {
                await api.updateJob(editingJob.id, jobData);
              } else {
                await api.createJob(jobData);
              }
              setShowModal(false);
              setEditingJob(null);
              loadJobs(currentPage);
            } catch (error) {
              console.error('Failed to save job:', error);
            }
          }}
          onClose={() => {
            setShowModal(false);
            setEditingJob(null);
          }}
        />
      )}
    </div>
  );
}

function JobRow({ job, onEdit, onArchive, onReorder }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
    // Set the full job object as data, or at least the ID
    // This is better than just the index which is only relevant to the current page
    e.dataTransfer.setData('application/json', JSON.stringify(job));
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const draggedJob = JSON.parse(e.dataTransfer.getData('application/json'));
    // The drop target is the current job
    onReorder(draggedJob, job);
  };

  return (
    <li
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`px-6 py-4 cursor-move ${isDragging ? 'opacity-50' : ''}`}
      data-testid={`job-row-${job.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`w-2 h-8 rounded ${job.status === 'active' ? 'bg-green-400' : 'bg-gray-400'}`} />
          </div>
          <div className="ml-4">
            <div className="flex items-center">
              <p className="text-sm font-medium text-gray-900">{job.title}</p>
              <span className="ml-2 text-xs text-gray-500">/{job.slug}</span>
            </div>
            <div className="mt-1 flex items-center space-x-2">
              {job.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(job)}
            className="text-gray-400 hover:text-gray-500"
            data-testid={`edit-job-button-${job.id}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onArchive(job)}
            className="text-gray-400 hover:text-gray-500"
            data-testid={`archive-job-button-${job.id}`}
          >
            <Archive className="w-4 h-4" />
          </button>
        </div>
      </div>
    </li>
  );
}

function JobModal({ job, onSave, onClose }) {
  const [formData, setFormData] = useState({
    title: job?.title || '',
    status: job?.status || 'active',
    tags: job?.tags?.join(', ') || ''
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center" data-testid="job-modal">
      <div className="relative p-8 bg-white w-96 rounded-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{job ? 'Edit Job' : 'Add Job'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
              Job Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.title ? 'border-red-500' : ''}`}
            />
            {errors.title && <p className="text-red-500 text-xs italic mt-1">{errors.title}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="tags">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Save Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Candidates View Component
function CandidatesView() {
  const [view, setView] = useState('list'); // 'list' or 'kanban'
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const stages = ['applied', 'screen', 'tech', 'offer', 'hired', 'rejected'];

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getCandidates({
        search: searchTerm,
        stage: stageFilter,
        pageSize: 1000
      });
      setCandidates(result.candidates);
    } catch (error) {
      console.error('Failed to load candidates:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, stageFilter]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => {
      const matchesSearch = searchTerm === '' ||
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStage = stageFilter === '' || candidate.stage === stageFilter;

      return matchesSearch && matchesStage;
    });
  }, [candidates, searchTerm, stageFilter]);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Candidates</h1>
          <p className="mt-1 text-sm text-gray-600">
            {filteredCandidates.length} candidates found
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <div className="flex space-x-2">
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                view === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                view === 'kanban'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Kanban View
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full"
            />
          </div>
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">All Stages</option>
          {stages.map(stage => (
            <option key={stage} value={stage}>
              {stage.charAt(0).toUpperCase() + stage.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="mt-6 p-6 text-center">Loading...</div>
      ) : view === 'list' ? (
        <CandidatesList
          candidates={filteredCandidates}
          onSelectCandidate={setSelectedCandidate}
        />
      ) : (
        <CandidatesKanban
          candidates={filteredCandidates}
          onCandidateUpdate={loadCandidates}
        />
      )}

      {selectedCandidate && (
        <CandidateModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}
    </div>
  );
}

function CandidatesList({ candidates, onSelectCandidate }) {
  const containerRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });

  const itemHeight = 80;
  const containerHeight = 600;

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      const start = Math.floor(scrollTop / itemHeight);
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      const end = Math.min(start + visibleCount + 10, candidates.length);

      setVisibleRange({ start: Math.max(0, start - 5), end });
    }
  }, [candidates.length, itemHeight, containerHeight]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Initial calculation on mount and data change
  useEffect(() => {
    handleScroll();
  }, [candidates, handleScroll]);

  const visibleCandidates = candidates.slice(visibleRange.start, visibleRange.end);
  const totalHeight = candidates.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return (
    <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ height: containerHeight }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="border-b border-gray-200 p-4 hover:bg-gray-50 cursor-pointer"
                style={{ height: itemHeight }}
                onClick={() => onSelectCandidate(candidate)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">{candidate.name}</p>
                      <p className="text-sm text-gray-500">{candidate.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      candidate.stage === 'hired' ? 'bg-green-100 text-green-800' :
                      candidate.stage === 'rejected' ? 'bg-red-100 text-red-800' :
                      candidate.stage === 'offer' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {candidate.stage}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CandidatesKanban({ candidates, onCandidateUpdate }) {
  const stages = ['applied', 'screen', 'tech', 'offer', 'hired', 'rejected'];
  const [draggedCandidate, setDraggedCandidate] = useState(null);
  const candidatesByStage = useMemo(() => {
    const groups = {};
    stages.forEach(stage => {
      groups[stage] = candidates.filter(c => c.stage === stage);
    });
    return groups;
  }, [candidates, stages]);

  const handleDragStart = (e, candidate) => {
    e.stopPropagation(); // Prevents event bubbling
    setDraggedCandidate(candidate);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevents event bubbling
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, newStage) => {
    e.preventDefault();
    e.stopPropagation(); // Prevents event bubbling
    if (draggedCandidate && draggedCandidate.stage !== newStage) {
      try {
        await api.updateCandidate(draggedCandidate.id, { stage: newStage });
        onCandidateUpdate();
      } catch (error) {
        console.error('Failed to update candidate stage:', error);
      }
    }
    setDraggedCandidate(null);
  };

  return (
    <div className="mt-6 flex space-x-4 overflow-x-auto">
      {stages.map(stage => (
        <div
          key={stage}
          className="flex-shrink-0 w-72"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, stage)}
        >
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4 capitalize">
              {stage} ({candidatesByStage[stage].length})
            </h3>
            <div className="space-y-3">
              {candidatesByStage[stage].map(candidate => (
                <div
                  key={candidate.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, candidate)}
                  className="bg-white p-3 rounded-md shadow-sm cursor-move hover:shadow-md transition-shadow"
                >
                  <p className="font-medium text-sm">{candidate.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{candidate.email}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CandidateModal({ candidate, onClose }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTimeline = async () => {
      try {
        const data = await api.getCandidateTimeline(candidate.id);
        setTimeline(data);
      } catch (error) {
        console.error('Failed to load timeline:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTimeline();
  }, [candidate.id]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{candidate.name}</h2>
              <p className="text-sm text-gray-500">{candidate.email}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Now scrollable */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center">Loading timeline...</div>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline</h3>
              <ul className="space-y-4">
                {timeline.length > 0 ? (
                  timeline.map(event => (
                    <li key={event.id} className="relative pl-6">
                      <div className="absolute top-0 left-0 h-full w-0.5 bg-gray-200" />
                      <div className="absolute top-1 left-0 -ml-1 h-2 w-2 rounded-full bg-blue-600" />
                      <div className="ml-4">
                        <p className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-800">{event.note}</p>
                      </div>
                    </li>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No timeline events found.</p>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Assessments View Component
function AssessmentsView() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoading(true);
        const result = await api.getJobs({ pageSize: 100 });
        setJobs(result.jobs);
      } catch (error) {
        console.error("Failed to load jobs for assessments:", error);
      } finally {
        setLoading(false);
      }
    };
    loadJobs();
  }, []);

  if (loading) {
    return <div className="p-6 text-center">Loading jobs...</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900">Assessments</h1>
      <p className="mt-1 text-sm text-gray-600">
        Create and manage assessments for your jobs.
      </p>

      <div className="mt-6 flex gap-6">
        {/* Left side: Job list */}
        <div className="w-1/3 bg-white shadow rounded-lg p-4 h-full">
          <h2 className="text-lg font-medium mb-4">Select a Job</h2>
          <ul className="divide-y divide-gray-200">
            {jobs.map(job => (
              <li
                key={job.id}
                className={`py-3 px-2 cursor-pointer rounded-md ${selectedJob?.id === job.id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
                onClick={() => setSelectedJob(job)}
              >
                <p className="text-sm font-medium text-gray-900">{job.title}</p>
                <p className="text-xs text-gray-500">{job.slug}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Right side: Assessment Editor */}
        <div className="flex-1">
          {selectedJob ? (
            <AssessmentEditor jobId={selectedJob.id} jobTitle={selectedJob.title} />
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
              Please select a job to view or create an assessment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssessmentEditor({ jobId, jobTitle }) {
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [changesMade, setChangesMade] = useState(false);

  useEffect(() => {
    const loadAssessment = async () => {
      setLoading(true);
      try {
        const data = await api.getAssessment(jobId);
        setAssessment(data || {
          id: `assessment-${jobId}`,
          jobId,
          title: `${jobTitle} Assessment`,
          sections: []
        });
      } catch (error) {
        console.error("Failed to load assessment:", error);
      } finally {
        setLoading(false);
        setChangesMade(false);
      }
    };
    loadAssessment();
  }, [jobId, jobTitle]);

  const handleSave = async () => {
    if (!changesMade) return;
    setIsSaving(true);
    try {
      await api.saveAssessment(jobId, assessment);
      setChangesMade(false);
    } catch (error) {
      console.error("Failed to save assessment:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSection = () => {
    setAssessment(prev => ({
      ...prev,
      sections: [...prev.sections, { id: `section-${Date.now()}`, title: 'New Section', questions: [] }]
    }));
    setChangesMade(true);
  };

  const handleUpdateSectionTitle = (sectionId, newTitle) => {
    setAssessment(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === sectionId ? { ...s, title: newTitle } : s)
    }));
    setChangesMade(true);
  };

  const handleDeleteSection = (sectionId) => {
    setAssessment(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
    setChangesMade(true);
  };

  const handleAddQuestion = (sectionId, type) => {
    const newQuestion = {
      id: `question-${Date.now()}`,
      type,
      title: 'New Question',
      required: false,
      options: type.includes('choice') ? ['Option 1'] : undefined,
    };

    setAssessment(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId ? { ...s, questions: [...s.questions, newQuestion] } : s
      )
    }));
    setChangesMade(true);
  };

  const handleDeleteQuestion = (sectionId, questionId) => {
    setAssessment(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId ? { ...s, questions: s.questions.filter(q => q.id !== questionId) } : s
      )
    }));
    setChangesMade(true);
  };

  const handleUpdateQuestion = (sectionId, questionId, updates) => {
    setAssessment(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId ? {
          ...s,
          questions: s.questions.map(q =>
            q.id === questionId ? { ...q, ...updates } : q
          )
        } : s
      )
    }));
    setChangesMade(true);
  };

  if (loading) {
    return <div className="bg-white shadow rounded-lg p-6 text-center">Loading assessment...</div>;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{assessment.title}</h2>
        <button
          onClick={handleSave}
          disabled={!changesMade || isSaving}
          className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
          data-testid="save-assessment-button"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Assessment'}
        </button>
      </div>

      <div className="space-y-6">
        {assessment.sections.map(section => (
          <div key={section.id} className="border border-gray-200 rounded-lg p-4" data-testid={`section-${section.id}`}>
            <div className="flex items-center justify-between mb-4">
              <input
                type="text"
                value={section.title}
                onChange={(e) => handleUpdateSectionTitle(section.id, e.target.value)}
                className="font-medium text-gray-900 text-lg w-full bg-transparent border-none focus:outline-none"
              />
              <button
                onClick={() => handleDeleteSection(section.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                data-testid={`delete-section-button-${section.id}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {section.questions.map(question => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  onUpdate={(updates) => handleUpdateQuestion(section.id, question.id, updates)}
                  onDelete={() => handleDeleteQuestion(section.id, question.id)}
                />
              ))}
              <div className="flex space-x-2">
                <select
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddQuestion(section.id, e.target.value);
                      e.target.value = ''; // Reset select after adding
                    }
                  }}
                  value=""
                  data-testid={`add-question-select-${section.id}`}
                >
                  <option value="" disabled>Add Question...</option>
                  <option value="single-choice">Single Choice</option>
                  <option value="multi-choice">Multi-Choice</option>
                  <option value="short-text">Short Text</option>
                  <option value="long-text">Long Text</option>
                  <option value="numeric">Numeric</option>
                  <option value="file-upload">File Upload</option>
                </select>
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={handleAddSection}
          className="mt-4 w-full flex justify-center items-center py-2 px-4 border border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-600 hover:border-gray-400 transition-colors"
          data-testid="add-section-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Section
        </button>
      </div>
    </div>
  );
}

function QuestionEditor({ question, onUpdate, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-3" data-testid={`question-editor-${question.id}`}>
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 flex items-center">
          <span className="text-sm font-medium text-gray-700 capitalize">
            {question.type.replace('-', ' ')}
          </span>
          <input
            type="text"
            value={question.title}
            onChange={(e) => {
              e.stopPropagation();
              onUpdate({ title: e.target.value });
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 ml-2 bg-transparent text-sm font-medium border-none focus:outline-none"
          />
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-gray-400 hover:text-red-500 transition-colors"
            data-testid={`delete-question-button-${question.id}`}
          >
            <X className="w-4 h-4" />
          </button>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          <label className="flex items-center text-sm text-gray-700">
            <input
              type="checkbox"
              checked={question.required}
              onChange={(e) => onUpdate({ required: e.target.checked })}
              className="mr-2"
            />
            Required
          </label>

          {question.type.includes('choice') && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Options</p>
              <div className="space-y-2">
                {question.options?.map((option, index) => (
                  <div key={index} className="flex items-center">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...question.options];
                        newOptions[index] = e.target.value;
                        onUpdate({ options: newOptions });
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm"
                    />
                    <button
                      onClick={() => {
                        const newOptions = question.options.filter((_, i) => i !== index);
                        onUpdate({ options: newOptions });
                      }}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => onUpdate({ options: [...(question.options || []), ''] })}
                  className="w-full text-sm py-1 border border-dashed rounded-md text-gray-500 hover:bg-gray-100"
                >
                  Add Option
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pageNumbers = [];
  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <nav className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-6">
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Page <span className="font-medium">{currentPage}</span> of{' '}
            <span className="font-medium">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            {pageNumbers.map(page => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                aria-current={page === currentPage ? 'page' : undefined}
                className={`relative inline-flex items-center border px-4 py-2 text-sm font-medium ${
                  page === currentPage
                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </nav>
  );
}