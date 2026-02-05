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
  Modal,
  Form,
  Upload,
  Progress,
  Avatar,
  Drawer,
  Descriptions,
  Tabs,
  Timeline,
  message,
  Tooltip,
  Statistic,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  UploadOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload';
import axios from 'axios';
import { endpoints } from '../config/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  skills: string[];
  experienceYears: number;
  currentTitle?: string | null;
  resumeUrl: string | null;
  status?: 'active' | 'placed' | 'withdrawn';
  totalApplications?: number;
  successfulApplications?: number;
  createdAt: string;
  updatedAt: string;
  applications?: Application[];
}

interface Application {
  id: string;
  job_title: string;
  company: string;
  ats_score: number;
  status: 'pending' | 'submitted' | 'rejected' | 'interview' | 'offer';
  applied_at: string;
}

const STATUS_COLORS = {
  active: 'green',
  placed: 'blue',
  withdrawn: 'default',
};

const APP_STATUS_COLORS = {
  pending: 'orange',
  submitted: 'blue',
  rejected: 'red',
  interview: 'purple',
  offer: 'green',
};

export default function Candidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  useEffect(() => {
    fetchCandidates();
  }, [search, statusFilter, pagination.current, pagination.pageSize]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', String(pagination.current));
      params.append('limit', String(pagination.pageSize));

      const response = await axios.get(`${endpoints.candidates.list}?${params}`);
      setCandidates(response.data.candidates);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination.total,
      }));
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
      setCandidates(getMockCandidates());
      setPagination((prev) => ({ ...prev, total: 50 }));
    } finally {
      setLoading(false);
    }
  };

  const getMockCandidates = (): Candidate[] => [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@email.com',
      phone: '+1 (555) 123-4567',
      skills: ['Python', 'Machine Learning', 'TensorFlow', 'Data Analysis'],
      experienceYears: 5,
      currentTitle: 'Data Scientist',
      resumeUrl: '/resumes/john_doe.pdf',
      totalApplications: 10,
      successfulApplications: 3,
      createdAt: '2024-01-10T08:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      applications: [
        { id: '1', job_title: 'Senior ML Engineer', company: 'Google', ats_score: 92, status: 'submitted', applied_at: '2024-01-12T10:00:00Z' },
        { id: '2', job_title: 'Data Scientist', company: 'Meta', ats_score: 85, status: 'interview', applied_at: '2024-01-14T10:00:00Z' },
      ],
    },
    {
      id: '2',
      name: 'Sarah Smith',
      email: 'sarah.smith@email.com',
      phone: '+1 (555) 987-6543',
      skills: ['Java', 'Spring Boot', 'Microservices', 'AWS'],
      experienceYears: 7,
      currentTitle: 'Senior Software Engineer',
      resumeUrl: '/resumes/sarah_smith.pdf',
      totalApplications: 8,
      successfulApplications: 2,
      createdAt: '2024-01-08T08:00:00Z',
      updatedAt: '2024-01-14T10:00:00Z',
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike.j@email.com',
      phone: null,
      skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
      experienceYears: 4,
      currentTitle: 'Full Stack Developer',
      resumeUrl: '/resumes/mike_johnson.pdf',
      totalApplications: 5,
      successfulApplications: 1,
      createdAt: '2024-01-05T08:00:00Z',
      updatedAt: '2024-01-13T10:00:00Z',
    },
  ];

  const handleAddCandidate = async (values: any) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('email', values.email);
      if (values.phone) formData.append('phone', values.phone);
      if (values.skills) formData.append('skills', JSON.stringify(values.skills));
      if (values.experience_years) formData.append('experience_years', values.experience_years);
      if (values.current_title) formData.append('current_title', values.current_title);
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('resume', fileList[0].originFileObj);
      }

      await axios.post(endpoints.candidates.create, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      message.success('Candidate added successfully');
      setModalOpen(false);
      form.resetFields();
      setFileList([]);
      fetchCandidates();
    } catch (err) {
      message.error('Failed to add candidate');
    } finally {
      setUploading(false);
    }
  };

  const handleBulkUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('resumes', file);

    try {
      await axios.post(endpoints.candidates.upload, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('Resume uploaded and processing started');
      fetchCandidates();
    } catch {
      message.error('Failed to upload resume');
    }
    return false;
  };

  const columns: ColumnsType<Candidate> = [
    {
      title: 'Candidate',
      key: 'candidate',
      render: (_: unknown, record: Candidate) => (
        <Space>
          <Avatar style={{ backgroundColor: '#5865F2' }}>
            {record.name.charAt(0)}
          </Avatar>
          <div>
            <a onClick={() => { setSelectedCandidate(record); setDrawerOpen(true); }}>
              <Text strong>{record.name}</Text>
            </a>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.currentTitle || 'No title'}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_: unknown, record: Candidate) => (
        <div>
          <Space>
            <MailOutlined style={{ color: '#9CA3AF' }} />
            <Text style={{ fontSize: 13 }}>{record.email}</Text>
          </Space>
          {record.phone && (
            <>
              <br />
              <Space>
                <PhoneOutlined style={{ color: '#9CA3AF' }} />
                <Text style={{ fontSize: 13 }}>{record.phone}</Text>
              </Space>
            </>
          )}
        </div>
      ),
    },
    {
      title: 'Skills',
      dataIndex: 'skills',
      key: 'skills',
      render: (skills: string[]) => (
        <Space size={[0, 4]} wrap>
          {skills.slice(0, 3).map((skill) => (
            <Tag key={skill} style={{ fontSize: 11 }}>{skill}</Tag>
          ))}
          {skills.length > 3 && (
            <Tag style={{ fontSize: 11 }}>+{skills.length - 3}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Experience',
      dataIndex: 'experienceYears',
      key: 'experienceYears',
      render: (years: number) => `${years} years`,
      sorter: (a, b) => a.experienceYears - b.experienceYears,
    },
    {
      title: 'Applications',
      key: 'applications',
      render: (_: unknown, record: Candidate) => (
        <Text>
          {record.successfulApplications || 0}/{record.totalApplications || 0}
        </Text>
      ),
    },
    {
      title: 'Resume',
      key: 'resume',
      render: (_: unknown, record: Candidate) => (
        record.resumeUrl ? (
          <Button
            type="link"
            icon={<FileTextOutlined />}
            href={record.resumeUrl}
            target="_blank"
          >
            View
          </Button>
        ) : (
          <Text type="secondary">No resume</Text>
        )
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Candidate) => (
        <Space>
          <Tooltip title="View">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => { setSelectedCandidate(record); setDrawerOpen(true); }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          Candidates Management
        </Title>
        <Text type="secondary">
          Manage candidate profiles, resumes, and track applications.
        </Text>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card bordered={false} size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Total Candidates"
              value={pagination.total}
              prefix={<UserOutlined style={{ color: '#5865F2' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Active"
              value={candidates.filter((c) => c.status === 'active').length}
              valueStyle={{ color: '#22C55E' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Placed"
              value={candidates.filter((c) => c.status === 'placed').length}
              valueStyle={{ color: '#5865F2' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="This Week"
              value={23}
              prefix={<PlusOutlined />}
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
                placeholder="Search candidates..."
                prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
                style={{ width: 280 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
              />
              <Select
                placeholder="Status"
                style={{ width: 140 }}
                allowClear
                value={statusFilter}
                onChange={setStatusFilter}
              >
                <Option value="active">Active</Option>
                <Option value="placed">Placed</Option>
                <Option value="withdrawn">Withdrawn</Option>
              </Select>
            </Space>
          </Col>
          <Col>
            <Space>
              <Upload
                accept=".pdf,.doc,.docx"
                showUploadList={false}
                beforeUpload={handleBulkUpload}
                multiple
              >
                <Button icon={<UploadOutlined />}>Bulk Upload</Button>
              </Upload>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                Add Candidate
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Candidates Table */}
      <Card bordered={false} style={{ borderRadius: 8 }}>
        <Table
          columns={columns}
          dataSource={candidates}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `${total} candidates`,
          }}
          onChange={(pag) => setPagination((prev) => ({ ...prev, ...pag }))}
        />
      </Card>

      {/* Add Candidate Modal */}
      <Modal
        title="Add New Candidate"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setFileList([]); }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddCandidate}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Full Name"
                rules={[{ required: true, message: 'Please enter name' }]}
              >
                <Input placeholder="John Doe" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Invalid email' },
                ]}
              >
                <Input placeholder="john@example.com" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="+1 (555) 123-4567" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="experience_years" label="Experience (years)">
                <Input type="number" placeholder="5" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="current_title" label="Current Title">
            <Input placeholder="Senior Software Engineer" />
          </Form.Item>
          <Form.Item name="skills" label="Skills">
            <Select mode="tags" placeholder="Add skills (press Enter)">
              <Option value="Python">Python</Option>
              <Option value="JavaScript">JavaScript</Option>
              <Option value="React">React</Option>
              <Option value="Machine Learning">Machine Learning</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Resume">
            <Upload
              accept=".pdf,.doc,.docx"
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={() => false}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Upload Resume</Button>
            </Upload>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setModalOpen(false); form.resetFields(); }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={uploading}>
                Add Candidate
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Candidate Detail Drawer */}
      <Drawer
        title={selectedCandidate?.name}
        placement="right"
        width={640}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {selectedCandidate && (
          <Tabs defaultActiveKey="profile">
            <TabPane tab="Profile" key="profile">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Email">
                  <Space>
                    <MailOutlined />
                    {selectedCandidate.email}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Phone">
                  {selectedCandidate.phone || 'Not provided'}
                </Descriptions.Item>
                <Descriptions.Item label="Current Title">
                  {selectedCandidate.currentTitle || 'Not provided'}
                </Descriptions.Item>
                <Descriptions.Item label="Experience">
                  {selectedCandidate.experienceYears} years
                </Descriptions.Item>
                <Descriptions.Item label="Applications">
                  {selectedCandidate.successfulApplications || 0} successful / {selectedCandidate.totalApplications || 0} total
                </Descriptions.Item>
              </Descriptions>

              <Title level={5} style={{ marginTop: 24 }}>Skills</Title>
              <Space size={[8, 8]} wrap>
                {selectedCandidate.skills.map((skill) => (
                  <Tag key={skill} color="blue">{skill}</Tag>
                ))}
              </Space>

              {selectedCandidate.resumeUrl && (
                <div style={{ marginTop: 24 }}>
                  <Button
                    type="primary"
                    icon={<FileTextOutlined />}
                    href={selectedCandidate.resumeUrl}
                    target="_blank"
                  >
                    View Resume
                  </Button>
                </div>
              )}
            </TabPane>

            <TabPane tab="Applications" key="applications">
              {selectedCandidate.applications && selectedCandidate.applications.length > 0 ? (
                <Timeline>
                  {selectedCandidate.applications.map((app) => (
                    <Timeline.Item
                      key={app.id}
                      color={APP_STATUS_COLORS[app.status]}
                      dot={
                        app.status === 'submitted' ? <CheckCircleOutlined /> :
                        app.status === 'pending' ? <ClockCircleOutlined /> :
                        app.status === 'rejected' ? <CloseCircleOutlined /> :
                        undefined
                      }
                    >
                      <div>
                        <Text strong>{app.job_title}</Text>
                        <Text type="secondary"> at {app.company}</Text>
                      </div>
                      <Space style={{ marginTop: 4 }}>
                        <Tag color={APP_STATUS_COLORS[app.status]}>
                          {app.status}
                        </Tag>
                        <span>ATS Score:</span>
                        <Progress
                          percent={app.ats_score}
                          size="small"
                          style={{ width: 100 }}
                          strokeColor={app.ats_score >= 90 ? '#22C55E' : '#F59E0B'}
                        />
                      </Space>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Applied: {new Date(app.applied_at).toLocaleDateString()}
                        </Text>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              ) : (
                <Text type="secondary">No applications yet</Text>
              )}
            </TabPane>
          </Tabs>
        )}
      </Drawer>
    </div>
  );
}
