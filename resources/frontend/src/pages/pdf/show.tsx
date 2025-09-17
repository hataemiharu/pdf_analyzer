import React from 'react';
import { Show, TextField, DateField } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Typography, Card, Tabs, Space, Tag, Spin, Alert } from 'antd';
import { FileTextOutlined, CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

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

const sectionLabels: Record<string, string> = {
  business_execution: '【1】業務遂行',
  skill_development: '【2】能力開発',
  ai_utilization: '【3】生成AI活用',
  self_appeal: '【4】自由アピール',
  challenges_next_week: '■ 今週できなかったこと・来週以降チャレンジしたいこと',
  self_evaluation: '■ 業績目標や行動に対する自己評価・所感'
};

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

        <Card title="セクション別内容">
          <Tabs defaultActiveKey="business_execution">
            {([
              'business_execution',
              'skill_development', 
              'ai_utilization',
              'self_appeal',
              'challenges_next_week',
              'self_evaluation'
            ] as const).map((key) => {
              const content = record.sections?.[key as keyof typeof record.sections];
              return content ? (
                <TabPane tab={sectionLabels[key] || key} key={key}>
                  <Paragraph>
                    <pre style={{ 
                      whiteSpace: 'pre-wrap', 
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      fontSize: '14px',
                      lineHeight: '1.6'
                    }}>
                      {content}
                    </pre>
                  </Paragraph>
                </TabPane>
              ) : null;
            })}
          </Tabs>
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