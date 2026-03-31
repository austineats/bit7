import { useState, useRef } from "react";
import { Camera, Check, ChevronDown } from "lucide-react";
import { motion } from "motion/react";

type Step = "info" | "photos" | "interests" | "done";

const INTEREST_OPTIONS = [
  "hiking", "gym", "music", "cooking", "travel", "gaming",
  "reading", "art", "photography", "movies", "dancing", "yoga",
  "surfing", "skateboarding", "coffee", "boba", "anime", "fashion",
  "sports", "festivals", "dogs", "cats", "food", "nightlife",
];

const px = { fontFamily: "'Press Start 2P', monospace" };

export function SignupPage() {
  const [step, setStep] = useState<Step>("info");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [location, setLocation] = useState("");
  const [school, setSchool] = useState("");
  const [bio, setBio] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fmtPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  };

  const addPhoto = (f: File) => {
    if (photos.length >= 6) return;
    setPhotos(prev => [...prev, f]);
    const r = new FileReader();
    r.onload = (e) => setPhotoPreviews(prev => [...prev, e.target?.result as string]);
    r.readAsDataURL(f);
  };

  const removePhoto = (i: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== i));
    setPhotoPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : prev.length < 8 ? [...prev, interest] : prev
    );
  };

  const submit = async () => {
    setError("");
    setSubmitting(true);
    const fd = new FormData();
    fd.append("name", name.trim());
    fd.append("phone", phone.replace(/\D/g, ""));
    fd.append("age", age);
    fd.append("gender", gender);
    fd.append("looking_for", lookingFor);
    fd.append("location", location.trim());
    fd.append("school", school.trim());
    fd.append("bio", bio.trim());
    fd.append("interests", JSON.stringify(interests));
    photos.forEach(p => fd.append("photos", p));

    try {
      const res = await fetch("/api/bubl/profile", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "something went wrong"); setSubmitting(false); return; }
      setStep("done");
    } catch {
      setError("couldn't connect — try again");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen text-[#fff1e8]" style={{ ...px, background: "#0d0d1a" }}>
      {/* Pixel star field background */}
      <div className="fixed inset-0 z-0" style={{ background: "linear-gradient(180deg, #0d0d1a 0%, #1d2b53 100%)" }}>
        <div className="absolute w-1 h-1 bg-[#ffec27] top-[10%] left-[15%]" />
        <div className="absolute w-1 h-1 bg-[#fff1e8] top-[20%] left-[70%]" />
        <div className="absolute w-[2px] h-[2px] bg-[#29adff] top-[35%] left-[85%]" />
        <div className="absolute w-1 h-1 bg-[#ffec27] top-[50%] left-[25%]" />
        <div className="absolute w-1 h-1 bg-[#fff1e8] top-[65%] left-[55%]" />
        <div className="absolute w-[2px] h-[2px] bg-[#ff77a8] top-[80%] left-[40%]" />
        <div className="absolute w-1 h-1 bg-[#29adff] top-[15%] left-[45%]" />
        <div className="absolute w-1 h-1 bg-[#fff1e8] top-[75%] left-[90%]" />
      </div>

      <nav className="fixed top-0 w-full z-50 border-b-4 border-[#29adff] bg-[#1d2b53]/95 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-[#ff77a8] text-[14px]">bubl.</span>
          <span className="text-[#ffec27] text-[10px]">
            {step === "info" ? "[1/3]" : step === "photos" ? "[2/3]" : step === "interests" ? "[3/3]" : "[OK]"}
          </span>
        </div>
      </nav>

      <div className="relative z-10 max-w-lg mx-auto px-6 pt-24 pb-16">
        {/* Step 1: Basic Info */}
        {step === "info" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-[16px] text-[#fff1e8] leading-relaxed">LET'S SET<br />YOU UP</h1>
            <p className="text-[#c2c3c7] text-[9px] mt-2 mb-8">TAKES 30 SECONDS</p>

            <div className="space-y-5">
              <div>
                <label className="text-[9px] text-[#29adff] mb-2 block">NAME</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full border-4 border-[#29adff] bg-[#1d2b53] text-white text-[11px] px-3 py-3 placeholder-[#c2c3c7]/40 focus:outline-none focus:border-[#ffec27]"
                  style={px}
                  placeholder="FIRST NAME" />
              </div>
              <div>
                <label className="text-[9px] text-[#29adff] mb-2 block">PHONE</label>
                <input value={phone} onChange={e => setPhone(fmtPhone(e.target.value))}
                  className="w-full border-4 border-[#29adff] bg-[#1d2b53] text-white text-[11px] px-3 py-3 placeholder-[#c2c3c7]/40 focus:outline-none focus:border-[#ffec27]"
                  style={px}
                  placeholder="(949) 000-0000" inputMode="tel" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[9px] text-[#29adff] mb-2 block">AGE</label>
                  <input value={age} onChange={e => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    className="w-full border-4 border-[#29adff] bg-[#1d2b53] text-white text-[11px] px-3 py-3 placeholder-[#c2c3c7]/40 focus:outline-none focus:border-[#ffec27]"
                    style={px}
                    placeholder="18" inputMode="numeric" />
                </div>
                <div className="flex-1">
                  <label className="text-[9px] text-[#29adff] mb-2 block">GENDER</label>
                  <div className="relative">
                    <select value={gender} onChange={e => setGender(e.target.value)}
                      className="w-full border-4 border-[#29adff] bg-[#1d2b53] text-white text-[11px] px-3 py-3 appearance-none focus:outline-none focus:border-[#ffec27]"
                      style={px}>
                      <option value="" className="bg-[#1d2b53]">SELECT</option>
                      <option value="male" className="bg-[#1d2b53]">MALE</option>
                      <option value="female" className="bg-[#1d2b53]">FEMALE</option>
                      <option value="nonbinary" className="bg-[#1d2b53]">NB</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-3.5 w-4 h-4 text-[#29adff] pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[9px] text-[#29adff] mb-2 block">INTERESTED IN</label>
                <div className="relative">
                  <select value={lookingFor} onChange={e => setLookingFor(e.target.value)}
                    className="w-full border-4 border-[#29adff] bg-[#1d2b53] text-white text-[11px] px-3 py-3 appearance-none focus:outline-none focus:border-[#ffec27]"
                    style={px}>
                    <option value="" className="bg-[#1d2b53]">SELECT</option>
                    <option value="male" className="bg-[#1d2b53]">MEN</option>
                    <option value="female" className="bg-[#1d2b53]">WOMEN</option>
                    <option value="everyone" className="bg-[#1d2b53]">EVERYONE</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-3.5 w-4 h-4 text-[#29adff] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[9px] text-[#29adff] mb-2 block">LOCATION</label>
                <input value={location} onChange={e => setLocation(e.target.value)}
                  className="w-full border-4 border-[#29adff] bg-[#1d2b53] text-white text-[11px] px-3 py-3 placeholder-[#c2c3c7]/40 focus:outline-none focus:border-[#ffec27]"
                  style={px}
                  placeholder="IRVINE, CA" />
              </div>
              <div>
                <label className="text-[9px] text-[#29adff] mb-2 block">SCHOOL (OPTIONAL)</label>
                <input value={school} onChange={e => setSchool(e.target.value)}
                  className="w-full border-4 border-[#29adff] bg-[#1d2b53] text-white text-[11px] px-3 py-3 placeholder-[#c2c3c7]/40 focus:outline-none focus:border-[#ffec27]"
                  style={px}
                  placeholder="UCI, IVC..." />
              </div>
              <div>
                <label className="text-[9px] text-[#29adff] mb-2 block">BIO</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={200}
                  className="w-full border-4 border-[#29adff] bg-[#1d2b53] text-white text-[11px] px-3 py-3 placeholder-[#c2c3c7]/40 focus:outline-none focus:border-[#ffec27] resize-none"
                  style={px}
                  placeholder="A LIL ABOUT YOU..." />
                <p className="text-[8px] text-[#c2c3c7]/40 text-right mt-1">{bio.length}/200</p>
              </div>
            </div>

            <button onClick={() => {
              if (!name.trim() || !phone.trim() || !age || !gender || !lookingFor) {
                setError("fill in the required fields"); return;
              }
              setError(""); setStep("photos");
            }}
              className="w-full mt-6 py-3.5 border-4 border-[#00e436] bg-[#00e436] text-[#1d2b53] text-[11px] hover:brightness-110 transition"
              style={{ ...px, boxShadow: "4px 4px 0 #008751" }}>
              NEXT &gt;&gt;
            </button>
            {error && <p className="text-[#ff004d] text-[9px] text-center mt-3">{error}</p>}
          </motion.div>
        )}

        {/* Step 2: Photos */}
        {step === "photos" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-[16px] text-[#fff1e8] leading-relaxed">ADD PHOTOS</h1>
            <p className="text-[#c2c3c7] text-[9px] mt-2 mb-8">AT LEAST 1, UP TO 6</p>

            <div className="grid grid-cols-3 gap-3">
              {photoPreviews.map((src, i) => (
                <div key={i} className="aspect-[3/4] overflow-hidden relative group border-4 border-[#29adff]">
                  <img src={src} className="w-full h-full object-cover" />
                  <button onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-[#ff004d] border-2 border-[#ff004d] flex items-center justify-center text-white text-[10px] opacity-0 group-hover:opacity-100 transition"
                    style={px}>
                    X
                  </button>
                </div>
              ))}
              {photos.length < 6 && (
                <button onClick={() => fileRef.current?.click()}
                  className="aspect-[3/4] border-4 border-dashed border-[#29adff]/40 flex flex-col items-center justify-center gap-2 hover:border-[#29adff] transition">
                  <Camera className="w-6 h-6 text-[#29adff]/50" />
                  <span className="text-[8px] text-[#29adff]/50">ADD</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { if (e.target.files?.[0]) addPhoto(e.target.files[0]); e.target.value = ""; }} />

            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep("info")}
                className="flex-1 py-3.5 border-4 border-[#29adff] bg-[#1d2b53] text-[#29adff] text-[10px] transition hover:brightness-110"
                style={{ ...px, boxShadow: "4px 4px 0 #1d2b53" }}>
                &lt;&lt; BACK
              </button>
              <button onClick={() => {
                if (photos.length === 0) { setError("add at least 1 photo"); return; }
                setError(""); setStep("interests");
              }}
                className="flex-1 py-3.5 border-4 border-[#00e436] bg-[#00e436] text-[#1d2b53] text-[10px] hover:brightness-110 transition"
                style={{ ...px, boxShadow: "4px 4px 0 #008751" }}>
                NEXT &gt;&gt;
              </button>
            </div>
            {error && <p className="text-[#ff004d] text-[9px] text-center mt-3">{error}</p>}
          </motion.div>
        )}

        {/* Step 3: Interests */}
        {step === "interests" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-[16px] text-[#fff1e8] leading-relaxed">PICK YOUR<br />VIBES</h1>
            <p className="text-[#c2c3c7] text-[9px] mt-2 mb-8">SELECT UP TO 8</p>

            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map(interest => (
                <button key={interest} onClick={() => toggleInterest(interest)}
                  className={`px-3 py-2 text-[9px] transition ${
                    interests.includes(interest)
                      ? "bg-[#ff004d] border-4 border-[#ff004d] text-white"
                      : "bg-transparent border-4 border-[#29adff]/30 text-[#c2c3c7] hover:border-[#29adff]/60"
                  }`}
                  style={px}>
                  {interest.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep("photos")}
                className="flex-1 py-3.5 border-4 border-[#29adff] bg-[#1d2b53] text-[#29adff] text-[10px] transition hover:brightness-110"
                style={{ ...px, boxShadow: "4px 4px 0 #1d2b53" }}>
                &lt;&lt; BACK
              </button>
              <button onClick={submit} disabled={submitting}
                className="flex-1 py-3.5 border-4 border-[#00e436] bg-[#00e436] text-[#1d2b53] text-[10px] hover:brightness-110 disabled:opacity-50 transition"
                style={{ ...px, boxShadow: "4px 4px 0 #008751" }}>
                {submitting ? "WAIT..." : "FINISH >>"}
              </button>
            </div>
            {error && <p className="text-[#ff004d] text-[9px] text-center mt-3">{error}</p>}
          </motion.div>
        )}

        {/* Done */}
        {step === "done" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center pt-20">
            <div className="w-20 h-20 border-4 border-[#00e436] bg-[#00e436]/20 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-[#00e436]" />
            </div>
            <h1 className="text-[16px] text-[#00e436] leading-relaxed">YOU'RE IN</h1>
            <p className="text-[#c2c3c7] mt-4 text-[9px] leading-relaxed">
              BUBL WILL TEXT YOU ON<br />WEDNESDAY WITH YOUR MATCH
            </p>
            <p className="text-[#c2c3c7]/40 mt-6 text-[8px]">
              YOU CAN CLOSE THIS PAGE NOW
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
