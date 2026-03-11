/**
 * Built-in template library — pre-baked design tokens for common app categories.
 * No Figma API needed. The system auto-picks the best template per generation.
 */

import type { FigmaDesignTokens } from "./figmaClient.js";

export interface BuiltInTemplate {
  id: string;
  name: string;
  category: string;
  keywords: string[]; // used for matching against user prompts
  design_tokens: FigmaDesignTokens;
  description: string;
}

// ─── Template definitions ────────────────────────────────────────

export const TEMPLATE_LIBRARY: BuiltInTemplate[] = [
  // ── 1. Dashboard / Analytics ──
  {
    id: "tpl-dashboard",
    name: "Analytics Dashboard",
    category: "dashboard",
    keywords: [
      "dashboard", "analytics", "metrics", "charts", "graphs", "kpi",
      "data", "insights", "reporting", "monitor", "statistics", "admin",
      "panel", "overview", "performance", "tracking",
    ],
    description: "Clean analytics dashboard with sidebar nav, stat cards, and chart panels",
    design_tokens: {
      colors: {
        primary: "#6366f1",
        secondary: "#8b5cf6",
        accent: "#06b6d4",
        background: "#f8fafc",
        surface: "#ffffff",
        text: "#0f172a",
        muted: "#64748b",
        all: ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#f8fafc", "#e2e8f0"],
      },
      typography: {
        fonts: ["Inter", "system-ui"],
        heading_sizes: [32, 24, 20, 16],
        body_size: 14,
        weights: [400, 500, 600, 700],
      },
      spacing: { base: 8, values: [4, 8, 12, 16, 24, 32, 48] },
      borders: { radii: [6, 8, 12, 16], default_radius: 12 },
      shadows: ["0 1px 3px rgba(0,0,0,0.1)", "0 4px 6px rgba(0,0,0,0.07)", "0 10px 15px rgba(0,0,0,0.05)"],
      layout: {
        type: "sidebar",
        columns: 12,
        frame_names: ["Sidebar Nav", "Header Bar", "Stat Cards Row", "Chart Panel", "Data Table", "Activity Feed"],
        component_names: ["StatCard", "LineChart", "BarChart", "DonutChart", "DataTable", "Sidebar", "TopBar", "FilterBar", "Badge", "Avatar"],
      },
    },
  },

  // ── 2. Social / Community ──
  {
    id: "tpl-social",
    name: "Social Platform",
    category: "social",
    keywords: [
      "social", "community", "feed", "post", "chat", "message", "friend",
      "follow", "like", "comment", "profile", "timeline", "network",
      "forum", "discussion", "sharing", "stories",
    ],
    description: "Social feed with stories bar, post cards, and engagement interactions",
    design_tokens: {
      colors: {
        primary: "#3b82f6",
        secondary: "#ec4899",
        accent: "#f97316",
        background: "#f0f2f5",
        surface: "#ffffff",
        text: "#1a1a2e",
        muted: "#65676b",
        all: ["#3b82f6", "#ec4899", "#f97316", "#10b981", "#8b5cf6", "#f0f2f5", "#e4e6eb"],
      },
      typography: {
        fonts: ["Inter", "system-ui"],
        heading_sizes: [28, 22, 18, 16],
        body_size: 15,
        weights: [400, 500, 600, 700],
      },
      spacing: { base: 8, values: [4, 8, 12, 16, 20, 24, 32] },
      borders: { radii: [8, 12, 20, 9999], default_radius: 12 },
      shadows: ["0 1px 2px rgba(0,0,0,0.1)", "0 2px 8px rgba(0,0,0,0.08)"],
      layout: {
        type: "top-nav",
        columns: 3,
        frame_names: ["Top Nav", "Stories Bar", "Post Feed", "Right Sidebar", "User Profile Card", "Comment Thread"],
        component_names: ["PostCard", "StoryBubble", "CommentBox", "LikeButton", "ShareButton", "Avatar", "NotificationBell", "SearchBar", "UserCard"],
      },
    },
  },

  // ── 3. E-Commerce / Shopping ──
  {
    id: "tpl-ecommerce",
    name: "E-Commerce Store",
    category: "ecommerce",
    keywords: [
      "shop", "store", "ecommerce", "e-commerce", "product", "cart",
      "checkout", "buy", "sell", "marketplace", "catalog", "inventory",
      "price", "order", "payment", "shipping", "retail",
    ],
    description: "Product grid with hero banner, filter sidebar, cart drawer, and checkout flow",
    design_tokens: {
      colors: {
        primary: "#18181b",
        secondary: "#a855f7",
        accent: "#f59e0b",
        background: "#ffffff",
        surface: "#fafafa",
        text: "#09090b",
        muted: "#71717a",
        all: ["#18181b", "#a855f7", "#f59e0b", "#ef4444", "#10b981", "#fafafa", "#e4e4e7"],
      },
      typography: {
        fonts: ["DM Sans", "system-ui"],
        heading_sizes: [36, 28, 22, 18],
        body_size: 15,
        weights: [400, 500, 600, 700],
      },
      spacing: { base: 8, values: [4, 8, 12, 16, 24, 32, 48, 64] },
      borders: { radii: [4, 8, 12, 16], default_radius: 8 },
      shadows: ["0 1px 3px rgba(0,0,0,0.06)", "0 4px 12px rgba(0,0,0,0.08)", "0 8px 24px rgba(0,0,0,0.1)"],
      layout: {
        type: "top-nav",
        columns: 4,
        frame_names: ["Top Nav", "Hero Banner", "Category Strip", "Product Grid", "Product Card", "Cart Drawer", "Filter Sidebar"],
        component_names: ["ProductCard", "HeroBanner", "CategoryChip", "CartDrawer", "PriceTag", "StarRating", "AddToCartButton", "SearchBar", "FilterPanel", "Breadcrumb"],
      },
    },
  },

  // ── 4. Fitness / Health ──
  {
    id: "tpl-fitness",
    name: "Fitness Tracker",
    category: "fitness",
    keywords: [
      "fitness", "health", "workout", "exercise", "gym", "training",
      "calories", "nutrition", "diet", "meal", "weight", "tracker",
      "habit", "wellness", "step", "run", "yoga", "meditation",
      "sleep", "hydration", "macro", "protein",
    ],
    description: "Activity dashboard with progress rings, workout cards, and nutrition tracking",
    design_tokens: {
      colors: {
        primary: "#10b981",
        secondary: "#06b6d4",
        accent: "#f59e0b",
        background: "#f0fdf4",
        surface: "#ffffff",
        text: "#064e3b",
        muted: "#6b7280",
        all: ["#10b981", "#06b6d4", "#f59e0b", "#ef4444", "#8b5cf6", "#f0fdf4", "#d1fae5"],
      },
      typography: {
        fonts: ["Inter", "system-ui"],
        heading_sizes: [32, 26, 20, 16],
        body_size: 15,
        weights: [400, 500, 600, 700, 800],
      },
      spacing: { base: 8, values: [4, 8, 12, 16, 20, 24, 32] },
      borders: { radii: [12, 16, 20, 9999], default_radius: 16 },
      shadows: ["0 2px 8px rgba(16,185,129,0.1)", "0 4px 12px rgba(0,0,0,0.06)"],
      layout: {
        type: "tab-bar",
        columns: 2,
        frame_names: ["Header", "Progress Rings", "Today's Stats", "Workout Cards", "Nutrition Panel", "Activity Graph", "Bottom Tab Bar"],
        component_names: ["ProgressRing", "StatCard", "WorkoutCard", "MealCard", "CalorieBar", "StepCounter", "WaterTracker", "TabBar", "StreakBadge"],
      },
    },
  },

  // ── 5. Finance / Banking ──
  {
    id: "tpl-finance",
    name: "Finance App",
    category: "finance",
    keywords: [
      "finance", "banking", "money", "budget", "expense", "income",
      "investment", "stock", "crypto", "portfolio", "wallet", "payment",
      "transaction", "savings", "loan", "credit", "debit", "fintech",
    ],
    description: "Balance overview with transaction list, spending breakdown, and investment charts",
    design_tokens: {
      colors: {
        primary: "#0ea5e9",
        secondary: "#6366f1",
        accent: "#10b981",
        background: "#0f172a",
        surface: "#1e293b",
        text: "#f8fafc",
        muted: "#94a3b8",
        all: ["#0ea5e9", "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#0f172a", "#1e293b", "#334155"],
      },
      typography: {
        fonts: ["SF Pro Display", "Inter", "system-ui"],
        heading_sizes: [36, 28, 22, 18],
        body_size: 15,
        weights: [400, 500, 600, 700],
      },
      spacing: { base: 8, values: [4, 8, 12, 16, 24, 32, 48] },
      borders: { radii: [8, 12, 16, 20], default_radius: 12 },
      shadows: ["0 2px 8px rgba(0,0,0,0.3)", "0 8px 24px rgba(0,0,0,0.2)"],
      layout: {
        type: "tab-bar",
        columns: 2,
        frame_names: ["Header Balance", "Quick Actions", "Transaction List", "Spending Chart", "Card Preview", "Investment Panel", "Bottom Tab Bar"],
        component_names: ["BalanceCard", "TransactionRow", "SpendingDonut", "CreditCard3D", "QuickActionButton", "InvestmentChart", "CryptoTicker", "TabBar"],
      },
    },
  },

  // ── 6. Productivity / Task Management ──
  {
    id: "tpl-productivity",
    name: "Productivity Suite",
    category: "productivity",
    keywords: [
      "todo", "task", "project", "kanban", "board", "planner",
      "calendar", "schedule", "reminder", "notes", "notebook",
      "productivity", "organize", "workflow", "team", "collaborate",
      "agenda", "checklist",
    ],
    description: "Kanban board with sidebar projects list, task cards, and calendar view",
    design_tokens: {
      colors: {
        primary: "#8b5cf6",
        secondary: "#06b6d4",
        accent: "#f59e0b",
        background: "#faf5ff",
        surface: "#ffffff",
        text: "#1e1b4b",
        muted: "#6b7280",
        all: ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#ef4444", "#ec4899", "#faf5ff", "#ede9fe"],
      },
      typography: {
        fonts: ["Inter", "system-ui"],
        heading_sizes: [28, 22, 18, 15],
        body_size: 14,
        weights: [400, 500, 600, 700],
      },
      spacing: { base: 8, values: [4, 8, 12, 16, 20, 24, 32] },
      borders: { radii: [6, 8, 12], default_radius: 8 },
      shadows: ["0 1px 3px rgba(0,0,0,0.08)", "0 4px 12px rgba(0,0,0,0.06)"],
      layout: {
        type: "sidebar",
        columns: 4,
        frame_names: ["Sidebar Projects", "Board Header", "Kanban Columns", "Task Card", "Calendar View", "Search Bar"],
        component_names: ["KanbanColumn", "TaskCard", "ProjectItem", "DueDateBadge", "PriorityTag", "AvatarStack", "ProgressBar", "CalendarGrid", "SearchInput"],
      },
    },
  },

  // ── 7. Education / Learning ──
  {
    id: "tpl-education",
    name: "Learning Platform",
    category: "education",
    keywords: [
      "learn", "course", "education", "school", "student", "teacher",
      "lesson", "quiz", "exam", "study", "tutorial", "class",
      "lecture", "grade", "certificate", "flashcard", "language",
    ],
    description: "Course catalog with progress tracking, lesson viewer, and quiz interface",
    design_tokens: {
      colors: {
        primary: "#2563eb",
        secondary: "#7c3aed",
        accent: "#f59e0b",
        background: "#eff6ff",
        surface: "#ffffff",
        text: "#1e3a5f",
        muted: "#64748b",
        all: ["#2563eb", "#7c3aed", "#f59e0b", "#10b981", "#ef4444", "#eff6ff", "#dbeafe"],
      },
      typography: {
        fonts: ["Inter", "Georgia"],
        heading_sizes: [32, 26, 20, 16],
        body_size: 16,
        weights: [400, 500, 600, 700],
      },
      spacing: { base: 8, values: [4, 8, 12, 16, 24, 32, 48] },
      borders: { radii: [8, 12, 16], default_radius: 12 },
      shadows: ["0 1px 3px rgba(0,0,0,0.06)", "0 4px 12px rgba(0,0,0,0.08)"],
      layout: {
        type: "top-nav",
        columns: 3,
        frame_names: ["Top Nav", "Hero Section", "Course Grid", "Course Card", "Lesson Viewer", "Progress Bar", "Quiz Panel"],
        component_names: ["CourseCard", "LessonList", "ProgressRing", "QuizQuestion", "VideoPlayer", "CertificateBadge", "SearchBar", "CategoryFilter", "StarRating"],
      },
    },
  },

  // ── 8. Travel / Booking ──
  {
    id: "tpl-travel",
    name: "Travel Booking",
    category: "travel",
    keywords: [
      "travel", "booking", "hotel", "flight", "trip", "vacation",
      "airbnb", "destination", "explore", "map", "itinerary",
      "restaurant", "review", "reservation", "tourism", "adventure",
    ],
    description: "Destination cards with search filters, map view, and booking flow",
    design_tokens: {
      colors: {
        primary: "#0891b2",
        secondary: "#f97316",
        accent: "#eab308",
        background: "#f0fdfa",
        surface: "#ffffff",
        text: "#134e4a",
        muted: "#6b7280",
        all: ["#0891b2", "#f97316", "#eab308", "#10b981", "#ef4444", "#f0fdfa", "#ccfbf1"],
      },
      typography: {
        fonts: ["DM Sans", "system-ui"],
        heading_sizes: [36, 28, 22, 18],
        body_size: 15,
        weights: [400, 500, 600, 700],
      },
      spacing: { base: 8, values: [4, 8, 12, 16, 24, 32, 48] },
      borders: { radii: [8, 12, 16, 24], default_radius: 12 },
      shadows: ["0 2px 8px rgba(0,0,0,0.08)", "0 8px 24px rgba(0,0,0,0.1)"],
      layout: {
        type: "top-nav",
        columns: 3,
        frame_names: ["Hero Search", "Category Pills", "Destination Grid", "Destination Card", "Map View", "Booking Panel", "Review Section"],
        component_names: ["DestinationCard", "SearchBar", "DatePicker", "GuestSelector", "MapPin", "PriceTag", "StarRating", "ImageCarousel", "BookingCTA"],
      },
    },
  },

  // ── 9. Music / Media ──
  {
    id: "tpl-music",
    name: "Music Player",
    category: "music",
    keywords: [
      "music", "player", "playlist", "song", "album", "artist",
      "podcast", "audio", "streaming", "spotify", "radio", "sound",
      "beat", "mix", "dj", "video", "media", "entertainment",
    ],
    description: "Now playing with album art, playlist queue, and discovery feed",
    design_tokens: {
      colors: {
        primary: "#1db954",
        secondary: "#e11d48",
        accent: "#a855f7",
        background: "#0a0a0a",
        surface: "#171717",
        text: "#fafafa",
        muted: "#a3a3a3",
        all: ["#1db954", "#e11d48", "#a855f7", "#3b82f6", "#f59e0b", "#0a0a0a", "#171717", "#262626"],
      },
      typography: {
        fonts: ["Inter", "system-ui"],
        heading_sizes: [32, 24, 18, 14],
        body_size: 14,
        weights: [400, 500, 600, 700, 800],
      },
      spacing: { base: 8, values: [4, 8, 12, 16, 24, 32] },
      borders: { radii: [4, 8, 12, 9999], default_radius: 8 },
      shadows: ["0 4px 16px rgba(0,0,0,0.4)", "0 8px 32px rgba(0,0,0,0.3)"],
      layout: {
        type: "sidebar",
        columns: 3,
        frame_names: ["Sidebar Library", "Now Playing Bar", "Discovery Feed", "Album Grid", "Playlist View", "Artist Page"],
        component_names: ["NowPlayingBar", "AlbumCard", "PlaylistRow", "PlayButton", "VolumeSlider", "ProgressBar", "ArtistCard", "GenreChip", "QueueList"],
      },
    },
  },

  // ── 10. Food / Recipe ──
  {
    id: "tpl-food",
    name: "Recipe & Food",
    category: "food",
    keywords: [
      "recipe", "food", "cooking", "meal", "restaurant", "menu",
      "delivery", "order", "kitchen", "chef", "ingredient", "baking",
      "cuisine", "dining", "cafe", "breakfast", "lunch", "dinner",
    ],
    description: "Recipe cards with ingredient lists, step-by-step instructions, and meal planner",
    design_tokens: {
      colors: {
        primary: "#ea580c",
        secondary: "#16a34a",
        accent: "#eab308",
        background: "#fff7ed",
        surface: "#ffffff",
        text: "#431407",
        muted: "#78716c",
        all: ["#ea580c", "#16a34a", "#eab308", "#ef4444", "#0891b2", "#fff7ed", "#fed7aa"],
      },
      typography: {
        fonts: ["DM Serif Display", "Inter", "system-ui"],
        heading_sizes: [36, 28, 22, 18],
        body_size: 16,
        weights: [400, 500, 600, 700],
      },
      spacing: { base: 8, values: [4, 8, 12, 16, 24, 32, 48] },
      borders: { radii: [8, 12, 16, 24], default_radius: 12 },
      shadows: ["0 2px 6px rgba(0,0,0,0.06)", "0 8px 20px rgba(0,0,0,0.08)"],
      layout: {
        type: "top-nav",
        columns: 3,
        frame_names: ["Hero Banner", "Category Tabs", "Recipe Grid", "Recipe Card", "Ingredients List", "Step-by-Step", "Meal Planner"],
        component_names: ["RecipeCard", "IngredientRow", "StepCard", "TimerBadge", "DifficultyTag", "NutritionLabel", "SearchBar", "CategoryTab", "RatingStars"],
      },
    },
  },

  // ── 11. Real Estate / Property ──
  {
    id: "tpl-realestate",
    name: "Real Estate",
    category: "realestate",
    keywords: [
      "real estate", "property", "house", "apartment", "rent",
      "mortgage", "listing", "agent", "home", "condo", "zillow",
      "realtor", "housing", "lease", "room",
    ],
    description: "Property listings with map view, photo gallery, and contact agent flow",
    design_tokens: {
      colors: {
        primary: "#1e40af",
        secondary: "#059669",
        accent: "#d97706",
        background: "#f8fafc",
        surface: "#ffffff",
        text: "#1e293b",
        muted: "#64748b",
        all: ["#1e40af", "#059669", "#d97706", "#ef4444", "#6366f1", "#f8fafc", "#e2e8f0"],
      },
      typography: {
        fonts: ["Inter", "system-ui"],
        heading_sizes: [36, 28, 22, 18],
        body_size: 15,
        weights: [400, 500, 600, 700],
      },
      spacing: { base: 8, values: [4, 8, 12, 16, 24, 32, 48] },
      borders: { radii: [6, 8, 12, 16], default_radius: 8 },
      shadows: ["0 1px 3px rgba(0,0,0,0.08)", "0 4px 16px rgba(0,0,0,0.1)"],
      layout: {
        type: "top-nav",
        columns: 3,
        frame_names: ["Search Header", "Map View", "Listing Grid", "Property Card", "Photo Gallery", "Details Panel", "Contact Agent"],
        component_names: ["PropertyCard", "MapView", "PhotoCarousel", "PriceTag", "FeatureBadge", "AgentCard", "SearchFilters", "MortgageCalculator"],
      },
    },
  },

  // ── 12. CRM / Business ──
  {
    id: "tpl-crm",
    name: "CRM Platform",
    category: "crm",
    keywords: [
      "crm", "sales", "lead", "pipeline", "client", "customer",
      "contact", "deal", "business", "enterprise", "b2b", "saas",
      "invoice", "proposal", "meeting", "startup",
    ],
    description: "Sales pipeline with deal cards, contact management, and activity timeline",
    design_tokens: {
      colors: {
        primary: "#4f46e5",
        secondary: "#0ea5e9",
        accent: "#f59e0b",
        background: "#f5f3ff",
        surface: "#ffffff",
        text: "#1e1b4b",
        muted: "#6b7280",
        all: ["#4f46e5", "#0ea5e9", "#f59e0b", "#10b981", "#ef4444", "#f5f3ff", "#e0e7ff"],
      },
      typography: {
        fonts: ["Inter", "system-ui"],
        heading_sizes: [28, 22, 18, 15],
        body_size: 14,
        weights: [400, 500, 600, 700],
      },
      spacing: { base: 8, values: [4, 8, 12, 16, 24, 32] },
      borders: { radii: [4, 6, 8, 12], default_radius: 8 },
      shadows: ["0 1px 2px rgba(0,0,0,0.05)", "0 4px 12px rgba(0,0,0,0.08)"],
      layout: {
        type: "sidebar",
        columns: 5,
        frame_names: ["Sidebar Nav", "Pipeline Board", "Deal Card", "Contact Detail", "Activity Timeline", "Email Panel"],
        component_names: ["PipelineColumn", "DealCard", "ContactRow", "ActivityItem", "MetricCard", "EmailComposer", "AvatarStack", "TagBadge", "SearchBar"],
      },
    },
  },

  // ── 13. Dating / Romance ──
  {
    id: "tpl-dating",
    name: "Dating App",
    category: "dating",
    keywords: [
      "dating", "match", "swipe", "love", "romance", "singles",
      "couples", "tinder", "bumble", "hinge", "ditto", "heart",
      "profile", "connection", "relationship", "meet",
    ],
    description: "Swipeable profile cards with match animations, chat, and discovery feed",
    design_tokens: {
      colors: {
        primary: "#e11d48",
        secondary: "#f43f5e",
        accent: "#a855f7",
        background: "#fff1f2",
        surface: "#ffffff",
        text: "#1a1a2e",
        muted: "#71717a",
        all: ["#e11d48", "#f43f5e", "#a855f7", "#ec4899", "#f97316", "#fff1f2", "#ffe4e6"],
      },
      typography: {
        fonts: ["DM Sans", "system-ui"],
        heading_sizes: [32, 26, 20, 16],
        body_size: 15,
        weights: [400, 500, 600, 700, 800],
      },
      spacing: { base: 8, values: [4, 8, 12, 16, 24, 32, 48] },
      borders: { radii: [12, 16, 24, 9999], default_radius: 16 },
      shadows: ["0 4px 16px rgba(225,29,72,0.15)", "0 8px 32px rgba(0,0,0,0.1)"],
      layout: {
        type: "tab-bar",
        columns: 2,
        frame_names: ["Discovery Feed", "Profile Card Stack", "Match Screen", "Chat List", "User Profile", "Settings", "Bottom Tab Bar"],
        component_names: ["SwipeCard", "ProfileCard", "MatchAnimation", "ChatBubble", "PhotoGrid", "InterestTag", "LikeButton", "SuperLikeButton", "TabBar", "StoryRing"],
      },
    },
  },

  // ── 14. Chat / Messaging ──
  {
    id: "tpl-chat",
    name: "Messaging App",
    category: "chat",
    keywords: [
      "chat", "message", "messaging", "conversation", "dm", "inbox",
      "whatsapp", "telegram", "slack", "discord", "communicate",
      "text", "send", "reply", "group", "channel",
    ],
    description: "Chat threads with message bubbles, conversation list, and media sharing",
    design_tokens: {
      colors: {
        primary: "#25d366",
        secondary: "#128c7e",
        accent: "#34b7f1",
        background: "#f0f2f5",
        surface: "#ffffff",
        text: "#111b21",
        muted: "#8696a0",
        all: ["#25d366", "#128c7e", "#34b7f1", "#075e54", "#dcf8c6", "#f0f2f5", "#e9edef"],
      },
      typography: {
        fonts: ["Inter", "system-ui"],
        heading_sizes: [24, 20, 16, 14],
        body_size: 15,
        weights: [400, 500, 600],
      },
      spacing: { base: 8, values: [4, 8, 12, 16, 20, 24] },
      borders: { radii: [8, 12, 18, 9999], default_radius: 12 },
      shadows: ["0 1px 2px rgba(0,0,0,0.08)", "0 2px 8px rgba(0,0,0,0.06)"],
      layout: {
        type: "sidebar",
        columns: 2,
        frame_names: ["Conversation List", "Chat Window", "Message Bubble", "Input Bar", "Contact Info", "Media Gallery"],
        component_names: ["ChatBubble", "ConversationRow", "TypingIndicator", "MessageInput", "AttachButton", "VoiceNote", "Avatar", "OnlineStatus", "ReadReceipt", "GroupAvatar"],
      },
    },
  },

  // ── 15. Scheduling / Calendar ──
  {
    id: "tpl-scheduling",
    name: "Scheduling App",
    category: "scheduling",
    keywords: [
      "schedule", "calendar", "appointment", "booking", "availability",
      "meeting", "event", "agenda", "planner", "cal", "calendly",
      "time", "slot", "reservation", "reminder",
    ],
    description: "Calendar views with time slot picker, booking flow, and appointment management",
    design_tokens: {
      colors: {
        primary: "#2563eb",
        secondary: "#7c3aed",
        accent: "#06b6d4",
        background: "#f8fafc",
        surface: "#ffffff",
        text: "#0f172a",
        muted: "#64748b",
        all: ["#2563eb", "#7c3aed", "#06b6d4", "#10b981", "#f59e0b", "#f8fafc", "#e2e8f0"],
      },
      typography: {
        fonts: ["Inter", "system-ui"],
        heading_sizes: [32, 24, 20, 16],
        body_size: 14,
        weights: [400, 500, 600, 700],
      },
      spacing: { base: 8, values: [4, 8, 12, 16, 24, 32, 48] },
      borders: { radii: [6, 8, 12, 16], default_radius: 8 },
      shadows: ["0 1px 3px rgba(0,0,0,0.08)", "0 4px 12px rgba(0,0,0,0.06)"],
      layout: {
        type: "top-nav",
        columns: 7,
        frame_names: ["Top Nav", "Calendar Month View", "Week View", "Day Timeline", "Time Slot Picker", "Booking Form", "Confirmation"],
        component_names: ["CalendarGrid", "DayCell", "TimeSlot", "EventCard", "BookingForm", "DatePicker", "TimePicker", "AvailabilityBar", "AppointmentCard", "ConfirmationModal"],
      },
    },
  },

  // ── 16. Weather ──
  {
    id: "tpl-weather",
    name: "Weather App",
    category: "weather",
    keywords: [
      "weather", "forecast", "temperature", "climate", "rain",
      "sunny", "cloud", "wind", "storm", "humidity", "uv",
    ],
    description: "Current conditions with animated weather icons, hourly/daily forecast, and radar map",
    design_tokens: {
      colors: {
        primary: "#0ea5e9",
        secondary: "#38bdf8",
        accent: "#f59e0b",
        background: "#0c4a6e",
        surface: "#0369a1",
        text: "#f0f9ff",
        muted: "#bae6fd",
        all: ["#0ea5e9", "#38bdf8", "#f59e0b", "#f97316", "#a855f7", "#0c4a6e", "#0369a1"],
      },
      typography: {
        fonts: ["SF Pro Display", "Inter", "system-ui"],
        heading_sizes: [64, 36, 24, 16],
        body_size: 15,
        weights: [300, 400, 500, 600, 700],
      },
      spacing: { base: 8, values: [4, 8, 16, 24, 32, 48] },
      borders: { radii: [12, 16, 24, 9999], default_radius: 16 },
      shadows: ["0 4px 16px rgba(0,0,0,0.2)", "0 8px 32px rgba(0,0,0,0.15)"],
      layout: {
        type: "top-nav",
        columns: 2,
        frame_names: ["Current Weather Hero", "Hourly Forecast Strip", "Daily Forecast List", "Weather Details Grid", "Radar Map", "Air Quality"],
        component_names: ["WeatherHero", "TempDisplay", "HourlyCard", "DailyRow", "WeatherIcon", "WindCompass", "UVIndex", "SunriseSunset", "PrecipBar", "LocationSearch"],
      },
    },
  },

  // ── 17. News / Blog ──
  {
    id: "tpl-news",
    name: "News Reader",
    category: "news",
    keywords: [
      "news", "blog", "article", "magazine", "media", "journalist",
      "headline", "newsletter", "press", "editorial", "publish",
      "read", "stories", "breaking",
    ],
    description: "Article feed with featured stories, category tabs, and reading view",
    design_tokens: {
      colors: {
        primary: "#dc2626",
        secondary: "#1e40af",
        accent: "#f59e0b",
        background: "#fafafa",
        surface: "#ffffff",
        text: "#171717",
        muted: "#737373",
        all: ["#dc2626", "#1e40af", "#f59e0b", "#10b981", "#6366f1", "#fafafa", "#e5e5e5"],
      },
      typography: {
        fonts: ["Georgia", "Inter", "system-ui"],
        heading_sizes: [36, 28, 22, 18],
        body_size: 17,
        weights: [400, 500, 600, 700, 800],
      },
      spacing: { base: 8, values: [4, 8, 12, 16, 24, 32, 48, 64] },
      borders: { radii: [4, 6, 8, 12], default_radius: 6 },
      shadows: ["0 1px 3px rgba(0,0,0,0.06)", "0 4px 12px rgba(0,0,0,0.08)"],
      layout: {
        type: "top-nav",
        columns: 3,
        frame_names: ["Top Nav", "Breaking Banner", "Featured Story", "Category Tabs", "Article Grid", "Article Card", "Reading View"],
        component_names: ["ArticleCard", "FeaturedStory", "CategoryTab", "AuthorByline", "ReadingProgress", "BookmarkButton", "ShareButton", "CommentSection", "RelatedArticles", "SearchBar"],
      },
    },
  },

  // ── 18. Medical / Healthcare ──
  {
    id: "tpl-medical",
    name: "Healthcare App",
    category: "medical",
    keywords: [
      "medical", "healthcare", "doctor", "patient", "hospital",
      "health", "prescription", "telemedicine", "clinic", "diagnosis",
      "pharmacy", "appointment", "symptoms", "wellness",
    ],
    description: "Patient dashboard with appointment booking, health records, and telemedicine",
    design_tokens: {
      colors: {
        primary: "#0d9488",
        secondary: "#2563eb",
        accent: "#f59e0b",
        background: "#f0fdfa",
        surface: "#ffffff",
        text: "#134e4a",
        muted: "#64748b",
        all: ["#0d9488", "#2563eb", "#f59e0b", "#ef4444", "#10b981", "#f0fdfa", "#ccfbf1"],
      },
      typography: {
        fonts: ["Inter", "system-ui"],
        heading_sizes: [32, 24, 20, 16],
        body_size: 15,
        weights: [400, 500, 600, 700],
      },
      spacing: { base: 8, values: [4, 8, 12, 16, 24, 32, 48] },
      borders: { radii: [8, 12, 16], default_radius: 12 },
      shadows: ["0 1px 3px rgba(0,0,0,0.06)", "0 4px 12px rgba(0,0,0,0.08)"],
      layout: {
        type: "top-nav",
        columns: 2,
        frame_names: ["Top Nav", "Health Summary", "Upcoming Appointments", "Doctor Cards", "Prescription List", "Vitals Chart", "Telemedicine View"],
        component_names: ["DoctorCard", "AppointmentCard", "VitalsChart", "PrescriptionRow", "SymptomChecker", "HealthScore", "VideoCallUI", "MedicalRecord", "SearchBar", "EmergencyButton"],
      },
    },
  },

  // ── 19. Gaming / Esports ──
  {
    id: "tpl-gaming",
    name: "Gaming Platform",
    category: "gaming",
    keywords: [
      "game", "gaming", "esports", "leaderboard", "score", "player",
      "tournament", "level", "rank", "achievement", "stream",
      "competitive", "match", "team", "clan",
    ],
    description: "Leaderboard with player stats, tournament brackets, and achievement system",
    design_tokens: {
      colors: {
        primary: "#7c3aed",
        secondary: "#06b6d4",
        accent: "#f59e0b",
        background: "#0f0f23",
        surface: "#1a1a3e",
        text: "#e2e8f0",
        muted: "#94a3b8",
        all: ["#7c3aed", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#0f0f23", "#1a1a3e"],
      },
      typography: {
        fonts: ["Rajdhani", "Inter", "system-ui"],
        heading_sizes: [36, 28, 22, 16],
        body_size: 14,
        weights: [400, 500, 600, 700, 800],
      },
      spacing: { base: 8, values: [4, 8, 12, 16, 24, 32] },
      borders: { radii: [4, 8, 12], default_radius: 8 },
      shadows: ["0 0 20px rgba(124,58,237,0.3)", "0 4px 16px rgba(0,0,0,0.4)"],
      layout: {
        type: "sidebar",
        columns: 3,
        frame_names: ["Sidebar Nav", "Featured Tournament", "Leaderboard", "Player Stats", "Match History", "Achievement Grid"],
        component_names: ["LeaderboardRow", "PlayerCard", "TournamentBracket", "StatBar", "AchievementBadge", "MatchCard", "RankBadge", "XPProgress", "TeamCard", "LiveIndicator"],
      },
    },
  },

  // ── 20. Portfolio / Landing ──
  {
    id: "tpl-portfolio",
    name: "Portfolio Website",
    category: "portfolio",
    keywords: [
      "portfolio", "resume", "personal", "landing", "showcase",
      "about", "cv", "freelance", "designer", "developer",
      "creative", "work", "projects", "hire", "website",
    ],
    description: "Hero section with project showcase, skills grid, and contact form",
    design_tokens: {
      colors: {
        primary: "#18181b",
        secondary: "#6366f1",
        accent: "#f59e0b",
        background: "#fafafa",
        surface: "#ffffff",
        text: "#09090b",
        muted: "#71717a",
        all: ["#18181b", "#6366f1", "#f59e0b", "#10b981", "#ec4899", "#fafafa", "#e4e4e7"],
      },
      typography: {
        fonts: ["DM Serif Display", "Inter", "system-ui"],
        heading_sizes: [48, 36, 28, 20],
        body_size: 16,
        weights: [400, 500, 600, 700],
      },
      spacing: { base: 8, values: [4, 8, 16, 24, 32, 48, 64, 96] },
      borders: { radii: [4, 8, 12, 16], default_radius: 8 },
      shadows: ["0 1px 3px rgba(0,0,0,0.06)", "0 4px 16px rgba(0,0,0,0.1)", "0 12px 40px rgba(0,0,0,0.12)"],
      layout: {
        type: "top-nav",
        columns: 3,
        frame_names: ["Navigation", "Hero Section", "About Section", "Project Grid", "Skills Grid", "Testimonials", "Contact Form", "Footer"],
        component_names: ["HeroSection", "ProjectCard", "SkillBadge", "TestimonialCard", "ContactForm", "SocialLinks", "ScrollReveal", "AnimatedHeading", "ImageGallery", "CTAButton"],
      },
    },
  },
];

// ─── Template matcher ────────────────────────────────────────────

/**
 * Match a user prompt to the best built-in template.
 * Returns the template with the highest keyword overlap score.
 */
// Common filler words to ignore during template matching
const STOP_WORDS = new Set([
  "make", "me", "a", "an", "the", "build", "create", "generate",
  "app", "application", "web", "please", "i", "want",
  "need", "like", "with", "and", "for", "that", "this", "my",
  "can", "you", "just", "simple", "good", "best", "new", "ai",
]);

export function matchTemplate(prompt: string): BuiltInTemplate {
  const lower = prompt.toLowerCase();
  // Strip "like [product name]" to avoid matching on filler words
  const stripped = lower.replace(/like\s+\w+(?:\s+\w+)?(?:\s+ai)?/gi, "").trim();
  const words = stripped.split(/\s+/).filter((w) => !STOP_WORDS.has(w) && w.length > 1);
  // Also keep product names from original prompt for matching (e.g. "tinder", "ditto")
  const allWords = lower.split(/\s+/).filter((w) => !STOP_WORDS.has(w) && w.length > 1);

  let bestMatch = TEMPLATE_LIBRARY[0];
  let bestScore = 0;

  for (const template of TEMPLATE_LIBRARY) {
    let score = 0;
    for (const keyword of template.keywords) {
      // Exact word match in cleaned prompt (highest weight)
      if (words.includes(keyword)) {
        score += 3;
      }
      // Exact word match including product names from original
      else if (allWords.includes(keyword)) {
        score += 3;
      }
      // Substring match (lower weight)
      else if (stripped.includes(keyword)) {
        score += 2;
      }
      // Partial word match — only if keyword is 4+ chars (avoids false positives)
      else if (keyword.length >= 4 && words.some((w) => w.length >= 4 && (w.startsWith(keyword) || keyword.startsWith(w)))) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  console.log(`[Template] Matched "${bestMatch.name}" (score: ${bestScore}) for prompt`);
  return bestMatch;
}

/**
 * Convert a built-in template to the same format used by Figma templates
 * for seamless integration with the context brief pipeline.
 */
export function templateToContextOverlay(template: BuiltInTemplate) {
  const t = template.design_tokens;
  return {
    competitive_landscape: [{
      name: template.name,
      description: template.description,
      key_ux_patterns: t.layout.component_names.slice(0, 5),
      visual_signature: `${t.colors.primary} primary, ${t.layout.type} layout`,
      pricing_model: "free template",
    }],
    must_have_features: t.layout.component_names.slice(0, 6),
    target_persona: { role: "general user", pain_points: [], expectations: [] },
    design_references: {
      color_psychology: `${template.name} palette: ${t.colors.primary} primary, ${t.colors.secondary} secondary, ${t.colors.accent} accent`,
      layout_pattern: t.layout.type,
      typography_style: t.typography.fonts[0] ?? "system sans-serif",
      visual_motifs: t.layout.component_names.slice(0, 5),
    },
    ui_component_suggestions: t.layout.component_names.slice(0, 10),
    layout_blueprint: `${t.layout.type} layout with sections: ${t.layout.frame_names.join(", ")}`,
    competitor_visuals: [
      {
        name: `Template: ${template.name}`,
        colors: t.colors.all.slice(0, 8),
        og_image: null,
        layout_signals: [
          `Layout: ${t.layout.type}`,
          `Border radius: ${t.borders.default_radius}px`,
          `Spacing base: ${t.spacing.base}px`,
          `Font: ${t.typography.fonts[0]}`,
          ...t.layout.frame_names.slice(0, 5).map((f) => `Section: ${f}`),
        ],
        screenshot_analysis: {
          color_palette: t.colors.all.slice(0, 8),
          layout_type: t.layout.type,
          component_patterns: t.layout.component_names.slice(0, 10),
          navigation_style: t.layout.type === "sidebar" ? "sidebar navigation" : t.layout.type === "tab-bar" ? "bottom tab bar" : "top navigation bar",
          image_usage: "minimal, decorative",
          interactive_elements: ["buttons", "inputs", "cards", "toggles"],
          key_ui_to_replicate: t.layout.component_names.slice(0, 6),
          background_treatment: `solid ${t.colors.background}`,
          card_design_spec: `bg: ${t.colors.surface}, border-radius: ${t.borders.default_radius}px, shadow: ${t.shadows[0] ?? "none"}`,
          typography_hierarchy: `${t.typography.fonts[0]} — headings: ${t.typography.heading_sizes.slice(0, 3).join("/")}px (${t.typography.weights.slice(-1)[0]}), body: ${t.typography.body_size}px (${t.typography.weights[0]})`,
          spacing_pattern: `base ${t.spacing.base}px, scale: ${t.spacing.values.join(", ")}px`,
          gradient_specs: [],
          border_and_shadow_system: `radius: ${t.borders.radii.join("/")}px, shadows: ${t.shadows.length} levels`,
          hero_section_spec: t.layout.frame_names[0] ? `Hero: ${t.layout.frame_names[0]}` : undefined,
          section_patterns: t.layout.frame_names,
        },
      },
    ],
  };
}
