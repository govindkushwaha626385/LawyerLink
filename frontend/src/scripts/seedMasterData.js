/**
 * seedMasterData.js
 * Run once with:  node src/scripts/seedMasterData.js
 * Or call seedAll() from a temporary React component / Admin panel.
 *
 * Uses the firebase-admin SDK – OR the same client SDK for browser execution.
 * Below is a browser-compatible version using the existing firebase.js config.
 */

import { db } from "../firebase";
import { collection, doc, setDoc, writeBatch } from "firebase/firestore";

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
  { advocate_registration_number: "MP/1024/2015", registration_date: "2015-04-12", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/4582/2010", registration_date: "2010-08-22", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/2291/2018", registration_date: "2018-01-15", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/0844/2005", registration_date: "2005-11-30", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/3310/2012", registration_date: "2012-06-19", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/5521/2020", registration_date: "2020-09-05", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/1177/2011", registration_date: "2011-03-14", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/6743/2016", registration_date: "2016-12-01", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/8820/2008", registration_date: "2008-05-22", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/4432/2014", registration_date: "2014-07-08", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/1099/2019", registration_date: "2019-02-28", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/5567/2013", registration_date: "2013-10-10", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/2241/2002", registration_date: "2002-04-20", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/9901/2017", registration_date: "2017-08-11", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/3382/2009", registration_date: "2009-11-15", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/7765/2021", registration_date: "2021-05-30", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/1256/2006", registration_date: "2006-03-12", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/4403/2015", registration_date: "2015-09-21", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/9928/2004", registration_date: "2004-01-18", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/6654/2018", registration_date: "2018-11-04", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/2210/2007", registration_date: "2007-06-25", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/5549/2014", registration_date: "2014-02-14", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/7732/2019", registration_date: "2019-12-05", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/1105/2010", registration_date: "2010-10-30", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/8831/2003", registration_date: "2003-07-20", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/4490/2016", registration_date: "2016-04-15", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/2258/2011", registration_date: "2011-08-09", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/9944/2022", registration_date: "2022-01-10", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/3341/2008", registration_date: "2008-09-17", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/6601/2015", registration_date: "2015-05-22", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/5512/2013", registration_date: "2013-11-11", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/1188/2009", registration_date: "2009-02-20", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/7760/2017", registration_date: "2017-06-05", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/2245/2014", registration_date: "2014-09-18", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/9933/2010", registration_date: "2010-01-25", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/4477/2021", registration_date: "2021-03-12", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/1122/2006", registration_date: "2006-07-07", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/6699/2019", registration_date: "2019-10-15", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/3355/2012", registration_date: "2012-12-20", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/8811/2005", registration_date: "2005-05-05", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/5544/2016", registration_date: "2016-08-30", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/2288/2008", registration_date: "2008-04-14", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/7711/2020", registration_date: "2020-02-02", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/1144/2011", registration_date: "2011-09-09", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/6622/2018", registration_date: "2018-11-11", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/3399/2004", registration_date: "2004-06-06", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/8855/2015", registration_date: "2015-01-01", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/5577/2013", registration_date: "2013-05-25", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/2200/2007", registration_date: "2007-10-10", email_id: "govindkushwaha6263@gmail.com" },
  { advocate_registration_number: "MP/7799/2022", registration_date: "2022-04-01", email_id: "govindkushwaha6263@gmail.com" },
];

/**
 * Seeds all courts and advocates master data into Firestore.
 * Call this from your Admin Panel seed button.
 * Uses batched writes for efficiency (max 500 per batch).
 */
export async function seedMasterData() {
  // ── Courts ──────────────────────────────────────────
  let batch = writeBatch(db);
  let count = 0;
  for (const court of courts) {
    // Use court_name (slug) as doc ID so re-runs are idempotent
    const id = court.court_name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    batch.set(doc(collection(db, "courts"), id), court);
    count++;
    if (count === 499) { await batch.commit(); batch = writeBatch(db); count = 0; }
  }
  await batch.commit();

  // ── Advocates master ────────────────────────────────
  batch = writeBatch(db);
  count = 0;
  for (const adv of advocates) {
    // Use registration number as doc ID (slashes replaced)
    const id = adv.advocate_registration_number.replace(/\//g, "_");
    batch.set(doc(collection(db, "advocates_master"), id), adv);
    count++;
    if (count === 499) { await batch.commit(); batch = writeBatch(db); count = 0; }
  }
  await batch.commit();

  console.log("✅ Master data seeded: courts & advocates_master");
  return true;
}
