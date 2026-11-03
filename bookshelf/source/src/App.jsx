import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import RequireAuth from './components/common/RequireAuth'
import Home from './pages/Home'
import ProductList from './pages/ProductList'
import ProductDetail from './pages/ProductDetail'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import Login from './pages/customer/Login'
import Register from './pages/customer/Register'
import ForgotPassword from './pages/customer/ForgotPassword'
import OrderTrack from './pages/customer/OrderTrack'
import Account from './pages/customer/Account'
import Orders from './pages/customer/Orders'
import OrderDetail from './pages/customer/OrderDetail'
import Contact from './pages/info/Contact'
import InfoPage from './pages/info/InfoPage'
import NotFound from './pages/NotFound'

// Routes mirror the live Laravel URLs so existing links, ads and SEO keep working.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="category/:slug" element={<ProductList mode="category" />} />
        <Route path="subcategory/:slug" element={<ProductList mode="subcategory" />} />
        <Route path="search" element={<ProductList mode="search" />} />
        <Route path="product/:slug" element={<ProductDetail />} />
        <Route path="customer/checkout" element={<Checkout />} />
        <Route path="customer/order-success/:invoice" element={<OrderSuccess />} />
        <Route path="customer/login" element={<Login />} />
        <Route path="customer/register" element={<Register />} />
        <Route path="customer/forgot-password" element={<ForgotPassword />} />
        <Route path="customer/order-track" element={<OrderTrack />} />
        <Route element={<RequireAuth />}>
          <Route path="customer/account" element={<Account />} />
          <Route path="customer/orders" element={<Orders />} />
          <Route path="customer/orders/:invoice" element={<OrderDetail />} />
        </Route>
        <Route path="site/contact-us" element={<Contact />} />
        <Route path="page/:slug" element={<InfoPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
