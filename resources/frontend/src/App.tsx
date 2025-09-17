import { Refine } from '@refinedev/core';
import { notificationProvider, ThemedLayout, ErrorComponent } from '@refinedev/antd';
import { ConfigProvider, App as AntdApp } from 'antd';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import dataProvider from '@refinedev/simple-rest';
import routerProvider from '@refinedev/react-router-v6';
import jaJP from 'antd/locale/ja_JP';
import '@refinedev/antd/dist/reset.css';

import { PdfList } from './pages/pdf/list';
import { PdfShow } from './pages/pdf/show';
import { PdfUpload } from './pages/pdf/upload';
import { CrossSummary } from './pages/cross-summary';
import { Dashboard } from './pages/dashboard';

const API_URL = '/api';

function App() {
  return (
    <BrowserRouter>
      <ConfigProvider locale={jaJP}>
        <AntdApp>
            <Refine
              dataProvider={dataProvider(API_URL)}
              notificationProvider={notificationProvider}
              routerProvider={routerProvider}
              resources={[
                {
                  name: 'dashboard',
                  list: '/',
                  meta: {
                    label: 'ダッシュボード',
                  },
                },
                {
                  name: 'pdf',
                  list: '/pdf',
                  show: '/pdf/show/:id',
                  create: '/pdf/upload',
                  meta: {
                    label: 'PDF管理',
                  },
                },
                {
                  name: 'cross-summary',
                  list: '/cross-summary',
                  meta: {
                    label: '横断分析',
                  },
                },
              ]}
              options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
              }}
            >
              <Routes>
                <Route
                  element={
                    <ThemedLayout>
                      <Outlet />
                    </ThemedLayout>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="/pdf">
                    <Route index element={<PdfList />} />
                    <Route path="show/:id" element={<PdfShow />} />
                    <Route path="upload" element={<PdfUpload />} />
                  </Route>
                  <Route path="/cross-summary" element={<CrossSummary />} />
                  <Route path="*" element={<ErrorComponent />} />
                </Route>
              </Routes>
            </Refine>
          </AntdApp>
        </ConfigProvider>
    </BrowserRouter>
  );
}

export default App;