import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import { Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { Employee, ATSTask } from '../types';

interface EmployeesTabProps {
  employees: Employee[];
  tasks: ATSTask[];
}

export function EmployeesTab({ employees, tasks }: EmployeesTabProps) {
  const getStatusBadge = (status: Employee['status']) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-500">Available</Badge>;
      case 'busy':
        return <Badge className="bg-yellow-500">Busy</Badge>;
      case 'offline':
        return <Badge variant="secondary">Offline</Badge>;
    }
  };

  const getWarningLevel = (warnings: number, violations: number) => {
    if (violations > 0) return 'text-red-600';
    if (warnings >= 3) return 'text-orange-600';
    if (warnings > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const assignedTasks = tasks.filter(t => t.status === 'assigned' || t.status === 'in-progress').length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Team Management</h1>
        <p className="text-muted-foreground">Monitor employee status and task assignments</p>
      </div>

      {/* Team Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees.filter(e => e.status === 'available').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Busy</CardTitle>
            <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees.filter(e => e.status === 'busy').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks in Queue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Alert */}
      {pendingTasks > employees.filter(e => e.status === 'available').length && (
        <Alert className="border-yellow-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Warning: There are {pendingTasks} tasks in queue but only {employees.filter(e => e.status === 'available').length} available employees.
            Tasks will be assigned as employees become available.
          </AlertDescription>
        </Alert>
      )}

      {/* Task Assignment Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Task Assignment Status</CardTitle>
          <CardDescription>Current task distribution across the team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Assigned Tasks</span>
              <Badge>{assignedTasks}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Pending in Queue</span>
              <Badge variant="secondary">{pendingTasks}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Completed Today</span>
              <Badge className="bg-green-500">{tasks.filter(t => t.status === 'completed').length}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
          <CardDescription>Real-time employee status and performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Task</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Avg. Time</TableHead>
                <TableHead>Warnings</TableHead>
                <TableHead>Violations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(employee => {
                const currentTask = tasks.find(t => t.id === employee.currentTask);
                return (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{getStatusBadge(employee.status)}</TableCell>
                    <TableCell>
                      {currentTask ? (
                        <div className="text-sm">
                          <p className="font-medium">{currentTask.candidateName}</p>
                          <p className="text-muted-foreground">{currentTask.jobTitle}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No active task</span>
                      )}
                    </TableCell>
                    <TableCell>{employee.tasksCompleted}</TableCell>
                    <TableCell>{employee.averageCompletionTime}m</TableCell>
                    <TableCell>
                      <span className={getWarningLevel(employee.warnings, employee.violations)}>
                        {employee.warnings}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={getWarningLevel(employee.warnings, employee.violations)}>
                        {employee.violations}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Performance Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {employees.filter(e => e.warnings >= 3 || e.violations > 0).length === 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>All employees are performing well</span>
              </div>
            ) : (
              employees
                .filter(e => e.warnings >= 3 || e.violations > 0)
                .map(employee => (
                  <Alert key={employee.id} className="border-orange-500">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{employee.name}</strong> has {employee.warnings} warnings and {employee.violations} violations.
                      {employee.warnings >= 3 && ' Next violation will result in serious action.'}
                    </AlertDescription>
                  </Alert>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
