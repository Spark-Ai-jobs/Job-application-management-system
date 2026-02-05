import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { login, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true);
    clearError();
    try {
      await login(values.email, values.password);
      navigate('/');
    } catch {
      // Error is handled by the store
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1E1E1E 0%, #2D2D2D 100%)',
      }}
    >
      <Card
        style={{
          width: 400,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          borderRadius: 12,
          border: 'none',
        }}
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          {/* Logo & Title */}
          <div style={{ textAlign: 'center' }}>
            <Title
              level={2}
              style={{
                margin: 0,
                color: '#5865F2',
                fontWeight: 700,
                letterSpacing: '-0.5px',
              }}
            >
              Spark.AI
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Job Application Management System
            </Text>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={clearError}
            />
          )}

          {/* Login Form */}
          <Form
            name="login"
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
            requiredMark={false}
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#9CA3AF' }} />}
                placeholder="Email address"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#9CA3AF' }} />}
                placeholder="Password"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                style={{
                  height: 48,
                  borderRadius: 8,
                  fontWeight: 600,
                  background: '#5865F2',
                }}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          {/* Demo Credentials */}
          <div
            style={{
              background: '#F9FAFB',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <Text strong style={{ fontSize: 12, color: '#6B7280' }}>
              Demo Credentials:
            </Text>
            <div style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                Manager: alice.t@company.com / password
              </Text>
              <br />
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                Employee: bob.m@company.com / password
              </Text>
            </div>
          </div>
        </Space>
      </Card>
    </div>
  );
}
