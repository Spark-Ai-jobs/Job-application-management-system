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
  DownloadOutlined,
  ReloadOutlined,
  GlobalOutlined,
  CalendarOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
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

const SOURCE_COLORS: Record<string, string> = {
  linkedin: '#0A66C2',
  indeed: '#2164F3',
  glassdoor: '#0CAA41',
  manual: '#6B7280',
};

const CATEGORY_COLORS: Record<string, string> = {
  'AI/ML': 'purple',
  'ai_ml': 'purple',
  'Data Science': 'green',
  'data_science': 'green',
  'Software Engineering': 'blue',
  'DevOps': 'orange',
  'Product': 'magenta',
  'Design': 'pink',
  'data_analysis': 'cyan',
  'bi_analytics': 'gold',
  'Other': 'default',
};

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (sourceFilter) params.append('source', sourceFilter);
        if (categoryFilter) params.append('category', categoryFilter);
        params.append('page', '1');
        params.append('limit', '20');

        const response = await axios.get(`${endpoints.jobs.list}?${params}`);
        setJobs(response.data.jobs || []);
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [search, sourceFilter, categoryFilter]);

  const columns: ColumnsType<Job> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Job) => (
        <a href={record.url} target="_blank" rel="noopener noreferrer" style={{ color: '#5865F2' }}>
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
        <Tag style={{ backgroundColor: SOURCE_COLORS[source] || '#6B7280', color: '#fff', border: 'none' }}>
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
        if (!date) return <Text type="secondary">Unknown</Text>;
        const d = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        let timeText = '';
        if (diffHours < 1) timeText = 'Just now';
        else if (diffHours < 24) timeText = `${diffHours}h ago`;
        else if (diffDays === 1) timeText = 'Yesterday';
        else if (diffDays < 7) timeText = `${diffDays}d ago`;
        else timeText = d.toLocaleDateString();

        return (
          <Space>
            <CalendarOutlined style={{ color: '#9CA3AF' }} />
            <Text type="secondary">{timeText}</Text>
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
              value={jobs.length}
              prefix={<GlobalOutlined style={{ color: '#5865F2' }} />}
            />
          </Card>
        </Col>
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
              </Select>
              <Select
                placeholder="Category"
                style={{ width: 180 }}
                allowClear
                value={categoryFilter}
                onChange={setCategoryFilter}
              >
                <Option value="ai_ml">AI/ML</Option>
                <Option value="data_science">Data Science</Option>
                <Option value="data_analysis">Data Analysis</Option>
                <Option value="bi_analytics">BI Analytics</Option>
              </Select>
            </Space>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
              Refresh
            </Button>
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
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `${total} jobs`,
          }}
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
                <Tag color={CATEGORY_COLORS[selectedJob.category] || 'default'}>
                  {selectedJob.category}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Source">
                <Tag style={{ backgroundColor: SOURCE_COLORS[selectedJob.source] || '#6B7280', color: '#fff' }}>
                  {selectedJob.source}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Title level={5}>Description</Title>
            <Paragraph>{selectedJob.description}</Paragraph>

            {selectedJob.requirements && selectedJob.requirements.length > 0 && (
              <>
                <Title level={5}>Requirements</Title>
                <ul>
                  {selectedJob.requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </>
            )}

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
