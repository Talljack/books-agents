"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  Globe2,
  Zap,
  MessageSquareText,
  Star,
  ChevronRight,
  Github,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// 动画变体
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div ref={containerRef} className="relative">
      {/* Hero Section */}
      <section className="relative min-h-[100vh] overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          {/* Grid Pattern */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
              backgroundSize: "64px 64px",
            }}
          />

          {/* Gradient Orbs */}
          <motion.div
            style={{ y, opacity }}
            className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-violet-600/20 to-transparent blur-[120px]"
          />
          <motion.div
            style={{ y, opacity }}
            className="absolute -right-40 top-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-cyan-500/15 to-transparent blur-[100px]"
          />
          <motion.div
            style={{ y, opacity }}
            className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-gradient-to-t from-primary/10 to-transparent blur-[80px]"
          />

          {/* Noise Texture */}
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015]" />
        </div>

        {/* Content */}
        <div className="container relative flex min-h-[100vh] flex-col items-center justify-center py-20">
          <motion.div
            variants={stagger}
            initial="initial"
            animate="animate"
            className="mx-auto max-w-5xl text-center"
          >
            {/* Announcement Banner */}
            <motion.div variants={fadeInUp} className="mb-8">
              <Link
                href="/settings"
                className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10"
              >
                <span className="flex h-5 items-center rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 px-2 text-[10px] font-semibold uppercase tracking-wider text-white">
                  New
                </span>
                <span className="text-muted-foreground">支持 18+ AI 模型供应商</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>

            {/* Main Title */}
            <motion.h1
              variants={fadeInUp}
              className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
            >
              <span className="block">用 AI 发现</span>
              <span className="mt-2 block bg-gradient-to-r from-violet-400 via-primary to-cyan-400 bg-clip-text text-transparent">
                你的下一本好书
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeInUp}
              className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground sm:text-xl"
            >
              告诉 AI 你想读什么，它会从豆瓣、Google Books 等多个平台为你找到最合适的书籍。
              <span className="text-foreground"> 支持本地模型，完全免费。</span>
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeInUp}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link href="/search">
                <Button
                  size="lg"
                  className="group h-12 gap-2 rounded-full bg-gradient-to-r from-violet-600 to-primary px-8 text-base font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
                >
                  <Play className="h-4 w-4" />
                  开始使用
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 gap-2 rounded-full border-white/10 bg-white/5 px-8 text-base font-medium backdrop-blur-sm hover:bg-white/10"
                >
                  <Github className="h-4 w-4" />
                  Star on GitHub
                </Button>
              </a>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              variants={fadeInUp}
              className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-6 w-6 rounded-full border-2 border-background bg-gradient-to-br from-violet-400 to-cyan-400"
                    />
                  ))}
                </div>
                <span>1000+ 用户</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span>4.9/5 评分</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-green-500" />
                <span>100% 免费</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex flex-col items-center gap-2 text-muted-foreground"
            >
              <span className="text-xs">向下滚动</span>
              <div className="h-8 w-5 rounded-full border border-white/20 p-1">
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="h-1.5 w-1.5 rounded-full bg-white/50"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative border-t border-white/5 bg-gradient-to-b from-background to-black/20 py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <span className="text-sm font-medium uppercase tracking-wider text-primary">
              功能特性
            </span>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">为什么选择 BookFinder AI</h2>
            <p className="mt-4 text-muted-foreground">
              我们整合了最先进的 AI 技术和最全面的书籍数据源
            </p>
          </motion.div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: MessageSquareText,
                title: "对话式交互",
                description: "像和朋友聊天一样描述你的阅读需求，AI 会理解并为你推荐最合适的书籍",
                gradient: "from-violet-500/20 to-violet-500/0",
              },
              {
                icon: Globe2,
                title: "多源聚合",
                description: "整合豆瓣、Google Books、Open Library、Internet Archive 等多个数据源",
                gradient: "from-cyan-500/20 to-cyan-500/0",
              },
              {
                icon: Sparkles,
                title: "智能推荐",
                description: "基于 LangGraph 的智能 Agent，深度理解你的偏好，精准匹配书籍",
                gradient: "from-primary/20 to-primary/0",
              },
              {
                icon: Zap,
                title: "本地模型支持",
                description: "支持 Ollama 本地模型，无需 API Key，完全免费，数据隐私有保障",
                gradient: "from-green-500/20 to-green-500/0",
              },
              {
                icon: BookOpen,
                title: "在线阅读",
                description: "部分书籍支持在线阅读，通过 Internet Archive 免费获取经典著作",
                gradient: "from-orange-500/20 to-orange-500/0",
              },
              {
                icon: Star,
                title: "智能评分",
                description: "综合多平台评分和评价数量，帮你快速筛选高质量书籍",
                gradient: "from-yellow-500/20 to-yellow-500/0",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-white/10 hover:bg-white/[0.04]"
              >
                {/* Gradient Background */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity group-hover:opacity-100`}
                />

                <div className="relative">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="relative border-t border-white/5 py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <span className="text-sm font-medium uppercase tracking-wider text-primary">
              使用流程
            </span>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">三步找到心仪好书</h2>
          </motion.div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {[
              {
                step: "01",
                title: "描述需求",
                description:
                  "用自然语言告诉 AI 你想读什么类型的书，比如「推荐几本机器学习入门书籍」",
              },
              {
                step: "02",
                title: "确认偏好",
                description: "AI 会理解你的需求并展示搜索条件，你可以调整语言、难度等偏好",
              },
              {
                step: "03",
                title: "获取推荐",
                description: "AI 从多个数据源搜索并智能排序，为你呈现最相关的高分书籍",
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative"
              >
                {/* Connector Line */}
                {index < 2 && (
                  <div className="absolute left-1/2 top-12 hidden h-px w-full bg-gradient-to-r from-white/10 to-transparent lg:block" />
                )}

                <div className="relative rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 text-2xl font-bold">
                    {item.step}
                  </div>
                  <h3 className="mb-3 text-xl font-semibold">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative border-t border-white/5 py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl"
          >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-primary/20 to-cyan-600/20" />
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]" />

            {/* Content */}
            <div className="relative px-8 py-16 text-center sm:px-16 sm:py-20">
              <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl">
                准备好发现下一本好书了吗？
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
                无需注册，无需付费，立即开始你的阅读探索之旅
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/search">
                  <Button
                    size="lg"
                    className="h-14 gap-2 rounded-full bg-white px-10 text-lg font-medium text-black hover:bg-white/90"
                  >
                    <Sparkles className="h-5 w-5" />
                    立即开始
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
