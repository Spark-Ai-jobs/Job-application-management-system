import { useState, useEffect, useCallback } from 'react';
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
  Modal,
  Progress,
  Upload,
  Input,
  Form,
  Alert,
  Badge,
  Tooltip,
  Empty,
  message,
} from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UploadOutlined,
  FileTextOutlined,
  UserOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload';
import axios from 'axios';
import { endpoints } from '../config/api';
import { useAuthStore } from '../stores/authStore';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Task {
  id: string;
  job_id: string;
  candidate_id: string;
  job_title: string;
  job_company: string;
  candidate_name: string;
  candidate_email: string;
  original_ats_score: number;
  final_ats_score: number | null;
  status: 'queued' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'timeout';
  assigned_to: string | null;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  deadline: string | null;
  notes: string | null;
  created_at: string;
}

interface CurrentTask extends Task {
  timeRemaining: number;
  originalResumeUrl: string | null;
}

const STATUS_COLORS = {
  queued: 'default',
  assigned: 'blue',
  in_progress: 'processing',
  completed: 'success',
  failed: 'error',
  timeout: 'warning',
};

const STATUS_LABELS = {
  queued: 'Queued',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
  timeout: 'Timed Out',
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<CurrentTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [notes, setNotes] = useState('');
  const { user } = useAuthStore();

  // Timer for deadline countdown
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksResponse, myTaskResponse] = await Promise.all([
        axios.get(endpoints.tasks.list),
        axios.get(endpoints.tasks.my),
      ]);

      setTasks(tasksResponse.data.tasks);

      if (myTaskResponse.data.task) {
        const task = myTaskResponse.data.task;
        const deadline = new Date(task.deadline).getTime();
        const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
        setCurrentTask({ ...task, timeRemaining: remaining });
        setTimeRemaining(remaining);
      } else {
        setCurrentTask(null);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setTasks(getMockTasks());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // Countdown timer
  useEffect(() => {
    if (!currentTask || currentTask.status !== 'in_progress') return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentTask]);

  const getMockTasks = (): Task[] => [
    {
      id: '1',
      job_id: 'j1',
      candidate_id: 'c1',
      job_title: 'Senior ML Engineer',
      job_company: 'Google',
      candidate_name: 'John Doe',
      candidate_email: 'john@email.com',
      original_ats_score: 78,
      final_ats_score: null,
      status: 'queued',
      assigned_to: null,
      assigned_at: null,
      started_at: null,
      completed_at: null,
      deadline: null,
      notes: null,
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      job_id: 'j2',
      candidate_id: 'c2',
      job_title: 'Data Scientist',
      job_company: 'Meta',
      candidate_name: 'Sarah Smith',
      candidate_email: 'sarah@email.com',
      original_ats_score: 82,
      final_ats_score: 94,
      status: 'completed',
      assigned_to: 'alice',
      assigned_at: '2024-01-15T09:00:00Z',
      started_at: '2024-01-15T09:05:00Z',
      completed_at: '2024-01-15T09:18:00Z',
      deadline: '2024-01-15T09:25:00Z',
      notes: 'Improved keyword matching',
      created_at: '2024-01-15T08:00:00Z',
    },
  ];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (seconds: number) => {
    if (seconds <= 120) return '#EF4444'; // Red - less than 2 min
    if (seconds <= 300) return '#F59E0B'; // Orange - less than 5 min
    return '#22C55E'; // Green
  };

  const handleStartTask = async (taskId: string) => {
    try {
      await axios.post(endpoints.tasks.start(taskId));
      message.success('Task started!');
      fetchTasks();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to start task');
    }
  };

  const handleCompleteTask = async () => {
    if (!currentTask) return;

    try {
      setCompleting(true);
      const formData = new FormData();
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('resume', fileList[0].originFileObj);
      }
      if (notes) {
        formData.append('notes', notes);
      }

      await axios.post(endpoints.tasks.complete(currentTask.id), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      message.success('Task completed successfully!');
      setModalOpen(false);
      setFileList([]);
      setNotes('');
      fetchTasks();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to complete task');
    } finally {
      setCompleting(false);
    }
  };

  const queueColumns: ColumnsType<Task> = [
    {
      title: 'Candidate',
      key: 'candidate',
      render: (_: unknown, record: Task) => (
        <div>
          <Text strong>{record.candidate_name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.candidate_email}</Text>
        </div>
      ),
    },
    {
      title: 'Job',
      key: 'job',
      render: (_: unknown, record: Task) => (
        <div>
          <Text>{record.job_title}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.job_company}</Text>
        </div>
      ),
    },
    {
      title: 'ATS Score',
      dataIndex: 'original_ats_score',
      key: 'ats_score',
      render: (score: number) => (
        <Progress
          percent={score}
          size="small"
          strokeColor={score >= 90 ? '#22C55E' : score >= 70 ? '#F59E0B' : '#EF4444'}
          format={(p) => `${p}%`}
          style={{ width: 100 }}
        />
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: keyof typeof STATUS_COLORS) => (
        <Badge status={STATUS_COLORS[status] as any} text={STATUS_LABELS[status]} />
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];

  const completedColumns: ColumnsType<Task> = [
    ...queueColumns.slice(0, 2),
    {
      title: 'Original',
      dataIndex: 'original_ats_score',
      key: 'original_ats_score',
      render: (score: number) => `${score}%`,
    },
    {
      title: 'Final',
      dataIndex: 'final_ats_score',
      key: 'final_ats_score',
      render: (score: number | null) => score ? (
        <Text style={{ color: score >= 90 ? '#22C55E' : '#F59E0B' }}>
          {score}%
        </Text>
      ) : '-',
    },
    {
      title: 'Assigned To',
      dataIndex: 'assigned_to',
      key: 'assigned_to',
    },
    {
      title: 'Completed',
      dataIndex: 'completed_at',
      key: 'completed_at',
      render: (date: string | null) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: keyof typeof STATUS_COLORS) => (
        <Tag color={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Tag>
      ),
    },
  ];

  const queuedTasks = tasks.filter((t) => t.status === 'queued' || t.status === 'assigned');
  const completedTasks = tasks.filter((t) => ['completed', 'failed', 'timeout'].includes(t.status));

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          ATS Review Tasks
        </Title>
        <Text type="secondary">
          Review and optimize resumes that scored below 90% ATS threshold.
        </Text>
      </div>

      {/* Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card bordered={false} size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Queue"
              value={queuedTasks.length}
              prefix={<ClockCircleOutlined style={{ color: '#F59E0B' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Completed Today"
              value={completedTasks.filter((t) =>
                new Date(t.completed_at || '').toDateString() === new Date().toDateString()
              ).length}
              prefix={<CheckCircleOutlined style={{ color: '#22C55E' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="My Warnings"
              value={user?.warnings || 0}
              prefix={<WarningOutlined style={{ color: user?.warnings ? '#F59E0B' : '#9CA3AF' }} />}
              valueStyle={{ color: user?.warnings ? '#F59E0B' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="My Violations"
              value={user?.violations || 0}
              prefix={<ExclamationCircleOutlined style={{ color: user?.violations ? '#EF4444' : '#9CA3AF' }} />}
              valueStyle={{ color: user?.violations ? '#EF4444' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      {/* Current Task Card */}
      {currentTask && currentTask.status === 'in_progress' && (
        <Card
          bordered={false}
          style={{
            borderRadius: 8,
            marginBottom: 24,
            background: 'linear-gradient(135deg, #5865F2 0%, #7289DA 100%)',
          }}
        >
          <Row gutter={[24, 16]} align="middle">
            <Col flex="auto">
              <div style={{ color: '#fff' }}>
                <Space>
                  <ThunderboltOutlined style={{ fontSize: 20 }} />
                  <Text strong style={{ color: '#fff', fontSize: 16 }}>
                    Current Task
                  </Text>
                </Space>
                <div style={{ marginTop: 12 }}>
                  <Title level={4} style={{ color: '#fff', margin: 0 }}>
                    {currentTask.candidate_name}
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {currentTask.job_title} at {currentTask.job_company}
                  </Text>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Space>
                    <Tag>Original ATS: {currentTask.original_ats_score}%</Tag>
                    {currentTask.originalResumeUrl && (
                      <Button
                        size="small"
                        icon={<FileTextOutlined />}
                        href={currentTask.originalResumeUrl}
                        target="_blank"
                      >
                        View Resume
                      </Button>
                    )}
                  </Space>
                </div>
              </div>
            </Col>
            <Col>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    border: `4px solid ${getTimerColor(timeRemaining)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.2)',
                  }}
                >
                  <div>
                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>
                      {formatTime(timeRemaining)}
                    </Text>
                    <br />
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                      remaining
                    </Text>
                  </div>
                </div>
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckCircleOutlined />}
                  onClick={() => setModalOpen(true)}
                  style={{ marginTop: 16, background: '#22C55E', borderColor: '#22C55E' }}
                >
                  Complete Task
                </Button>
              </div>
            </Col>
          </Row>

          {timeRemaining <= 120 && (
            <Alert
              message="Time is running low! Complete the task soon to avoid a warning."
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Card>
      )}

      {/* No Current Task */}
      {!currentTask && user?.status === 'available' && (
        <Card bordered={false} style={{ borderRadius: 8, marginBottom: 24, textAlign: 'center' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Text>No active task assigned</Text>
                <br />
                <Text type="secondary">
                  You'll be automatically assigned when a task is available
                </Text>
              </div>
            }
          />
        </Card>
      )}

      {/* Queue Table */}
      <Card
        title="Task Queue"
        bordered={false}
        style={{ borderRadius: 8, marginBottom: 24 }}
        extra={<Badge count={queuedTasks.length} />}
      >
        <Table
          columns={queueColumns}
          dataSource={queuedTasks}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'No tasks in queue' }}
        />
      </Card>

      {/* Completed Table */}
      <Card
        title="Completed Tasks"
        bordered={false}
        style={{ borderRadius: 8 }}
        extra={<Text type="secondary">Today's completed tasks</Text>}
      >
        <Table
          columns={completedColumns}
          dataSource={completedTasks}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Complete Task Modal */}
      <Modal
        title="Complete Task"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form layout="vertical" onFinish={handleCompleteTask}>
          <Alert
            message="Upload the optimized resume to complete this task"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item label="Optimized Resume" required>
            <Upload
              accept=".pdf,.doc,.docx"
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={() => false}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
          </Form.Item>

          <Form.Item label="Notes (Optional)">
            <TextArea
              rows={3}
              placeholder="Describe the improvements made..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={completing}
                disabled={fileList.length === 0}
                icon={<CheckCircleOutlined />}
              >
                Submit & Complete
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
