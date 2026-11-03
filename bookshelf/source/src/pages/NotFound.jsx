import { Link } from 'react-router-dom'
import { EmptyState } from '../components/common/ui'

export default function NotFound() {
  return (
    <div className="container-x py-12">
      <EmptyState title="পেজটি পাওয়া যায়নি (404)" icon="search">
        <Link to="/" className="btn-accent">হোমে ফিরে যান</Link>
      </EmptyState>
    </div>
  )
}
