"use client";

import { ModelSettings } from "@/components/settings/model-settings";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            📚 BookFinder AI
          </Link>
          <Link href="/" className="text-blue-500 hover:underline">
            返回首页
          </Link>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4">
        <ModelSettings />
      </main>
    </div>
  );
}

