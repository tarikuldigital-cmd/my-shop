import { Link } from 'react-router-dom'
import { EmptyState } from '../components/common/ui'

export default function NotFound() {
  return (
    <div className="container-x py-12">
      <EmptyState title="Page not found (404)" icon="search">
        <Link to="/" className="btn-accent">Back to home</Link>
      </EmptyState>
    </div>
  )
}
