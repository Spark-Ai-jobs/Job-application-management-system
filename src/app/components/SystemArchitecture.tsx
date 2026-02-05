import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Network, 
  Database, 
  Server, 
  Globe, 
  Cpu, 
  UserCog, 
  ArrowRight, 
  Bot, 
  Layers,
  ShieldAlert
} from 'lucide-react';

export function SystemArchitecture() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">System Architecture</h2>
        <p className="text-muted-foreground">
          High-level design of the distributed event-driven microservices architecture.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Scraper Service */}
        <Card className="relative overflow-hidden border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Job Discovery Service</CardTitle>
            </div>
            <CardDescription>Distributed Scraping Fleet</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Badge variant="outline">Python</Badge>
                <Badge variant="outline">Selenium</Badge>
              </li>
              <li>• Multi-source scraping (LinkedIn, Indeed)</li>
              <li>• Intelligent proxy rotation</li>
              <li>• Rate limit handling</li>
            </ul>
          </CardContent>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
            <ArrowRight className="h-6 w-6 text-blue-300" />
          </div>
        </Card>

        {/* Message Queue */}
        <Card className="relative overflow-hidden border-orange-200 bg-orange-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg">Event Bus</CardTitle>
            </div>
            <CardDescription>Kafka / RabbitMQ</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Badge variant="outline">Kafka</Badge>
              </li>
              <li>• Topic: <code>jobs.discovered</code></li>
              <li>• Topic: <code>applications.pending</code></li>
              <li>• Decoupled communication</li>
            </ul>
          </CardContent>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
            <ArrowRight className="h-6 w-6 text-orange-300" />
          </div>
        </Card>

        {/* ATS Engine */}
        <Card className="relative overflow-hidden border-purple-200 bg-purple-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg">ATS Engine</CardTitle>
            </div>
            <CardDescription>AI Matching Core</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Badge variant="outline">PyTorch</Badge>
                <Badge variant="outline">BERT</Badge>
              </li>
              <li>• Resume Parsing & Keyword Extraction</li>
              <li>• Semantic Matching vs JD</li>
              <li>• <b>Threshold: 90%</b> logic enforcement</li>
            </ul>
          </CardContent>
        </Card>

        {/* Human Loop */}
        <Card className="relative overflow-hidden border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg">Workflow Engine</CardTitle>
            </div>
            <CardDescription>Human-in-the-Loop</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Badge variant="outline">Redis</Badge>
                <Badge variant="outline">WebSockets</Badge>
              </li>
              <li>• Task Assignment (Round-robin)</li>
              <li>• SLA Timers (15-20m)</li>
              <li>• Employee Availability Tracking</li>
            </ul>
          </CardContent>
           <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
            <ArrowRight className="h-6 w-6 text-yellow-300" />
          </div>
        </Card>

         {/* Application Bot */}
         <Card className="relative overflow-hidden border-green-200 bg-green-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Auto-Applier</CardTitle>
            </div>
            <CardDescription>Execution Bot</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Badge variant="outline">Playwright</Badge>
              </li>
              <li>• Automated Form Filling</li>
              <li>• Resume Upload</li>
              <li>• Final Submission</li>
            </ul>
          </CardContent>
        </Card>

        {/* Database */}
        <Card className="relative overflow-hidden border-slate-200 bg-slate-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-slate-600" />
              <CardTitle className="text-lg">Persistence Layer</CardTitle>
            </div>
            <CardDescription>Polyglot Persistence</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Badge variant="outline">PostgreSQL</Badge>
                <Badge variant="outline">S3</Badge>
              </li>
              <li>• Users & Tasks (SQL)</li>
              <li>• Job Content (NoSQL)</li>
              <li>• Resume Files (Object Storage)</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 border-red-100 bg-red-50/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            <CardTitle className="text-lg">Performance & Compliance Protocols</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Task SLA Enforcement</h4>
              <p className="text-sm text-gray-600">
                If a task exceeds 20 minutes, it is automatically revoked and reassigned. 
                The employee receives a "Strike".
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">3-Strike Policy</h4>
              <p className="text-sm text-gray-600">
                Employees are allowed 3 warnings (strikes). The 4th violation triggers 
                a serious action (System Lockout) and notifies management.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
