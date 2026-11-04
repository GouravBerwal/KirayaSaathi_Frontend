import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  BookOpen,
  Calendar,
  Clock,
  Eye,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Tag,
  Share2,
  CheckCircle2,
  TrendingUp,
  LayoutDashboard,
} from "lucide-react";
import { apiRequest } from "../utils/api";

export interface BlogItem {
  id: number;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  cover_image: string;
  author_name: string;
  author_role: string;
  read_time: string;
  tags: string;
  is_featured: boolean;
  views_count: number;
  created_at: string;
  formatted_date: string;
}

interface BlogListPageProps {
  onBackToLanding?: () => void;
  onOpenDashboard?: () => void;
  onLogin?: () => void;
  isAuthenticated?: boolean;
}

export default function BlogListPage({
  onBackToLanding,
  onOpenDashboard,
  onLogin,
  isAuthenticated = false,
}: BlogListPageProps) {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Fetch blogs & categories
  useEffect(() => {
    let isMounted = true;
    async function loadBlogs() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectedCategory && selectedCategory !== "All") {
          queryParams.append("category", selectedCategory);
        }
        if (searchQuery.trim()) {
          queryParams.append("search", searchQuery.trim());
        }

        const url = `/api/blogs/?${queryParams.toString()}`;
        const res = await apiRequest<{ count: number; results: BlogItem[] }>(url);
        if (isMounted && res && res.results) {
          setBlogs(res.results);
        }
      } catch (err) {
        console.warn("Could not fetch remote blogs, using local cache", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBlogs();
    return () => {
      isMounted = false;
    };
  }, [selectedCategory, searchQuery]);

  // Fetch categories list once
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        const catRes = await apiRequest<{ name: string; count: number }[]>("/api/blogs/categories/");
        if (isMounted && Array.isArray(catRes)) {
          setCategories(catRes);
        }
      } catch {
        // Fallback default categories
        if (isMounted) {
          setCategories([
            { name: "All", count: 4 },
            { name: "Tenant Management", count: 1 },
            { name: "Electricity Submetering", count: 1 },
            { name: "Rent Laws & Agreements", count: 1 },
            { name: "PG & Hostel Guide", count: 1 },
          ]);
        }
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update Page Title and Schema for SEO
  useEffect(() => {
    document.title = "KirayaSaathi Rental & Property Knowledge Hub | Landlord & PG Guides";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Authoritative guides, electricity calculation rules, legal templates, and management tips for Indian landlords, PG & hostel operators by KirayaSaathi."
      );
    }
  }, []);

  // Separate featured blog from the rest
  const featuredBlog = useMemo(() => {
    return blogs.find((b) => b.is_featured) || blogs[0];
  }, [blogs]);

  const regularBlogs = useMemo(() => {
    if (!featuredBlog) return blogs;
    return blogs.filter((b) => b.id !== featuredBlog.id);
  }, [blogs, featuredBlog]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      {/* =========================================================================
          TOP NAVIGATION BAR
      ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToLanding || (() => navigate("/"))}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#035E7B] px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition mr-1"
              aria-label="Back to Website Homepage"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </button>

            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-xs">
                <img src="/images/logo.png" alt="KirayaSaathi Logo" width="40" height="40" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-extrabold text-[#035E7B] block leading-none tracking-tight">
                  KirayaSaathi
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500 font-semibold tracking-wide">
                  Editorial &amp; Knowledge Hub
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={onOpenDashboard || (() => navigate("/dashboard"))}
                className="px-3 sm:px-4 py-2 rounded-xl bg-[#035E7B] hover:bg-[#024B63] text-white text-xs sm:text-sm font-bold shadow-sm transition inline-flex items-center gap-1.5"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onLogin || (() => navigate("/login"))}
                  className="px-3 sm:px-4 py-2 rounded-xl text-[#035E7B] border border-[#035E7B]/30 hover:bg-[#EAF4F7] text-xs sm:text-sm font-bold transition"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/signup")}
                  className="hidden sm:inline-flex px-3.5 py-2 rounded-xl bg-[#035E7B] hover:bg-[#024B63] text-white text-xs sm:text-sm font-bold shadow-sm transition items-center gap-1.5"
                >
                  <span>Start Free</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          HERO BANNER & SEARCH
      ========================================================================= */}
      <section className="bg-gradient-to-b from-[#EAF4F7]/80 via-white to-[#F8FAFC] pt-12 pb-14 border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#035E7B]/10 text-[#035E7B] text-xs font-bold border border-[#035E7B]/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Property Management Guides &amp; India Rental Insights</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
            The Smart Landlord &amp; PG <br className="hidden sm:inline" />
            <span className="text-[#035E7B]">Knowledge Center</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Expert articles, electricity billing calculation formulas, state-specific rent agreement laws, and tenant verification guides to scale your rental income.
          </p>

          {/* Search Box */}
          <div className="max-w-2xl mx-auto pt-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guides (e.g. electricity formula, rent agreement, tenant screening)..."
                aria-label="Search articles"
                className="w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl bg-white border border-slate-200 text-sm text-slate-900 shadow-md shadow-slate-200/40 outline-none focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/20 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700 bg-slate-100 px-2 py-1 rounded-md"
                  aria-label="Clear search query"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {categories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedCategory.toLowerCase() === cat.name.toLowerCase()
                    ? "bg-[#035E7B] text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-[#035E7B]/40 hover:text-[#035E7B]"
                }`}
              >
                <span>{cat.name}</span>
                {cat.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      selectedCategory.toLowerCase() === cat.name.toLowerCase()
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {cat.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          MAIN BLOG LISTING
      ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm text-sm font-semibold text-[#035E7B]">
              <span className="w-4 h-4 border-2 border-[#035E7B] border-t-transparent rounded-full animate-spin" />
              <span>Loading articles...</span>
            </div>
          </div>
        ) : blogs.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8 max-w-xl mx-auto">
            <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-slate-900">No articles found</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              We couldn't find any articles matching your search query "{searchQuery}".
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
              className="px-4 py-2 rounded-xl bg-[#035E7B] text-white text-xs font-bold hover:bg-[#024B63] transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* FEATURED SPOTLIGHT ARTICLE (when no search query is active) */}
            {!searchQuery && featuredBlog && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition">
                <div className="grid lg:grid-cols-12 gap-0 items-stretch">
                  <div className="lg:col-span-7 relative min-h-[260px] lg:min-h-[380px] overflow-hidden bg-slate-900">
                    <img
                      src={featuredBlog.cover_image || "/images/logo.png"}
                      alt={featuredBlog.title}
                      loading="eager"
                      className="w-full h-full object-cover object-center transform hover:scale-105 transition duration-500"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full bg-[#035E7B] text-white text-xs font-bold shadow-md uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
                        Featured Guide
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
                    <div className="space-y-3.5">
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold">
                        <span className="text-[#035E7B] bg-[#EAF4F7] px-2.5 py-0.5 rounded-md">
                          {featuredBlog.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {featuredBlog.read_time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> {featuredBlog.views_count.toLocaleString()} views
                        </span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 hover:text-[#035E7B] transition leading-tight">
                        <Link to={`/blog/${featuredBlog.slug}`}>
                          {featuredBlog.title}
                        </Link>
                      </h2>

                      <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                        {featuredBlog.excerpt}
                      </p>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between mt-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 shadow-xs ring-1 ring-[#035E7B]/20 bg-[#035E7B]">
                          <picture>
                            <source srcSet="/images/author_gourav.webp" type="image/webp" />
                            <img
                              src="/images/author_gourav.png"
                              alt={featuredBlog.author_name}
                              className="w-full h-full object-cover object-top"
                            />
                          </picture>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{featuredBlog.author_name}</div>
                          <div className="text-[11px] text-slate-500">{featuredBlog.formatted_date}</div>
                        </div>
                      </div>

                      <Link
                        to={`/blog/${featuredBlog.slug}`}
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#035E7B] hover:text-[#024B63] hover:translate-x-1 transition"
                      >
                        <span>Read Full Guide</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ARTICLES GRID */}
            {regularBlogs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    {selectedCategory === "All" ? "Latest Articles" : `${selectedCategory} Articles`}
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    {regularBlogs.length} {regularBlogs.length === 1 ? "article" : "articles"} available
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {regularBlogs.map((post) => (
                    <article
                      key={post.id}
                      className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden hover:border-[#035E7B]/40 hover:shadow-lg transition-all flex flex-col group"
                    >
                      <Link to={`/blog/${post.slug}`} className="block relative aspect-video overflow-hidden bg-slate-100">
                        <img
                          src={post.cover_image || "/images/logo.png"}
                          alt={post.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-md bg-white/95 backdrop-blur-sm text-[11px] font-bold text-[#035E7B] shadow-xs">
                          {post.category}
                        </span>
                      </Link>

                      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {post.formatted_date}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {post.read_time}
                            </span>
                          </div>

                          <h4 className="text-lg font-bold text-slate-900 group-hover:text-[#035E7B] transition line-clamp-2 leading-snug">
                            <Link to={`/blog/${post.slug}`}>
                              {post.title}
                            </Link>
                          </h4>

                          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                            {post.excerpt}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 ring-1 ring-[#035E7B]/20 bg-[#035E7B]">
                              <picture>
                                <source srcSet="/images/author_gourav.webp" type="image/webp" />
                                <img
                                  src="/images/author_gourav.png"
                                  alt={post.author_name}
                                  className="w-full h-full object-cover object-top"
                                />
                              </picture>
                            </div>
                            <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">
                              {post.author_name}
                            </span>
                          </div>

                          <Link
                            to={`/blog/${post.slug}`}
                            className="text-xs font-bold text-[#035E7B] group-hover:translate-x-0.5 transition inline-flex items-center gap-1"
                          >
                            <span>Read</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CTA BANNER */}
        <div className="mt-16 rounded-3xl bg-gradient-to-r from-[#035E7B] to-[#024B63] p-8 sm:p-12 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ready to Simplify Your Rental Property Management?
            </h3>
            <p className="text-sm text-white/80 leading-relaxed">
              Join thousands of hostel, PG, and apartment owners across India. Generate instant PDF invoices, track rent receipts, and calculate electricity submeters automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="px-6 py-3.5 rounded-2xl bg-white text-[#035E7B] hover:bg-slate-50 font-bold text-sm shadow-md hover:shadow-lg transition shrink-0 inline-flex items-center gap-2"
          >
            <span>Start Free Today</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* =========================================================================
          FOOTER
      ========================================================================= */}
      <footer className="bg-slate-900 text-white py-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <img src="/images/logo.png" alt="KirayaSaathi Logo" width="24" height="24" className="w-6 h-6 object-contain" />
            <span className="font-bold text-white text-sm">KirayaSaathi</span>
            <span>— © 2026 All Rights Reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-white transition">Home</Link>
            <Link to="/blog" className="hover:text-white transition text-white font-bold">Blog</Link>
            <Link to="/login" className="hover:text-white transition">Login</Link>
            <Link to="/signup" className="hover:text-white transition">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
