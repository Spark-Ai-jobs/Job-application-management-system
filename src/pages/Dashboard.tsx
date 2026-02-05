import { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Progress,
  Table,
  Tag,
  Space,
  Spin,
  Alert,
} from 'antd';
import {
  RiseOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  FileSearchOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';

const { Title, Text } = Typography;

interface DashboardData {
  totalJobs: number;
  activeJobs: number;
  totalCandidates: number;
  pendingTasks: number;
  completedToday: number;
  avgAtsScore: number;
  recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
  }>;
  teamPerformance: Array<{
    name: string;
    completed: number;
    avgTime: number;
  }>;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    // Use mock data directly for now
    setData(getMockData());
    setLoading(false);
  }, []);

  const getMockData = (): DashboardData => ({
    totalJobs: 1247,
    activeJobs: 342,
    totalCandidates: 8564,
    pendingTasks: 23,
    completedToday: 47,
    avgAtsScore: 76.4,
    recentActivity: [
      { id: '1', type: 'task', message: 'Alice completed ATS review for John Doe', timestamp: '2 min ago' },
      { id: '2', type: 'job', message: 'New job scraped: Senior ML Engineer at Google', timestamp: '5 min ago' },
      { id: '3', type: 'candidate', message: 'New resume uploaded for Sarah Smith', timestamp: '12 min ago' },
      { id: '4', type: 'alert', message: 'Bob received a warning for SLA timeout', timestamp: '18 min ago' },
      { id: '5', type: 'task', message: 'Carol completed 5 tasks with 95% avg score', timestamp: '25 min ago' },
    ],
    teamPerformance: [
      { name: 'Alice', completed: 47, avgTime: 12.3 },
      { name: 'Bob', completed: 38, avgTime: 15.7 },
      { name: 'Carol', completed: 52, avgTime: 10.8 },
      { name: 'David', completed: 29, avgTime: 18.2 },
    ],
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" message={error} showIcon />;
  }

  if (!data) return null;

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          Welcome back, {user?.name}
        </Title>
        <Text type="secondary">
          Here's what's happening with your job applications today.
        </Text>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <Statistic
              title="Total Jobs"
              value={data.totalJobs}
              prefix={<FileSearchOutlined style={{ color: '#5865F2' }} />}
              suffix={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <RiseOutlined style={{ color: '#22C55E' }} /> +12%
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <Statistic
              title="Active Candidates"
              value={data.totalCandidates}
              prefix={<TeamOutlined style={{ color: '#22C55E' }} />}
              suffix={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <RiseOutlined style={{ color: '#22C55E' }} /> +8%
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <Statistic
              title="Pending Tasks"
              value={data.pendingTasks}
              prefix={<ClockCircleOutlined style={{ color: '#F59E0B' }} />}
              valueStyle={{ color: data.pendingTasks > 20 ? '#EF4444' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <Statistic
              title="Completed Today"
              value={data.completedToday}
              prefix={<CheckCircleOutlined style={{ color: '#22C55E' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Placeholder for Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title="Jobs by Category"
            bordered={false}
            style={{ borderRadius: 8, height: 300 }}
          >
            <div style={{ textAlign: 'center', paddingTop: 100 }}>
              <Text type="secondary">Charts loading...</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="Application Trends"
            bordered={false}
            style={{ borderRadius: 8, height: 300 }}
          >
            <div style={{ textAlign: 'center', paddingTop: 100 }}>
              <Text type="secondary">Charts loading...</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Bottom Row */}
      <Row gutter={[16, 16]}>
        {/* ATS Score Distribution */}
        <Col xs={24} lg={8}>
          <Card
            title="Average ATS Score"
            bordered={false}
            style={{ borderRadius: 8 }}
          >
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Progress
                type="dashboard"
                percent={data.avgAtsScore}
                strokeColor={{
                  '0%': '#F59E0B',
                  '100%': '#22C55E',
                }}
                format={(percent) => (
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 600 }}>{percent}%</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>Avg Score</div>
                  </div>
                )}
                size={180}
              />
              <div style={{ marginTop: 16 }}>
                <Space>
                  <Tag color="success">≥90% Auto-Submit</Tag>
                  <Tag color="warning">&lt;90% Review</Tag>
                </Space>
              </div>
            </div>
          </Card>
        </Col>

        {/* Team Performance */}
        <Col xs={24} lg={8}>
          <Card
            title="Team Performance"
            bordered={false}
            style={{ borderRadius: 8 }}
            extra={<Text type="secondary">This Week</Text>}
          >
            <Table
              dataSource={data.teamPerformance}
              rowKey="name"
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Name',
                  dataIndex: 'name',
                  key: 'name',
                },
                {
                  title: 'Completed',
                  dataIndex: 'completed',
                  key: 'completed',
                  render: (val: number) => (
                    <Tag color={val >= 40 ? 'success' : val >= 30 ? 'warning' : 'default'}>
                      {val}
                    </Tag>
                  ),
                },
                {
                  title: 'Avg Time',
                  dataIndex: 'avgTime',
                  key: 'avgTime',
                  render: (val: number) => `${val.toFixed(1)} min`,
                },
              ]}
            />
          </Card>
        </Col>

        {/* Recent Activity */}
        <Col xs={24} lg={8}>
          <Card
            title="Recent Activity"
            bordered={false}
            style={{ borderRadius: 8 }}
          >
            <div style={{ maxHeight: 280, overflow: 'auto' }}>
              {data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  style={{
                    padding: '12px 0',
                    borderBottom: '1px solid #F3F4F6',
                  }}
                >
                  <Space>
                    {activity.type === 'task' && <CheckCircleOutlined style={{ color: '#22C55E' }} />}
                    {activity.type === 'job' && <ThunderboltOutlined style={{ color: '#5865F2' }} />}
                    {activity.type === 'candidate' && <TeamOutlined style={{ color: '#8B5CF6' }} />}
                    {activity.type === 'alert' && <WarningOutlined style={{ color: '#EF4444' }} />}
                    <div>
                      <Text style={{ fontSize: 13 }}>{activity.message}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {activity.timestamp}
                      </Text>
                    </div>
                  </Space>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
