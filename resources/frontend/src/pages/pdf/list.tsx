import React, { useState, useEffect } from 'react';
import { List, DateField } from '@refinedev/antd';
import { Table, Space, Button, Tag, Empty, Card, Input, Alert, message } from 'antd';
import { Link } from 'react-router-dom';
import { UploadOutlined, EyeOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useDelete } from '@refinedev/core';
import axios from 'axios';
import { DeleteConfirmModal } from '../../components/DeleteConfirmModal';

interface IPdfDocument {
  id: number;
  filename: string;
  slack_date: string;
  summary: string;
  created_at: string;
}



export const PdfList: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<IPdfDocument[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize] = useState(5);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [inputKeyword, setInputKeyword] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IPdfDocument | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { mutate: deletePdf } = useDelete();

  // テキストハイライト用のヘルパー関数
  const highlightText = (text: string, keyword: string) => {
    if (!keyword || !text) return text;

    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} style={{ backgroundColor: '#ffeb3b', padding: '2px 4px', borderRadius: '2px' }}>
          {part}
        </mark>
      ) : part
    );
  };

  useEffect(() => {
    fetchData(currentPage, searchKeyword);
  }, [currentPage]);

  const fetchData = async (page: number, search: string = '') => {
    try {
      setLoading(true);
      const params: any = {
        page,
        per_page: pageSize
      };

      if (search) {
        params.search = search;
      }

      const response = await axios.get('/api/pdf', { params });
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


  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = async (keyword: string) => {
    setSearchLoading(true);
    setSearchKeyword(keyword);
    setCurrentPage(1);

    try {
      await fetchData(1, keyword);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleClearSearch = async () => {
    setSearchKeyword('');
    setInputKeyword('');
    setCurrentPage(1);
    await fetchData(1, '');
  };

  const handleDeleteClick = (record: IPdfDocument) => {
    setDeleteTarget(record);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    deletePdf({
      resource: 'pdf',
      id: deleteTarget.id,
    }, {
      onSuccess: () => {
        message.success('削除しました');
        fetchData(currentPage, searchKeyword);
        setDeleteModalOpen(false);
        setDeleteTarget(null);
      },
      onError: (error) => {
        message.error('削除に失敗しました');
        console.error('Delete error:', error);
      },
      onSettled: () => {
        setDeleteLoading(false);
      }
    });
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
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
      {/* 検索ボックス */}
      <Card style={{ marginBottom: 16 }} variant="outlined">
        <Input.Search
          placeholder="キーワードで検索（ファイル名、要約、内容から検索）"
          enterButton={
            <Button type="primary" icon={<SearchOutlined />} loading={searchLoading}>
              検索
            </Button>
          }
          size="large"
          value={inputKeyword}
          onChange={(e) => setInputKeyword(e.target.value)}
          onSearch={handleSearch}
          allowClear
          onClear={handleClearSearch}
        />

        {/* 検索結果の表示 */}
        {searchKeyword && (
          <Alert
            message={`「${searchKeyword}」の検索結果: ${totalItems}件`}
            type="info"
            style={{ marginTop: 12 }}
            showIcon
            closable={false}
          />
        )}
      </Card>

      <Table
        dataSource={data}
        loading={loading}
        rowKey="id"
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
              description={
                searchKeyword
                  ? `「${searchKeyword}」に一致する結果が見つかりませんでした`
                  : "まだPDFファイルがアップロードされていません"
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              {searchKeyword ? (
                <Space>
                  <Button onClick={handleClearSearch}>
                    検索をクリア
                  </Button>
                  <Link to="/pdf/upload">
                    <Button type="primary" icon={<UploadOutlined />}>
                      PDFをアップロード
                    </Button>
                  </Link>
                </Space>
              ) : (
                <Link to="/pdf/upload">
                  <Button type="primary" icon={<UploadOutlined />}>
                    最初のPDFをアップロード
                  </Button>
                </Link>
              )}
            </Empty>
          )
        }}
      >
        <Table.Column
          title="アップロード日"
          dataIndex="slack_date"
          render={(value) => value ? <DateField value={value} format="YYYY/MM/DD" /> : '-'}
        />
        <Table.Column
          title="ファイル名"
          dataIndex="filename"
          render={(value) => (
            <Tag color="blue">
              {searchKeyword ? highlightText(value, searchKeyword) : value}
            </Tag>
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
                {searchKeyword ? highlightText(value, searchKeyword) : value}
              </pre>
            </div>
          )}
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
                onClick={() => handleDeleteClick(record)}
              >
                削除
              </Button>
            </Space>
          )}
        />
      </Table>

      <DeleteConfirmModal
        open={deleteModalOpen}
        filename={deleteTarget?.filename || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleteLoading}
      />
    </List>
  );
};