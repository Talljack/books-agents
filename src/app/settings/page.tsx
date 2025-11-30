"use client";

import { ModelSettings } from "@/components/settings/model-settings";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold">
            📚 BookFinder AI
          </Link>
          <Link href="/" className="text-blue-500 hover:underline">
            返回首页
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <ModelSettings />
      </main>
    </div>
  );
}
