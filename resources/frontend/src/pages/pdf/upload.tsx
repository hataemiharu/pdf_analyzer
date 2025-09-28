import React, { useState } from 'react';
import { Create } from '@refinedev/antd';
import { Upload, Button, message, Card, List, Typography, Space, Progress, Breadcrumb } from 'antd';
import { InboxOutlined, FileTextOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Dragger } = Upload;
const { Text } = Typography;

export const PdfUpload: React.FC = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigate = useNavigate();

  const uploadProps: UploadProps = {
    name: 'pdf_files',
    multiple: true,
    fileList,
    accept: '.pdf',
    beforeUpload: (file) => {
      const isPDF = file.type === 'application/pdf';
      if (!isPDF) {
        message.error(`${file.name} はPDFファイルではありません`);
        return false;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('ファイルサイズは10MB以下にしてください');
        return false;
      }
      return false;
    },
    onChange: (info) => {
      setFileList(info.fileList);
    },
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error('アップロードするファイルを選択してください');
      return;
    }

    const formData = new FormData();
    fileList.forEach((file) => {
      if (file.originFileObj) {
        formData.append('pdf_files[]', file.originFileObj);
      }
    });

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await axios.post('/api/pdf/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });

      message.success(`${response.data.documents.length}件のPDFファイルを正常に処理しました`);
      setFileList([]);
      setTimeout(() => {
        navigate('/pdf');
      }, 2000);
    } catch (error: any) {
      console.error('Upload error:', error);
      message.error(error.response?.data?.error || 'アップロード中にエラーが発生しました');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Create
      title="PDFアップロード"
      breadcrumb={
        <Breadcrumb
          items={[
            { title: 'PDF管理' },
            { title: 'PDFアップロード' }
          ]}
        />
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card variant="outlined">
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">
              クリックまたはドラッグでPDFファイルをアップロード
            </p>
            <p className="ant-upload-hint">
              複数のPDFファイルを一度にアップロードできます。
              各ファイルは10MB以下にしてください。
            </p>
          </Dragger>
        </Card>

        {fileList.length > 0 && (
          <Card title={`選択されたファイル (${fileList.length}件)`} variant="outlined">
            <List
              itemLayout="horizontal"
              dataSource={fileList}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<FileTextOutlined style={{ fontSize: 24 }} />}
                    title={item.name}
                    description={`サイズ: ${((item.size || 0) / 1024 / 1024).toFixed(2)} MB`}
                  />
                  {item.status === 'done' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  {item.status === 'uploading' && <LoadingOutlined />}
                </List.Item>
              )}
            />
          </Card>
        )}

        {uploading && (
          <Card variant="outlined">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>アップロード中...</Text>
              <Progress percent={uploadProgress} />
            </Space>
          </Card>
        )}

        <Button
          type="primary"
          onClick={handleUpload}
          disabled={fileList.length === 0}
          loading={uploading}
          size="large"
          block
        >
          {uploading ? 'アップロード中...' : 'アップロード開始'}
        </Button>
      </Space>
    </Create>
  );
};
