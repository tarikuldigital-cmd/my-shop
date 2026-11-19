import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import RequireAuth from './components/common/RequireAuth'
import Home from './pages/Home'
import ProductList from './pages/ProductList'
import ProductDetail from './pages/ProductDetail'
import LandingPage from './pages/LandingPage'
import { lazy, Suspense } from 'react'
import { Spinner } from './components/common/ui'

// Admin is split into its own chunk so customers never download it
const Checkout = lazy(() => import('./pages/Checkout'))
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'))
const Login = lazy(() => import('./pages/customer/Login'))
const Register = lazy(() => import('./pages/customer/Register'))
const ForgotPassword = lazy(() => import('./pages/customer/ForgotPassword'))
const OrderTrack = lazy(() => import('./pages/customer/OrderTrack'))
const Account = lazy(() => import('./pages/customer/Account'))
const Orders = lazy(() => import('./pages/customer/Orders'))
const OrderDetail = lazy(() => import('./pages/customer/OrderDetail'))
const Contact = lazy(() => import('./pages/info/Contact'))
const InfoPage = lazy(() => import('./pages/info/InfoPage'))
const NotFound = lazy(() => import('./pages/NotFound'))
const TrackOrder = lazy(() => import('./pages/TrackOrder'))
const AdminApp = lazy(() => import('./admin/AdminApp'))
const ComplainNew = lazy(() => import('./pages/complain/Complain').then((m) => ({ default: m.ComplainNew })))
const ComplainTrack = lazy(() => import('./pages/complain/Complain').then((m) => ({ default: m.ComplainTrack })))

// Routes mirror the live Laravel URLs so existing links, ads and SEO keep working.
export default function App() {
  return (
    <Routes>
      <Route path="admin/*" element={<Suspense fallback={<Spinner className="py-24" />}><AdminApp /></Suspense>} />
      <Route path="lp/:slug" element={<LandingPage />} />
      <Route path="complain" element={<Suspense fallback={<Spinner className="py-24" />}><ComplainNew /></Suspense>} />
      <Route path="complain/track" element={<Suspense fallback={<Spinner className="py-24" />}><ComplainTrack /></Suspense>} />
      <Route path="complain/track/:ref" element={<Suspense fallback={<Spinner className="py-24" />}><ComplainTrack key="ref" /></Suspense>} />
      <Route path="c/:ref" element={<Suspense fallback={<Spinner className="py-24" />}><ComplainTrack key="short" /></Suspense>} />
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
        <Route path="track/:code" element={<TrackOrder />} />
        <Route path="t/:code" element={<TrackOrder />} />
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
