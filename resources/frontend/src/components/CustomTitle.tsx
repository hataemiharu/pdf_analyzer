import React from 'react';
import { Space, Typography } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

const { Text } = Typography;

export const CustomTitle: React.FC = () => {
  return (
    <Space align="center" style={{ padding: '12px 8px' }}>
      <CopyOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
      <Text strong style={{ fontSize: '16px', color: '#1890ff', lineHeight: '1.2', fontWeight: 'bold' }}>
        週次振り返り<br />分析
      </Text>
    </Space>
  );
};