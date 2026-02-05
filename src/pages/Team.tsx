import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Avatar,
  Badge,
  Modal,
  Descriptions,
  Timeline,
  Progress,
  Tooltip,
  Popconfirm,
  message,
} from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  TeamOutlined,
  TrophyOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';
import { endpoints } from '../config/api';
import { useAuthStore } from '../stores/authStore';

const { Title, Text } = Typography;

interface Employee {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
  status: 'available' | 'busy' | 'offline';
  warnings: number;
  violations: number;
  tasks_completed: number;
  avg_completion_time: number | null;
  last_active: string | null;
  created_at: string;
}

interface Incident {
  id: string;
  type: 'warning' | 'violation';
  reason: string;
  task_id: string | null;
  created_at: string;
}

interface EmployeeStats {
  total: number;
  available: number;
  busy: number;
  offline: number;
  avgTasksPerDay: number;
}

const STATUS_COLORS = {
  available: '#22C55E',
  busy: '#F59E0B',
  offline: '#9CA3AF',
};

const ROLE_COLORS = {
  admin: 'red',
  manager: 'blue',
  employee: 'default',
};

export default function Team() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchEmployees();
    fetchStats();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get(endpoints.employees.list);
      setEmployees(response.data.employees);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      setEmployees(getMockEmployees());
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(endpoints.employees.stats);
      setStats(response.data);
    } catch {
      setStats({
        total: 12,
        available: 8,
        busy: 3,
        offline: 1,
        avgTasksPerDay: 15.4,
      });
    }
  };

  const fetchIncidents = async (employeeId: string) => {
    try {
      const response = await axios.get(endpoints.employees.incidents(employeeId));
      setIncidents(response.data.incidents);
    } catch {
      setIncidents([
        { id: '1', type: 'warning', reason: 'SLA timeout on task', task_id: 't1', created_at: '2024-01-15T10:00:00Z' },
        { id: '2', type: 'warning', reason: 'SLA timeout on task', task_id: 't2', created_at: '2024-01-14T14:00:00Z' },
      ]);
    }
  };

  const getMockEmployees = (): Employee[] => [
    {
      id: '1',
      email: 'alice.t@company.com',
      name: 'Alice Thompson',
      role: 'manager',
      status: 'available',
      warnings: 0,
      violations: 0,
      tasks_completed: 156,
      avg_completion_time: 12.3,
      last_active: new Date().toISOString(),
      created_at: '2023-06-01T08:00:00Z',
    },
    {
      id: '2',
      email: 'bob.m@company.com',
      name: 'Bob Martinez',
      role: 'employee',
      status: 'busy',
      warnings: 2,
      violations: 0,
      tasks_completed: 89,
      avg_completion_time: 15.7,
      last_active: new Date().toISOString(),
      created_at: '2023-08-15T08:00:00Z',
    },
    {
      id: '3',
      email: 'carol.j@company.com',
      name: 'Carol Johnson',
      role: 'employee',
      status: 'available',
      warnings: 0,
      violations: 0,
      tasks_completed: 201,
      avg_completion_time: 10.8,
      last_active: new Date().toISOString(),
      created_at: '2023-05-10T08:00:00Z',
    },
    {
      id: '4',
      email: 'david.k@company.com',
      name: 'David Kim',
      role: 'employee',
      status: 'offline',
      warnings: 3,
      violations: 1,
      tasks_completed: 67,
      avg_completion_time: 18.2,
      last_active: '2024-01-14T17:00:00Z',
      created_at: '2023-09-20T08:00:00Z',
    },
  ];

  const handleViewEmployee = async (employee: Employee) => {
    setSelectedEmployee(employee);
    await fetchIncidents(employee.id);
    setModalOpen(true);
  };

  const handleResetWarnings = async (employeeId: string) => {
    try {
      await axios.post(endpoints.employees.resetWarnings(employeeId));
      message.success('Warnings reset successfully');
      fetchEmployees();
      if (selectedEmployee?.id === employeeId) {
        setSelectedEmployee((prev) => prev ? { ...prev, warnings: 0 } : null);
      }
    } catch {
      message.error('Failed to reset warnings');
    }
  };

  const handleResetViolations = async (employeeId: string) => {
    try {
      await axios.post(endpoints.employees.resetViolations(employeeId));
      message.success('Violations reset successfully');
      fetchEmployees();
      if (selectedEmployee?.id === employeeId) {
        setSelectedEmployee((prev) => prev ? { ...prev, violations: 0 } : null);
      }
    } catch {
      message.error('Failed to reset violations');
    }
  };

  const columns: ColumnsType<Employee> = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_: unknown, record: Employee) => (
        <Space>
          <Badge
            dot
            offset={[-4, 28]}
            color={STATUS_COLORS[record.status]}
          >
            <Avatar style={{ backgroundColor: '#5865F2' }}>
              {record.name.charAt(0)}
            </Avatar>
          </Badge>
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: keyof typeof ROLE_COLORS) => (
        <Tag color={ROLE_COLORS[role]}>
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: keyof typeof STATUS_COLORS) => (
        <Badge
          status={status === 'available' ? 'success' : status === 'busy' ? 'warning' : 'default'}
          text={status.charAt(0).toUpperCase() + status.slice(1)}
        />
      ),
    },
    {
      title: 'Tasks Completed',
      dataIndex: 'tasks_completed',
      key: 'tasks_completed',
      sorter: (a, b) => a.tasks_completed - b.tasks_completed,
      render: (count: number) => (
        <Space>
          <CheckCircleOutlined style={{ color: '#22C55E' }} />
          {count}
        </Space>
      ),
    },
    {
      title: 'Avg Time',
      dataIndex: 'avg_completion_time',
      key: 'avg_completion_time',
      render: (time: number | null) => time ? `${time.toFixed(1)} min` : '-',
    },
    {
      title: 'Warnings',
      dataIndex: 'warnings',
      key: 'warnings',
      render: (warnings: number) => (
        <Tag color={warnings > 0 ? 'warning' : 'default'} icon={warnings > 0 ? <WarningOutlined /> : null}>
          {warnings} / 3
        </Tag>
      ),
    },
    {
      title: 'Violations',
      dataIndex: 'violations',
      key: 'violations',
      render: (violations: number) => (
        <Tag color={violations > 0 ? 'error' : 'default'} icon={violations > 0 ? <ExclamationCircleOutlined /> : null}>
          {violations} / 4
        </Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Employee) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewEmployee(record)}
            />
          </Tooltip>
          {(user?.role === 'admin' || user?.role === 'manager') && record.warnings > 0 && (
            <Popconfirm
              title="Reset warnings?"
              description="This will set the warning count to 0."
              onConfirm={() => handleResetWarnings(record.id)}
            >
              <Tooltip title="Reset Warnings">
                <Button type="text" icon={<ReloadOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          Team Management
        </Title>
        <Text type="secondary">
          Monitor team performance, availability, and incident history.
        </Text>
      </div>

      {/* Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card bordered={false} size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Total Team"
              value={stats?.total || 0}
              prefix={<TeamOutlined style={{ color: '#5865F2' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Available"
              value={stats?.available || 0}
              valueStyle={{ color: '#22C55E' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Busy"
              value={stats?.busy || 0}
              valueStyle={{ color: '#F59E0B' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Avg Tasks/Day"
              value={stats?.avgTasksPerDay || 0}
              precision={1}
              prefix={<TrophyOutlined style={{ color: '#5865F2' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Warning System Info */}
      <Card bordered={false} style={{ borderRadius: 8, marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col flex="auto">
            <Title level={5} style={{ margin: 0 }}>
              <WarningOutlined style={{ color: '#F59E0B', marginRight: 8 }} />
              Warning & Violation System
            </Title>
            <Text type="secondary">
              3 warnings = 1 violation • 4 violations = account suspension
            </Text>
          </Col>
          <Col>
            <Space size={24}>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={75}
                  size={60}
                  strokeColor="#F59E0B"
                  format={() => '3'}
                />
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                  Warnings → Violation
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={100}
                  size={60}
                  strokeColor="#EF4444"
                  format={() => '4'}
                />
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                  Violations → Action
                </div>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Team Table */}
      <Card bordered={false} style={{ borderRadius: 8 }}>
        <Table
          columns={columns}
          dataSource={employees}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Employee Detail Modal */}
      <Modal
        title={selectedEmployee?.name}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
      >
        {selectedEmployee && (
          <div>
            <Descriptions column={2} size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Email">
                {selectedEmployee.email}
              </Descriptions.Item>
              <Descriptions.Item label="Role">
                <Tag color={ROLE_COLORS[selectedEmployee.role]}>
                  {selectedEmployee.role}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge
                  status={selectedEmployee.status === 'available' ? 'success' : selectedEmployee.status === 'busy' ? 'warning' : 'default'}
                  text={selectedEmployee.status}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Tasks Completed">
                {selectedEmployee.tasks_completed}
              </Descriptions.Item>
              <Descriptions.Item label="Avg Time">
                {selectedEmployee.avg_completion_time?.toFixed(1) || '-'} min
              </Descriptions.Item>
              <Descriptions.Item label="Joined">
                {new Date(selectedEmployee.created_at).toLocaleDateString()}
              </Descriptions.Item>
            </Descriptions>

            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={12}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Warnings"
                    value={selectedEmployee.warnings}
                    suffix="/ 3"
                    valueStyle={{ color: selectedEmployee.warnings > 0 ? '#F59E0B' : undefined }}
                  />
                  {selectedEmployee.warnings > 0 && (user?.role === 'admin' || user?.role === 'manager') && (
                    <Popconfirm
                      title="Reset all warnings?"
                      onConfirm={() => handleResetWarnings(selectedEmployee.id)}
                    >
                      <Button size="small" style={{ marginTop: 8 }}>
                        Reset
                      </Button>
                    </Popconfirm>
                  )}
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Violations"
                    value={selectedEmployee.violations}
                    suffix="/ 4"
                    valueStyle={{ color: selectedEmployee.violations > 0 ? '#EF4444' : undefined }}
                  />
                  {selectedEmployee.violations > 0 && user?.role === 'admin' && (
                    <Popconfirm
                      title="Reset all violations?"
                      onConfirm={() => handleResetViolations(selectedEmployee.id)}
                    >
                      <Button size="small" style={{ marginTop: 8 }}>
                        Reset
                      </Button>
                    </Popconfirm>
                  )}
                </Card>
              </Col>
            </Row>

            <Title level={5}>Incident History</Title>
            {incidents.length > 0 ? (
              <Timeline>
                {incidents.map((incident) => (
                  <Timeline.Item
                    key={incident.id}
                    color={incident.type === 'warning' ? 'orange' : 'red'}
                    dot={incident.type === 'warning' ? <WarningOutlined /> : <ExclamationCircleOutlined />}
                  >
                    <div>
                      <Tag color={incident.type === 'warning' ? 'warning' : 'error'}>
                        {incident.type.toUpperCase()}
                      </Tag>
                      <Text>{incident.reason}</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(incident.created_at).toLocaleString()}
                    </Text>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Text type="secondary">No incidents recorded</Text>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
