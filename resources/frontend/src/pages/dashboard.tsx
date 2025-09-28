import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, List, Typography, Space, Tag, Spin } from 'antd';
import { FileTextOutlined, CalendarOutlined, UploadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;

interface IDashboardStats {
  total_documents: number;
  recent_documents: Array<{
    id: number;
    filename: string;
    slack_date: string;
    summary: string;
  }>;
  monthly_stats: Array<{
    month: string;
    count: number;
  }>;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<IDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD形式
    } catch {
      return dateString; // フォーマットに失敗した場合は元の文字列を返す
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const [documentsRes] = await Promise.all([
        axios.get('/api/pdf?per_page=5')
      ]);

      const documents = documentsRes.data.data;
      
      setStats({
        total_documents: documentsRes.data.total || documents.length,
        recent_documents: documents,
        monthly_stats: []
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>ダッシュボード</Title>
      
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="outlined">
            <Statistic
              title="総PDF数"
              value={stats?.total_documents || 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Link to="/pdf/upload">
            <Card hoverable variant="outlined">
              <Statistic
                title="PDFアップロード"
                value="新規追加"
                prefix={<UploadOutlined />}
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
          </Link>
        </Col>
        
        
        <Col xs={24} sm={12} lg={6}>
          <Card variant="outlined">
            <Statistic
              title="今月の処理数"
              value={stats?.monthly_stats?.[0]?.count || 0}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={24}>
          <Card title="最近アップロードされたPDF" variant="outlined">
            <List
              itemLayout="horizontal"
              dataSource={stats?.recent_documents || []}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Link to={`/pdf/show/${item.id}`} key="view">
                      詳細を見る
                    </Link>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<FileTextOutlined style={{ fontSize: 24 }} />}
                    title={
                      <Space>
                        <Text>{item.filename}</Text>
                        <Tag color="blue">{formatDate(item.slack_date)}</Tag>
                      </Space>
                    }
                    description={
                      <Text ellipsis style={{ maxWidth: 600 }}>
                        {item.summary}
                      </Text>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'まだPDFがアップロードされていません' }}
            />
            {stats?.total_documents && stats.total_documents > 5 && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Link to="/pdf">すべてのPDFを見る →</Link>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="クイックアクション" variant="outlined">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Link to="/pdf/upload">
                <Card hoverable size="small" variant="outlined">
                  <Space>
                    <UploadOutlined />
                    <Text>新しいPDFをアップロード</Text>
                  </Space>
                </Card>
              </Link>
              <Link to="/pdf">
                <Card hoverable size="small" variant="outlined">
                  <Space>
                    <FileTextOutlined />
                    <Text>PDF一覧を表示</Text>
                  </Space>
                </Card>
              </Link>
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title="システム情報" variant="outlined">
            <Space direction="vertical" size="small">
              <Text>PDFアナライザー v1.0.0</Text>
              <Text type="secondary">Slack週報の管理と分析を効率化</Text>
              <Text type="secondary">RefineとAnt Designで構築</Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};