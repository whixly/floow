import { Outlet } from 'react-router-dom'
import TopNav from './TopNav'

export default function AppLayout() {
  return (
    <div className="min-h-screen t-bg">
      <TopNav />
      <main className="pt-14 min-h-screen overflow-y-auto">
        <div className="p-6 max-w-screen-xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
