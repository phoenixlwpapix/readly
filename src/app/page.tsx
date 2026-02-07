import { AppShell } from '@/components/app-shell'
import { Sidebar } from '@/components/sidebar'
import { ArticleList } from '@/components/article-list'
import { ArticleReader } from '@/components/article-reader'

export default function Home() {
  return (
    <AppShell
      sidebar={<Sidebar />}
      articleList={<ArticleList />}
      articleReader={<ArticleReader />}
    />
  )
}
