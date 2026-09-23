const $=id=>document.getElementById(id);
const contentEl=$("content"),crumbEl=$("crumb"),worldListEl=$("worldList"),categoryListEl=$("categoryList"),sidebarEl=$("sidebar");
const searchInputEl=$("searchInput"),newEntryBtnEl=$("newEntryBtn"),menuBtnEl=$("menuBtn"),themeBtnEl=$("themeBtn"),importMdEl=$("importMd");
const DEFAULT_HOME={eyebrow:"✦ Personal character database",title:"Welcome to your",accent:"Archive.",description:"페르소나의 설정과 AI 채팅 프롬프트를 한곳에 보관하는 개인 위키."};
let homeSettings={...DEFAULT_HOME},state={posts:[],filterWorld:null,filterCategory:null,query:""},editingIndex=null,selectedImage=null,selectedGalleryFiles=[],galleryKeep=[],customCount=0;

function isOwnerMode(){const c=ghConfig();return !!(c.owner&&c.repo&&token())}
function postSlug(p){return String(p?.slug||p?._file||p?.codename||p?.name||"").replace(/^.*\//,"").replace(/\.md$/i,"")||"persona"}
function setHash(route){const next="#/"+route.replace(/^\/+/,"");if(location.hash!==next)history.pushState(null,"",next)}
function applyOwnerUI(){const owner=isOwnerMode();document.body.classList.toggle("owner-mode",owner);document.body.classList.toggle("viewer-mode",!owner);if(newEntryBtnEl)newEntryBtnEl.hidden=!owner;updateConnectUI()}
function routeFromHash(){const route=decodeURIComponent(location.hash.replace(/^#\/?/,""));if(!route||route==="home"){showHome(false);return}if(route==="personas"){showPersonas(false);return}const slug=route.replace(/^persona\//,"");const i=state.posts.findIndex(p=>postSlug(p)===slug);if(i>=0){showDetail(i,false);return}showHome(false)}

function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function imageRepoPath(src=""){return String(src||"").replace(/^\.\//,"").split(/[?#]/,1)[0]}
function parseFrontMatter(text,file=""){
 const normalized=String(text??"").replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n").trimStart();let meta={},body=normalized;
 if(normalized.startsWith("---")){const lines=normalized.split("\n"),closing=lines.findIndex((l,i)=>i>0&&l.trim()==="---");if(closing>0){body=lines.slice(closing+1).join("\n").trim();lines.slice(1,closing).forEach(line=>{const i=line.indexOf(":");if(i<0)return;const key=line.slice(0,i).trim().toLowerCase();let raw=line.slice(i+1).trim();if((raw.startsWith('"')&&raw.endsWith('"'))||(raw.startsWith("'")&&raw.endsWith("'")))raw=raw.slice(1,-1);meta[key]=(key==="tags"||key==="gallery")?raw.replace(/^\s*\[/,"").replace(/\]\s*$/,"").split(",").map(s=>s.trim().replace(/^['"]|['"]$/g,"")).filter(Boolean):raw})}}
 const sections=[],rx=/^(<!-- persona-archive:copy -->\n)?#\s+(.+)$/gm,matches=[...body.matchAll(rx)];matches.forEach((m,i)=>{const title=m[2].trim();sections.push({title,content:body.slice(m.index+m[0].length,i+1<matches.length?matches[i+1].index:body.length).trim(),type:(m[1]||/PROMPT|OOC/i.test(title))?"copy":"text"})});
 return {...meta,name:meta.name||"Untitled",native_name:meta.native_name||"",codename:meta.codename||"",world:meta.world||"",category:meta.category||"OTHER",image:meta.image||"",gallery:Array.isArray(meta.gallery)?meta.gallery:[],updated:meta.updated||"",updated_at:meta.updated_at||"",tags:Array.isArray(meta.tags)?meta.tags:[],sections,raw:text,_file:file};
}
async function decodeGhText(item){
 const raw=String(item?.content||"").replace(/\n/g,"");
 return new TextDecoder().decode(Uint8Array.from(atob(raw),c=>c.charCodeAt(0)))
}
async function loadPostsFromGitHub(){
 const idx=await ghGet("posts/index.json");
 if(!idx?.content)return [];
 const manifest=JSON.parse(await decodeGhText(idx));
 if(!Array.isArray(manifest))throw new Error("posts/index.json must be an array");
 const loaded=[];
 for(const file of manifest){
  try{
   const item=await ghGet(`posts/${file}`);
   if(!item?.content)throw new Error(`${file}: not found`);
   loaded.push(parseFrontMatter(await decodeGhText(item),file));
  }catch(e){console.warn("GitHub post load failed:",file,e)}
 }
 return loaded
}
async function loadPostsFromPages(){
 const stamp=Date.now();
 const r=await fetch(`posts/index.json?v=${stamp}`,{cache:"no-store"});
 if(!r.ok)throw new Error(`posts/index.json: ${r.status}`);
 const manifest=await r.json();
 if(!Array.isArray(manifest))throw new Error("posts/index.json must be an array");
 const loaded=[];
 for(const file of manifest){
  try{
   const safePath=String(file).split("/").map(encodeURIComponent).join("/");
   const x=await fetch(`posts/${safePath}?v=${stamp}`,{cache:"no-store"});
   if(!x.ok)throw new Error(`${file}: ${x.status}`);
   loaded.push(parseFrontMatter(await x.text(),file));
  }catch(e){console.warn("post load failed:",file,e)}
 }
 return loaded
}
async function loadAll(){
 showHome();updateConnectUI();
 try{
  if(isOwnerMode()){
   const item=await ghGet("config/home.json");
   if(item?.content)homeSettings={...DEFAULT_HOME,...JSON.parse(await decodeGhText(item))};
  }else{
   const hr=await fetch(`config/home.json?v=${Date.now()}`,{cache:"no-store"});
   if(hr.ok)homeSettings={...DEFAULT_HOME,...await hr.json()};
  }
  showHome();
 }catch(e){console.warn("home.json load failed:",e)}
 try{
  state.posts=isOwnerMode()?await loadPostsFromGitHub():await loadPostsFromPages();
 }catch(e){state.posts=[];console.warn("post index load failed:",e)}
 renderSide();applyOwnerUI();routeFromHash();
}
function initials(p){return(p.codename||p.name||"PA").slice(0,2).toUpperCase()}
function displayImageSrc(src=""){
 const path=imageRepoPath(src);if(!path)return "";
 if(isOwnerMode()&&!/^https?:/i.test(path)){const c=ghConfig();return `https://raw.githubusercontent.com/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/${encodeURIComponent(c.branch||"main")}/${path.split("/").map(encodeURIComponent).join("/")}?v=${Date.now()}`}
 return src
}
function art(p,cls="card-art"){const src=displayImageSrc(p.image);return`<div class="${cls}">${src?`<img src="${esc(src)}" alt="" onerror="this.remove();this.parentElement.textContent='${esc(initials(p))}'">`:esc(initials(p))}</div>`}
function card(p,i){return`<article class="persona-card" onclick="showDetail(${i})">${art(p)}<div class="card-body"><div class="card-world">${esc(p.world||"UNFILED")}</div><div class="card-name">${esc(p.name)}</div>${p.native_name?`<div class="card-native">${esc(p.native_name)}</div>`:""}<div class="card-code">${esc(p.codename)}</div></div></article>`}
function renderSide(){const categories=["MAIN","SUB","OTHER"];categoryListEl.innerHTML=categories.map(c=>`<button class="world-btn category-btn" data-category="${c}">⌞ ${c}</button>`).join("");categoryListEl.querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{state.filterCategory=b.dataset.category;state.filterWorld=null;showPersonas()});const worlds=[...new Set(state.posts.map(p=>p.world).filter(Boolean))].sort();worldListEl.innerHTML=worlds.map(w=>`<button class="world-btn" data-world="${esc(w)}">⌞ ${esc(w)}</button>`).join("");worldListEl.querySelectorAll("[data-world]").forEach(b=>b.onclick=()=>{state.filterWorld=b.dataset.world;state.filterCategory=null;showPersonas()})}
function setCrumb(s){crumbEl.textContent="ARCHIVE / "+String(s).toUpperCase()} function navActive(v){document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.view===v))}
function closeSide(){sidebarEl.classList.remove("open")}
function showHome(updateHash=true){if(updateHash)setHash("home");state.filterWorld=null;state.filterCategory=null;navActive("home");setCrumb("HOME");const h=homeSettings,recent=state.posts.map((p,i)=>({p,i})).sort((a,b)=>{const ak=a.p.updated_at||a.p.updated||"",bk=b.p.updated_at||b.p.updated||"";return bk.localeCompare(ak)}).slice(0,5);contentEl.innerHTML=`<section class="hero"><div class="eyebrow">${esc(h.eyebrow)}</div><h1>${esc(h.title)} <em>${esc(h.accent)}</em></h1><p>${esc(h.description)}</p><div class="stats"><span><b>${state.posts.length}</b> PERSONAS</span><span><b>${new Set(state.posts.map(p=>p.world).filter(Boolean)).size}</b> WORLDS</span></div></section>${isOwnerMode()?`<div class="home-edit-row"><button class="home-edit-btn" onclick="editHome()">✎ EDIT HOME</button></div>`:""}<div class="section-head"><h2>PERSONAS</h2><span>ARCHIVE INDEX</span></div><div class="card-grid">${state.posts.map(card).join("")}</div><div class="section-head"><h2>RECENTLY UPDATED</h2><span>LAST CHANGES</span></div><div class="recent-list">${recent.map(({p,i})=>`<div class="recent-row" onclick="showDetail(${i})"><span>◇ ${esc(p.name)} / ${esc(p.codename)}</span><span class="recent-date">${esc(p.updated||"—")}</span></div>`).join("")}</div>`;closeSide()}
function getFiltered(){const q=state.query.toLowerCase();return state.posts.map((p,i)=>({p,i})).filter(({p})=>{const hay=[p.name,p.native_name,p.codename,p.world,p.category,p.catchphrase,p.summary,...p.tags,...p.sections.map(s=>s.title+" "+s.content)].join(" ").toLowerCase();return(!q||hay.includes(q))&&(!state.filterWorld||p.world===state.filterWorld)&&(!state.filterCategory||p.category===state.filterCategory)})}
function showPersonas(updateHash=true){if(updateHash)setHash("personas");navActive("personas");setCrumb("PERSONAS");const list=getFiltered();contentEl.innerHTML=`<section class="hero"><div class="eyebrow">Archive Index</div><h1>Persona <em>Index</em></h1><p>${state.filterCategory?`CATEGORY · ${esc(state.filterCategory)}`:state.filterWorld?`WORLD · ${esc(state.filterWorld)}`:"전체 페르소나"}</p></section><div class="section-head"><h2>${list.length} ENTRIES</h2><span>${state.filterCategory||state.filterWorld||"ALL"}</span></div><div class="card-grid">${list.map(({p,i})=>card(p,i)).join("")||'<div class="empty">조건에 맞는 페르소나가 없습니다.</div>'}</div>`;closeSide()}
function profileGrid(p){return`<div class="profile-grid">${[["AGE",p.age],["GENDER",p.gender],["BIRTHDAY",p.birthday],["HEIGHT",p.height],["NATIONALITY",p.nationality],["PARTNER",p.partner]].map(([l,v])=>`<div class="profile-cell"><div class="profile-label">${l}</div><div class="profile-value ${v?"":"empty-value"}">${esc(v||"—")}</div></div>`).join("")}</div>`}
function galleryHtml(p){const items=(p.gallery||[]).filter(Boolean);if(!items.length)return "";return`<section class="persona-gallery"><div class="section-head"><h2>GALLERY</h2><span>${items.length} IMAGES</span></div><div class="gallery-grid">${items.map((src,gi)=>`<button type="button" class="gallery-item" data-gallery-index="${gi}" aria-label="Open ${esc(p.name)} gallery image ${gi+1}"><img src="${esc(displayImageSrc(src))}" alt="${esc(p.name)} gallery ${gi+1}" loading="lazy"></button>`).join("")}</div></section>`}
let lightboxItems=[],lightboxIndex=0;
function ensureGalleryLightbox(){
 if($("galleryLightbox"))return;
 const el=document.createElement("div");el.id="galleryLightbox";el.className="gallery-lightbox";el.hidden=true;
 el.innerHTML=`<button class="gallery-lightbox-close" aria-label="Close gallery">×</button><button class="gallery-lightbox-nav prev" aria-label="Previous image">‹</button><div class="gallery-lightbox-stage"><img alt="Gallery image"><div class="gallery-lightbox-count"></div></div><button class="gallery-lightbox-nav next" aria-label="Next image">›</button>`;
 document.body.appendChild(el);
 el.querySelector(".gallery-lightbox-close").onclick=closeGalleryLightbox;
 el.querySelector(".prev").onclick=e=>{e.stopPropagation();stepGalleryLightbox(-1)};
 el.querySelector(".next").onclick=e=>{e.stopPropagation();stepGalleryLightbox(1)};
 el.querySelector(".gallery-lightbox-stage").onclick=e=>e.stopPropagation();
 el.onclick=closeGalleryLightbox;
}
function openGalleryImageAt(index){
 ensureGalleryLightbox();
 lightboxItems=[...document.querySelectorAll(".gallery-grid .gallery-item img")].map(img=>img.currentSrc||img.src);
 if(!lightboxItems.length)return;
 lightboxIndex=Math.min(Math.max(Number(index)||0,0),lightboxItems.length-1);
 renderGalleryLightbox();
 const el=$("galleryLightbox");el.hidden=false;document.body.classList.add("lightbox-open");
}
function renderGalleryLightbox(){
 const el=$("galleryLightbox");if(!el||!lightboxItems.length)return;
 el.querySelector("img").src=lightboxItems[lightboxIndex];
 el.querySelector(".gallery-lightbox-count").textContent=`${lightboxIndex+1} / ${lightboxItems.length}`;
 const many=lightboxItems.length>1;el.querySelector(".prev").hidden=!many;el.querySelector(".next").hidden=!many;
}
function stepGalleryLightbox(dir){if(!lightboxItems.length)return;lightboxIndex=(lightboxIndex+dir+lightboxItems.length)%lightboxItems.length;renderGalleryLightbox()}
function closeGalleryLightbox(){const el=$("galleryLightbox");if(el)el.hidden=true;document.body.classList.remove("lightbox-open")}
document.addEventListener("keydown",e=>{const el=$("galleryLightbox");if(!el||el.hidden)return;if(e.key==="Escape")closeGalleryLightbox();else if(e.key==="ArrowLeft")stepGalleryLightbox(-1);else if(e.key==="ArrowRight")stepGalleryLightbox(1)});
document.addEventListener("click",e=>{const item=e.target.closest?.(".gallery-item[data-gallery-index]");if(!item)return;e.preventDefault();openGalleryImageAt(item.dataset.galleryIndex)});
function showDetail(i,updateHash=true){const p=state.posts[i];if(!p)return;if(updateHash)setHash("persona/"+encodeURIComponent(postSlug(p)));navActive("");setCrumb(p.codename||p.name);const sections=p.sections.map((s,si)=>{const prompt=s.type==="copy"||/PROMPT|OOC/i.test(s.title);return`<section class="doc-section"><h2>${esc(s.title)}</h2>${prompt?`<div class="prompt-box"><div class="prompt-top"><span>COPY SECTION</span><button class="copy-btn" onclick="copyPrompt(${i},${si},this)">COPY</button></div><pre>${esc(s.content)}</pre></div>`:`<div class="prose">${esc(s.content)}</div>`}</section>`}).join("");contentEl.innerHTML=`<button class="back-btn" onclick="showPersonas()">← BACK TO INDEX</button>${isOwnerMode()?`<div class="detail-tools"><button class="delete-entry-btn" onclick="deletePersona(${i})">DELETE ENTRY</button><button class="edit-entry-btn" onclick="editor(${i})">✎ EDIT ENTRY</button></div>`:""}<div class="detail-head">${art(p,"portrait")}<div class="detail-title"><div class="eyebrow">${esc(p.world||"UNFILED")}</div><div class="detail-name-block"><div class="code">${esc(p.codename)}</div><div class="detail-name-row"><h1>${esc(p.name)}</h1>${p.native_name?`<div class="native-name">${esc(p.native_name)}</div>`:""}</div></div><div class="detail-tags">${p.tags.map(t=>`<span class="tag-chip">#${esc(t)}</span>`).join("")}</div>${(p.catchphrase||p.summary)?`<div class="character-intro">${p.catchphrase?`<div class="character-catchphrase">${esc(p.catchphrase)}</div>`:""}${p.summary?`<div class="character-summary">${esc(p.summary)}</div>`:""}</div>`:""}</div></div>${profileGrid(p)}<div class="detail-body">${sections}</div>${galleryHtml(p)}`;window.scrollTo(0,0);closeSide()}
async function copyPrompt(i,si,b){await navigator.clipboard.writeText(state.posts[i].sections[si].content);b.textContent="COPIED";setTimeout(()=>b.textContent="COPY",1000)}
function field(id,label,val="",cls=""){return`<div class="field ${cls}"><label>${label}</label><input id="${id}" value="${esc(val||"")}"></div>`}
function editor(index=null){editingIndex=index;selectedImage=null;selectedGalleryFiles=[];const p=index===null?{tags:[],sections:[],gallery:[]}:state.posts[index];galleryKeep=[...(p.gallery||[])];navActive("");setCrumb(index===null?"NEW ENTRY":"EDIT ENTRY");contentEl.innerHTML=`<div class="editor-wrap"><div class="eyebrow">✦ Archive Editor</div><h1 class="editor-title">${index===null?"New":"Edit"} Persona</h1><div class="form-grid">${field("name","NAME",p.name)}${field("native_name","NATIVE NAME",p.native_name)}${field("codename","CODENAME",p.codename)}${field("world","WORLD",p.world)}<div class="field"><label>CATEGORY</label><select id="category"><option value="MAIN" ${((p.category||"OTHER")==="MAIN")?"selected":""}>MAIN</option><option value="SUB" ${((p.category||"OTHER")==="SUB")?"selected":""}>SUB</option><option value="OTHER" ${((p.category||"OTHER")==="OTHER")?"selected":""}>OTHER</option></select></div>${field("tags","TAGS · comma separated",(p.tags||[]).join(", "))}${field("catchphrase","CATCHPHRASE · one line",p.catchphrase,"full")}<div class="field full"><label>SHORT DESCRIPTION</label><textarea id="summary" placeholder="캐릭터를 짧게 소개하는 설명을 입력하세요.">${esc(p.summary||"")}</textarea></div>
<div class="image-picker"><div class="image-preview" id="imagePreview">${p.image?`<img src="${esc(p.image)}" onerror="this.remove();this.parentElement.textContent='NO IMAGE'">`:"NO IMAGE"}</div><div><div class="field"><label>CHARACTER IMAGE</label><button type="button" class="action-btn" onclick="$('imageFile').click()">UPLOAD IMAGE</button><input id="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></div><div class="editor-note">PNG / JPG / WEBP / GIF · SAVE TO GITHUB 시 assets/characters에 함께 업로드됩니다.</div></div></div>
<div class="editor-subhead">GALLERY</div><div class="gallery-editor field full"><div class="gallery-editor-head"><div><label>ADDITIONAL IMAGES</label><div class="editor-note">전신 · B컷 · 표정차분 등 여러 장을 추가할 수 있습니다.</div></div><button type="button" class="action-btn" onclick="$('galleryFiles').click()">＋ ADD IMAGES</button><input id="galleryFiles" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden></div><div id="galleryEditorGrid" class="gallery-editor-grid"></div></div><div class="editor-subhead">PROFILE</div>${field("age","AGE",p.age)}${field("gender","GENDER",p.gender)}${field("birthday","BIRTHDAY",p.birthday)}${field("height","HEIGHT",p.height)}${field("nationality","NATIONALITY",p.nationality)}${field("partner","PARTNER",p.partner)}
<div class="editor-subhead">FREE SECTIONS</div><div id="sectionsHost" class="field full"></div></div><div class="editor-actions"><button class="action-btn" onclick="addSection()">＋ ADD SECTION</button><button class="action-btn" onclick="addCopySection()">⧉ ADD COPY SECTION</button><button class="action-btn primary" onclick="savePersonaToGitHub()">SAVE ENTRY</button><button class="action-btn" onclick="previewEditor()">PREVIEW</button></div><div class="save-status" id="saveStatus"></div></div>`;
(p.sections||[]).forEach(s=>addSection(s.title,s.content,s.type||(/PROMPT|OOC/i.test(s.title)?"copy":"text")));if(!p.sections?.length){addSection("CHARACTER","");addSection("BACKGROUND","");addCopySection("CHARACTER PROMPT","")}
$("imageFile").onchange=e=>{selectedImage=e.target.files[0]||null;if(selectedImage){const u=URL.createObjectURL(selectedImage);$("imagePreview").innerHTML=`<img src="${u}">`}};$("galleryFiles").onchange=e=>{selectedGalleryFiles.push(...[...e.target.files]);renderGalleryEditor();e.target.value=""};renderGalleryEditor();closeSide()}

function renderGalleryEditor(){const host=$("galleryEditorGrid");if(!host)return;const existing=galleryKeep.map((src,i)=>`<div class="gallery-edit-item"><img src="${esc(displayImageSrc(src))}"><button type="button" onclick="removeGalleryExisting(${i})">REMOVE</button></div>`);const fresh=selectedGalleryFiles.map((f,i)=>`<div class="gallery-edit-item"><img src="${URL.createObjectURL(f)}"><button type="button" onclick="removeGalleryNew(${i})">REMOVE</button></div>`);host.innerHTML=[...existing,...fresh].join("")||`<div class="gallery-empty">NO GALLERY IMAGES</div>`}
function removeGalleryExisting(i){galleryKeep.splice(i,1);renderGalleryEditor()}
function removeGalleryNew(i){selectedGalleryFiles.splice(i,1);renderGalleryEditor()}
function moveSection(btn,direction){const item=btn.closest(".custom-section"),host=$("sectionsHost");if(!item||!host)return;if(direction<0){const prev=item.previousElementSibling;if(prev)host.insertBefore(item,prev)}else{const next=item.nextElementSibling;if(next)host.insertBefore(next,item)}updateSectionMoveButtons()}
function updateSectionMoveButtons(){const items=[...document.querySelectorAll("#sectionsHost .custom-section")];items.forEach((item,i)=>{const up=item.querySelector(".move-section-up"),down=item.querySelector(".move-section-down");if(up)up.disabled=i===0;if(down)down.disabled=i===items.length-1})}
function addSection(title="",body="",type="text"){const wrap=document.createElement("div");wrap.className=`custom-section ${type==="copy"?"copy-section-editor":""}`;wrap.dataset.type=type;wrap.innerHTML=`<div class="section-kind">${type==="copy"?"COPY SECTION":"TEXT SECTION"}</div><input class="section-title" placeholder="SECTION TITLE" value="${esc(title)}"><div class="section-controls"><button type="button" class="move-section move-section-up" onclick="moveSection(this,-1)" aria-label="Move section up" title="Move up">↑</button><button type="button" class="move-section move-section-down" onclick="moveSection(this,1)" aria-label="Move section down" title="Move down">↓</button><button type="button" class="remove-section" onclick="this.closest('.custom-section').remove();updateSectionMoveButtons()" aria-label="Remove section" title="Remove">✕</button></div><textarea class="section-body" placeholder="내용을 입력하세요.">${esc(body)}</textarea>`;$("sectionsHost").appendChild(wrap);updateSectionMoveButtons()}
function addCopySection(title="",body=""){addSection(title,body,"copy")}
function slugify(s){return String(s||"persona").trim().toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9가-힣_-]/g,"").replace(/-+/g,"-")||"persona"}
function formData(){const v=id=>$(id)?.value.trim()||"";return{name:v("name"),native_name:v("native_name"),codename:v("codename"),world:v("world"),category:v("category")||"OTHER",tags:v("tags").split(",").map(x=>x.trim()).filter(Boolean),age:v("age"),gender:v("gender"),birthday:v("birthday"),height:v("height"),nationality:v("nationality"),partner:v("partner"),catchphrase:v("catchphrase"),summary:v("summary"),sections:[...document.querySelectorAll(".custom-section")].map(x=>({title:x.querySelector(".section-title").value.trim(),content:x.querySelector(".section-body").value.trim(),type:x.dataset.type||"text"})).filter(x=>x.title)}}
function buildMd(imagePath="",entrySlug="",galleryPaths=null){const d=formData(),old=editingIndex!==null?state.posts[editingIndex]:null,img=imagePath||old?.image||"",gallery=galleryPaths??old?.gallery??[],slug=entrySlug||old?.slug||postSlug(old)||slugify([d.world,d.codename||d.name].filter(Boolean).join("-"));return`---\nname: ${d.name}\nnative_name: ${d.native_name}\ncodename: ${d.codename}\nworld: ${d.world}\ncategory: ${d.category}\nslug: ${slug}\ntags: [${d.tags.join(", ")}]\nimage: ${img}\ngallery: [${gallery.join(", ")}]\nupdated: ${new Date().toISOString().slice(0,10)}\nupdated_at: ${new Date().toISOString()}\nage: ${d.age}\ngender: ${d.gender}\nbirthday: ${d.birthday}\nheight: ${d.height}\nnationality: ${d.nationality}\npartner: ${d.partner}\ncatchphrase: ${d.catchphrase}\nsummary: ${d.summary.replace(/\n/g," ")}\n---\n\n${d.sections.map(s=>`${s.type==="copy"?"<!-- persona-archive:copy -->\n":""}# ${s.title}\n${s.content}`).join("\n\n")}\n`}
function downloadMd(){const d=formData(),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([buildMd()],{type:"text/markdown;charset=utf-8"}));a.download=slugify(d.codename||d.name)+".md";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function previewEditor(){const p=parseFrontMatter(buildMd());state.posts.push(p);showDetail(state.posts.length-1);state.posts.pop()}
function editHome(){navActive("");setCrumb("EDIT HOME");const h=homeSettings;contentEl.innerHTML=`<div class="editor-wrap"><div class="eyebrow">✦ Archive Settings</div><h1 class="editor-title">Edit Home</h1><div class="form-grid">${field("homeEyebrow","EYEBROW",h.eyebrow,"full")}${field("homeTitle","TITLE",h.title)}${field("homeAccent","ACCENT · violet text",h.accent)}<div class="field full"><label>DESCRIPTION</label><textarea id="homeDescription">${esc(h.description)}</textarea></div></div><div class="editor-actions"><button class="action-btn primary" onclick="saveHomeToGitHub()">SAVE TO GITHUB</button><button class="action-btn" onclick="showHome()">CANCEL</button></div><div class="save-status" id="saveStatus"></div></div>`}
function ghConfig(){try{return JSON.parse(localStorage.getItem("personaArchiveGithub")||"{}")}catch(e){return{}}}
function token(){return sessionStorage.getItem("personaArchiveToken")||""}
function updateConnectUI(){const c=ghConfig(),ok=!!(c.owner&&c.repo&&token());$("githubBtn").textContent=ok?"GITHUB · CONNECTED":"GITHUB · CONNECT";$("githubBtn").classList.toggle("connected",ok)}
function openGitHub(){const c=ghConfig();$("ghOwner").value=c.owner||"";$("ghRepo").value=c.repo||"";$("ghBranch").value=c.branch||"main";$("ghToken").value="";$("githubModal").hidden=false}
function requireGitHub(){const c=ghConfig();if(!c.owner||!c.repo||!token()){openGitHub();throw new Error("GitHub 연결이 필요합니다.")}return c}
async function ghRequest(path,opts={}){const c=requireGitHub(),r=await fetch(`https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/${path}`,{cache:"no-store",...opts,headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${token()}`,"X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json",...(opts.headers||{})}});if(!r.ok){let msg="";try{msg=(await r.json()).message}catch(e){}throw new Error(`GitHub ${r.status}: ${msg||r.statusText}`)}return r.json()}
async function ghGet(path){try{const sep=String(path).includes("?")?"&":"?";return await ghRequest(path+`${sep}ref=${encodeURIComponent(ghConfig().branch||"main")}&_=${Date.now()}-${Math.random().toString(36).slice(2)}`,{cache:"no-store"})}catch(e){if(String(e.message).includes("404"))return null;throw e}}
function utf8b64(s){const bytes=new TextEncoder().encode(s);let bin="";bytes.forEach(b=>bin+=String.fromCharCode(b));return btoa(bin)}
async function fileB64(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]);r.onerror=rej;r.readAsDataURL(file)})}
async function ghPut(path,contentB64,message){let lastError;for(let attempt=0;attempt<4;attempt++){const old=await ghGet(path);try{return await ghPutWithSha(path,contentB64,message,old?.sha)}catch(e){lastError=e;if(!String(e.message).includes("GitHub 409"))throw e;await new Promise(r=>setTimeout(r,500*(attempt+1)))}}throw lastError}
async function ghPutWithSha(path,contentB64,message,sha){const c=requireGitHub(),body={message,content:contentB64,branch:c.branch||"main"};if(sha)body.sha=sha;return ghRequest(path,{method:"PUT",body:JSON.stringify(body)})}
async function updatePersonaIndex(mutator,message){let lastError;for(let attempt=0;attempt<3;attempt++){const idx=await ghGet("posts/index.json");let list=[];if(idx?.content)list=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(idx.content.replace(/\n/g,"")),c=>c.charCodeAt(0))));const next=mutator([...list]);try{return await ghPutWithSha("posts/index.json",utf8b64(JSON.stringify(next,null,2)+"\n"),message,idx?.sha)}catch(e){lastError=e;if(!String(e.message).includes("GitHub 409"))throw e;await new Promise(r=>setTimeout(r,350*(attempt+1)))}}throw lastError}
async function ghDelete(path,message){const c=requireGitHub();let lastError;for(let attempt=0;attempt<3;attempt++){const old=await ghGet(path);if(!old?.sha)return false;try{await ghRequest(path,{method:"DELETE",body:JSON.stringify({message,sha:old.sha,branch:c.branch||"main"})});return true}catch(e){lastError=e;if(!String(e.message).includes("GitHub 409"))throw e;await new Promise(r=>setTimeout(r,350*(attempt+1)))}}throw lastError}
function showToast(message){let t=document.getElementById("archiveToast");if(!t){t=document.createElement("div");t.id="archiveToast";t.className="archive-toast";document.body.appendChild(t)}t.textContent=message;t.classList.add("show");clearTimeout(showToast._timer);showToast._timer=setTimeout(()=>t.classList.remove("show"),2600)}
async function deletePersona(i){const p=state.posts[i];if(!p)return;const filename=p._file;if(!filename){alert("이 게시글의 파일명을 확인할 수 없어 삭제하지 않았습니다.");return}const ok=confirm(`“${p.name}”을(를) 정말 삭제할까요?\n\n게시글은 Archive에서 제거되며, 전용 업로드 이미지가 다른 게시글에서 사용되지 않는 경우 이미지도 함께 삭제됩니다.`);if(!ok)return;try{requireGitHub();const btn=document.querySelector(".delete-entry-btn");if(btn){btn.disabled=true;btn.textContent="DELETING…"}
 await updatePersonaIndex(list=>list.filter(f=>f!==filename),`Remove persona from index: ${p.name}`);
 await ghDelete(`posts/${filename}`,`Delete persona: ${p.name}`);
 const imagePath=imageRepoPath(p.image);const imageShared=imagePath&&state.posts.some((other,oi)=>oi!==i&&imageRepoPath(other.image)===imagePath);if(imagePath.startsWith("assets/characters/")&&!imageShared)await ghDelete(imagePath,`Delete image: ${p.name}`);
 for(const gsrc of (p.gallery||[])){const gp=imageRepoPath(gsrc);const shared=state.posts.some((other,oi)=>oi!==i&&(other.gallery||[]).some(x=>imageRepoPath(x)===gp));if(gp.startsWith("assets/characters/")&&!shared)await ghDelete(gp,`Delete gallery image: ${p.name}`)}
 state.posts.splice(i,1);renderSide();showHome();showToast(`“${p.name}” 삭제 완료! 이 화면에는 즉시 반영되었습니다.`)
 }catch(e){alert(`삭제하지 못했습니다.\n${e.message}`);showDetail(i)}}
async function uniquePersonaSlug(d){const base=slugify([d.world,d.codename||d.name].filter(Boolean).join("-"))||"persona";let candidate=base,n=2;while(state.posts.some(p=>postSlug(p)===candidate)||await ghGet(`posts/${candidate}.md`)){candidate=`${base}-${n++}`}return candidate}
async function savePersonaToGitHub(){const status=$("saveStatus");try{status.textContent="게시글과 이미지를 GitHub에 저장 중…";const d=formData(),old=editingIndex!==null?state.posts[editingIndex]:null;const entrySlug=old?(old.slug||postSlug(old)):await uniquePersonaSlug(d);let filename=old?(old._file||entrySlug+".md"):(entrySlug+".md"),imagePath=old?.image||"";
 if(selectedImage){const ext=(selectedImage.name.split(".").pop()||"webp").toLowerCase().replace(/[^a-z0-9]/g,"");const repoImagePath=`assets/characters/${entrySlug}.${ext}`;await ghPut(repoImagePath,await fileB64(selectedImage),`Update image: ${d.name}`);imagePath=`${repoImagePath}?v=${Date.now()}`}
 let galleryPaths=[...galleryKeep];const galleryStamp=Date.now();for(let gi=0;gi<selectedGalleryFiles.length;gi++){const f=selectedGalleryFiles[gi],ext=(f.name.split(".").pop()||"webp").toLowerCase().replace(/[^a-z0-9]/g,"");const gp=`assets/characters/${entrySlug}-gallery-${galleryStamp}-${gi+1}.${ext}`;await ghPut(gp,await fileB64(f),`Add gallery image: ${d.name}`);galleryPaths.push(`${gp}?v=${galleryStamp}`)}
 if(old){for(const removed of (old.gallery||[]).filter(x=>!galleryKeep.includes(x))){const rp=imageRepoPath(removed);if(rp.startsWith("assets/characters/"))await ghDelete(rp,`Remove gallery image: ${d.name}`)}}
 const mdText=buildMd(imagePath,entrySlug,galleryPaths);await ghPut(`posts/${filename}`,utf8b64(mdText),`${old?"Update":"Add"} persona: ${d.name}`);
 await updatePersonaIndex(list=>{if(!list.includes(filename))list.push(filename);return list},`Update persona index`);
 // Optimistic UI: GitHub Pages deployment can finish in the background; update this browser immediately.
 const saved=parseFrontMatter(mdText,filename);if(old){state.posts[editingIndex]=saved}else{state.posts.push(saved);editingIndex=state.posts.length-1}renderSide();status.textContent="저장 완료! 이 화면에는 즉시 반영되었습니다. 공개 Pages 배포는 뒤에서 진행됩니다.";showDetail(editingIndex)
 }catch(e){status.textContent=e.message}}
async function saveHomeToGitHub(){const status=$("saveStatus");try{homeSettings={eyebrow:$("homeEyebrow").value.trim(),title:$("homeTitle").value.trim(),accent:$("homeAccent").value.trim(),description:$("homeDescription").value.trim()};status.textContent="HOME 설정 저장 중…";await ghPut("config/home.json",utf8b64(JSON.stringify(homeSettings,null,2)+"\n"),"Update archive home");status.textContent="저장 완료!";setTimeout(()=>showHome(),800)}catch(e){status.textContent=e.message}}
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>b.dataset.view==="home"?showHome():showPersonas());
function clearArchiveSearch(){searchInputEl.textContent="";state.query=""}
clearArchiveSearch();
window.addEventListener("pageshow",()=>{clearArchiveSearch();setTimeout(clearArchiveSearch,0);setTimeout(clearArchiveSearch,250)});
window.addEventListener("load",()=>{clearArchiveSearch();setTimeout(clearArchiveSearch,100);setTimeout(clearArchiveSearch,500)});
searchInputEl.oninput=e=>{state.query=e.target.textContent.trim();showPersonas()};
searchInputEl.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();}};newEntryBtnEl.onclick=()=>editor();menuBtnEl.onclick=()=>sidebarEl.classList.toggle("open");themeBtnEl.onclick=()=>document.body.classList.toggle("light");
importMdEl.onchange=async e=>{const f=e.target.files[0];if(f){const p=parseFrontMatter(await f.text(),f.name);state.posts.push(p);editor(state.posts.length-1);state.posts.pop()}e.target.value=""};
$("githubBtn").onclick=openGitHub;$("githubClose").onclick=()=>$("githubModal").hidden=true;
$("ghSave").onclick=()=>{localStorage.setItem("personaArchiveGithub",JSON.stringify({owner:$("ghOwner").value.trim(),repo:$("ghRepo").value.trim(),branch:$("ghBranch").value.trim()||"main"}));sessionStorage.setItem("personaArchiveToken",$("ghToken").value.trim());$("githubModal").hidden=true;applyOwnerUI();loadAll()};
$("ghForget").onclick=()=>{sessionStorage.removeItem("personaArchiveToken");$("ghToken").value="";applyOwnerUI();routeFromHash()};
window.addEventListener("hashchange",()=>routeFromHash());
applyOwnerUI();
loadAll();
