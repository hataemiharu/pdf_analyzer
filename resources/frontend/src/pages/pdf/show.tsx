import React from 'react';
import { Show, TextField, DateField } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Typography, Card, Space, Tag, Spin, Alert } from 'antd';
import { FileTextOutlined, CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface IPdfDocument {
  id: number;
  filename: string;
  file_path: string;
  slack_date: string;
  raw_content: string;
  summary: string;
  sections: {
    business_execution?: string;
    skill_development?: string;
    ai_utilization?: string;
    self_appeal?: string;
    challenges_next_week?: string;
    self_evaluation?: string;
  };
  created_at: string;
}

export const PdfShow: React.FC = () => {
  const { queryResult } = useShow<IPdfDocument>();
  const { data, isLoading } = queryResult;
  const record = data?.data;

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!record) {
    return (
      <Alert
        message="エラー"
        description="PDFドキュメントが見つかりません"
        type="error"
        showIcon
      />
    );
  }

  return (
    <Show title={`PDF詳細: ${record.filename}`}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space>
            <FileTextOutlined />
            <Text strong>ファイル名:</Text>
            <Tag color="blue">{record.filename}</Tag>
          </Space>
          <br />
          <Space style={{ marginTop: 8 }}>
            <CalendarOutlined />
            <Text strong>Slack週報日付:</Text>
            <DateField value={record.slack_date} format="YYYY年MM月DD日" />
          </Space>
          <br />
          <Space style={{ marginTop: 8 }}>
            <ClockCircleOutlined />
            <Text strong>アップロード日時:</Text>
            <DateField value={record.created_at} format="YYYY/MM/DD HH:mm" />
          </Space>
        </Card>

        <Card title="要約">
          <Paragraph>
            <pre style={{
              whiteSpace: 'pre-wrap',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              {record.summary}
            </pre>
          </Paragraph>
        </Card>

        <Card title="元のテキスト" extra={<Tag>全文</Tag>}>
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <Paragraph>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px' }}>
                {record.raw_content}
              </pre>
            </Paragraph>
          </div>
        </Card>
      </Space>
    </Show>
  );
};