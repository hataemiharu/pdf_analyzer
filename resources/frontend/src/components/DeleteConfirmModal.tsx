import React from 'react';
import { Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

interface DeleteConfirmModalProps {
  open: boolean;
  title?: string;
  filename: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  open,
  title = '削除確認',
  filename,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  return (
    <Modal
      title={title}
      open={open}
      onOk={onConfirm}
      onCancel={onCancel}
      okText="はい"
      cancelText="いいえ"
      okType="danger"
      confirmLoading={loading}
      destroyOnClose
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 22 }} />
        <span>「{filename}」のPDFを削除しますか？</span>
      </div>
    </Modal>
  );
};