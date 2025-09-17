import React, { useState, useEffect } from 'react';
import { List, DateField } from '@refinedev/antd';
import { Table, Space, Button, Tag, Empty, Card, Typography, Divider } from 'antd';
import { Link } from 'react-router-dom';
import { UploadOutlined, EyeOutlined, DeleteOutlined, TableOutlined } from '@ant-design/icons';
import { useDelete } from '@refinedev/core';
import axios from 'axios';

interface IPdfDocument {
  id: number;
  filename: string;
  slack_date: string;
  summary: string;
  created_at: string;
}

interface ISectionSummary {
  id: number;
  date: string;
  filename: string;
  sections: {
    business_execution: string;
    skill_development: string;
    ai_utilization: string;
    self_appeal: string;
    challenges_next_week: string;
    self_evaluation: string;
  };
}

const { Title } = Typography;

export const PdfList: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<IPdfDocument[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [sectionSummary, setSectionSummary] = useState<ISectionSummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSummaryTable, setShowSummaryTable] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize] = useState(5);
  const { mutate: deletePdf } = useDelete();

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage]);

  const fetchData = async (page: number) => {
    try {
      setLoading(true);
      const response = await axios.get('/api/pdf', {
        params: {
          page,
          per_page: pageSize
        }
      });
      setData(response.data.data || []);
      setTotalItems(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch PDF data:', error);
      setData([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchSectionSummary = async (pdfIds: number[]) => {
    if (pdfIds.length === 0) {
      setSectionSummary([]);
      return;
    }
    
    try {
      setSummaryLoading(true);
      const response = await axios.post('/api/pdf/section-summary', {
        pdf_ids: pdfIds
      });
      setSectionSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch section summary:', error);
      setSectionSummary([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSelectChange = (selectedKeys: React.Key[]) => {
    const keys = selectedKeys as number[];
    setSelectedRowKeys(keys);
    setShowSummaryTable(false);
    setSectionSummary([]);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedRowKeys([]);
    setShowSummaryTable(false);
    setSectionSummary([]);
  };

  const handleShowSectionSummary = async () => {
    await fetchSectionSummary(selectedRowKeys);
    setShowSummaryTable(true);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: handleSelectChange,
  };

  return (
    <List
      title="PDF一覧"
      headerButtons={
        <Link to="/pdf/upload">
          <Button type="primary" icon={<UploadOutlined />}>
            PDFアップロード
          </Button>
        </Link>
      }
    >
      {selectedRowKeys.length > 0 && (
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <Button
            type="primary"
            icon={<TableOutlined />}
            onClick={handleShowSectionSummary}
            loading={summaryLoading}
            size="large"
          >
            選択されたPDF（{selectedRowKeys.length}件）のセクション別要約を表示
          </Button>
        </div>
      )}

      <Table
        dataSource={data}
        loading={loading}
        rowKey="id"
        rowSelection={rowSelection}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: totalItems,
          onChange: handlePageChange,
          showSizeChanger: false,
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}件`,
        }}
        locale={{
          emptyText: (
            <Empty
              description="まだPDFファイルがアップロードされていません"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Link to="/pdf/upload">
                <Button type="primary" icon={<UploadOutlined />}>
                  最初のPDFをアップロード
                </Button>
              </Link>
            </Empty>
          )
        }}
      >
        <Table.Column
          title="日付"
          dataIndex="slack_date"
          render={(value) => value ? <DateField value={value} format="YYYY/MM/DD" /> : '-'}
        />
        <Table.Column
          title="ファイル名"
          dataIndex="filename"
          render={(value) => (
            <Tag color="blue">{value}</Tag>
          )}
        />
        <Table.Column
          title="要約"
          dataIndex="summary"
          render={(value) => (
            <div style={{
              maxWidth: 500,
              maxHeight: 200,
              overflow: 'auto',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              padding: '8px',
              backgroundColor: '#fafafa'
            }}>
              <pre style={{
                whiteSpace: 'pre-wrap',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                fontSize: '12px',
                lineHeight: '1.4',
                margin: 0
              }}>
                {value}
              </pre>
            </div>
          )}
        />
        <Table.Column
          title="アップロード日時"
          dataIndex="created_at"
          render={(value) => value ? <DateField value={value} format="YYYY/MM/DD HH:mm" /> : '-'}
        />
        <Table.Column
          title="アクション"
          dataIndex="actions"
          render={(_, record: IPdfDocument) => (
            <Space>
              <Link to={`/pdf/show/${record.id}`}>
                <Button icon={<EyeOutlined />} size="small">
                  詳細
                </Button>
              </Link>
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
                onClick={() => {
                  if (confirm('このPDFを削除してもよろしいですか？')) {
                    deletePdf({
                      resource: 'pdf',
                      id: record.id,
                    }, {
                      onSuccess: () => {
                        fetchData(currentPage);
                      }
                    });
                  }
                }}
              >
                削除
              </Button>
            </Space>
          )}
        />
      </Table>
      

      {showSummaryTable && sectionSummary.length > 0 && (
        <>
          <Divider />
          <Card
            title={
              <Space>
                <TableOutlined />
                <Title level={4} style={{ margin: 0 }}>選択されたPDFのセクション別要約</Title>
              </Space>
            }
            style={{ marginTop: 24 }}
            extra={
              <Button
                onClick={() => setShowSummaryTable(false)}
                size="small"
              >
                閉じる
              </Button>
            }
          >
            <Table
              dataSource={sectionSummary}
              loading={summaryLoading}
              rowKey="id"
              pagination={false}
              scroll={{ x: 1500 }}
            >
              <Table.Column
                title="日付"
                dataIndex="date"
                width={120}
                fixed="left"
                render={(value) => value ? <DateField value={value} format="YYYY/MM/DD" /> : '-'}
              />
              <Table.Column
                title="ファイル名"
                dataIndex="filename"
                width={200}
                fixed="left"
                render={(value) => (
                  <Tag color="blue" style={{ fontSize: '12px' }}>{value}</Tag>
                )}
              />
              <Table.Column
                title="【1】業務遂行"
                dataIndex={['sections', 'business_execution']}
                width={300}
                render={(value) => (
                  <div style={{ maxWidth: 280, fontSize: '12px', lineHeight: '1.4' }}>
                    {value || '該当なし'}
                  </div>
                )}
              />
              <Table.Column
                title="【2】能力開発"
                dataIndex={['sections', 'skill_development']}
                width={300}
                render={(value) => (
                  <div style={{ maxWidth: 280, fontSize: '12px', lineHeight: '1.4' }}>
                    {value || '該当なし'}
                  </div>
                )}
              />
              <Table.Column
                title="【3】生成AI活用"
                dataIndex={['sections', 'ai_utilization']}
                width={300}
                render={(value) => (
                  <div style={{ maxWidth: 280, fontSize: '12px', lineHeight: '1.4' }}>
                    {value || '該当なし'}
                  </div>
                )}
              />
              <Table.Column
                title="【4】自由アピール"
                dataIndex={['sections', 'self_appeal']}
                width={300}
                render={(value) => (
                  <div style={{ maxWidth: 280, fontSize: '12px', lineHeight: '1.4' }}>
                    {value || '該当なし'}
                  </div>
                )}
              />
              <Table.Column
                title="■ 今週できなかったこと・来週以降チャレンジしたいこと"
                dataIndex={['sections', 'challenges_next_week']}
                width={400}
                render={(value) => (
                  <div style={{ maxWidth: 380, fontSize: '12px', lineHeight: '1.4' }}>
                    {value || '該当なし'}
                  </div>
                )}
              />
              <Table.Column
                title="■ 業績目標や行動に対する自己評価・所感"
                dataIndex={['sections', 'self_evaluation']}
                width={400}
                render={(value) => (
                  <div style={{ maxWidth: 380, fontSize: '12px', lineHeight: '1.4' }}>
                    {value || '該当なし'}
                  </div>
                )}
              />
            </Table>
          </Card>
        </>
      )}
    </List>
  );
};