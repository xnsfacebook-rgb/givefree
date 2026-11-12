// GiveFree — Give & Need, 100% free. Firebase (Auth + Firestore + Storage).
// Default language: English. Weekly limit: 2 posts / account / rolling 7 days.
// Firebase is loaded dynamically: if the Firebase CDN is unreachable,
// the whole page must NOT die — it falls back to demo data instead.
let F = null;
async function loadFirebase(){
  try{
    const [a, au, fs, st] = await Promise.all([
      import("firebase/app"), import("firebase/auth"),
      import("firebase/firestore"), import("firebase/storage")]);
    F = { ...a, ...au, ...fs, ...st };
    return true;
  }catch(e){ console.warn("Firebase CDN unreachable, running in demo mode:", e); return false; }
}

const WEEKLY_LIMIT = 2;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CATEGORIES = ["Furniture","Electronics","Clothing","Books","Toys","Kitchen","Baby & Kids","Sports","Other"];
const COUNTRIES = ["Vietnam","South Korea","United States","United Kingdom","Canada","Australia","Germany","France","Japan","Singapore","Thailand","Malaysia","Indonesia","Philippines","India","China","Taiwan","Hong Kong","Netherlands","Spain","Italy","Poland","Brazil","Mexico","New Zealand","Sweden","Norway","Denmark","Finland","Ireland","Portugal","Belgium","Switzerland","Austria","Greece","Turkey","Ukraine","Russia","South Africa","Nigeria","Kenya","Egypt","Morocco","Israel","UAE","Saudi Arabia","Pakistan","Bangladesh","Sri Lanka","Nepal","Myanmar","Cambodia","Laos","Mongolia","Kazakhstan","Argentina","Chile","Colombia","Peru","Venezuela","Ecuador","Other"];

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const isDemo = new URLSearchParams(location.search).has("demo");
const cfg = window.GIVEFREE_FIREBASE_CONFIG || {};
const configured = cfg.apiKey && !String(cfg.apiKey).includes("YOUR_");

let app=null, auth=null, db=null, storage=null;
let user=null, profile=null, items=[], currentTab="all", currentView="browse", currentItem=null, myWeeklyCount=0;

const DEMO_ITEMS = [
  {id:"d1",type:"give",title:"Wooden dining chair — good condition",category:"Furniture",condition:"Good",description:"Solid wood chair, no wobble. Pickup near District 1.",country:"Vietnam",city:"Ho Chi Minh City",ownerName:"Minh",status:"available",createdAt:Date.now()-86400000,imageUrl:""},
  {id:"d2",type:"give",title:"Baby stroller, lightly used",category:"Baby & Kids",condition:"Like new",description:"Foldable stroller, clean. Free to a family who needs it.",country:"South Korea",city:"Seoul",ownerName:"Hana",status:"available",createdAt:Date.now()-2*86400000,imageUrl:""},
  {id:"d3",type:"need",title:"Looking for a used laptop for study",category:"Electronics",condition:"Good",description:"Student needs any working laptop for online classes. Thank you!",country:"Vietnam",city:"Hanoi",ownerName:"Lan",status:"available",createdAt:Date.now()-3*86400000,imageUrl:""},
  {id:"d4",type:"give",title:"Box of children's books (English + Korean)",category:"Books",condition:"Good",description:"About 20 picture books, ages 3–7.",country:"United States",city:"Seattle",ownerName:"Alex",status:"available",createdAt:Date.now()-4*86400000,imageUrl:""},
  {id:"d5",type:"need",title:"Winter coat, size M",category:"Clothing",condition:"Good",description:"Need a warm coat before winter. Any dark colour is fine.",country:"South Korea",city:"Busan",ownerName:"Jihoon",status:"available",createdAt:Date.now()-5*86400000,imageUrl:""},
  {id:"d6",type:"give",title:"Rice cooker — works fine",category:"Kitchen",condition:"Good",description:"5-cup rice cooker, giving away because we got a new one.",country:"Vietnam",city:"Da Nang",ownerName:"Thu",status:"given",createdAt:Date.now()-6*86400000,imageUrl:""},
];

function fillCountries(sel, val=""){
  const first = sel.id==="filterCountry"
    ? '<option value="">🌍 All countries</option>'
    : '<option value="">Select country…</option>';
  sel.innerHTML = first + COUNTRIES.map(c=>`<option ${c===val?"selected":""}>${esc(c)}</option>`).join("");
}
fillCountries($("#filterCountry")); fillCountries($("#pCountry")); fillCountries($("#pfCountry"));

function timeAgo(ts){
  const t = ts?.toDate ? ts.toDate().getTime() : (typeof ts==="number" ? ts : Date.now());
  const d = Math.floor((Date.now()-t)/1000);
  if (d<3600) return Math.max(1,Math.floor(d/60))+" min ago";
  if (d<86400) return Math.floor(d/3600)+" h ago";
  return Math.floor(d/86400)+" d ago";
}
function statusLabel(it){
  if (it.status==="given") return "✓ Given";
  if (it.status==="received") return "✓ Received";
  if (it.status==="closed") return "Closed";
  return "Available";
}

async function init(){
  if (!configured && !isDemo) $("#setupBanner").hidden = false;
  if (configured){
    const fbOk = await loadFirebase();
    if (!fbOk){ $("#setupBanner").hidden = false; items = DEMO_ITEMS; renderItems(); renderAuth(); renderLimitNote(); bindUI(); return; }
    app = F.initializeApp(cfg); auth = F.getAuth(app); db = F.getFirestore(app); storage = F.getStorage(app);
    F.onAuthStateChanged(auth, async (u)=>{
      user = u;
      if (u){
        const snap = await F.getDoc(F.doc(db,"users",u.uid));
        profile = snap.exists() ? snap.data() : null;
        if (!profile || !profile.country) openProfile(true);
        await refreshWeeklyCount();
      } else { profile=null; myWeeklyCount=0; }
      renderAuth(); renderLimitNote(); renderItems();
    });
    const q = F.query(F.collection(db,"items"), F.orderBy("createdAt","desc"));
    F.onSnapshot(q, (s)=>{ items = s.docs.map(d=>({id:d.id, ...d.data()})); renderItems(); },
      ()=>{ items = DEMO_ITEMS; renderItems(); });
  } else {
    items = DEMO_ITEMS; renderItems(); renderAuth(); renderLimitNote();
  }
  bindUI();
}

function renderAuth(){
  const area = $("#authArea");
  if (!user){
    area.innerHTML = `<button class="btn btn-google" id="btnSignIn">Sign in with Google</button>`;
    $("#btnSignIn").onclick = signIn;
    return;
  }
  area.innerHTML = `<span class="user-chip">
      ${user.photoURL?`<img class="avatar" src="${esc(user.photoURL)}" alt="">`:""}
      <span>${esc(profile?.displayName || user.displayName || "User")}</span>
      <button id="btnProfile">Profile</button>
      <button id="btnSignOut">Sign out</button></span>`;
  $("#btnProfile").onclick = ()=>openProfile(false);
  $("#btnSignOut").onclick = ()=>F.signOut(auth);
}
async function signIn(){
  if (!configured){ alert("Firebase is not configured yet. Add your keys in firebase-config.js (see SETUP.md), or preview with ?demo=1."); return; }
  try { await F.signInWithPopup(auth, new F.GoogleAuthProvider()); }
  catch(e){ alert("Sign-in failed: "+e.message); }
}
function renderLimitNote(){
  const el = $("#limitNote");
  if (!user){ el.innerHTML = `Sign in to post. Each account can post <b>2 items per week</b>.`; return; }
  const left = Math.max(0, WEEKLY_LIMIT - myWeeklyCount);
  el.innerHTML = `You have posted <b>${myWeeklyCount}/2</b> this week — <b>${left} post${left===1?"":"s"} left</b> (rolling 7 days).`;
}
async function refreshWeeklyCount(){
  if (!user || !db) return;
  const since = new Date(Date.now()-WEEK_MS);
  const q = F.query(F.collection(db,"items"), F.where("ownerId","==",user.uid), F.where("createdAt",">=",since));
  const s = await F.getDocs(q); myWeeklyCount = s.size;
}
function profileComplete(){ return profile && profile.displayName && profile.country && profile.city; }

function filteredItems(){
  let list = items.slice();
  if (currentView==="mine") list = list.filter(i=>user && i.ownerId===user.uid);
  if (currentTab!=="all") list = list.filter(i=>i.type===currentTab);
  const c = $("#filterCountry").value, cat = $("#filterCategory").value, st = $("#filterStatus").value, q = $("#searchBox").value.trim().toLowerCase();
  if (c) list = list.filter(i=>i.country===c);
  if (cat) list = list.filter(i=>i.category===cat);
  if (st==="available") list = list.filter(i=>i.status==="available");
  if (q) list = list.filter(i=>(i.title+" "+i.description+" "+i.city).toLowerCase().includes(q));
  return list;
}
function renderItems(){
  const list = filteredItems();
  $("#resultCount").textContent = `${list.length} item${list.length===1?"":"s"}${currentView==="mine"?" (yours)":""}`;
  $("#emptyState").hidden = list.length>0;
  $("#itemsGrid").innerHTML = list.map(it=>{
    const isOwner = user && it.ownerId===user.uid;
    const badge = it.status!=="available" ? `<span class="badge badge-done">${esc(statusLabel(it))}</span>`
      : it.type==="give" ? `<span class="badge badge-give">🎁 Giving away</span>` : `<span class="badge badge-need">🙏 Needed</span>`;
    return `<article class="item">
      ${it.imageUrl?`<img class="thumb" src="${esc(it.imageUrl)}" alt="" loading="lazy">`:""}
      <div class="item-body">
        ${badge}
        <h3>${esc(it.title)}</h3>
        <p class="meta">${esc(it.category)} · ${esc(it.condition||"")} · 📍 ${esc(it.city)}, ${esc(it.country)} · ${timeAgo(it.createdAt)}</p>
        <p class="desc">${esc(it.description)}</p>
        <div class="item-foot">
          <span class="owner">by ${esc(it.ownerName||"Someone")}</span><span class="spacer"></span>
          ${isOwner && it.status==="available" ? `<button class="btn btn-sm btn-primary" data-mark="${it.id}">${it.type==="give"?"✓ Mark as given":"✓ Mark as received"}</button>`:""}
          <button class="btn btn-sm" data-view-item="${it.id}">Details</button>
        </div>
      </div></article>`;
  }).join("");
  document.querySelectorAll("[data-mark]").forEach(b=>b.onclick=()=>markDone(b.dataset.mark));
  document.querySelectorAll("[data-view-item]").forEach(b=>b.onclick=()=>showItem(b.dataset.viewItem));
}

function openPost(type){
  if (!configured && !isDemo){ alert("Firebase is not configured yet — add your keys first (SETUP.md), or preview with ?demo=1."); return; }
  if (!user){ alert("Please sign in with Google first."); if (configured) signIn(); return; }
  if (!profileComplete()){ openProfile(true); return; }
  if (myWeeklyCount>=WEEKLY_LIMIT){ alert(`Weekly limit reached: you already posted ${WEEKLY_LIMIT} items in the last 7 days. Please try again later.`); return; }
  document.querySelector(`input[name="ptype"][value="${type}"]`).checked = true;
  $("#postTitle").textContent = type==="give" ? "Offer an item" : "Ask for an item";
  $("#pCountry").value = profile.country; $("#pCity").value = profile.city||"";
  $("#weeklyInfo").textContent = `You have used ${myWeeklyCount} of ${WEEKLY_LIMIT} posts this week.`;
  $("#postErr").hidden = true;
  $("#postDialog").showModal();
}
function openProfile(firstTime){
  if (!user){ alert("Please sign in with Google first."); return; }
  $("#pfName").value = profile?.displayName || user.displayName || "";
  $("#pfCountry").value = profile?.country || "";
  $("#pfCity").value = profile?.city || "";
  $("#pfPhone").value = profile?.phone || "";
  $("#profileErr").hidden = true;
  $("#profileDialog").showModal();
}
function showItem(id){
  const it = items.find(x=>x.id===id); if (!it) return;
  currentItem = it;
  const isOwner = user && it.ownerId===user.uid;
  $("#itemDetail").innerHTML = `
    ${it.imageUrl?`<img class="detail-img" src="${esc(it.imageUrl)}" alt="">`:""}
    <h2 style="margin:12px 0 6px">${esc(it.title)}</h2>
    <p class="meta">${esc(it.type==="give"?"🎁 Giving away":"🙏 Needed")} · ${esc(it.category)} · ${esc(it.condition||"")} · ${esc(statusLabel(it))}</p>
    <p>${esc(it.description)}</p>
    <p class="meta">📍 ${esc(it.city)}, ${esc(it.country)} · Posted ${timeAgo(it.createdAt)} by ${esc(it.ownerName||"Someone")}</p>
    ${user && it.ownerPhone ? `<p>📞 Contact: ${esc(it.ownerPhone)}</p>` : ""}
    ${!user ? `<p class="muted">Sign in with Google to see the giver's contact details.</p>` : ""}`;
  $("#btnMarkGiven").hidden = !(isOwner && it.type==="give" && it.status==="available");
  $("#btnMarkReceived").hidden = !(isOwner && it.type==="need" && it.status==="available");
  $("#itemDialog").showModal();
}
async function markDone(id){
  const it = items.find(x=>x.id===id); if (!it) return;
  const label = it.type==="give" ? "given" : "received";
  if (!confirm(`Mark this item as ${label}? It will leave the available list.`)) return;
  if (isDemo || !db){ it.status = label; renderItems(); return; }
  await F.updateDoc(F.doc(db,"items",id), { status: label, updatedAt: F.serverTimestamp(), givenAt: F.serverTimestamp() });
}
async function submitPost(e){
  e.preventDefault();
  const err = $("#postErr");
  const type = document.querySelector('input[name="ptype"]:checked').value;
  const title = $("#pTitle").value.trim(), category = $("#pCategory").value,
    condition = $("#pCondition").value, country = $("#pCountry").value,
    city = $("#pCity").value.trim(), desc = $("#pDesc").value.trim(),
    imageUrlInput = $("#pImageUrl").value.trim();
  if (!title || !desc || !country || !city){ err.textContent="Please fill in all required fields."; err.hidden=false; return; }
  if (isDemo || !db){
    items.unshift({id:"local"+Date.now(), type, title, category, condition, description:desc, country, city, ownerId:user?.uid||"demo", ownerName:profile?.displayName||user?.displayName||"You", ownerPhone:profile?.phone||"", status:"available", createdAt:Date.now(), imageUrl:imageUrlInput});
    $("#postDialog").close(); e.target.reset(); renderItems();
    alert("Demo mode: item added locally only (not saved to Firebase)."); return;
  }
  if (myWeeklyCount>=WEEKLY_LIMIT){ err.textContent=`Weekly limit reached (${WEEKLY_LIMIT} posts / 7 days).`; err.hidden=false; return; }
  $("#btnSubmitPost").disabled = true; $("#btnSubmitPost").textContent = "Posting…";
  try {
    let imageUrl = imageUrlInput;
    const file = $("#pImage").files[0];
    if (file){
      const r = F.ref(storage, `items/${user.uid}/${Date.now()}-${file.name}`);
      await F.uploadBytes(r, file); imageUrl = await F.getDownloadURL(r);
    }
    await F.addDoc(F.collection(db,"items"), { type, title, category, condition, description:desc, country, city,
      imageUrl: imageUrl||"", ownerId:user.uid, ownerName:profile.displayName, ownerPhone:profile.phone||"",
      status:"available", createdAt:F.serverTimestamp(), updatedAt:F.serverTimestamp() });
    await refreshWeeklyCount(); renderLimitNote();
    $("#postDialog").close(); e.target.reset();
  } catch(ex){ err.textContent = "Could not post: "+ex.message; err.hidden=false; }
  finally { $("#btnSubmitPost").disabled=false; $("#btnSubmitPost").textContent="Post item"; }
}
async function saveProfile(e){
  e.preventDefault();
  const data = { displayName:$("#pfName").value.trim(), country:$("#pfCountry").value, city:$("#pfCity").value.trim(), phone:$("#pfPhone").value.trim(), email:user.email, photoURL:user.photoURL||"", updatedAt:F.serverTimestamp() };
  if (!data.displayName || !data.country || !data.city){ $("#profileErr").textContent="Please fill in name, country and city."; $("#profileErr").hidden=false; return; }
  if (!db){ profile=data; $("#profileDialog").close(); renderAuth(); return; }
  await F.setDoc(F.doc(db,"users",user.uid), {...data, createdAt:F.serverTimestamp()}, {merge:true});
  profile = {...profile, ...data}; $("#profileDialog").close(); renderAuth(); renderLimitNote();
}

function bindUI(){
  document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active")); t.classList.add("active");
    currentTab=t.dataset.tab; renderItems();
  });
  document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>{
    document.querySelectorAll(".nav-btn").forEach(x=>x.classList.remove("active")); b.classList.add("active");
    currentView=b.dataset.view;
    $("#view-browse").hidden = currentView==="how";
    $("#view-how").hidden = currentView!=="how";
    if (currentView==="mine" && !user){ alert("Sign in with Google to see your items."); }
    renderItems();
  });
  ["filterCountry","filterCategory","filterStatus"].forEach(id=>$("#"+id).addEventListener("change", renderItems));
  $("#searchBox").addEventListener("input", renderItems);
  $("#btnPostGive").onclick=()=>openPost("give");
  $("#btnPostNeed").onclick=()=>openPost("need");
  $("#btnEmptyPost").onclick=()=>openPost("give");
  $("#btnCancelPost").onclick=()=>$("#postDialog").close();
  $("#btnCancelProfile").onclick=()=>$("#profileDialog").close();
  $("#btnCloseItem").onclick=()=>$("#itemDialog").close();
  $("#btnMarkGiven").onclick=async()=>{ if(currentItem){ await markDone(currentItem.id); $("#itemDialog").close(); } };
  $("#btnMarkReceived").onclick=async()=>{ if(currentItem){ await markDone(currentItem.id); $("#itemDialog").close(); } };
  $("#postForm").addEventListener("submit", submitPost);
  $("#profileForm").addEventListener("submit", saveProfile);
}

init();
