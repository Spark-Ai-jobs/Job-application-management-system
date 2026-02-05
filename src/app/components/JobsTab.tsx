import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { ExternalLink, Building2, Calendar, Search, Filter } from 'lucide-react';
import { Job } from '../types';

interface JobsTabProps {
  jobs: Job[];
}

export function JobsTab({ jobs }: JobsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const sources = ['All', 'LinkedIn', 'Indeed', 'Glassdoor', 'Other'];
  const categories = ['All', ...Array.from(new Set(jobs.map(job => job.category)))];

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = selectedSource === 'All' || job.source === selectedSource;
    const matchesCategory = selectedCategory === 'All' || job.category === selectedCategory;
    return matchesSearch && matchesSource && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Job Discovery</h1>
        <p className="text-slate-500">Monitor and manage incoming job streams from external sources.</p>
      </div>

      <Card className="border-border shadow-sm">
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <Button size="sm" className="h-9">
                Export CSV
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Source:</span>
            {sources.map(source => (
              <Badge
                key={source}
                variant={selectedSource === source ? 'default' : 'outline'}
                className={`cursor-pointer transition-colors ${selectedSource === source ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'}`}
                onClick={() => setSelectedSource(source)}
              >
                {source}
              </Badge>
            ))}
            <div className="w-px h-4 bg-slate-200 mx-2" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Category:</span>
            {categories.map(category => (
              <Badge
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                className={`cursor-pointer transition-colors ${selectedCategory === category ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        <div className="rounded-md">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-[300px]">Job Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.map((job) => (
                <TableRow key={job.id} className="group">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-slate-900 font-semibold">{job.title}</span>
                      <span className="text-xs text-slate-500 font-medium">{job.category}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center text-slate-600">
                        <Building2 className="h-3 w-3" />
                      </div>
                      <span className="text-slate-900 font-medium">{job.company}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`border bg-white text-slate-700 font-medium`}>
                      {job.source}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                      <Calendar className="h-3 w-3" />
                      {new Date(job.postedDate).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                      <a href={job.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 text-slate-400 hover:text-slate-900" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredJobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                    No jobs found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>Showing {filteredJobs.length} results</span>
        <span>Last updated: Just now</span>
      </div>
    </div>
  );
}
