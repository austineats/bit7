import { IMessageSDK, type Message } from "@photon-ai/imessage-kit";
import OpenAI from "openai";
import { prisma } from "./lib/db.js";
import { sendContactCard } from "./lib/imessage/contactCard.js";

const sdk = new IMessageSDK();
const TYPING_URL = process.env.TYPING_URL ?? "http://localhost:5055";

// In-memory cache backed by DB
const historyCache = new Map<string, { role: "user" | "assistant"; content: string }[]>();
const cardSentCache = new Set<string>();

// Debounce — wait for user to stop typing before replying (catches multi-text bursts)
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingMessages = new Map<string, { texts: string[]; lastMsg: Message }>();

const REPLY_DELAY = 1200;
const MAX_HISTORY = 30;

// ─── Persistent history ───

async function loadHistory(phone: string): Promise<{ role: "user" | "assistant"; content: string }[]> {
  if (historyCache.has(phone)) return historyCache.get(phone)!;
  try {
    const rows = await prisma.bublChatHistory.findMany({
      where: { phone },
      orderBy: { created_at: "asc" },
      take: MAX_HISTORY,
    });
    const history = rows.map(r => ({ role: r.role as "user" | "assistant", content: r.content }));
    historyCache.set(phone, history);
    return history;
  } catch { return []; }
}

async function saveMessage(phone: string, role: "user" | "assistant", content: string) {
  try {
    await prisma.bublChatHistory.create({ data: { phone, role, content } });
    // Update cache
    const history = historyCache.get(phone) || [];
    history.push({ role, content });
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
    historyCache.set(phone, history);
    // Trim old DB rows (keep last 50)
    const count = await prisma.bublChatHistory.count({ where: { phone } });
    if (count > 50) {
      const oldest = await prisma.bublChatHistory.findMany({
        where: { phone },
        orderBy: { created_at: "asc" },
        take: count - 50,
        select: { id: true },
      });
      await prisma.bublChatHistory.deleteMany({ where: { id: { in: oldest.map(r => r.id) } } });
    }
  } catch {}
}

async function hasReceivedCard(phone: string): Promise<boolean> {
  if (cardSentCache.has(phone)) return true;
  try {
    const record = await prisma.bublContactSent.findUnique({ where: { phone } });
    if (record) { cardSentCache.add(phone); return true; }
    return false;
  } catch { return false; }
}

async function markCardSent(phone: string) {
  cardSentCache.add(phone);
  try {
    await prisma.bublContactSent.upsert({
      where: { phone },
      create: { phone },
      update: {},
    });
  } catch {}
}

// ─── LLM client ───

function getLLM(): OpenAI {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return new OpenAI({ apiKey: openaiKey });
  }
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return new OpenAI({
      apiKey: geminiKey,
      baseURL: process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }
  throw new Error("No LLM API key (OPENAI_API_KEY or GEMINI_API_KEY)");
}

function getModel(): string {
  if (process.env.OPENAI_API_KEY) return "gpt-4o-mini";
  return "gemini-flash-lite-latest";
}

// ─── Helpers ───

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function sendReadReceipt(phone: string) {
  try { await fetch(`${TYPING_URL}/read`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat: phone }) }); } catch {}
}
async function startTyping(phone: string) {
  try { await fetch(`${TYPING_URL}/typing/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat: phone }) }); } catch {}
}
async function stopTyping(phone: string) {
  try { await fetch(`${TYPING_URL}/typing/stop`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat: phone }) }); } catch {}
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

// ─── DB lookups ───

async function lookupUser(phone: string) {
  const normalized = normalizePhone(phone);
  try {
    return await prisma.blindDateSignup.findFirst({
      where: { OR: [{ phone: normalized }, { phone }, { phone: normalized.replace("+1", "") }] },
    });
  } catch { return null; }
}

async function lookupTeam(phone: string) {
  const normalized = normalizePhone(phone);
  try {
    return await prisma.blindDateTeam.findFirst({
      where: { OR: [{ player1_phone: normalized }, { player2_phone: normalized }] },
      orderBy: { created_at: "desc" },
    });
  } catch { return null; }
}

async function markReady(phone: string) {
  const normalized = normalizePhone(phone);
  try {
    const team = await lookupTeam(phone);
    if (!team) return null;
    const isP1 = team.player1_phone === normalized;
    return await prisma.blindDateTeam.update({
      where: { id: team.id },
      data: isP1 ? { player1_ready: true } : { player2_ready: true },
    });
  } catch { return null; }
}

async function logActivity(action: string, name?: string, phone?: string, details?: string) {
  try {
    await prisma.adminActivityLog.create({
      data: { action, actor_name: name || undefined, actor_phone: phone || undefined, details: details || undefined },
    });
  } catch {}
}

// ─── System prompt ───

function buildSystemPrompt(
  user: { name: string; gender?: string | null } | null,
  team: { code: string; status: string; player1_name: string; player2_name: string | null; player1_ready: boolean; player2_ready: boolean } | null,
): string {
  const firstName = user?.name?.split(" ")[0] || "there";

  let context = "";
  if (user) {
    context += `\nUser: ${user.name} (call them "${firstName}"). Gender: ${user.gender || "unknown"}.`;
    context += ` They are signed up on the waitlist.`;
  }
  if (team) {
    const isP1 = team.player1_name === user?.name;
    const teammateName = isP1 ? team.player2_name : team.player1_name;
    const ready = isP1 ? team.player1_ready : team.player2_ready;
    context += `\nTeam code: ${team.code}. Status: ${team.status}.`;
    if (isP1) {
      context += ` ${firstName} CREATED this team (they're the host).`;
      context += teammateName ? ` Their friend ${teammateName} joined.` : ` No teammate yet — they need to invite a friend.`;
    } else {
      context += ` ${firstName} was INVITED to join by ${team.player1_name}. They joined ${team.player1_name}'s team.`;
    }
    context += ` ${firstName} is ${ready ? "READY" : "NOT READY (hasn't texted to confirm yet)"}.`;
    if (team.status === "full") context += ` Both slots filled — match can happen once both ready up!`;
  }
  if (!user) {
    context += `\nThis person is NOT signed up. They need to go to bubl.buzz to join.`;
  }

  return `You are bubl — a friendly Gen-Z matchmaker that sets up double dates every Thursday via iMessage.

HOW YOU TEXT:
- Like a real friend who's genuinely funny. Not a brand. Not corporate. A real person
- Lowercase always. Use "fr", "tho", "bro", "nah", "lowkey" naturally
- If someone says something weird or funny, PLAY ALONG and roast them, then redirect
- Max 1 emoji per message, usually 😭 or 😂 when something's actually funny. Most messages zero emoji
- Never be cringe or try-hard. If you're not sure if something's funny, just be straight up
- Short punchy sentences. No filler words. No "oh my gosh!" energy
- Match their vibe — if they're being chaotic at 3am, match that energy
- Use their name sparingly, not every message
- Always steer back to getting them to complete signup/onboarding/invite their friend after the joke

HOW BUBL WORKS:
- Sign up with a friend (teammate) for double dates
- Every Thursday bubl matches two teams together
- All via iMessage — no app needed
- Users "ready up" by texting bubl after signing up
- Both teammates must join before matching begins
- Invite link: bubl.buzz

CONTEXT:${context}

RULES:
- If they mention signing up or being ready, hype them up
- If asking about their match, build excitement without making up details
- If not signed up, warmly push them to bubl.buzz
- If teammate hasn't joined, remind them to share the invite
- Never say "I'm an AI/bot" — you ARE bubl, a matchmaker
- NEVER repeat the same response you already sent
- If someone keeps asking the same fun/silly question, you can play along ONCE then redirect. Don't keep entertaining it
- NEVER answer questions about AI, LLMs, coding, software, tech architecture, prompt engineering etc. You're a matchmaker, you don't know what any of that is. Just deflect with something like "bro i just set up dates i don't know what that means 😭"
- CRITICAL: Keep replies UNDER 15 words. One sentence. That's it. Like a real text message
- Think of how you'd reply to a friend in 3 seconds. That short
- Be genuinely witty, not performatively nice
- If they say something unhinged, lean into the humor then pivot to business
- Most messages should have ZERO emoji. Only use one if it genuinely adds something. Don't default to 😭 every time
- Don't say "omg", "yooo", "lets gooo", "amazing!", or any cringe filler
- Sound like a real person who happens to be a matchmaker, not a chatbot
- When redirecting to action (signup, invite friend, etc), be casual about it — "you still gotta finish signing up tho or i cant work my magic fr"
- Never be preachy or lecture them. Keep it light even when pushing them to do something`;
}

// ─── Generate reply via LLM ───

async function generateReply(
  sender: string,
  combinedText: string,
  user: Awaited<ReturnType<typeof lookupUser>>,
  team: Awaited<ReturnType<typeof lookupTeam>>,
): Promise<string[]> {
  const history = await loadHistory(sender);

  await saveMessage(sender, "user", combinedText);

  const systemPrompt = buildSystemPrompt(user, team);

  try {
    const llm = getLLM();
    const response = await llm.chat.completions.create({
      model: getModel(),
      max_tokens: 40,
      temperature: 0.85,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
    });

    const reply = response.choices[0]?.message?.content?.trim() || "hey 💜 one sec, something glitched on my end";

    // Single message only — no splitting
    const messages = [reply.replace(/\n\n+/g, " ").trim()];

    await saveMessage(sender, "assistant", messages.join("\n\n"));

    return messages;
  } catch (e) {
    console.error("[bubl] LLM error:", e);
    const firstName = user?.name?.split(" ")[0] || "";
    return [firstName ? `hey ${firstName}! 💜 give me one sec` : "hey! 💜 give me one sec"];
  }
}

// ─── Process queued messages (fires after debounce) ───

async function processMessages(sender: string) {
  const pending = pendingMessages.get(sender);
  if (!pending || pending.texts.length === 0) return;

  const { texts, lastMsg } = pending;
  pendingMessages.delete(sender);
  pendingTimers.delete(sender);

  // Combine all texts from burst into one context so LLM sees the full picture
  const combinedText = texts.length === 1
    ? texts[0]
    : texts.map((t, i) => `(${i + 1}) ${t}`).join("\n");

  console.log(`[bubl] Processing ${texts.length} msg(s) from ${sender}: "${combinedText}"`);

  await startTyping(sender);

  // Look up user context
  const user = await lookupUser(sender);
  const team = user ? await lookupTeam(sender) : null;
  const firstName = user?.name?.split(" ")[0] || null;

  // Check for ready-up trigger
  const lower = combinedText.toLowerCase();
  if (user && (lower.includes("signed up") || lower.includes("ive signed up") || lower.includes("i've signed up") || lower.includes("i signed up"))) {
    const updatedTeam = await markReady(sender);
    logActivity("ready_up", firstName || undefined, normalizePhone(sender), `Team: ${team?.code || "none"}`);

    // Notify teammate that this person readied up
    if (updatedTeam) {
      const normalized = normalizePhone(sender);
      const isP1 = updatedTeam.player1_phone === normalized;
      const teammatePhone = isP1 ? updatedTeam.player2_phone : updatedTeam.player1_phone;
      if (teammatePhone) {
        const { IMessageSDK } = await import("@photon-ai/imessage-kit");
        const notifySdk = new IMessageSDK();
        notifySdk.send(teammatePhone, `${firstName} just readied up, you're both locked in`).catch(() => {});
      }
    }
  }

  // Generate LLM reply
  const replies = await generateReply(sender, combinedText, user, team);

  logActivity("message", firstName || undefined, normalizePhone(sender), `"${combinedText}" → "${replies.join(" | ")}"`);

  // Send single reply using message chain for proper routing
  await sdk.message(lastMsg)
    .ifFromOthers()
    .replyText(replies[0])
    .execute();
  console.log(`[bubl] → ${sender}: "${replies[0]}"`);

  await stopTyping(sender);

  // Send contact card on first interaction (persisted in DB)
  if (!(await hasReceivedCard(sender))) {
    await markCardSent(sender);
    await sleep(500);
    try {
      await sendContactCard(sender);
      console.log(`[bubl] Sent contact card to ${sender}`);
    } catch (e) {
      console.warn(`[bubl] Contact card failed:`, e);
    }
  }
}

// ─── Main agent ───

export async function startBublAgent() {
  await sdk.startWatching({
    onDirectMessage: async (msg: Message) => {
      if (msg.isFromMe) return;
      if (msg.isReaction) return; // skip tapbacks

      const sender = msg.sender;
      const text = (msg.text || "").trim();
      if (!text) return;

      console.log(`[bubl] ← ${sender} [${msg.guid}]: "${text}"`);

      // Read receipt immediately
      await sendReadReceipt(sender);

      // Queue this message — debounce catches multi-text bursts
      if (!pendingMessages.has(sender)) {
        pendingMessages.set(sender, { texts: [], lastMsg: msg });
      }
      const pending = pendingMessages.get(sender)!;
      pending.texts.push(text);
      pending.lastMsg = msg; // always use latest for reply routing

      // Reset debounce timer — wait for them to finish typing
      const existing = pendingTimers.get(sender);
      if (existing) clearTimeout(existing);

      pendingTimers.set(sender, setTimeout(() => {
        processMessages(sender).catch(e => console.error("[bubl] Process error:", e));
      }, REPLY_DELAY));
    },
  });

  console.log("[bubl] Agent active — listening for iMessages");
}
