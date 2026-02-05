import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  ClipboardList, 
  UsersRound,
  Search,
  Bell,
  Settings,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from './ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Employee } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentEmployee: Employee;
  onLogout: () => void;
}

export function Layout({ 
  children, 
  activeTab, 
  onTabChange, 
  currentEmployee,
  onLogout 
}: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'jobs', label: 'Job Discovery', icon: Briefcase },
    { id: 'candidates', label: 'Candidates', icon: Users },
    { id: 'tasks', label: 'My Tasks', icon: ClipboardList },
    ...(currentEmployee.role === 'manager' || currentEmployee.role === 'admin' 
      ? [{ id: 'team', label: 'Team', icon: UsersRound }] 
      : []),
  ];

  return (
    <div className="min-h-screen bg-muted/20 flex">
      {/* Sidebar */}
      <aside 
        className={`bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col ${
          isSidebarOpen ? 'w-64' : 'w-[70px]'
        }`}
      >
        <div className="h-16 flex items-center px-4 border-b border-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <Briefcase className="h-4 w-4 text-primary-foreground" />
            </div>
            {isSidebarOpen && (
              <span className="font-semibold text-lg whitespace-nowrap">JobFlow AI</span>
            )}
          </div>
        </div>

        <div className="flex-1 py-4 flex flex-col gap-1 px-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors relative group
                ${activeTab === item.id 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {isSidebarOpen && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              
              {!isSidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none border">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-border">
           <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentEmployee.name}`} />
                      <AvatarFallback>{currentEmployee.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {isSidebarOpen && (
                      <div className="text-left overflow-hidden">
                        <p className="text-sm font-medium truncate">{currentEmployee.name}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                            currentEmployee.status === 'available' ? 'bg-green-500' :
                            currentEmployee.status === 'busy' ? 'bg-amber-500' : 'bg-slate-400'
                          }`} />
                          {currentEmployee.role}
                        </p>
                      </div>
                    )}
                    {isSidebarOpen && <ChevronRight className="h-4 w-4 text-muted-foreground opacity-50" />}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" side="right" sideOffset={10}>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onTabChange('settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-background/50 backdrop-blur-sm border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4 w-full max-w-xl">
             <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search candidates, jobs, or tasks..." 
                className="pl-9 bg-muted/40 border-transparent focus:bg-background focus:border-input transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-background" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b border-border">
                  <h4 className="font-semibold">Notifications</h4>
                </div>
                <div className="p-4 text-sm text-center text-muted-foreground min-h-[100px] flex items-center justify-center">
                  No new notifications
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => onTabChange('settings')}>
              <Settings className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={onLogout} title="Logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
