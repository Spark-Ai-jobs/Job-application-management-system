import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Space, Typography } from 'antd';
import {
  DashboardOutlined,
  SearchOutlined,
  TeamOutlined,
  CheckSquareOutlined,
  UserOutlined,
  BellOutlined,
  LogoutOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuthStore } from '../stores/authStore';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// Status indicator component
function StatusIndicator({ status }: { status: 'available' | 'busy' | 'offline' }) {
  const colors = {
    available: '#22C55E',
    busy: '#F59E0B',
    offline: '#9CA3AF',
  };

  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: colors[status],
        marginRight: 8,
      }}
    />
  );
}

export default function BasicLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updatePresence } = useAuthStore();

  // Menu items
  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/jobs',
      icon: <SearchOutlined />,
      label: 'Jobs Discovery',
    },
    {
      key: '/candidates',
      icon: <TeamOutlined />,
      label: 'Candidates',
    },
    {
      key: '/tasks',
      icon: <CheckSquareOutlined />,
      label: 'My Tasks',
    },
    // Only show Team for managers and admins
    ...(user?.role === 'manager' || user?.role === 'admin'
      ? [
          {
            key: '/team',
            icon: <UserOutlined />,
            label: 'Team Management',
          },
        ]
      : []),
  ];

  // User dropdown menu
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'status',
      label: 'Status',
      children: [
        {
          key: 'available',
          label: (
            <Space>
              <StatusIndicator status="available" />
              Available
            </Space>
          ),
          onClick: () => updatePresence('available'),
        },
        {
          key: 'busy',
          label: (
            <Space>
              <StatusIndicator status="busy" />
              Busy
            </Space>
          ),
          onClick: () => updatePresence('busy'),
        },
        {
          key: 'offline',
          label: (
            <Space>
              <StatusIndicator status="offline" />
              Appear Offline
            </Space>
          ),
          onClick: () => updatePresence('offline'),
        },
      ],
    },
    { type: 'divider' },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: async () => {
        await logout();
        navigate('/login');
      },
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Dark Sidebar */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        style={{
          background: '#1E1E1E',
          borderRight: '1px solid #2D2D2D',
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 16px',
            borderBottom: '1px solid #2D2D2D',
          }}
        >
          {collapsed ? (
            <span style={{ fontSize: 20, fontWeight: 700, color: '#5865F2' }}>S</span>
          ) : (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #5865F2 0%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'white',
                }}
              >
                Spark.A
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  ı
                  <span
                    style={{
                      position: 'absolute',
                      top: -4,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 8,
                      height: 8,
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #f59e0b 100%)',
                        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                      }}
                    />
                  </span>
                </span>
              </span>
              <svg
                viewBox="0 0 100 35"
                preserveAspectRatio="none"
                style={{
                  position: 'absolute',
                  bottom: -4,
                  left: '6%',
                  width: '88%',
                  height: 6,
                }}
              >
                <path
                  d="M0,15 C0,15 25,32 50,32 C75,32 88,18 88,18 L97,10 L86,18 C86,18 72,28 50,28 C28,28 5,14 5,14 Z"
                  fill="#FF9900"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            background: 'transparent',
            borderRight: 'none',
            marginTop: 8,
          }}
        />

        {/* User Info at Bottom */}
        {!collapsed && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '16px',
              borderTop: '1px solid #2D2D2D',
            }}
          >
            <Space>
              <Avatar
                size={36}
                style={{ backgroundColor: '#5865F2' }}
                src={user?.avatarUrl}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </Avatar>
              <div>
                <Text style={{ color: '#fff', display: 'block', fontSize: 13 }}>
                  {user?.name}
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                  <StatusIndicator status={user?.status || 'offline'} />
                  {user?.status === 'available' ? 'Available' : user?.status === 'busy' ? 'Busy' : 'Offline'}
                </Text>
              </div>
            </Space>
          </div>
        )}
      </Sider>

      <Layout>
        {/* Header */}
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #E5E5E5',
          }}
        >
          {/* Left side - collapse button */}
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 48, height: 48 }}
          />

          {/* Right side - notifications and user */}
          <Space size={16}>
            {/* Notification Bell */}
            <Badge count={3} size="small">
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 18 }} />}
                style={{ width: 40, height: 40 }}
              />
            </Badge>

            {/* User Dropdown */}
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  size={32}
                  style={{ backgroundColor: '#5865F2' }}
                  src={user?.avatarUrl}
                >
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
                <Text strong style={{ fontSize: 14 }}>
                  {user?.name}
                </Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* Main Content */}
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: '#fff',
            borderRadius: 8,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
