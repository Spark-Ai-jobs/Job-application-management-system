import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import ParticleCanvas from '../components/ParticleCanvas';
import '../styles/spark-animation.css';

const { Text } = Typography;

// Spark.AI Logo Component - Exact match from sparkaijobs.com
function SparkLogo() {
  const brandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const brand = brandRef.current;
    if (!brand) return;

    // Start the animation immediately
    brand.classList.add('animate-star');

    // After animations complete (0.8s slide + 0.4s landing = 1.2s), add star-landed class
    const timer = setTimeout(() => {
      brand.classList.add('star-landed');
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="spark-brand spark-brand-glow" ref={brandRef}>
      <div className="spark-brand-wrapper">
        <span className="spark-brand-text">
          Spark.A<span className="dotless-i">ı<span className="star-dot"></span></span>
        </span>
        <svg
          className="spark-brand-arrow"
          viewBox="0 0 100 35"
          preserveAspectRatio="none"
        >
          <path
            d="M0,15 C0,15 25,32 50,32 C75,32 88,18 88,18 L97,10 L86,18 C86,18 72,28 50,28 C28,28 5,14 5,14 Z"
            fill="#FF9900"
          />
        </svg>
        <span className="sliding-star"></span>
      </div>
    </div>
  );
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { login, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true);
    clearError();
    try {
      await login(values.email, values.password);
      // Store flag to show animation after login
      sessionStorage.setItem('showLoginAnimation', 'true');
      navigate('/');
    } catch {
      // Error is handled by the store
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="spark-login-container">
      <ParticleCanvas />

      <div className="spark-login-content">
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <SparkLogo />
          <Text className="spark-tagline-cursor" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 16, display: 'block', marginTop: 16 }}>
            AI-Powered Job Application Management
          </Text>
        </div>

        {/* Login Card */}
        <div className="spark-login-card">
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <Text strong style={{ fontSize: 20, color: '#1a1a2e' }}>
                Welcome Back
              </Text>
              <br />
              <Text type="secondary">
                Sign in to continue to your dashboard
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
                    background: 'linear-gradient(135deg, #5865F2 0%, #7c3aed 100%)',
                    border: 'none',
                  }}
                >
                  Sign In
                </Button>
              </Form.Item>
            </Form>
          </Space>
        </div>
      </div>
    </div>
  );
}
