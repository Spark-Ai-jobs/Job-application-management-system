import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    // Primary Colors (Slack/Discord inspired purple-blue)
    colorPrimary: '#5865F2',
    colorPrimaryHover: '#4752C4',
    colorPrimaryActive: '#3C45A5',
    colorPrimaryBg: '#EEF0FF',
    colorPrimaryBgHover: '#DDE1FF',

    // Success/Warning/Error
    colorSuccess: '#22C55E',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
    colorInfo: '#3B82F6',

    // Background
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F9FAFB',
    colorBgElevated: '#FFFFFF',
    colorBgSpotlight: '#FAFAFA',

    // Text
    colorText: '#171717',
    colorTextSecondary: '#525252',
    colorTextTertiary: '#A3A3A3',
    colorTextQuaternary: '#D4D4D4',

    // Border
    colorBorder: '#E5E5E5',
    colorBorderSecondary: '#F5F5F5',

    // Border Radius (Notion-style rounded)
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    borderRadiusXS: 4,

    // Font
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,

    // Line Height
    lineHeight: 1.5714285714285714,
    lineHeightHeading1: 1.2105263157894737,
    lineHeightHeading2: 1.2666666666666666,
    lineHeightHeading3: 1.3333333333333333,
    lineHeightHeading4: 1.4,
    lineHeightHeading5: 1.5,

    // Spacing
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    paddingXXS: 4,

    margin: 16,
    marginLG: 24,
    marginSM: 12,
    marginXS: 8,
    marginXXS: 4,

    // Size
    controlHeight: 36,
    controlHeightLG: 44,
    controlHeightSM: 28,

    // Motion
    motionDurationSlow: '0.3s',
    motionDurationMid: '0.2s',
    motionDurationFast: '0.1s',

    // Box Shadow
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    boxShadowSecondary: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  components: {
    Layout: {
      siderBg: '#1E1E1E',
      headerBg: '#FFFFFF',
      bodyBg: '#F9FAFB',
      headerHeight: 64,
      headerPadding: '0 24px',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: '#5865F2',
      darkItemHoverBg: 'rgba(88, 101, 242, 0.1)',
      darkItemColor: 'rgba(255, 255, 255, 0.85)',
      darkItemSelectedColor: '#FFFFFF',
      itemBorderRadius: 6,
      itemMarginInline: 8,
      itemPaddingInline: 16,
      iconSize: 18,
      collapsedIconSize: 18,
    },
    Card: {
      boxShadowTertiary: '0 1px 2px rgba(0, 0, 0, 0.05)',
      paddingLG: 24,
    },
    Table: {
      headerBg: '#FAFAFA',
      headerColor: '#525252',
      rowHoverBg: '#F5F5F5',
      borderColor: '#E5E5E5',
      headerBorderRadius: 8,
    },
    Button: {
      primaryShadow: '0 2px 4px rgba(88, 101, 242, 0.3)',
      defaultBorderColor: '#E5E5E5',
      fontWeight: 500,
    },
    Input: {
      activeBorderColor: '#5865F2',
      hoverBorderColor: '#A3A3A3',
      paddingInline: 12,
    },
    Select: {
      optionSelectedBg: '#EEF0FF',
    },
    Tabs: {
      inkBarColor: '#5865F2',
      itemSelectedColor: '#5865F2',
      itemHoverColor: '#4752C4',
    },
    Badge: {
      dotSize: 8,
    },
    Progress: {
      defaultColor: '#5865F2',
    },
    Statistic: {
      titleFontSize: 14,
      contentFontSize: 28,
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Modal: {
      borderRadiusLG: 12,
    },
    Notification: {
      borderRadiusLG: 8,
    },
    Message: {
      borderRadiusLG: 8,
    },
  },
};

// Color constants for use in components
export const colors = {
  primary: '#5865F2',
  primaryHover: '#4752C4',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Status colors
  available: '#22C55E',
  busy: '#F59E0B',
  offline: '#6B7280',

  // Category colors
  ai_ml: '#8B5CF6',
  data_science: '#3B82F6',
  data_analysis: '#10B981',
  bi_analytics: '#F59E0B',
  other: '#6B7280',

  // Source colors
  linkedin: '#0A66C2',
  indeed: '#003A9B',
  glassdoor: '#0CAA41',
};
