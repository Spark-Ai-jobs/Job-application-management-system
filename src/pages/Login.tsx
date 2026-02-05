import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import '../styles/spark-animation.css';

const { Text } = Typography;

// Spark.AI Logo Component
function SparkLogo({ size = 'large' }: { size?: 'small' | 'large' }) {
  const fontSize = size === 'large' ? '48px' : '24px';
  const starSize = size === 'large' ? '16px' : '10px';
  const starTop = size === 'large' ? '-8px' : '-5px';

  return (
    <div className="spark-brand spark-brand-glow" style={{ marginBottom: size === 'large' ? 16 : 0 }}>
      <div className="spark-brand-wrapper" style={{ fontSize, fontWeight: 700 }}>
        <span
          className="spark-brand-text visible"
          style={{
            background: 'linear-gradient(135deg, #5865F2 0%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'white',
          }}
        >
          Spark.A
          <span className="dotless-i" style={{ position: 'relative', display: 'inline-block' }}>
            ı
            <span
              className="star-dot"
              style={{
                position: 'absolute',
                top: starTop,
                left: '50%',
                transform: 'translateX(-50%)',
                width: starSize,
                height: starSize,
                opacity: 1,
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #f59e0b 100%)',
                  clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                  animation: 'rotateStar 3s linear infinite',
                }}
              />
            </span>
          </span>
        </span>
        <svg
          className="spark-brand-arrow"
          viewBox="0 0 100 35"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            bottom: size === 'large' ? '-10px' : '-5px',
            left: '6%',
            width: '88%',
            height: size === 'large' ? '14px' : '8px',
          }}
        >
          <path
            d="M0,15 C0,15 25,32 50,32 C75,32 88,18 88,18 L97,10 L86,18 C86,18 72,28 50,28 C28,28 5,14 5,14 Z"
            fill="#FF9900"
          />
        </svg>
      </div>
    </div>
  );
}

// Floating Particles with glow effects
function Particles() {
  // Regular floating particles
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 3 + Math.random() * 4,
    size: 2 + Math.random() * 4,
    color: ['#5865F2', '#ec4899', '#6366f1', '#f59e0b', '#22d3ee'][Math.floor(Math.random() * 5)],
  }));

  // Larger glow orbs
  const glowOrbs = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: 10 + Math.random() * 80,
    top: 10 + Math.random() * 80,
    delay: Math.random() * 8,
    size: 40 + Math.random() * 60,
    color: ['rgba(88, 101, 242, 0.15)', 'rgba(236, 72, 153, 0.12)', 'rgba(99, 102, 241, 0.1)'][Math.floor(Math.random() * 3)],
  }));

  // Shooting stars
  const shootingStars = Array.from({ length: 3 }, (_, i) => ({
    id: i,
    left: Math.random() * 50,
    top: 20 + Math.random() * 40,
    delay: i * 4 + Math.random() * 2,
  }));

  return (
    <div className="spark-login-particles">
      {/* Glow orbs */}
      {glowOrbs.map((orb) => (
        <div
          key={`orb-${orb.id}`}
          className="spark-particle-glow"
          style={{
            left: `${orb.left}%`,
            top: `${orb.top}%`,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            animationDelay: `${orb.delay}s`,
          }}
        />
      ))}

      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="spark-particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            color: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      {/* Shooting stars */}
      {shootingStars.map((star) => (
        <div
          key={`star-${star.id}`}
          className="spark-shooting-star"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
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
      <Particles />

      <div className="spark-login-content">
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <SparkLogo size="large" />
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

            {/* Demo Credentials */}
            <div
              style={{
                background: '#f8fafc',
                borderRadius: 8,
                padding: 16,
                border: '1px dashed #e2e8f0',
              }}
            >
              <Text strong style={{ fontSize: 12, color: '#64748b' }}>
                Demo Credentials:
              </Text>
              <div style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>
                  Manager: bob.m@company.com
                </Text>
                <br />
                <Text style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>
                  Admin: admin@company.com
                </Text>
                <br />
                <Text style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>
                  Password: password
                </Text>
              </div>
            </div>
          </Space>
        </div>
      </div>
    </div>
  );
}
