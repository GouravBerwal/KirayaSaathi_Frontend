import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  Share2,
  Check,
  Tag,
  ArrowRight,
  BookOpen,
  Sparkles,
  LayoutDashboard,
  Linkedin,
} from "lucide-react";
import { apiRequest } from "../utils/api";
import { BlogItem } from "./BlogListPage";

interface BlogDetail extends BlogItem {
  content: string;
  related_posts?: BlogItem[];
}

interface BlogPostDetailPageProps {
  onBackToLanding?: () => void;
  onOpenDashboard?: () => void;
  isAuthenticated?: boolean;
}

export default function BlogPostDetailPage({
  onBackToLanding,
  onOpenDashboard,
  isAuthenticated = false,
}: BlogPostDetailPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Fetch single blog by slug
  useEffect(() => {
    let isMounted = true;
    async function loadPost() {
      if (!slug) return;
      setLoading(true);
      setError("");
      try {
        const res = await apiRequest<BlogDetail>(`/api/blogs/${slug}/`);
        if (isMounted) {
          setBlog(res);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Article not found or has been removed.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPost();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Dynamic SEO title, description, and BlogPosting schema
  useEffect(() => {
    if (blog) {
      document.title = `${blog.title} | KirayaSaathi Blog`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", blog.excerpt);
      }

      // Inject Schema.org BlogPosting
      const scriptId = "blogposting-schema";
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.text = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": blog.title,
        "description": blog.excerpt,
        "image": blog.cover_image || "https://www.kirayasaathi.app/favicon-512x512.png",
        "author": {
          "@type": "Person",
          "name": blog.author_name,
        },
        "publisher": {
          "@type": "Organization",
          "name": "KirayaSaathi",
          "logo": {
            "@type": "ImageObject",
            "url": "https://www.kirayasaathi.app/favicon-512x512.png",
          },
        },
        "datePublished": blog.created_at,
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": window.location.href,
        },
      });
    }

    return () => {
      const script = document.getElementById("blogposting-schema");
      if (script) script.remove();
    };
  }, [blog]);

  // Copy article link to clipboard
  function handleCopyLink() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // Share to WhatsApp
  function handleWhatsAppShare() {
    if (typeof window !== "undefined" && blog) {
      const text = encodeURIComponent(`Read this helpful guide on KirayaSaathi: "${blog.title}"\n${window.location.href}`);
      window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
    }
  }

  // Share to Twitter / X
  function handleTwitterShare() {
    if (typeof window !== "undefined" && blog) {
      const text = encodeURIComponent(`Useful rental management guide: "${blog.title}" via @KirayaSaathi`);
      const url = encodeURIComponent(window.location.href);
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#035E7B] px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition"
              aria-label="Back to all blog articles"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All Articles</span>
            </Link>
          </div>

          <Link to="/" className="flex items-center gap-2">
            <img src="/images/logo.png" alt="KirayaSaathi Logo" width="32" height="32" className="w-8 h-8 object-contain" />
            <span className="text-base sm:text-lg font-extrabold text-[#035E7B]">KirayaSaathi</span>
          </Link>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={onOpenDashboard || (() => navigate("/dashboard"))}
                className="px-3 py-1.5 rounded-xl bg-[#035E7B] text-white text-xs font-bold transition flex items-center gap-1"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="px-3.5 py-1.5 rounded-xl bg-[#035E7B] hover:bg-[#024B63] text-white text-xs font-bold transition"
              >
                Start Free
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 flex-1">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm text-sm font-semibold text-[#035E7B]">
              <span className="w-4 h-4 border-2 border-[#035E7B] border-t-transparent rounded-full animate-spin" />
              <span>Loading article...</span>
            </div>
          </div>
        ) : error || !blog ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8">
            <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-slate-900">Article Not Found</h2>
            <p className="text-sm text-slate-500 mt-1 mb-6">{error || "This article may have been unpublished or removed."}</p>
            <Link
              to="/blog"
              className="px-5 py-2.5 rounded-xl bg-[#035E7B] text-white font-bold text-xs inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Knowledge Hub</span>
            </Link>
          </div>
        ) : (
          <article className="space-y-8">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Link to="/" className="hover:text-[#035E7B] transition">Home</Link>
              <span>/</span>
              <Link to="/blog" className="hover:text-[#035E7B] transition">Blog</Link>
              <span>/</span>
              <span className="text-slate-800 truncate max-w-[200px] sm:max-w-sm">{blog.title}</span>
            </nav>

            {/* Header info */}
            <header className="space-y-4">
              {blog.is_published === false && (
                <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 text-xs font-bold flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Admin Draft Preview: This article is currently hidden from the public website.</span>
                  </div>
                  <Link
                    to="/admin-portal"
                    className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] transition shadow-xs"
                  >
                    Manage in Admin
                  </Link>
                </div>
              )}
              <div className="inline-flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#EAF4F7] text-[#035E7B] text-xs font-bold">
                  {blog.category}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
                {blog.title}
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                {blog.excerpt}
              </p>

              {/* Author and metadata row */}
              <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-xs ring-2 ring-[#035E7B]/20 bg-[#035E7B]">
                    <picture>
                      <source srcSet="/images/author_gourav.webp" type="image/webp" />
                      <img
                        src="/images/author_gourav.png"
                        alt={blog.author_name || "Gourav Berwal"}
                        className="w-full h-full object-cover object-top"
                      />
                    </picture>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{blog.author_name || "Gourav Berwal"}</div>
                    <div className="text-[11px] text-slate-500">{blog.author_role || "Founder & Creator of KirayaSaathi"}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> {blog.formatted_date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {blog.read_time}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-slate-400" /> {blog.views_count.toLocaleString()} views
                  </span>
                </div>
              </div>
            </header>

            {/* Cover Image */}
            {blog.cover_image && (
              <div className="rounded-3xl overflow-hidden shadow-lg border border-slate-200 aspect-[16/9] bg-slate-900">
                <img
                  src={blog.cover_image}
                  alt={blog.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/images/blogs/submeter_formula_guide.webp";
                  }}
                  className="w-full h-full object-cover object-center"
                />
              </div>
            )}

            {/* Social Share Toolbar */}
            <div className="flex items-center justify-between py-3 px-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-[#035E7B]" />
                Share this guide:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition"
                  aria-label="Share on WhatsApp"
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleTwitterShare}
                  className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition"
                  aria-label="Share on Twitter"
                >
                  Twitter / X
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition inline-flex items-center gap-1"
                  aria-label="Copy article link"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <span>Copy Link</span>
                  )}
                </button>
              </div>
            </div>

            {/* Article Content Render */}
            <div
              className="prose prose-slate max-w-none bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xs leading-relaxed space-y-4 text-slate-800
                [&>h2]:text-2xl [&>h2]:font-extrabold [&>h2]:text-slate-900 [&>h2]:mt-8 [&>h2]:mb-3 [&>h2]:tracking-tight
                [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-[#035E7B] [&>h3]:mt-6 [&>h3]:mb-2
                [&>p]:text-base [&>p]:text-slate-700 [&>p]:leading-relaxed
                [&>blockquote]:border-l-4 [&>blockquote]:border-[#035E7B] [&>blockquote]:bg-[#EAF4F7]/40 [&>blockquote]:p-4 [&>blockquote]:rounded-r-xl [&>blockquote]:italic [&>blockquote]:my-6
                [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2
                [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:space-y-2
                [&>strong]:text-slate-900"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />

            {/* Tags strip */}
            {blog.tags && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-500">Related Tags:</span>
                {blog.tags.split(",").map((t) => (
                  <span
                    key={t.trim()}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600"
                  >
                    #{t.trim()}
                  </span>
                ))}
              </div>
            )}

            {/* Author Profile Bio Card */}
            <div className="bg-gradient-to-br from-[#EAF4F7]/80 via-white to-[#EAF4F7]/40 p-6 sm:p-8 rounded-3xl border border-[#035E7B]/20 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="relative w-24 h-28 sm:w-28 sm:h-32 rounded-2xl overflow-hidden shrink-0 shadow-md border-2 border-white ring-2 ring-[#035E7B]/25 bg-[#035E7B]">
                  <picture>
                    <source srcSet="/images/author_gourav.webp" type="image/webp" />
                    <img
                      src="/images/author_gourav.png"
                      alt="Gourav Berwal - Founder & Creator of KirayaSaathi"
                      className="w-full h-full object-cover object-top"
                      loading="lazy"
                      decoding="async"
                    />
                  </picture>
                </div>
                <div className="space-y-3 flex-1">
                  <div>
                    <div className="text-xs font-bold text-[#035E7B] uppercase tracking-wider mb-1">
                      About the Author
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Gourav Berwal
                    </h3>
                    <div className="text-xs sm:text-sm font-semibold text-[#035E7B] italic">
                      Founder &amp; Creator of KirayaSaathi
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2.5">
                    <p>
                      Gourav Berwal is the creator of KirayaSaathi, a technology-driven platform built to simplify rental property management for landlords, property owners and tenants. With a focus on practical innovation, intuitive digital experiences and real-world challenges, the vision is to make property management more organized, transparent and effortless.
                    </p>
                    <p>
                      Through KirayaSaathi, Gourav Berwal explores the evolving world of rental management, real estate technology, landlord–tenant relationships and smarter ways to manage properties. The goal is simple: turn everyday rental challenges into simpler, smarter digital experiences.
                    </p>
                    <p className="font-bold text-slate-900 pt-0.5">
                      Building smarter ways to rent, manage and grow.
                    </p>
                  </div>

                  {/* LinkedIn Connect Button */}
                  <div className="pt-2">
                    <a
                      href="https://www.linkedin.com/in/gourav-berwal"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A66C2] hover:bg-[#004182] text-white text-xs font-bold transition-all shadow-xs hover:shadow-md group"
                      aria-label="Connect with Gourav Berwal on LinkedIn"
                    >
                      <Linkedin className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                      <span>Connect on LinkedIn</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Related Articles */}
            {blog.related_posts && blog.related_posts.length > 0 && (
              <div className="pt-8 space-y-4">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Recommended Articles</h3>
                <div className="grid sm:grid-cols-3 gap-6">
                  {blog.related_posts.map((rp) => (
                    <Link
                      key={rp.id}
                      to={`/blog/${rp.slug}`}
                      className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-[#035E7B]/40 hover:shadow-md transition block group"
                    >
                      <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 mb-3">
                        <img
                          src={rp.cover_image || "/images/logo.png"}
                          alt={rp.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-[#035E7B] uppercase">{rp.category}</span>
                      <h5 className="text-sm font-bold text-slate-900 group-hover:text-[#035E7B] transition line-clamp-2 mt-1">
                        {rp.title}
                      </h5>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>© 2026 KirayaSaathi. All Rights Reserved.</div>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-white transition">Home</Link>
            <Link to="/blog" className="hover:text-white transition text-white font-bold">Blog</Link>
            <Link to="/signup" className="hover:text-white transition">Start Free</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
