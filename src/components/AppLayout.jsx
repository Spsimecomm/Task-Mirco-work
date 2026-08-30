import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import MobileBottomNav from './MobileBottomNav'
import Navbar from './Navbar'

export default function AppLayout({ children }) {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // If user is not logged in, render standard public navbar with content
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1020] text-[#0F172A] dark:text-[#F1F5F9] transition-colors">
        <Navbar />
        {children}
      </div>
    )
  }

  // If user is authenticated, render modern dashboard layout with Sidebar, Topbar and Bottom Nav
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1020] text-[#0F172A] dark:text-[#F1F5F9] transition-colors">
      {/* Fixed Left Sidebar on Desktop */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Column with offset for desktop sidebar */}
      <div className="flex min-h-screen flex-col lg:pl-64 transition-all duration-300">
        {/* Sticky Topbar */}
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Dynamic Page Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 pb-24 lg:pb-10 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation for Quick Access */}
        <MobileBottomNav />
      </div>
    </div>
  )
}
