/**
 * Blind Date API — signup endpoint for the waitlist.
 *
 * POST /api/blind-date/signup — multipart/form-data with name, phone, school_id (file)
 * GET  /api/blind-date/status/:phone — check signup status
 */
import { Router } from "express";
import multer from "multer";
import { prisma } from "../lib/db.js";
import { sendIMessage } from "../lib/imessage/imessageClient.js";
import { clearHistory } from "../bublAgent.js";

export const blindDateRouter = Router();

/** Log an admin activity */
async function logActivity(action: string, actor_name?: string, actor_phone?: string, details?: string) {
  try {
    await prisma.adminActivityLog.create({
      data: { action, actor_name: actor_name || null, actor_phone: actor_phone || null, details: details || null },
    });
  } catch (e) {
    console.warn("[AdminLog] Failed to log:", e);
  }
}

/** Pick a random bubl reply */
function bublWaitingReply(name: string): string {
  const replies = [
    `lets gooo ${name}!! 🔥 im curating your match rn but i can only match you once your friend has joined. send them the invite link!`,
    `yooo ${name}! 🎮 you're in the queue! once your teammate joins i'll start finding your match. tell them to hurry up lol`,
    `${name}!! welcome to bubl 💜 im getting everything ready but i need your friend to sign up first — share that invite link!`,
    `ayy ${name} 🫶 signed up and locked in! waiting on your teammate to join so i can start the matchmaking magic ✨`,
    `${name}! 🎯 you're on the list. get your friend to join through your invite link and i'll find you the perfect double date!`,
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

function friendJoinedReply(friendName: string): string {
  const replies = [
    `${friendName} just signed up! 🔥 you're both on the list now — i'm finding your matches!`,
    `yo ${friendName} joined your team! 🎮 you're all set, sit tight while i find your match`,
    `${friendName} is in!! 💜 both of you are locked in. match drop coming soon 👀`,
    `lets goo ${friendName} just joined! 🫶 your team is ready — i'll text you when i find your match`,
    `${friendName} signed up! ✨ team complete. working on finding the perfect double date for you two`,
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

/** Normalize phone to E.164 (+1XXXXXXXXXX) */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

// ---------------------------------------------------------------------------
// POST /signup
// ---------------------------------------------------------------------------

blindDateRouter.post("/signup", upload.none(), async (req, res) => {
  try {
    const { name, phone, age, school, gender, looking_for, hobbies } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ ok: false, error: "name and phone are required" });
    }

    const normalized = normalizePhone(phone);
    if (!normalized) {
      return res.status(400).json({ ok: false, error: "invalid phone number" });
    }

    // Check for existing signup
    const existing = await prisma.blindDateSignup.findUnique({
      where: { phone: normalized },
    });
    if (existing) {
      return res.status(409).json({
        ok: false,
        error: "you're already signed up!",
        status: existing.status,
      });
    }

    let parsedHobbies: string[] = [];
    try { parsedHobbies = hobbies ? JSON.parse(hobbies) : []; } catch { /* ignore */ }

    // Clear any orphaned chat history from previous signups
    await clearHistory(normalized);

    const signup = await prisma.blindDateSignup.create({
      data: {
        name: name.trim(),
        phone: normalized,
        age: age || null,
        school_id_url: school || null,
        gender: gender || null,
        looking_for: looking_for || null,
        hobbies: parsedHobbies,
        signup_ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.headers["cf-connecting-ip"] as string || req.ip || null,
        user_agent: req.headers["user-agent"] || null,
        referrer: req.headers["referer"] || null,
      },
    });

    // Count position in queue
    const position = await prisma.blindDateSignup.count({
      where: { status: "waiting", created_at: { lte: signup.created_at } },
    });

    // Create a team if no invite_code (player 1), or join existing team (player 2)
    const inviteCode = req.body.invite_code;
    let teamCode = "";

    if (inviteCode) {
      // Joining an existing team
      const team = await prisma.blindDateTeam.findUnique({ where: { code: inviteCode } });
      if (team && !team.player2_phone) {
        await prisma.blindDateTeam.update({
          where: { code: inviteCode },
          data: {
            player2_name: name.trim(),
            player2_phone: normalized,
            player2_gender: gender || null,
            status: "full",
          },
        });
        teamCode = inviteCode;
        console.log(`[BlindDate] ${name} joined team ${inviteCode}`);
        logActivity("team_joined", name.trim(), normalized, `Joined team ${inviteCode} (with ${team.player1_name})`);

        // Notify player 1 that their friend joined
        sendIMessage(team.player1_phone, friendJoinedReply(name.trim()))
          .catch(e => console.warn("[BlindDate] Failed to notify player 1:", e));
      }
    } else {
      // Create a new team (player 1)
      const code = Math.random().toString(36).slice(2, 6).toUpperCase();
      await prisma.blindDateTeam.create({
        data: {
          code,
          player1_name: name.trim(),
          player1_phone: normalized,
          player1_gender: gender || "boy",
        },
      });
      teamCode = code;
      console.log(`[BlindDate] ${name} created team ${code}`);
      logActivity("team_created", name.trim(), normalized, `Created team ${code}`);
    }

    // Log the signup
    logActivity("signup", name.trim(), normalized, `Position #${position}, team: ${teamCode || "none"}, school: ${school || "n/a"}`);
    console.log(`[BlindDate] New signup: ${name} (${normalized}), position #${position}`);

    // Push to Google Sheet (fire-and-forget)
    const sheetWebhook = process.env.GOOGLE_SHEET_WEBHOOK;
    if (sheetWebhook) {
      fetch(sheetWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: normalized,
          position,
          timestamp: new Date().toISOString(),
        }),
      }).catch((err) => console.warn("[BlindDate] Sheet webhook failed:", err));
    }

    return res.json({ ok: true, position, teamCode });
  } catch (e) {
    console.error("[BlindDate] Signup error:", e);
    return res.status(500).json({ ok: false, error: "something went wrong" });
  }
});

// ---------------------------------------------------------------------------
// GET /status/:phone
// ---------------------------------------------------------------------------

blindDateRouter.get("/status/:phone", async (req, res) => {
  const normalized = normalizePhone(req.params.phone);
  if (!normalized) {
    return res.status(400).json({ ok: false, error: "invalid phone number" });
  }

  const signup = await prisma.blindDateSignup.findUnique({
    where: { phone: normalized },
  });

  if (!signup) {
    return res.status(404).json({ ok: false, error: "not found" });
  }

  return res.json({
    ok: true,
    status: signup.status,
    name: signup.name,
  });
});

// ---------------------------------------------------------------------------
// GET /admin/signups — all signups for admin dashboard
// ---------------------------------------------------------------------------

blindDateRouter.get("/admin/signups", async (_req, res) => {
  const signups = await prisma.blindDateSignup.findMany({
    orderBy: { created_at: "desc" },
    take: 500,
  });
  return res.json({ ok: true, signups });
});

blindDateRouter.delete("/admin/signups/:id", async (req, res) => {
  try {
    const signup = await prisma.blindDateSignup.findUnique({ where: { id: req.params.id } });
    await prisma.blindDateSignup.delete({ where: { id: req.params.id } });
    if (signup?.phone) await clearHistory(signup.phone);
    logActivity("admin_delete", signup?.name || undefined, signup?.phone || undefined, `Deleted signup ${req.params.id}`);
    return res.json({ ok: true });
  } catch {
    return res.status(404).json({ ok: false, error: "not found" });
  }
});

blindDateRouter.delete("/admin/teams/:id", async (req, res) => {
  try {
    const team = await prisma.blindDateTeam.findUnique({ where: { id: req.params.id } });
    await prisma.blindDateTeam.delete({ where: { id: req.params.id } });
    if (team?.player1_phone) await clearHistory(team.player1_phone);
    if (team?.player2_phone) await clearHistory(team.player2_phone);
    logActivity("admin_delete", undefined, undefined, `Deleted team ${team?.code || req.params.id}`);
    return res.json({ ok: true });
  } catch {
    return res.status(404).json({ ok: false, error: "not found" });
  }
});

blindDateRouter.delete("/admin/activity/:id", async (req, res) => {
  try {
    await prisma.adminActivityLog.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch {
    return res.status(404).json({ ok: false, error: "not found" });
  }
});

blindDateRouter.delete("/admin/visits/:id", async (req, res) => {
  try {
    await prisma.siteAnalytics.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch {
    return res.status(404).json({ ok: false, error: "not found" });
  }
});

// ---------------------------------------------------------------------------
// GET /admin/teams — all teams for admin dashboard
// ---------------------------------------------------------------------------

blindDateRouter.get("/admin/teams", async (_req, res) => {
  const teams = await prisma.blindDateTeam.findMany({
    orderBy: { created_at: "desc" },
    take: 200,
  });
  return res.json({ ok: true, teams });
});

// ---------------------------------------------------------------------------
// POST /analytics — track page views
// ---------------------------------------------------------------------------

blindDateRouter.post("/analytics", async (req, res) => {
  try {
    const { event, path, referrer } = req.body;
    await prisma.siteAnalytics.create({
      data: {
        event: event || "visit",
        path: path || null,
        referrer: referrer || null,
        user_agent: req.headers["user-agent"] || null,
        ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.headers["cf-connecting-ip"] as string || req.ip || null,
      },
    });
    return res.json({ ok: true });
  } catch {
    return res.json({ ok: true }); // fail silently
  }
});

// ---------------------------------------------------------------------------
// GET /admin/analytics — site stats for admin
// ---------------------------------------------------------------------------

blindDateRouter.get("/admin/analytics", async (_req, res) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalVisits, todayVisits, weekVisits, activeLastHour] = await Promise.all([
    prisma.siteAnalytics.count(),
    prisma.siteAnalytics.count({ where: { created_at: { gte: today } } }),
    prisma.siteAnalytics.count({ where: { created_at: { gte: weekAgo } } }),
    prisma.siteAnalytics.count({
      where: { created_at: { gte: new Date(now.getTime() - 60 * 60 * 1000) } },
    }),
  ]);

  return res.json({ ok: true, totalVisits, todayVisits, weekVisits, activeLastHour });
});

// ---------------------------------------------------------------------------
// GET /admin/visits — raw visit logs with IP, user agent, path, referrer
// ---------------------------------------------------------------------------

blindDateRouter.get("/admin/visits", async (_req, res) => {
  const visits = await prisma.siteAnalytics.findMany({
    orderBy: { created_at: "desc" },
    take: 300,
  });
  return res.json({ ok: true, visits });
});

// ---------------------------------------------------------------------------
// GET /admin/activity — activity log for admin dashboard
// ---------------------------------------------------------------------------

blindDateRouter.get("/admin/activity", async (_req, res) => {
  const logs = await prisma.adminActivityLog.findMany({
    orderBy: { created_at: "desc" },
    take: 200,
  });
  return res.json({ ok: true, logs });
});

// ---------------------------------------------------------------------------
// POST /ready — user texts "i've signed up", bubl replies
// ---------------------------------------------------------------------------

blindDateRouter.post("/ready", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ ok: false, error: "phone required" });

    const normalized = normalizePhone(phone);
    if (!normalized) return res.status(400).json({ ok: false, error: "invalid phone" });

    const signup = await prisma.blindDateSignup.findUnique({ where: { phone: normalized } });
    if (!signup) return res.status(404).json({ ok: false, error: "not signed up" });

    // Find their team and mark ready
    const team = await prisma.blindDateTeam.findFirst({
      where: { OR: [{ player1_phone: normalized }, { player2_phone: normalized }] },
      orderBy: { created_at: "desc" },
    });

    if (team) {
      const isPlayer1 = team.player1_phone === normalized;
      await prisma.blindDateTeam.update({
        where: { id: team.id },
        data: isPlayer1 ? { player1_ready: true } : { player2_ready: true },
      });
    }

    let reply: string;
    if (team && team.status === "full") {
      reply = `${signup.name}!! both you and your teammate are locked in 🔥 im finding your match now. sit tight, match drop coming soon 👀`;
    } else {
      reply = bublWaitingReply(signup.name);
    }

    sendIMessage(normalized, reply)
      .catch(e => console.warn("[BlindDate] Ready reply failed:", e));

    logActivity("ready_up", signup.name, normalized, `Team: ${team?.code || "none"}, status: ${team?.status || "no team"}`);

    return res.json({ ok: true, reply });
  } catch (e) {
    console.error("[BlindDate] Ready error:", e);
    return res.status(500).json({ ok: false, error: "something went wrong" });
  }
});

// ---------------------------------------------------------------------------
// GET /team/:code — get team status (polled by invite page)
// ---------------------------------------------------------------------------

blindDateRouter.get("/team/:code", async (req, res) => {
  try {
    const team = await prisma.blindDateTeam.findUnique({
      where: { code: req.params.code },
    });
    if (!team) {
      return res.status(404).json({ ok: false, error: "team not found" });
    }
    return res.json({
      ok: true,
      team: {
        code: team.code,
        status: team.status,
        player1: { name: team.player1_name, gender: team.player1_gender, ready: team.player1_ready },
        player2: team.player2_name
          ? { name: team.player2_name, gender: team.player2_gender, ready: team.player2_ready }
          : null,
      },
    });
  } catch (e) {
    console.error("[BlindDate] Team fetch error:", e);
    return res.status(500).json({ ok: false, error: "something went wrong" });
  }
});

// ---------------------------------------------------------------------------
// OTP — send and verify codes via iMessage
// ---------------------------------------------------------------------------

// In-memory OTP store (replace with Redis in production)
const otpStore = new Map<string, { code: string; expires: number }>();

blindDateRouter.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ ok: false, error: "phone required" });

    const normalized = normalizePhone(phone);
    if (!normalized) return res.status(400).json({ ok: false, error: "invalid phone" });

    // Check if user exists
    const signup = await prisma.blindDateSignup.findUnique({ where: { phone: normalized } });
    if (!signup) {
      return res.status(404).json({ ok: false, error: "no account found with this number" });
    }

    // Generate 4-digit code
    const code = String(Math.floor(1000 + Math.random() * 9000));
    otpStore.set(normalized, { code, expires: Date.now() + 5 * 60 * 1000 }); // 5 min

    // Send OTP via bubl iMessage
    sendIMessage(normalized, `your bubl verification code is: ${code}`)
      .catch(e => console.warn("[OTP] iMessage send failed:", e));
    console.log(`[OTP] Code for ${normalized}: ${code}`);
    logActivity("otp_sent", signup.name, normalized, "OTP requested");

    return res.json({ ok: true });
  } catch (e) {
    console.error("[OTP] Send error:", e);
    return res.status(500).json({ ok: false, error: "something went wrong" });
  }
});

blindDateRouter.post("/verify-otp", async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ ok: false, error: "phone and code required" });

    const normalized = normalizePhone(phone);
    if (!normalized) return res.status(400).json({ ok: false, error: "invalid phone" });

    const stored = otpStore.get(normalized);
    if (!stored || stored.expires < Date.now()) {
      otpStore.delete(normalized!);
      return res.status(400).json({ ok: false, error: "code expired — request a new one" });
    }

    if (stored.code !== code) {
      return res.status(400).json({ ok: false, error: "wrong code" });
    }

    otpStore.delete(normalized);

    // Find the user
    const signup = await prisma.blindDateSignup.findUnique({ where: { phone: normalized } });
    logActivity("signin", signup?.name || undefined, normalized, "OTP verified, signed in");

    // Find their team
    const team = await prisma.blindDateTeam.findFirst({
      where: {
        OR: [{ player1_phone: normalized }, { player2_phone: normalized }],
      },
      orderBy: { created_at: "desc" },
    });

    return res.json({
      ok: true,
      user: {
        name: signup?.name,
        phone: normalized,
        teamCode: team?.code || null,
      },
    });
  } catch (e) {
    console.error("[OTP] Verify error:", e);
    return res.status(500).json({ ok: false, error: "something went wrong" });
  }
});
