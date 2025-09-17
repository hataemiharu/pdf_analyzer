import React, { useState, useEffect } from 'react';
import { Card, Select, Slider, Button, Timeline, Typography, Space, Spin, Alert, Tag, Divider } from 'antd';
import { LineChartOutlined, CalendarOutlined, FileTextOutlined, ReloadOutlined, ArrowLeftOutlined, StopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

interface ISummaryData {
  sections: Array<{
    id: number;
    content: string;
    summary: string;
    pdfDocument: {
      filename: string;
      slack_date: string;
    };
  }>;
  timeline: Array<{
    date: string;
    summary: string;
    document_id: number;
  }>;
  trend_analysis: string;
  overall_summary: string;
}

const sectionOptions = [
  { value: 'business_execution', label: '【1】業務遂行' },
  { value: 'skill_development', label: '【2】能力開発' },
  { value: 'ai_utilization', label: '【3】生成AI活用' },
  { value: 'self_appeal', label: '【4】自由アピール' },
  { value: 'challenges_next_week', label: '■ 今週できなかったこと・来週以降チャレンジしたいこと' },
  { value: 'self_evaluation', label: '■ 業績目標や行動に対する自己評価・所感' }
];

export const CrossSummary: React.FC = () => {
  const navigate = useNavigate();
  const [sectionType, setSectionType] = useState('business_execution');
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<ISummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const fetchSummary = async () => {
    // 既存のリクエストをキャンセル
    if (abortController) {
      abortController.abort();
    }
    
    setLoading(true);
    setError(null);
    
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      const response = await axios.get('/api/pdf/cross-summary', {
        params: {
          section: sectionType,
          months: months
        },
        signal: controller.signal,
        timeout: 300000 // 5分タイムアウト
      });
      setSummaryData(response.data);
    } catch (err: any) {
      console.error('Error fetching cross summary:', err);
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        setError('リクエストがキャンセルされました');
      } else {
        setError(err.response?.data?.error || '横断的要約の取得中にエラーが発生しました');
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  useEffect(() => {
    fetchSummary();
    
    // クリーンアップ関数でリクエストをキャンセル
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = () => {
    fetchSummary();
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setLoading(false);
      setAbortController(null);
    }
  };

  const getSectionLabel = (value: string) => {
    return sectionOptions.find(opt => opt.value === value)?.label || value;
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>
          <LineChartOutlined /> 横断的分析
        </Title>
        <Button 
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/pdf')}
          size="large"
        >
          PDF一覧に戻る
        </Button>
      </div>
      
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong>分析対象セクション:</Text>
            <Select
              value={sectionType}
              onChange={setSectionType}
              style={{ width: 250, marginLeft: 16 }}
            >
              {sectionOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </div>
          
          <div>
            <Text strong>分析期間: {months}ヶ月</Text>
            <Slider
              min={1}
              max={12}
              value={months}
              onChange={setMonths}
              marks={{
                1: '1ヶ月',
                3: '3ヶ月',
                6: '6ヶ月',
                12: '12ヶ月'
              }}
              style={{ marginTop: 8 }}
            />
          </div>
          
          <Space>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleAnalyze}
              loading={loading}
              disabled={loading}
              size="large"
            >
              分析実行
            </Button>
            {loading && (
              <Button
                danger
                icon={<StopOutlined />}
                onClick={handleCancel}
                size="large"
              >
                キャンセル
              </Button>
            )}
          </Space>
        </Space>
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" tip="分析中..." />
        </div>
      )}

      {error && (
        <Alert
          message="エラー"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 24 }}
        />
      )}

      {summaryData && !loading && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card title={`${getSectionLabel(sectionType)}の全体要約`}>
            <Paragraph>{summaryData.overall_summary}</Paragraph>
          </Card>

          <Card title="傾向分析">
            <Paragraph>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {summaryData.trend_analysis}
              </pre>
            </Paragraph>
          </Card>

          <Card title="時系列サマリー">
            <Timeline mode="left">
              {summaryData.timeline.map((item, index) => (
                <Timeline.Item
                  key={index}
                  label={
                    <Space>
                      <CalendarOutlined />
                      <Text>{item.date}</Text>
                    </Space>
                  }
                  color={index === 0 ? 'green' : 'blue'}
                >
                  <Card size="small" style={{ marginBottom: 8 }}>
                    <Paragraph ellipsis={{ rows: 3, expandable: true }}>
                      {item.summary}
                    </Paragraph>
                  </Card>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>

          {summaryData.sections.length > 0 && (
            <Card title="詳細データ">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {summaryData.sections.map((section) => (
                  <Card
                    key={section.id}
                    size="small"
                    title={
                      <Space>
                        <FileTextOutlined />
                        <Text>{section.pdfDocument?.filename || 'ファイル名不明'}</Text>
                        <Tag color="blue">{section.pdfDocument?.slack_date || '日付不明'}</Tag>
                      </Space>
                    }
                  >
                    <Paragraph>
                      <Text strong>要約:</Text>
                      <br />
                      {section.summary}
                    </Paragraph>
                    <Divider />
                    <Paragraph>
                      <Text strong>内容:</Text>
                      <br />
                      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '12px' }}>
                        {section.content}
                      </pre>
                    </Paragraph>
                  </Card>
                ))}
              </Space>
            </Card>
          )}
        </Space>
      )}
    </div>
  );
};