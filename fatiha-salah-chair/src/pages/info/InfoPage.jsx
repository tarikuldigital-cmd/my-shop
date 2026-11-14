import { useParams } from 'react-router-dom'
import { Breadcrumb, Spinner } from '../../components/common/ui'
import useAsync from '../../hooks/useAsync'
import { getPage } from '../../services/catalogService'
import NotFound from '../NotFound'

/** CMS pages: /page/order-procedure, delivery-rules, return-policy, terms-&-conditions, privacy-policy */
export default function InfoPage() {
  const { slug } = useParams()
  const { data: page, loading, error } = useAsync(() => getPage(slug), [slug])
  if (loading) return <Spinner className="py-24" />
  if (error || !page) return <NotFound />
  return (
    <div className="container-x py-5">
      <Breadcrumb items={[{ label: page.title }]} />
      <article className="card mt-4 p-5 sm:p-8">
        <h1 className="mb-4 text-2xl font-bold text-brand">{page.title}</h1>
        <div className="prose-bs" dangerouslySetInnerHTML={{ __html: page.html }} />
      </article>
    </div>
  )
}
