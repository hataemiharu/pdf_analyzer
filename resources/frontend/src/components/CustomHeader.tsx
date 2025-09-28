import React from 'react';
import { Layout, Space, Typography } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

export const CustomHeader: React.FC = () => {
  return (
    <Header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 24px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <div style={{ flex: 1 }} />
      <Space>
        <CopyOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
        <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
          週次振り返り分析
        </Title>
      </Space>
    </Header>
  );
};