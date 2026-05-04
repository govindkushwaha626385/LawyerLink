// src/pages/SeedMasterData.js
// ⚠️  Admin-only page — accessible at /seed-master (remove route after seeding!)
import React, { useState } from "react";
import { db } from "../firebase";
import { collection, doc, writeBatch } from "firebase/firestore";

const firNumbers = [
  "FIR/2024/MP/JAB/001", "FIR/2024/MP/IND/042", "FIR/2024/MP/BHO/112",
  "FIR/2024/MP/GWA/215", "FIR/2024/MP/UJJ/098", "FIR/2024/MP/SAG/331",
  "FIR/2024/MP/REW/056", "FIR/2024/MP/SAT/129", "FIR/2024/MP/RAT/007",
  "FIR/2024/MP/CHI/442", "FIR/2024/MP/DEW/223", "FIR/2024/MP/VID/101",
  "FIR/2024/MP/BET/884", "FIR/2024/MP/MOR/556", "FIR/2024/MP/BHI/210",
  "FIR/2024/MP/SEH/019", "FIR/2024/MP/HOS/663", "FIR/2024/MP/KAT/447",
  "FIR/2024/MP/KHA/112", "FIR/2024/MP/KRG/338", "FIR/2024/MP/MAN/552",
  "FIR/2024/MP/SHI/089", "FIR/2024/MP/DAT/991", "FIR/2024/MP/GUN/224",
  "FIR/2024/MP/DAM/771", "FIR/2024/MP/TIK/003", "FIR/2024/MP/PAN/115",
  "FIR/2024/MP/SIN/664", "FIR/2024/MP/SID/442", "FIR/2024/MP/BAL/012",
  "FIR/2024/MP/DHA/339", "FIR/2024/MP/SHE/110", "FIR/2024/MP/JHA/557",
  "FIR/2024/MP/ALI/228", "FIR/2024/MP/SHA/996", "FIR/2024/MP/ANU/441",
  "FIR/2024/MP/UMA/002", "FIR/2024/MP/BUR/118", "FIR/2024/MP/ASH/335",
  "FIR/2024/MP/ALL/550", "FIR/2024/MP/KHA/221", "FIR/2024/MP/BHO/998",
  "FIR/2024/MP/IND/443", "FIR/2024/MP/GWA/116", "FIR/2024/MP/JAB/772",
  "FIR/2024/MP/UJJ/004", "FIR/2024/MP/SAG/119", "FIR/2024/MP/REW/332",
  "FIR/2024/MP/SAT/551", "FIR/2024/MP/KAT/220",
];

const courts = [
  { court_name: "Jabalpur District Court",             address: "South Civil Lines, Near High Court, Jabalpur, MP 482001" },
  { court_name: "Indore District & Sessions Court",    address: "Mahatma Gandhi Road, New Siyaganj, Indore, MP 452007" },
  { court_name: "Bhopal District Court",               address: "Arera Hills, Near Jail Road, Bhopal, MP 462011" },
  { court_name: "Gwalior District Court",              address: "City Center, Gwalior, MP 474011" },
  { court_name: "Ujjain District Court",               address: "Kshapanak Marg, Freeganj, Ujjain, MP 456010" },
  { court_name: "Sagar District & Sessions Court",     address: "Civil Lines, Sagar, MP 470001" },
  { court_name: "Rewa District Court",                 address: "Civil Lines, Near Commissioner Office, Rewa, MP 486001" },
  { court_name: "Satna District Court",                address: "Panna Road, Satna, MP 485001" },
  { court_name: "Ratlam District Court",               address: "Station Road, Ratlam, MP 457001" },
  { court_name: "Chhindwara District Court",           address: "Nagpur Road, Chhindwara, MP 480001" },
  { court_name: "Dewas District Court",                address: "Civil Lines, Dewas, MP 455001" },
  { court_name: "Vidisha District Court",              address: "Hospital Road, Vidisha, MP 464001" },
  { court_name: "Betul District Court",                address: "Link Road, Betul, MP 460001" },
  { court_name: "Morena District Court",               address: "Gwalior Road, Morena, MP 476001" },
  { court_name: "Bhind District Court",                address: "Lahar Road, Bhind, MP 477001" },
  { court_name: "Sehore District Court",               address: "Indore-Bhopal Road, Sehore, MP 466001" },
  { court_name: "Hoshangabad District Court",          address: "Kothi Bazar, Hoshangabad, MP 461001" },
  { court_name: "Katni District Court",                address: "Madhav Nagar, Katni, MP 483501" },
  { court_name: "Khandwa District Court",              address: "Civil Lines, Khandwa, MP 450001" },
  { court_name: "Khargone District Court",             address: "Sanawad Road, Khargone, MP 451001" },
  { court_name: "Mandsaur District Court",             address: "Station Road, Mandsaur, MP 458001" },
  { court_name: "Shivpuri District Court",             address: "Jhansi Road, Shivpuri, MP 473551" },
  { court_name: "Datia District Court",                address: "Civil Lines, Datia, MP 475661" },
  { court_name: "Guna District Court",                 address: "A.B. Road, Guna, MP 473001" },
  { court_name: "Damoh District Court",                address: "Jabalpur Road, Damoh, MP 470661" },
  { court_name: "Tikamgarh District Court",            address: "Civil Lines, Tikamgarh, MP 472001" },
  { court_name: "Panna District Court",                address: "Kishore Ganj, Panna, MP 488001" },
  { court_name: "Singrauli District Court",            address: "Waidhan, Singrauli, MP 486886" },
  { court_name: "Sidhi District Court",                address: "Collectorate Campus, Sidhi, MP 486661" },
  { court_name: "Balaghat District Court",             address: "Gondia Road, Balaghat, MP 481001" },
];

const advocates = [
  { advocate_registration_number: "MP/1024/2015", registration_date: "2015-04-12", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/4582/2010", registration_date: "2010-08-22", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/2291/2018", registration_date: "2018-01-15", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/0844/2005", registration_date: "2005-11-30", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/3310/2012", registration_date: "2012-06-19", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/5521/2020", registration_date: "2020-09-05", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/1177/2011", registration_date: "2011-03-14", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/6743/2016", registration_date: "2016-12-01", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/8820/2008", registration_date: "2008-05-22", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/4432/2014", registration_date: "2014-07-08", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/1099/2019", registration_date: "2019-02-28", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/5567/2013", registration_date: "2013-10-10", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/2241/2002", registration_date: "2002-04-20", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/9901/2017", registration_date: "2017-08-11", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/3382/2009", registration_date: "2009-11-15", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/7765/2021", registration_date: "2021-05-30", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/1256/2006", registration_date: "2006-03-12", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/4403/2015", registration_date: "2015-09-21", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/9928/2004", registration_date: "2004-01-18", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/6654/2018", registration_date: "2018-11-04", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/2210/2007", registration_date: "2007-06-25", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/5549/2014", registration_date: "2014-02-14", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/7732/2019", registration_date: "2019-12-05", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/1105/2010", registration_date: "2010-10-30", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/8831/2003", registration_date: "2003-07-20", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/4490/2016", registration_date: "2016-04-15", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/2258/2011", registration_date: "2011-08-09", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/9944/2022", registration_date: "2022-01-10", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/3341/2008", registration_date: "2008-09-17", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/6601/2015", registration_date: "2015-05-22", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/5512/2013", registration_date: "2013-11-11", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/1188/2009", registration_date: "2009-02-20", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/7760/2017", registration_date: "2017-06-05", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/2245/2014", registration_date: "2014-09-18", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/9933/2010", registration_date: "2010-01-25", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/4477/2021", registration_date: "2021-03-12", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/1122/2006", registration_date: "2006-07-07", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/6699/2019", registration_date: "2019-10-15", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/3355/2012", registration_date: "2012-12-20", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/8811/2005", registration_date: "2005-05-05", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/5544/2016", registration_date: "2016-08-30", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/2288/2008", registration_date: "2008-04-14", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/7711/2020", registration_date: "2020-02-02", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/1144/2011", registration_date: "2011-09-09", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/6622/2018", registration_date: "2018-11-11", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/3399/2004", registration_date: "2004-06-06", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/8855/2015", registration_date: "2015-01-01", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/5577/2013", registration_date: "2013-05-25", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/2200/2007", registration_date: "2007-10-10", email_id: "a9majorprojectgdjnm@gmail.com" },
  { advocate_registration_number: "MP/7799/2022", registration_date: "2022-04-01", email_id: "a9majorprojectgdjnm@gmail.com" },
];

async function batchWrite(collectionName, items, idFn) {
  let batch = writeBatch(db);
  let count = 0;
  for (const item of items) {
    const id = idFn(item);
    batch.set(doc(collection(db, collectionName), id), item);
    count++;
    if (count === 499) { await batch.commit(); batch = writeBatch(db); count = 0; }
  }
  await batch.commit();
}

export default function SeedMasterData() {
  const [status, setStatus]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  const handleSeed = async () => {
    setLoading(true); setStatus(""); setDone(false);
    try {
      setStatus("⏳ Seeding courts (30 records)…");
      await batchWrite(
        "courts", courts,
        c => c.court_name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()
      );
      setStatus("⏳ Seeding advocates_master (50 records)…");
      await batchWrite(
        "advocates_master", advocates,
        a => a.advocate_registration_number.replace(/\//g, "_")
      );
      setStatus("⏳ Seeding fir_numbers (50 records)…");
      await batchWrite(
        "fir_numbers", firNumbers.map(f => ({ fir_number: f })),
        f => f.fir_number.replace(/\//g, "_")
      );
      setStatus("✅ All master data seeded successfully!\n\n• courts: 30 documents\n• advocates_master: 50 documents\n• fir_numbers: 50 documents");
      setDone(true);
    } catch (e) {
      setStatus("❌ Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg,#f0f4ff,#fdf8ee)", padding: 40,
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: "white", borderRadius: 24, padding: "40px 48px",
        maxWidth: 520, width: "100%",
        boxShadow: "0 8px 40px rgba(26,39,68,0.12)",
        border: "1px solid rgba(26,39,68,0.06)"
      }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", color: "#1a2744", fontSize: "1.6rem", marginBottom: 8 }}>
          🗄️ Seed Master Data
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: 28 }}>
          This will push <strong>30 courts</strong> and <strong>50 advocate records</strong> into Firestore.
          This operation is <strong>idempotent</strong> — safe to run multiple times.
        </p>

        <button
          onClick={handleSeed}
          disabled={loading || done}
          style={{
            width: "100%", padding: "14px", borderRadius: 50, border: "none",
            background: done ? "#dcfce7" : "linear-gradient(135deg,#1a2744,#243460)",
            color: done ? "#16a34a" : "white",
            fontWeight: 700, fontSize: "0.95rem", cursor: loading || done ? "not-allowed" : "pointer",
            transition: "all 0.25s", opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "⏳ Seeding..." : done ? "✅ Done! Data is in Firestore." : "🚀 Seed All Master Data"}
        </button>

        {status && (
          <pre style={{
            marginTop: 24, background: "#f9fafb", border: "1px solid #e5e7eb",
            borderRadius: 12, padding: "16px 18px",
            fontSize: "0.82rem", color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.6
          }}>
            {status}
          </pre>
        )}

        {done && (
          <p style={{ marginTop: 16, fontSize: "0.78rem", color: "#9ca3af", textAlign: "center" }}>
            ⚠️ Remove this route from App.js after seeding is confirmed.
          </p>
        )}
      </div>
    </div>
  );
}
