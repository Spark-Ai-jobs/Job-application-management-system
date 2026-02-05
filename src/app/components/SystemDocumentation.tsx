import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

export function SystemDocumentation() {
  return (
    <div className="space-y-6">
      <Alert className="border-blue-500 bg-blue-50">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> This is a frontend prototype demonstrating the application flow and UI. 
          A production implementation would require backend services, databases, and proper security measures.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">1. Login</h4>
            <p className="text-sm text-muted-foreground">Use one of the demo credentials to login as an employee.</p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">2. Dashboard Overview</h4>
            <p className="text-sm text-muted-foreground">
              View KPIs including total candidates, jobs found today, applications submitted, and average ATS scores. 
              The pie chart shows job categorization (AI/ML, Data Science, etc.).
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">3. Jobs Tab</h4>
            <p className="text-sm text-muted-foreground">
              Browse all scraped jobs from LinkedIn, Indeed, Glassdoor, and other portals. Filter by source and category.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">4. Candidates Tab</h4>
            <p className="text-sm text-muted-foreground">
              Upload candidate resumes (up to n candidates). Each candidate's resume is automatically checked against all jobs.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">5. My Tasks Tab</h4>
            <p className="text-sm text-muted-foreground">
              When a candidate's resume has an ATS score below 90%, it's assigned to you. You have 15-20 minutes to tailor 
              the resume and upload the updated version.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">6. Team Tab</h4>
            <p className="text-sm text-muted-foreground">
              View all employees, their status (available/busy/offline), current tasks, and performance metrics.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Automated Job Scraping</p>
              <p className="text-sm text-muted-foreground">
                Continuously scrapes jobs from multiple portals (LinkedIn, Indeed, Glassdoor, etc.)
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">ATS Score Calculation</p>
              <p className="text-sm text-muted-foreground">
                Automatically calculates ATS compatibility score for each candidate-job pair
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Smart Task Assignment</p>
              <p className="text-sm text-muted-foreground">
                Tasks are automatically assigned to available employees. If all busy, tasks wait in queue.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Human-in-the-Loop Review</p>
              <p className="text-sm text-muted-foreground">
                Resumes below 90% ATS score are flagged for human review and tailoring
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Automated Application Submission</p>
              <p className="text-sm text-muted-foreground">
                Once a resume meets the 90% threshold, it's automatically applied to all matching jobs
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Performance Tracking</p>
              <p className="text-sm text-muted-foreground">
                Track employee performance with warnings, violations, and average completion times
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Warning & Violation System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Task Timer:</strong> Each task has a 15-20 minute timer. If you don't complete it in time, 
              you receive a warning.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <span>Warnings 1-3: Recorded but no action taken</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              <span>Warning 4+: Converted to violation, serious action required</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job Categorization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Jobs are automatically categorized using NLP into the following categories:
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 bg-blue-50 rounded">AI/ML</div>
            <div className="p-2 bg-green-50 rounded">Data Science</div>
            <div className="p-2 bg-orange-50 rounded">Data Analysis</div>
            <div className="p-2 bg-purple-50 rounded">BI/Analytics</div>
            <div className="p-2 bg-pink-50 rounded">Software Engineering</div>
            <div className="p-2 bg-yellow-50 rounded">Other Tech Roles</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backend Requirements (For Production)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Alert className="border-orange-500 bg-orange-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This prototype uses mock data. A production system would require:
            </AlertDescription>
          </Alert>
          
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
            <li>Database (PostgreSQL/MongoDB) for jobs, candidates, tasks, employees</li>
            <li>Job scraping service with API integrations (LinkedIn, Indeed, Glassdoor)</li>
            <li>ATS scoring engine using NLP/ML models</li>
            <li>Task queue management system (Redis/RabbitMQ)</li>
            <li>Authentication service (OAuth, JWT)</li>
            <li>File storage for resumes (AWS S3, Google Cloud Storage)</li>
            <li>Real-time notification system (WebSocket, Push notifications)</li>
            <li>Automated job application service with portal integrations</li>
            <li>Monitoring and logging infrastructure</li>
            <li>GDPR/CCPA compliance measures for handling PII</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Privacy & Security</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-500 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> This system handles sensitive personal information (resumes, applications). 
              In production, you must implement:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>End-to-end encryption for all data</li>
                <li>Secure authentication and authorization</li>
                <li>Regular security audits</li>
                <li>GDPR/CCPA compliance</li>
                <li>Data retention and deletion policies</li>
                <li>Consent management</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
