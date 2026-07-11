import { useState, useEffect } from 'react';
import { Layout, Menu, Button, Tag, Space, Dropdown, Avatar, Drawer, Grid, Tooltip } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  TeamOutlined,
  BankOutlined,
  ShopOutlined,
  UsergroupAddOutlined,
  LogoutOutlined,
  FileTextOutlined,
  DollarOutlined,
  BarChartOutlined,
  MenuOutlined,
  PlusOutlined,
  SnippetsOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, isManager, isAdminOrManager, hasPerm, canManageUsers, logout } = useAuth();
  const screens = useBreakpoint();
  const isMobile = !screens.lg;
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Helper: render menu label with an inline "+" button for quick-add
  const menuLabel = (text, addPath, editPerm) => (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span>{text}</span>
      {(!editPerm || hasPerm(editPerm)) && (
        <Tooltip title={`Add new`} placement="right">
          <PlusOutlined
            onClick={(e) => {
              e.stopPropagation();
              navigate(addPath);
              setDrawerOpen(false);
            }}
            style={{
              fontSize: 13,
              padding: 4,
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          />
        </Tooltip>
      )}
    </span>
  );

  // Build menu based on role & permissions
  const menuItems = [];

  if (isAdmin) {
    // ─── Product Owner (platform admin): manage CLIENTS & users only ───
    // No tenant/client business operations or tenant dashboard here.
    menuItems.push({ key: '/tenants', icon: <BankOutlined />, label: menuLabel('Tenants', '/tenants/new', null) });
    menuItems.push({ key: '/users', icon: <UsergroupAddOutlined />, label: menuLabel('Users', '/users/new', null) });
  } else {
    // ─── Tenant (client business) operational menus ───
    menuItems.push({ key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' });
    if (hasPerm('production_units:view'))
      menuItems.push({ key: '/production-units', icon: <ShopOutlined />, label: menuLabel('Production Units', '/production-units/new', 'production_units:edit') });
    if (hasPerm('employees:view'))
      menuItems.push({ key: '/employees', icon: <TeamOutlined />, label: menuLabel('Employees', '/employees/new', 'employees:edit') });
    if (hasPerm('customers:view'))
      menuItems.push({ key: '/customers', icon: <UserOutlined />, label: menuLabel('Customers', '/customers/new', 'customers:edit') });
    if (hasPerm('products:view'))
      menuItems.push({ key: '/products', icon: <AppstoreOutlined />, label: menuLabel('Products', '/products/new', 'products:edit') });
    if (hasPerm('orders:view'))
      menuItems.push({ key: '/orders', icon: <ShoppingCartOutlined />, label: menuLabel('Purchase Orders', '/orders/new', 'orders:edit') });
    if (hasPerm('invoices:view')) {
      const invoiceChildren = [
        { key: '/invoices', icon: <FileTextOutlined />, label: 'Manage Invoices' },
      ];
      if (hasPerm('invoices:edit')) {
        invoiceChildren.unshift({ key: '/invoices/new', icon: <PlusOutlined />, label: 'Create Invoice' });
      }
      menuItems.push({ key: 'invoices-menu', icon: <FileTextOutlined />, label: 'Invoices', children: invoiceChildren });
    }
    if (hasPerm('invoices:view'))
      menuItems.push({ key: '/quotes', icon: <SnippetsOutlined />, label: menuLabel('Quotes', '/quotes/new', 'invoices:edit') });
    if (hasPerm('payments:view'))
      menuItems.push({ key: '/payments', icon: <DollarOutlined />, label: menuLabel('Payments', '/payments/new', 'payments:edit') });
    if (hasPerm('reports:view'))
      menuItems.push({ key: '/reports', icon: <BarChartOutlined />, label: 'Reports' });

    // Tenant Manager can manage their own users
    if (canManageUsers) {
      menuItems.push({ type: 'divider' });
      menuItems.push({ key: '/users', icon: <UsergroupAddOutlined />, label: menuLabel('Users', '/users/new', null) });
    }
  }

  // Determine selected key – for invoices, differentiate between create and manage
  const pathSegments = location.pathname.split('/');
  let selectedKey;
  if (pathSegments[1] === 'invoices') {
    if (pathSegments[2] === 'new') {
      selectedKey = '/invoices/new';
    } else {
      selectedKey = '/invoices';
    }
  } else {
    selectedKey = '/' + pathSegments[1];
  }

  // Auto-open the Invoices submenu when on an invoice route
  const openKeys = pathSegments[1] === 'invoices' ? ['invoices-menu'] : [];

  const roleColor = isAdmin ? 'red' : isManager ? 'volcano' : user?.role === 'STAFF' ? 'blue' : 'default';
  const userMenuItems = [
    { key: 'role', label: <Tag color={roleColor}>{user?.role}</Tag>, disabled: true },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
    setDrawerOpen(false);
  };

  const siderContent = (
    <>
      <div style={{
        textAlign: 'center',
        padding: '16px 8px 12px 8px',
        borderBottom: isMobile ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.10)',
        marginBottom: 4,
      }}>
        <img src="/salesapp_logo.png" alt="Sales App" style={{ maxHeight: 40, maxWidth: 160, objectFit: 'contain', filter: isMobile ? 'none' : 'brightness(0) invert(1)' }} />
        <div style={{ color: isMobile ? '#333' : 'rgba(255,255,255,0.85)', fontWeight: 'bold', fontSize: 14, marginTop: 4 }}>Sales App</div>
      </div>
      <Menu
        theme={isMobile ? 'light' : 'dark'}
        mode="inline"
        selectedKeys={[selectedKey]}
        defaultOpenKeys={openKeys}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </>
  );

  return (
    /* Outer layout locked to viewport height — nothing outside this scrolls */
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Desktop Sidebar — scrolls independently if menu is long */}
      {!isMobile && (
        <Sider
          breakpoint="lg"
          collapsedWidth="60"
          width={220}
          style={{
            height: '100vh',
            overflow: 'auto',
            position: 'sticky',
            top: 0,
            left: 0,
            boxShadow: '2px 0 8px rgba(0,21,41,0.35)',
            zIndex: 10,
          }}
        >
          {siderContent}
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={260}
          styles={{ body: { padding: 0 } }}
          closable={false}
        >
          {siderContent}
        </Drawer>
      )}

       {/* Right side: flex column, fills remaining viewport height */}
       <Layout style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #f0f2f5 100%)', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

         {/* Header — always visible, never scrolls away */}
         <Header style={{
           background: 'linear-gradient(90deg, #001529 0%, #003366 100%)',
           padding: isMobile ? '0 12px' : '0 24px',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'space-between',
           gap: 8,
           boxShadow: '0 4px 16px rgba(0,21,41,0.35)',
           flexShrink: 0,
           zIndex: 100,
         }}>
           <Space>
             {isMobile && (
               <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} style={{ fontSize: 18, color: 'rgba(255,255,255,0.85)' }} />
             )}
             {user?.tenantLogoUrl && (
               <img src={user.tenantLogoUrl} alt="" style={{ height: 32, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
             )}
             {!isMobile && <span style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>Sales App</span>}
             {user?.tenantName && !isMobile && (
               <Tag color="cyan" style={{ fontSize: 13 }}>{user.tenantName}</Tag>
             )}
           </Space>
           <Dropdown
             menu={{ items: userMenuItems, onClick: ({ key }) => { if (key === 'logout') handleLogout(); } }}
             placement="bottomRight"
           >
             <Space style={{ cursor: 'pointer' }}>
               <Avatar icon={<UserOutlined />} style={{ backgroundColor: isAdmin ? '#f56a00' : isManager ? '#fa8c16' : '#1677ff' }} />
               {!isMobile && <span style={{ color: 'rgba(255,255,255,0.85)' }}>{user?.fullName || user?.username}</span>}
             </Space>
           </Dropdown>
         </Header>

         {/* Content — the ONLY thing that scrolls */}
         <Content style={{
           flex: 1,
           overflowY: 'auto',
           padding: isMobile ? '12px' : '24px',
           background: 'transparent',
         }}>
           <div
             style={{
               background: '#fff',
               borderRadius: '16px',
               padding: isMobile ? '16px' : '32px',
               boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
               minHeight: '100%',
               backdropFilter: 'blur(10px)',
               border: '1px solid rgba(255,255,255,0.8)',
             }}
           >
             <div key={location.key} className="page-transition">
               <Outlet />
             </div>
           </div>
         </Content>
      </Layout>
    </Layout>
  );
}
