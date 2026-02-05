import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Drawer,
  Descriptions,
  Badge,
  Tooltip,
  message,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  ReloadOutlined,
  GlobalOutlined,
  CalendarOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import axios from 'axios';
import { endpoints } from '../config/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryRange: string | null;
  jobType: string;
  experienceLevel: string;
  category: string;
  source: string;
  url: string;
  description: string;
  requirements: string[];
  postedDate: string;
  scrapedAt: string;
  isActive: boolean;
}

interface JobStats {
  total: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
}

const SOURCE_COLORS: Record<string, string> = {
  linkedin: '#0A66C2',
  indeed: '#2164F3',
  glassdoor: '#0CAA41',
  manual: '#6B7280',
};

const CATEGORY_COLORS: Record<string, string> = {
  'AI/ML': 'purple',
  'Data Science': 'green',
  'Software Engineering': 'blue',
  'DevOps': 'orange',
  'Product': 'magenta',
  'Design': 'pink',
  'Other': 'default',
};

// Mock data for fallback
const getMockJobs = (): Job[] => [
  {
    id: '1',
    title: 'Senior Machine Learning Engineer',
    company: 'Google',
    location: 'Mountain View, CA',
    salaryRange: '$180,000 - $250,000',
    jobType: 'full-time',
    experienceLevel: 'senior',
    category: 'AI/ML',
    source: 'linkedin',
    url: 'https://linkedin.com/jobs/1234',
    description: 'We are looking for a Senior ML Engineer to join our AI team...',
    requirements: ['5+ years ML experience', 'PhD preferred', 'TensorFlow/PyTorch'],
    postedDate: '2024-01-15T10:00:00Z',
    scrapedAt: '2024-01-15T12:00:00Z',
    isActive: true,
  },
  {
    id: '2',
    title: 'Data Scientist',
    company: 'Meta',
    location: 'Menlo Park, CA',
    salaryRange: '$150,000 - $200,000',
    jobType: 'full-time',
    experienceLevel: 'mid',
    category: 'Data Science',
    source: 'indeed',
    url: 'https://indeed.com/jobs/5678',
    description: 'Join our data science team to build ML models at scale...',
    requirements: ['3+ years experience', 'Python', 'SQL', 'Statistics'],
    postedDate: '2024-01-14T08:00:00Z',
    scrapedAt: '2024-01-14T10:00:00Z',
    isActive: true,
  },
  {
    id: '3',
    title: 'Software Engineer - Backend',
    company: 'Amazon',
    location: 'Seattle, WA',
    salaryRange: '$140,000 - $190,000',
    jobType: 'full-time',
    experienceLevel: 'mid',
    category: 'Software Engineering',
    source: 'glassdoor',
    url: 'https://glassdoor.com/jobs/9012',
    description: 'Build scalable backend services for AWS...',
    requirements: ['Java/Python', 'Distributed systems', 'AWS'],
    postedDate: '2024-01-13T14:00:00Z',
    scrapedAt: '2024-01-13T16:00:00Z',
    isActive: true,
  },
];

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (sourceFilter) params.append('source', sourceFilter);
        if (categoryFilter) params.append('category', categoryFilter);
        params.append('page', String(pagination.current));
        params.append('limit', String(pagination.pageSize));

        const response = await axios.get(`${endpoints.jobs.list}?${params}`);
        setJobs(response.data.jobs || []);
        setPagination((prev) => ({
          ...prev,
          total: response.data.pagination?.total || 0,
        }));
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
        // Use mock data
        setJobs(getMockJobs());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sourceFilter, categoryFilter]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(endpoints.jobs.stats);
        setStats(response.data);
      } catch {
        setStats({
          total: 1247,
          bySource: { linkedin: 523, indeed: 412, glassdoor: 287, manual: 25 },
          byCategory: {
            'AI/ML': 342,
            'Data Science': 287,
            'Software Engineering': 456,
            'DevOps': 89,
            'Product': 45,
            'Design': 28,
          },
        });
      }
    };

    fetchStats();
  }, []);

  const handleExport = async () => {
    try {
      const response = await axios.get(endpoints.jobs.export, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `jobs_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('Jobs exported successfully');
    } catch {
      message.error('Failed to export jobs');
    }
  };

  const columns: ColumnsType<Job> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Job) => (
        <a onClick={() => { setSelectedJob(record); setDrawerOpen(true); }}>
          {text}
        </a>
      ),
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (text: string) => (
        <Space>
          <EnvironmentOutlined style={{ color: '#9CA3AF' }} />
          {text}
        </Space>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => (
        <Tag color={CATEGORY_COLORS[cat] || 'default'}>{cat}</Tag>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => (
        <Tag style={{ backgroundColor: SOURCE_COLORS[source], color: '#fff', border: 'none' }}>
          {source.charAt(0).toUpperCase() + source.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Salary',
      dataIndex: 'salaryRange',
      key: 'salaryRange',
      render: (salary: string | null) => (
        salary ? (
          <Space>
            <DollarOutlined style={{ color: '#22C55E' }} />
            {salary}
          </Space>
        ) : (
          <Text type="secondary">Not specified</Text>
        )
      ),
    },
    {
      title: 'Posted',
      dataIndex: 'postedDate',
      key: 'postedDate',
      render: (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        return (
          <Space>
            <CalendarOutlined style={{ color: '#9CA3AF' }} />
            {diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`}
          </Space>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) => (
        <Badge status={active ? 'success' : 'default'} text={active ? 'Active' : 'Closed'} />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: unknown, record: Job) => (
        <Tooltip title="View on source">
          <Button
            type="text"
            icon={<LinkOutlined />}
            href={record.url}
            target="_blank"
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          Jobs Discovery
        </Title>
        <Text type="secondary">
          Browse and manage scraped job listings from multiple sources.
        </Text>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card bordered={false} size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Total Jobs"
              value={stats?.total || 0}
              prefix={<GlobalOutlined style={{ color: '#5865F2' }} />}
            />
          </Card>
        </Col>
        {stats && Object.entries(stats.bySource).slice(0, 3).map(([source, count]) => (
          <Col xs={12} sm={6} key={source}>
            <Card bordered={false} size="small" style={{ borderRadius: 8 }}>
              <Statistic
                title={source.charAt(0).toUpperCase() + source.slice(1)}
                value={count}
                valueStyle={{ color: SOURCE_COLORS[source] }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters & Actions */}
      <Card bordered={false} style={{ borderRadius: 8, marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Input
                placeholder="Search jobs..."
                prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
                style={{ width: 280 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
              />
              <Select
                placeholder="Source"
                style={{ width: 140 }}
                allowClear
                value={sourceFilter}
                onChange={setSourceFilter}
              >
                <Option value="linkedin">LinkedIn</Option>
                <Option value="indeed">Indeed</Option>
                <Option value="glassdoor">Glassdoor</Option>
                <Option value="manual">Manual</Option>
              </Select>
              <Select
                placeholder="Category"
                style={{ width: 180 }}
                allowClear
                value={categoryFilter}
                onChange={setCategoryFilter}
              >
                <Option value="AI/ML">AI/ML</Option>
                <Option value="Data Science">Data Science</Option>
                <Option value="Software Engineering">Software Engineering</Option>
                <Option value="DevOps">DevOps</Option>
                <Option value="Product">Product</Option>
                <Option value="Design">Design</Option>
              </Select>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
                Refresh
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                Export CSV
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Jobs Table */}
      <Card bordered={false} style={{ borderRadius: 8 }}>
        <Table
          columns={columns}
          dataSource={jobs}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `${total} jobs`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={(pag) => setPagination(pag)}
        />
      </Card>

      {/* Job Detail Drawer */}
      <Drawer
        title={selectedJob?.title}
        placement="right"
        width={600}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {selectedJob && (
          <div>
            <Descriptions column={1} size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Company">
                <Text strong>{selectedJob.company}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Location">
                {selectedJob.location}
              </Descriptions.Item>
              <Descriptions.Item label="Salary">
                {selectedJob.salaryRange || 'Not specified'}
              </Descriptions.Item>
              <Descriptions.Item label="Type">
                {selectedJob.jobType}
              </Descriptions.Item>
              <Descriptions.Item label="Experience">
                {selectedJob.experienceLevel}
              </Descriptions.Item>
              <Descriptions.Item label="Category">
                <Tag color={CATEGORY_COLORS[selectedJob.category]}>
                  {selectedJob.category}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Source">
                <Tag style={{ backgroundColor: SOURCE_COLORS[selectedJob.source], color: '#fff' }}>
                  {selectedJob.source}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Title level={5}>Description</Title>
            <Paragraph>{selectedJob.description}</Paragraph>

            <Title level={5}>Requirements</Title>
            <ul>
              {selectedJob.requirements.map((req, i) => (
                <li key={i}>{req}</li>
              ))}
            </ul>

            <div style={{ marginTop: 24 }}>
              <Button type="primary" href={selectedJob.url} target="_blank" icon={<LinkOutlined />}>
                View Original Posting
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
