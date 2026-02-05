import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Upload, FileText, Trash2, UserPlus, Mail } from 'lucide-react';
import { Candidate } from '../types';
import { toast } from 'sonner';

interface CandidatesTabProps {
  candidates: Candidate[];
  onAddCandidate: (candidate: Omit<Candidate, 'id' | 'uploadedDate' | 'totalApplications'>) => void;
  onDeleteCandidate: (id: string) => void;
}

export function CandidatesTab({ candidates, onAddCandidate, onDeleteCandidate }: CandidatesTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    resumeFile: null as File | null
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewCandidate({ ...newCandidate, resumeFile: e.target.files[0] });
    }
  };

  const handleAddCandidate = () => {
    if (!newCandidate.name || !newCandidate.email || !newCandidate.resumeFile) {
      toast.error('Please fill in all fields and upload a resume');
      return;
    }

    // In a real app, you'd upload the file to storage first
    onAddCandidate({
      name: newCandidate.name,
      email: newCandidate.email,
      resumeUrl: `/mock/resume-${newCandidate.name.toLowerCase().replace(/\s+/g, '-')}.pdf`
    });

    toast.success(`Candidate ${newCandidate.name} added successfully!`);
    setNewCandidate({ name: '', email: '', resumeFile: null });
    setIsAddDialogOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      onDeleteCandidate(id);
      toast.success(`Candidate ${name} removed`);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Candidates</h1>
          <p className="text-muted-foreground">Manage candidate resumes for automated applications</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Candidate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Candidate</DialogTitle>
              <DialogDescription>
                Upload a candidate's resume to start applying to jobs automatically
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Candidate Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={newCandidate.name}
                  onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={newCandidate.email}
                  onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resume">Resume (PDF)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="resume"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                  />
                  {newCandidate.resumeFile && (
                    <FileText className="h-5 w-5 text-green-600" />
                  )}
                </div>
                {newCandidate.resumeFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {newCandidate.resumeFile.name}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCandidate}>Add Candidate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{candidates.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {candidates.reduce((sum, c) => sum + c.totalApplications, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Applications/Candidate</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {candidates.length > 0
                ? Math.round(candidates.reduce((sum, c) => sum + c.totalApplications, 0) / candidates.length)
                : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Candidates Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Candidates</CardTitle>
          <CardDescription>
            {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Resume</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map(candidate => (
                <TableRow key={candidate.id}>
                  <TableCell className="font-medium">{candidate.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {candidate.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4 mr-2" />
                        View Resume
                      </a>
                    </Button>
                  </TableCell>
                  <TableCell>{new Date(candidate.uploadedDate).toLocaleDateString()}</TableCell>
                  <TableCell>{candidate.totalApplications}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(candidate.id, candidate.name)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {candidates.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No candidates yet</p>
              <p className="text-sm text-muted-foreground">Click "Add Candidate" to upload your first resume</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
